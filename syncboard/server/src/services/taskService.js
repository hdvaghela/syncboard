import Board from '../models/Board.js';
import Task from '../models/Task.js';
import { serializeBoard, serializeTask } from '../serializers.js';
import { GAP, MIN_GAP, computePosition, HttpError } from '../lib.js';
import { isObjectId } from './boardService.js';

const PRIORITIES = ['low', 'medium', 'high'];

const clean = {
  title(v) {
    const t = String(v ?? '').trim();
    if (!t) throw new HttpError(400, 'Give the card a title');
    if (t.length > 200) throw new HttpError(400, 'Titles can be up to 200 characters');
    return t;
  },
  description: (v) => String(v ?? '').slice(0, 4000),
  priority(v) {
    if (!PRIORITIES.includes(v)) throw new HttpError(400, 'Priority must be low, medium or high');
    return v;
  },
  dueDate(v) {
    if (v === null || v === '') return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Due date is not valid');
    return d;
  },
};

async function boardOr404(boardId) {
  const board = await Board.findById(boardId);
  if (!board) throw new HttpError(404, 'Board not found');
  return board;
}

const hasColumn = (board, columnId) => isObjectId(columnId) && board.columns.some((c) => c.id === String(columnId));

async function taskOr404(boardId, taskId) {
  if (!isObjectId(taskId)) throw new HttpError(404, 'Card not found');
  const task = await Task.findOne({ _id: taskId, board: boardId });
  if (!task) throw new HttpError(404, 'That card no longer exists');
  return task;
}

async function checkAssignee(board, assignee) {
  if (assignee === null || assignee === '' || assignee === undefined) return null;
  if (!board.members.some((m) => String(m) === String(assignee))) {
    throw new HttpError(400, 'You can only assign cards to board members');
  }
  return assignee;
}

/* Every function returns { ack, event, payload } – the socket layer sends `ack` to the
   caller and broadcasts `event`/`payload` to everyone on the board. */

export async function createTask(boardId, userId, input) {
  const board = await boardOr404(boardId);
  if (!hasColumn(board, input.columnId)) throw new HttpError(400, 'That column no longer exists');

  const last = await Task.findOne({ board: boardId, column: input.columnId }).sort({ position: -1 }).select('position');
  const task = await Task.create({
    board: boardId,
    column: input.columnId,
    title: clean.title(input.title),
    description: clean.description(input.description),
    priority: input.priority ? clean.priority(input.priority) : 'medium',
    assignee: await checkAssignee(board, input.assignee),
    dueDate: input.dueDate ? clean.dueDate(input.dueDate) : null,
    position: last ? last.position + GAP : GAP,
    createdBy: userId,
  });
  const data = serializeTask(task);
  return { ack: { task: data }, event: 'task:created', payload: { task: data, by: userId } };
}

export async function updateTask(boardId, userId, { taskId, patch = {} }) {
  const board = await boardOr404(boardId);
  const task = await taskOr404(boardId, taskId);

  if ('title' in patch) task.title = clean.title(patch.title);
  if ('description' in patch) task.description = clean.description(patch.description);
  if ('priority' in patch) task.priority = clean.priority(patch.priority);
  if ('dueDate' in patch) task.dueDate = clean.dueDate(patch.dueDate);
  if ('assignee' in patch) task.assignee = await checkAssignee(board, patch.assignee);
  await task.save();

  const data = serializeTask(task);
  return { ack: { task: data }, event: 'task:updated', payload: { task: data, by: userId } };
}

export async function moveTask(boardId, userId, { taskId, columnId, index }) {
  const board = await boardOr404(boardId);
  if (!hasColumn(board, columnId)) throw new HttpError(400, 'That column no longer exists');
  const task = await taskOr404(boardId, taskId);

  const others = await Task.find({ board: boardId, column: columnId, _id: { $ne: task._id } })
    .sort({ position: 1 })
    .select('position');
  const positions = others.map((t) => t.position);
  const idx = Math.max(0, Math.min(Number.isInteger(index) ? index : positions.length, positions.length));
  const position = computePosition(positions, idx);

  const prev = positions[idx - 1];
  const next = positions[idx];
  const tooClose = (prev !== undefined && position - prev < MIN_GAP) || (next !== undefined && next - position < MIN_GAP);

  let rebalanced = null;
  if (!tooClose) {
    task.column = columnId;
    task.position = position;
    await task.save();
  } else {
    // Gaps got too small after many inserts: renumber this column once.
    const order = [...others];
    order.splice(idx, 0, task);
    await Task.bulkWrite(
      order.map((t, i) => ({
        updateOne: {
          filter: { _id: t._id },
          update: { $set: { position: (i + 1) * GAP, ...(t._id.equals(task._id) ? { column: columnId } : {}) } },
        },
      }))
    );
    rebalanced = (await Task.find({ board: boardId, column: columnId })).map(serializeTask);
  }

  const data = rebalanced ? rebalanced.find((t) => t.id === String(task._id)) : serializeTask(task);
  return {
    ack: { task: data },
    event: 'task:moved',
    payload: { task: data, rebalanced, by: userId },
  };
}

export async function deleteTask(boardId, userId, { taskId }) {
  const task = await taskOr404(boardId, taskId);
  await task.deleteOne();
  return { ack: {}, event: 'task:deleted', payload: { taskId: String(task._id), title: task.title, by: userId } };
}

export async function createColumn(boardId, userId, { title }) {
  const board = await boardOr404(boardId);
  const name = String(title ?? '').trim();
  if (!name) throw new HttpError(400, 'Give the column a name');
  if (board.columns.length >= 12) throw new HttpError(400, 'A board can have up to 12 columns');
  board.columns.push({ title: name.slice(0, 60) });
  await board.save();
  const column = serializeBoard(board).columns.at(-1);
  return { ack: { column }, event: 'column:created', payload: { column, by: userId } };
}

export async function renameColumn(boardId, userId, { columnId, title }) {
  const board = await boardOr404(boardId);
  if (!hasColumn(board, columnId)) throw new HttpError(404, 'That column no longer exists');
  const name = String(title ?? '').trim();
  if (!name) throw new HttpError(400, 'Give the column a name');
  board.columns.id(columnId).title = name.slice(0, 60);
  await board.save();
  const column = { id: String(columnId), title: board.columns.id(columnId).title };
  return { ack: { column }, event: 'column:renamed', payload: { column, by: userId } };
}

export async function deleteColumn(boardId, userId, { columnId }) {
  const board = await boardOr404(boardId);
  if (!hasColumn(board, columnId)) throw new HttpError(404, 'That column no longer exists');
  if (board.columns.length <= 1) throw new HttpError(400, 'A board needs at least one column');
  const title = board.columns.id(columnId).title;
  board.columns.pull(columnId);
  await board.save();
  await Task.deleteMany({ board: boardId, column: columnId });
  return { ack: {}, event: 'column:deleted', payload: { columnId: String(columnId), title, by: userId } };
}
