import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { http } from '../api/http.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import { Logo, PlusIcon } from '../components/Icons.jsx';

export default function Boards() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState(null);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    http('/boards').then((d) => setBoards(d.boards)).catch((e) => setError(e.message));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const d = await http('/boards', { method: 'POST', body: { title } });
      navigate(`/b/${d.board.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full">
      <header className="bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="flex items-center gap-2.5 font-display text-xl font-bold"><Logo /> SyncBoard</span>
          <div className="flex items-center gap-3 text-sm">
            <Avatar user={user} size={28} />
            <span className="hidden sm:inline">{user.name}</span>
            <button onClick={logout} className="rounded-md px-2 py-1 font-semibold hover:bg-white/10">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold">Your boards</h1>

        <form onSubmit={create} className="mt-4 flex max-w-md gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name a new board" aria-label="New board name" maxLength={80} className="input" />
          <button className="btn btn-primary shrink-0" disabled={!title.trim() || busy}><PlusIcon /> Create</button>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards === null && !error && Array.from({ length: 3 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-white/60" />)}
          {boards?.map((b) => (
            <Link key={b.id} to={`/b/${b.id}`} className="block rounded-xl bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
              <h2 className="font-display text-lg font-semibold">{b.title}</h2>
              <p className="mt-1 text-sm text-muted">{b.taskCount} {b.taskCount === 1 ? 'card' : 'cards'} · {b.columns.length} columns</p>
              <p className="mt-4 text-xs font-medium text-muted">{b.members.length} {b.members.length === 1 ? 'member' : 'members'}</p>
            </Link>
          ))}
        </div>
        {boards?.length === 0 && (
          <p className="mt-6 rounded-xl border border-dashed border-line p-8 text-center text-muted">No boards yet. Name one above to get started.</p>
        )}
      </main>
    </div>
  );
}
