import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard.jsx';
import { PlusIcon, TrashIcon } from './Icons.jsx';

function AddCard({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (open) ref.current?.focus(); }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const ok = await onAdd(title.trim());
    setBusy(false);
    if (ok) { setTitle(''); ref.current?.focus(); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted hover:bg-white/70 hover:text-ink">
        <PlusIcon width={16} height={16} /> Add card
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        ref={ref}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) submit(e);
          if (e.key === 'Escape') { setOpen(false); setTitle(''); }
        }}
        rows={2}
        maxLength={200}
        placeholder="What needs to be done?"
        aria-label="Card title"
        className="w-full resize-none rounded-lg border border-line bg-white p-2.5 text-sm focus:border-violet"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={!title.trim() || busy} className="btn btn-primary h-9">Add card</button>
        <button type="button" onClick={() => { setOpen(false); setTitle(''); }} className="btn btn-ghost h-9">Cancel</button>
      </div>
    </form>
  );
}

export default function Column({ column, taskIds, taskMap, membersById, dragging, flash, onOpen, actions }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column' } });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.title);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => setName(column.title), [column.title]);

  const saveName = () => {
    setEditing(false);
    const t = name.trim();
    if (t && t !== column.title) actions.renameColumn(column.id, t);
    else setName(column.title);
  };

  return (
    <section
      aria-label={`${column.title}, ${taskIds.length} cards`}
      className={`flex max-h-full w-[85vw] shrink-0 snap-center flex-col rounded-xl bg-lane p-2.5 sm:w-80 ${isOver ? 'ring-2 ring-violet/40' : ''}`}
    >
      <header className="mb-2 flex items-center justify-between gap-2 px-1">
        {editing ? (
          <input
            autoFocus value={name} maxLength={60}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(column.title); setEditing(false); } }}
            aria-label="Column name"
            className="h-8 min-w-0 flex-1 rounded-md border border-violet bg-white px-2 font-display text-base font-semibold"
          />
        ) : (
          <h2 className="min-w-0 flex-1 truncate font-display text-base font-semibold">
            <button onClick={() => setEditing(true)} className="max-w-full truncate rounded px-1 text-left hover:bg-white/80" title="Rename column">
              {column.title}
            </button>
            <span className="ml-2 text-sm font-medium text-muted">{taskIds.length}</span>
          </h2>
        )}
        {confirming ? (
          <div className="flex items-center gap-1 text-xs">
            <button onClick={() => { setConfirming(false); actions.deleteColumn(column.id); }} className="rounded-md bg-danger px-2 py-1 font-semibold text-white">
              Delete{taskIds.length ? ` + ${taskIds.length}` : ''}
            </button>
            <button onClick={() => setConfirming(false)} className="rounded-md px-2 py-1 font-semibold hover:bg-white">Keep</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} aria-label={`Delete column ${column.title}`} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-white hover:text-danger">
            <TrashIcon width={16} height={16} />
          </button>
        )}
      </header>

      <div ref={setNodeRef} className="no-scrollbar min-h-[48px] flex-1 space-y-2 overflow-y-auto px-0.5 pb-1">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {taskIds.map((id) => {
            const task = taskMap[id];
            if (!task) return null;
            return (
              <TaskCard
                key={id}
                task={task}
                assignee={membersById[task.assignee]}
                remoteUser={dragging[id] ? membersById[dragging[id]] : null}
                flash={Boolean(flash[id])}
                onOpen={onOpen}
              />
            );
          })}
        </SortableContext>
        {taskIds.length === 0 && (
          <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-muted">Drop a card here</p>
        )}
      </div>

      <div className="mt-1 pt-1">
        <AddCard onAdd={(title) => actions.createTask(column.id, title)} />
      </div>
    </section>
  );
}
