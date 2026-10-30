import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Avatar from './Avatar.jsx';
import { CalendarIcon } from './Icons.jsx';
import { PRIORITY, formatDue, isOverdue } from '../lib/format.js';

/** Pure visual card – also rendered inside <DragOverlay>. */
export function TaskCardView({ task, assignee, remoteUser, flash, overlay }) {
  const p = PRIORITY[task.priority] ?? PRIORITY.medium;
  const overdue = isOverdue(task.dueDate);
  return (
    <div
      className={`select-none rounded-lg border border-l-4 border-line bg-white p-3 text-left ${p.bar} ${
        overlay ? 'rotate-2 shadow-lift' : 'shadow-card'
      } ${flash ? 'remote-flash' : ''}`}
      style={remoteUser ? { outline: `2px solid ${remoteUser.color}`, outlineOffset: 1 } : undefined}
    >
      <p className="break-words text-sm font-medium leading-snug">{task.title}</p>

      {remoteUser && (
        <p className="mt-2 text-xs font-semibold" style={{ color: remoteUser.color }}>
          {remoteUser.name.split(' ')[0]} is moving this
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className={`font-semibold ${p.text}`}>{p.label}</span>
          {task.dueDate && (
            <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-danger' : 'text-muted'}`}>
              <CalendarIcon width={13} height={13} /> {formatDue(task.dueDate)}
            </span>
          )}
        </div>
        {assignee && <Avatar user={assignee} size={24} />}
      </div>
    </div>
  );
}

function SortableTaskCard({ task, assignee, remoteUser, flash, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: Boolean(remoteUser), // someone else is holding it
    data: { type: 'task' },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: 'manipulation' }}
      {...attributes}
      {...listeners}
      aria-label={`${task.title}. Press space to pick up, enter to open.`}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === 'Enter') onOpen(task.id);
      }}
      className={`cursor-grab rounded-lg active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
    >
      <TaskCardView task={task} assignee={assignee} remoteUser={remoteUser} flash={flash} />
    </div>
  );
}

export default memo(SortableTaskCard);
