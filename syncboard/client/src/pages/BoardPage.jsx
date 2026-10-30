import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useBoard } from '../hooks/useBoard.js';
import Board from '../components/Board.jsx';
import TaskModal from '../components/TaskModal.jsx';
import MembersDialog from '../components/MembersDialog.jsx';
import FeedStack from '../components/FeedStack.jsx';
import Avatar from '../components/Avatar.jsx';
import { BackIcon, UsersIcon } from '../components/Icons.jsx';

export default function BoardPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const b = useBoard(id, user);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [showMembers, setShowMembers] = useState(false);

  const onlineUsers = useMemo(() => b.members.filter((m) => b.online.includes(m.id)), [b.members, b.online]);
  const openTask = b.tasks.find((t) => t.id === openTaskId);

  if (b.status === 'error') {
    return (
      <main className="grid h-full place-items-center p-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Can’t open this board</h1>
          <p className="mt-1 text-muted">{b.error}</p>
          <Link to="/" className="btn btn-primary mt-5">Back to your boards</Link>
        </div>
      </main>
    );
  }

  if (b.status === 'loading') {
    return <div className="grid h-full place-items-center text-muted" aria-busy="true">Connecting to board…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 bg-ink px-3 text-white sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/" aria-label="Back to boards" className="grid h-9 w-9 place-items-center rounded-md hover:bg-white/10"><BackIcon /></Link>
          <h1 className="truncate font-display text-lg font-bold sm:text-xl">{b.board.title}</h1>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className={`hidden items-center gap-1.5 text-xs font-semibold sm:flex ${b.connected ? 'text-emerald-300' : 'text-amber-300'}`} role="status">
            <span className={`h-2 w-2 rounded-full ${b.connected ? 'bg-emerald-300' : 'animate-pulse bg-amber-300'}`} />
            {b.connected ? 'Live' : 'Reconnecting…'}
          </span>
          <div className="flex -space-x-2" aria-label={`${onlineUsers.length} online`}>
            {onlineUsers.slice(0, 5).map((m) => (
              <span key={m.id} className="rounded-full ring-2 ring-ink"><Avatar user={m} size={30} title={`${m.name}${m.id === user.id ? ' (you)' : ''} · online`} /></span>
            ))}
            {onlineUsers.length > 5 && <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-white/20 text-xs font-semibold ring-2 ring-ink">+{onlineUsers.length - 5}</span>}
          </div>
          <button onClick={() => setShowMembers(true)} className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm font-semibold hover:bg-white/20">
            <UsersIcon /> <span className="hidden sm:inline">Members</span>
          </button>
        </div>
      </header>

      {!b.connected && (
        <p role="status" className="bg-amber-100 px-4 py-1.5 text-center text-sm font-medium text-amber-900 sm:hidden">Reconnecting… edits are paused.</p>
      )}

      <main className="min-h-0 flex-1">
        <Board
          board={b.board}
          tasks={b.tasks}
          members={b.members}
          dragging={b.dragging}
          flash={b.flash}
          actions={b.actions}
          onOpenTask={setOpenTaskId}
        />
      </main>

      {openTask && (
        <TaskModal
          key={openTask.id}
          task={openTask}
          columnTitle={b.board.columns.find((c) => c.id === openTask.column)?.title ?? ''}
          members={b.members}
          actions={b.actions}
          onClose={() => setOpenTaskId(null)}
        />
      )}
      {showMembers && <MembersDialog boardId={id} members={b.members} online={b.online} onClose={() => setShowMembers(false)} />}
      <FeedStack feed={b.feed} onDismiss={b.actions.dismissFeed} />
    </div>
  );
}
