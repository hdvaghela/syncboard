import { asyncRouter } from '../asyncRouter.js';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { serializeUser } from '../serializers.js';

const router = asyncRouter();
const COLORS = ['#5B3DF5', '#E5484D', '#0E9F6E', '#D97706', '#0891B2', '#C026D3', '#2563EB', '#DB2777'];
const colorFor = (name) => COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!name) return res.status(400).json({ error: 'Enter your name' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (password.length < 8) return res.status(400).json({ error: 'Use a password with at least 8 characters' });
  if (await User.exists({ email })) return res.status(409).json({ error: 'An account with that email already exists' });

  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), color: colorFor(name) });
  res.status(201).json({ token: signToken(user._id), user: serializeUser(user) });
});

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))) {
    return res.status(401).json({ error: 'Email or password is incorrect' });
  }
  res.json({ token: signToken(user._id), user: serializeUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'Account not found' });
  res.json({ user: serializeUser(user) });
});

export default router;
