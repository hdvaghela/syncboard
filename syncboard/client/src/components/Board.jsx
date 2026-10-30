import { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor,
  closestCorners, useSensor, useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import Column from './Column.jsx';
import { TaskCardView } from './TaskCard.jsx';
import { PlusIcon } from './Icons.jsx';

function AddColumn({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (await onAdd(title.trim())) { setTitle(''); setOpen(false); }
  };
  return (
    <div className="w-[85vw] shrink-0 snap-center sm:w-80">
      {open ? (
        <form onSubmit={submit} className="space-y-2 rounded-xl bg-lane p-3">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Column name" aria-label="Column name" className="input" />
          <div className="flex gap-2">
            <button className="btn btn-primary h-9" disabled={!title.trim()}>Add column</button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost h-9">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-sm font-semibold text-muted hover:border-violet hover:text-violet">
          <PlusIcon /> Add column
        </button>
      )}
    </div>
  );
}

export default function Board({ board, tasks, members, dragging, flash, actions, onOpenTask }) {
  const [activeId, setActiveId] = useState(null);
  const [items, setItems] = useState(null); // live column -> ids map while dragging

  const membersById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const taskMap = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

  // Source of truth: column -> ordered task ids, derived from server positions.
  const baseItems = useMemo(() => {
    const map = Object.fromEntries(board.columns.map((c) => [c.id, []]));
    [...tasks].sort((a, b) => a.position - b.position).forEach((t) => map[t.column]?.push(t.id));
    return map;
  }, [board.columns, tasks]);

  const current = items ?? baseItems;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    })
  );

  const findContainer = (id, map) => (id in map ? id : Object.keys(map).find((k) => map[k].includes(id)));

  function onDragStart({ active }) {
    setActiveId(active.id);
    setItems(baseItems);
    actions.notifyDrag('start', active.id);
  }

  // While hovering another column, move the card there locally so the lane makes room.
  function onDragOver({ active, over }) {
    if (!over) return;
    setItems((prev) => {
      const map = prev ?? baseItems;
      const from = findContainer(active.id, map);
      const to = findContainer(over.id, map);
      if (!from || !to || from === to) return prev;

      const target = map[to];
      let index;
      if (over.id in map) {
        index = target.length;
      } else {
        const overIndex = target.indexOf(over.id);
        const below = active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height / 2;
        index = overIndex + (below ? 1 : 0);
      }
      return {
        ...map,
        [from]: map[from].filter((id) => id !== active.id),
        [to]: [...target.slice(0, index), active.id, ...target.slice(index)],
      };
    });
  }

  function onDragEnd({ active, over }) {
    const id = active.id;
    actions.notifyDrag('end', id);
    setActiveId(null);

    const map = items ?? baseItems;
    const task = taskMap[id];
    if (!over || !task) return setItems(null);

    let next = map;
    const from = findContainer(id, map);
    const to = findContainer(over.id, map);
    if (from && from === to && over.id !== id && !(over.id in map)) {
      const oldIndex = map[from].indexOf(id);
      const newIndex = map[to].indexOf(over.id);
      if (oldIndex !== newIndex) next = { ...map, [to]: arrayMove(map[to], oldIndex, newIndex) };
    }

    const column = findContainer(id, next);
    const index = next[column].indexOf(id); // == number of other cards above it
    const moved = task.column !== column || baseItems[task.column].indexOf(id) !== index;
    setItems(null);
    if (moved) actions.moveTask(id, column, index);
  }

  function onDragCancel() {
    if (activeId) actions.notifyDrag('end', activeId);
    setActiveId(null);
    setItems(null);
  }

  const activeTask = activeId ? taskMap[activeId] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="no-scrollbar flex h-full snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-6 pt-4 sm:snap-none sm:px-6">
        {board.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            taskIds={current[column.id] ?? []}
            taskMap={taskMap}
            membersById={membersById}
            dragging={dragging}
            flash={flash}
            onOpen={onOpenTask}
            actions={actions}
          />
        ))}
        <AddColumn onAdd={actions.createColumn} />
      </div>

      <DragOverlay dropAnimation={{ duration: 160 }}>
        {activeTask && <TaskCardView task={activeTask} assignee={membersById[activeTask.assignee]} overlay />}
      </DragOverlay>
    </DndContext>
  );
}
