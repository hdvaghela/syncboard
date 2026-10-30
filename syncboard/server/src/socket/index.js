import { Server } from 'socket.io';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import { config } from '../config.js';
import { serializeUser } from '../serializers.js';
import { loadBoardState, getBoardForMember } from '../services/boardService.js';
import * as tasks from '../services/taskService.js';

const room = (boardId) => `board:${boardId}`;

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientOrigins, credentials: true },
  });

  // boardId -> Map(userId -> number of open tabs/sockets)
  const presence = new Map();
  const online = (boardId) => [...(presence.get(boardId)?.keys() ?? [])];
  const broadcastPresence = (boardId) => io.to(room(boardId)).emit('presence:update', { online: online(boardId) });

  function leave(socket) {
    const boardId = socket.data.boardId;
    if (!boardId) return;
    const users = presence.get(boardId);
    if (users) {
      const n = (users.get(socket.data.userId) || 1) - 1;
      if (n <= 0) users.delete(socket.data.userId);
      else users.set(socket.data.userId, n);
      if (users.size === 0) presence.delete(boardId);
    }
    socket.leave(room(boardId));
    socket.data.boardId = null;
    broadcastPresence(boardId);
  }

  // Authenticate every connection with the JWT sent in the handshake.
  io.use(async (socket, next) => {
    try {
      const userId = verifyToken(socket.handshake.auth?.token);
      const user = await User.findById(userId);
      if (!user) return next(new Error('Account not found'));
      socket.data.userId = String(user._id);
      socket.data.user = serializeUser(user);
      next();
    } catch {
      next(new Error('Not authenticated'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;

    // Wrap handlers: run, ack the caller, broadcast to the board room.
    const mutation = (name, fn) =>
      socket.on(name, async (data, ack) => {
        const boardId = socket.data.boardId;
        try {
          if (!boardId) throw new Error('Join a board first');
          await getBoardForMember(boardId, userId); // re-check membership on every write
          const result = await fn(boardId, userId, data || {});
          io.to(room(boardId)).emit(result.event, result.payload);
          ack?.({ ok: true, ...result.ack });
        } catch (err) {
          if (!err.status) console.error(`[socket:${name}]`, err);
          ack?.({ ok: false, error: err.status ? err.message : 'Something went wrong. Try again.' });
        }
      });

    socket.on('board:join', async ({ boardId } = {}, ack) => {
      try {
        const state = await loadBoardState(boardId, userId); // throws if not a member
        if (socket.data.boardId && socket.data.boardId !== boardId) leave(socket);
        if (socket.data.boardId !== boardId) {
          socket.data.boardId = boardId;
          socket.join(room(boardId));
          const users = presence.get(boardId) ?? new Map();
          users.set(userId, (users.get(userId) || 0) + 1);
          presence.set(boardId, users);
        }
        ack?.({ ok: true, state: { ...state, online: online(boardId) } });
        broadcastPresence(boardId);
      } catch (err) {
        ack?.({ ok: false, error: err.status ? err.message : 'Could not open this board' });
      }
    });

    mutation('task:create', tasks.createTask);
    mutation('task:update', tasks.updateTask);
    mutation('task:move', tasks.moveTask);
    mutation('task:delete', tasks.deleteTask);
    mutation('column:create', tasks.createColumn);
    mutation('column:rename', tasks.renameColumn);
    mutation('column:delete', tasks.deleteColumn);

    // Lightweight "someone is dragging this card" signal (not persisted).
    for (const evt of ['drag:start', 'drag:end']) {
      socket.on(evt, ({ taskId } = {}) => {
        if (socket.data.boardId && taskId) socket.to(room(socket.data.boardId)).emit(evt, { taskId: String(taskId), by: userId });
      });
    }
    socket.on('disconnect', () => leave(socket));
  });

  return io;
}
