import { useEffect, useMemo, useRef, useState } from 'react';
import { createSocket } from '../api/socket.js';
import { getToken } from '../api/http.js';
import { computePosition } from '../lib/position.js';

const upsert = (tasks, incoming) => {
  const map = new Map(tasks.map((t) => [t.id, t]));
  (Array.isArray(incoming) ? incoming : [incoming]).forEach((t) => map.set(t.id, t));
  return [...map.values()];
};

/**
 * Owns all real-time board state.
 *  - joins the board room over Socket.io and receives the full state in the ack
 *  - applies every broadcast event idempotently (so our own echoes are harmless)
 *  - exposes optimistic actions that roll back if the server rejects them
 *  - re-joins (and therefore re-syncs) automatically after a dropped connection
 */
export function useBoard(boardId, me) {
  const [state, setState] = useState({ status: 'loading', error: null, connected: false, board: null, tasks: [], members: [], online: [] });
  const [dragging, setDragging] = useState({}); // taskId -> userId currently dragging it
  const [flash, setFlash] = useState({}); // taskId -> true for ~1.6s after a remote change
  const [feed, setFeed] = useState([]); // transient activity messages

  const socketRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const meRef = useRef(me);
  meRef.current = me;
  const feedId = useRef(0);
  const helpers = useRef(null); // toast/flash helpers shared with the socket effect

  const api = useMemo(() => {
    const pushFeed = (text, tone = 'info') => {
      const id = ++feedId.current;
      setFeed((f) => [...f.slice(-3), { id, text, tone }]);
      setTimeout(() => setFeed((f) => f.filter((m) => m.id !== id)), tone === 'error' ? 6000 : 4000);
    };
    const flashTasks = (ids) => {
      setFlash((f) => ({ ...f, ...Object.fromEntries(ids.map((i) => [i, true])) }));
      setTimeout(() => setFlash((f) => Object.fromEntries(Object.entries(f).filter(([k]) => !ids.includes(k)))), 1600);
    };
    const nameOf = (id) => stateRef.current.members.find((m) => m.id === id)?.name.split(' ')[0] ?? 'Someone';
    const colTitle = (id) => stateRef.current.board?.columns.find((c) => c.id === id)?.title ?? 'a column';

    const emit = (event, payload) =>
      new Promise((resolve, reject) => {
        const s = socketRef.current;
        if (!s || !s.connected) return reject(new Error('You’re offline. Changes will work again once you reconnect.'));
        s.timeout(8000).emit(event, payload, (err, res) => {
          if (err) return reject(new Error('The server took too long to respond. Try again.'));
          return res?.ok ? resolve(res) : reject(new Error(res?.error || 'Something went wrong'));
        });
      });

    // Run an action; surface failures as a toast and return success as a boolean.
    const attempt = async (fn, rollback) => {
      try {
        await fn();
        return true;
      } catch (err) {
        rollback?.();
        pushFeed(err.message, 'error');
        return false;
      }
    };

    const patchTask = (id, patch) =>
      setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));

    const actions = {
      createTask: (columnId, title) => attempt(() => emit('task:create', { columnId, title })),

      updateTask(taskId, patch) {
        const before = stateRef.current.tasks.find((t) => t.id === taskId);
        if (!before) return Promise.resolve(false);
        patchTask(taskId, patch);
        return attempt(() => emit('task:update', { taskId, patch }), () => patchTask(taskId, before));
      },

      moveTask(taskId, columnId, index) {
        const { tasks } = stateRef.current;
        const before = tasks.find((t) => t.id === taskId);
        if (!before) return Promise.resolve(false);
        const positions = tasks
          .filter((t) => t.column === columnId && t.id !== taskId)
          .map((t) => t.position)
          .sort((a, b) => a - b);
        // Optimistic: card lands immediately; the server echo then confirms/overrides.
        patchTask(taskId, { column: columnId, position: computePosition(positions, index) });
        return attempt(() => emit('task:move', { taskId, columnId, index }), () => patchTask(taskId, before));
      },

      deleteTask(taskId) {
        const before = stateRef.current.tasks.find((t) => t.id === taskId);
        setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }));
        return attempt(
          () => emit('task:delete', { taskId }),
          () => before && setState((s) => ({ ...s, tasks: upsert(s.tasks, before) }))
        );
      },

      createColumn: (title) => attempt(() => emit('column:create', { title })),
      renameColumn: (columnId, title) => attempt(() => emit('column:rename', { columnId, title })),
      deleteColumn: (columnId) => attempt(() => emit('column:delete', { columnId })),

      notifyDrag(type, taskId) {
        socketRef.current?.emit(`drag:${type}`, { taskId });
      },
      dismissFeed: (id) => setFeed((f) => f.filter((m) => m.id !== id)),
    };

    helpers.current = { pushFeed, flashTasks, nameOf, colTitle };
    return actions;
  }, []);

  useEffect(() => {
    const { pushFeed, flashTasks, nameOf, colTitle } = helpers.current;
    const socket = createSocket(getToken());
    socketRef.current = socket;
    setState((s) => ({ ...s, status: 'loading', error: null }));

    const join = () =>
      socket.emit('board:join', { boardId }, (res) => {
        if (!res?.ok) return setState((s) => ({ ...s, status: 'error', error: res?.error || 'Could not open this board' }));
        setDragging({});
        setState({ status: 'ready', error: null, connected: true, ...res.state });
      });

    const mine = (id) => id === meRef.current?.id;
    const remote = (by, fn) => !mine(by) && fn();

    socket.on('connect', join);
    socket.on('disconnect', () => setState((s) => ({ ...s, connected: false })));
    socket.on('connect_error', (err) => {
      if (err.message === 'Not authenticated' || err.message === 'Account not found') {
        setState((s) => ({ ...s, status: 'error', error: 'Your session expired. Sign in again.' }));
      }
    });

    socket.on('task:created', ({ task, by }) => {
      setState((s) => ({ ...s, tasks: upsert(s.tasks, task) }));
      remote(by, () => { flashTasks([task.id]); pushFeed(`${nameOf(by)} added “${task.title}”`); });
    });
    socket.on('task:updated', ({ task, by }) => {
      setState((s) => ({ ...s, tasks: upsert(s.tasks, task) }));
      remote(by, () => flashTasks([task.id]));
    });
    socket.on('task:moved', ({ task, rebalanced, by }) => {
      setState((s) => ({ ...s, tasks: upsert(s.tasks, rebalanced || task) }));
      remote(by, () => { flashTasks([task.id]); pushFeed(`${nameOf(by)} moved “${task.title}” to ${colTitle(task.column)}`); });
    });
    socket.on('task:deleted', ({ taskId, title, by }) => {
      setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }));
      setDragging((d) => { const { [taskId]: _gone, ...rest } = d; return rest; });
      remote(by, () => pushFeed(`${nameOf(by)} deleted “${title}”`));
    });
    socket.on('column:created', ({ column, by }) => {
      setState((s) => (s.board.columns.some((c) => c.id === column.id) ? s : { ...s, board: { ...s.board, columns: [...s.board.columns, column] } }));
      remote(by, () => pushFeed(`${nameOf(by)} added the “${column.title}” column`));
    });
    socket.on('column:renamed', ({ column }) =>
      setState((s) => ({ ...s, board: { ...s.board, columns: s.board.columns.map((c) => (c.id === column.id ? column : c)) } })));
    socket.on('column:deleted', ({ columnId, title, by }) => {
      setState((s) => ({
        ...s,
        board: { ...s.board, columns: s.board.columns.filter((c) => c.id !== columnId) },
        tasks: s.tasks.filter((t) => t.column !== columnId),
      }));
      remote(by, () => pushFeed(`${nameOf(by)} deleted the “${title}” column`));
    });
    socket.on('members:updated', ({ members }) => setState((s) => ({ ...s, members })));
    socket.on('presence:update', ({ online }) => {
      setState((s) => ({ ...s, online }));
      // Drop "is dragging" markers for people who have gone offline.
      setDragging((d) => Object.fromEntries(Object.entries(d).filter(([, uid]) => online.includes(uid))));
    });
    socket.on('drag:start', ({ taskId, by }) => setDragging((d) => ({ ...d, [taskId]: by })));
    socket.on('drag:end', ({ taskId }) => setDragging((d) => { const { [taskId]: _x, ...rest } = d; return rest; }));
    socket.on('board:deleted', () => setState((s) => ({ ...s, status: 'error', error: 'This board was deleted' })));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId]);

  return { ...state, dragging, flash, feed, actions: api };
}
