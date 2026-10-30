import { asyncRouter } from '../asyncRouter.js';
import Board from '../models/Board.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeBoard } from '../serializers.js';
import { getBoardForMember, loadBoardState, loadMembers } from '../services/boardService.js';
import { HttpError } from '../lib.js';

const router = asyncRouter();
router.use(requireAuth);

const DEFAULT_COLUMNS = ['To do', 'In progress', 'In review', 'Done'];

router.get('/', async (req, res) => {
  const boards = await Board.find({ members: req.userId }).sort({ updatedAt: -1 });
  const counts = await Task.aggregate([
    { $match: { board: { $in: boards.map((b) => b._id) } } },
    { $group: { _id: '$board', count: { $sum: 1 } } },
  ]);
  const byBoard = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  res.json({ boards: boards.map((b) => ({ ...serializeBoard(b), taskCount: byBoard[String(b._id)] || 0 })) });
});

router.post('/', async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) throw new HttpError(400, 'Give the board a name');
  const board = await Board.create({
    title: title.slice(0, 80),
    owner: req.userId,
    members: [req.userId],
    columns: DEFAULT_COLUMNS.map((t) => ({ title: t })),
  });
  res.status(201).json({ board: serializeBoard(board) });
});

router.get('/:id', async (req, res) => {
  res.json(await loadBoardState(req.params.id, req.userId));
});

router.post('/:id/members', async (req, res) => {
  const board = await getBoardForMember(req.params.id, req.userId);
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user) throw new HttpError(404, 'No SyncBoard account uses that email yet');
  if (board.members.some((m) => String(m) === String(user._id))) throw new HttpError(409, `${user.name} is already on this board`);

  board.members.push(user._id);
  await board.save();
  const members = await loadMembers(board);
  req.app.get('io').to(`board:${board.id}`).emit('members:updated', { members, by: req.userId });
  res.status(201).json({ members });
});

router.delete('/:id', async (req, res) => {
  const board = await getBoardForMember(req.params.id, req.userId);
  if (String(board.owner) !== String(req.userId)) throw new HttpError(403, 'Only the board owner can delete it');
  await Task.deleteMany({ board: board._id });
  await board.deleteOne();
  req.app.get('io').to(`board:${board.id}`).emit('board:deleted', { boardId: board.id });
  res.json({ ok: true });
});

export default router;
