// Explicit, predictable JSON shapes for REST responses and socket events.
const s = (v) => (v ? String(v) : null);

export const serializeUser = (u) => ({ id: s(u._id), name: u.name, email: u.email, color: u.color });

export const serializeBoard = (b) => ({
  id: s(b._id),
  title: b.title,
  owner: s(b.owner),
  members: b.members.map((m) => s(m._id || m)),
  columns: b.columns.map((c) => ({ id: s(c._id), title: c.title })),
});

export const serializeTask = (t) => ({
  id: s(t._id),
  board: s(t.board),
  column: s(t.column),
  title: t.title,
  description: t.description,
  priority: t.priority,
  assignee: s(t.assignee),
  dueDate: t.dueDate ? t.dueDate.toISOString() : null,
  position: t.position,
  createdBy: s(t.createdBy),
  updatedAt: t.updatedAt ? t.updatedAt.toISOString() : null,
});
