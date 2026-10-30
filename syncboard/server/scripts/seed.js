// Creates two demo users and a populated board:  npm run seed
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../src/config.js';
import User from '../src/models/User.js';
import Board from '../src/models/Board.js';
import Task from '../src/models/Task.js';
import { GAP } from '../src/lib.js';

await mongoose.connect(config.mongoUri);

const passwordHash = await bcrypt.hash('password123', 10);
async function upsertUser(name, email, color) {
  return (await User.findOne({ email })) ?? User.create({ name, email, passwordHash, color });
}
const alex = await upsertUser('Alex Rivera', 'alex@demo.com', '#5B3DF5');
const sam = await upsertUser('Sam Okafor', 'sam@demo.com', '#0E9F6E');

await Board.deleteMany({ title: 'Product launch', owner: alex._id });
const board = await Board.create({
  title: 'Product launch',
  owner: alex._id,
  members: [alex._id, sam._id],
  columns: ['To do', 'In progress', 'In review', 'Done'].map((title) => ({ title })),
});
const [todo, doing, review, done] = board.columns.map((c) => c._id);

const cards = [
  [todo, 'Write launch announcement', 'medium', alex],
  [todo, 'Prepare pricing page copy', 'low', sam],
  [todo, 'Set up uptime monitoring', 'high', null],
  [doing, 'Build onboarding checklist', 'high', alex],
  [doing, 'Fix signup form validation', 'medium', sam],
  [review, 'Dark mode QA pass', 'low', sam],
  [done, 'Design new logo', 'medium', alex],
  [done, 'Register domain', 'low', sam],
];
const perColumn = new Map();
for (const [column, title, priority, assignee] of cards) {
  const n = (perColumn.get(String(column)) ?? 0) + 1;
  perColumn.set(String(column), n);
  await Task.create({ board: board._id, column, title, priority, assignee: assignee?._id ?? null, position: n * GAP, createdBy: alex._id });
}

console.log('Seeded. Sign in with alex@demo.com or sam@demo.com, password: password123');
await mongoose.disconnect();
