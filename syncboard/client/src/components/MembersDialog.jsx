import { useEffect, useState } from 'react';
import { http } from '../api/http.js';
import Avatar from './Avatar.jsx';
import { CloseIcon } from './Icons.jsx';

export default function MembersDialog({ boardId, members, online, onClose }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const invite = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await http(`/boards/${boardId}/members`, { method: 'POST', body: { email } });
      setEmail(''); // the server broadcasts members:updated, so the list refreshes for everyone
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Board members" className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-lift sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Members</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md hover:bg-lane"><CloseIcon /></button>
        </div>

        <ul className="mt-4 divide-y divide-line">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5">
              <Avatar user={m} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <p className="truncate text-xs text-muted">{m.email}</p>
              </div>
              <span className={`text-xs font-semibold ${online.includes(m.id) ? 'text-ok' : 'text-muted'}`}>
                {online.includes(m.id) ? 'Online' : 'Offline'}
              </span>
            </li>
          ))}
        </ul>

        <form onSubmit={invite} className="mt-4">
          <label className="text-sm font-medium" htmlFor="invite-email">Add a teammate by email</label>
          <div className="mt-1 flex gap-2">
            <input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" className="input" />
            <button className="btn btn-primary shrink-0" disabled={busy || !email}>Add</button>
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
        </form>
      </div>
    </div>
  );
}
