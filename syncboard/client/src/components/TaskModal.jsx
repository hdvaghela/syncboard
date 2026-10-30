import { useEffect, useState } from 'react';
import Avatar from './Avatar.jsx';
import { CloseIcon, TrashIcon } from './Icons.jsx';

export default function TaskModal({ task, columnTitle, members, actions, onClose }) {
  const [draft, setDraft] = useState(() => ({
    title: task.title,
    description: task.description,
    priority: task.priority,
    assignee: task.assignee ?? '',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
  }));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const save = async (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    const ok = await actions.updateTask(task.id, {
      title: draft.title.trim(),
      description: draft.description,
      priority: draft.priority,
      assignee: draft.assignee || null,
      dueDate: draft.dueDate ? `${draft.dueDate}T00:00:00.000Z` : null,
    });
    setSaving(false);
    if (ok) onClose();
  };

  const assignee = members.find((m) => m.id === draft.assignee);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={save} role="dialog" aria-modal="true" aria-label="Edit card" className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-lift sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted">in <span className="font-semibold text-ink">{columnTitle}</span></p>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md hover:bg-lane"><CloseIcon /></button>
        </div>

        <label className="mt-3 block">
          <span className="sr-only">Title</span>
          <textarea
            value={draft.title} onChange={(e) => set({ title: e.target.value })} rows={2} maxLength={200}
            className="w-full resize-none rounded-lg border border-transparent p-2 font-display text-xl font-semibold leading-snug hover:border-line focus:border-violet"
          />
        </label>

        <label className="mt-3 block text-sm font-medium">
          Description
          <textarea
            value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={4} maxLength={4000}
            placeholder="Add details, links or acceptance criteria"
            className="mt-1 w-full rounded-lg border border-line p-2.5 text-sm font-normal focus:border-violet"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Assignee
            <select value={draft.assignee} onChange={(e) => set({ assignee: e.target.value })} className="input mt-1 font-normal">
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Priority
            <select value={draft.priority} onChange={(e) => set({ priority: e.target.value })} className="input mt-1 font-normal">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="col-span-2 text-sm font-medium sm:col-span-1">
            Due date
            <input type="date" value={draft.dueDate} onChange={(e) => set({ dueDate: e.target.value })} className="input mt-1 font-normal" />
          </label>
          {assignee && (
            <div className="col-span-2 flex items-center gap-2 self-end text-sm text-muted sm:col-span-1">
              <Avatar user={assignee} size={24} /> {assignee.name}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-sm">
              <span>Delete this card?</span>
              <button type="button" onClick={async () => { onClose(); await actions.deleteTask(task.id); }} className="btn h-9 bg-danger text-white hover:opacity-90">Delete</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn btn-ghost h-9">Keep</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-danger hover:underline">
              <TrashIcon width={16} height={16} /> Delete card
            </button>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={saving || !draft.title.trim()} className="btn btn-primary">{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
