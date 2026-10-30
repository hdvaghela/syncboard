import mongoose from 'mongoose';
import Board from '../models/Board.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { serializeBoard, serializeTask, serializeUser } from '../serializers.js';
import { HttpError } from '../lib.js';

export const isObjectId = (id) => mongoose.isValidObjectId(id);

export async function getBoardForMember(boardId, userId) {
  if (!isObjectId(boardId)) throw new HttpError(404, 'Board not found');
  const board = await Board.findOne({ _id: boardId, members: userId });
  if (!board) throw new HttpError(404, 'Board not found');
  return board;
}

export async function loadMembers(board) {
  const users = await User.find({ _id: { $in: board.members } });
  return users.map(serializeUser);
}

/** Everything a client needs to render a board. Used by REST and by the socket join ack. */
export async function loadBoardState(boardId, userId) {
  const board = await getBoardForMember(boardId, userId);
  const [tasks, members] = await Promise.all([
    Task.find({ board: board._id }).sort({ position: 1 }),
    loadMembers(board),
  ]);
  return { board: serializeBoard(board), tasks: tasks.map(serializeTask), members };
}
