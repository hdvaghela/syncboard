import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Icons.jsx';

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from || '/'} replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-full place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <Logo size={36} />
          <h1 className="font-display text-3xl font-bold tracking-tight">SyncBoard</h1>
        </div>
        <p className="mb-5 text-muted">Plan work together. Every move shows up for your whole team the moment it happens.</p>

        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="font-display text-xl font-semibold">{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
          {mode === 'register' && (
            <label className="block text-sm font-medium">Name
              <input className="input mt-1 font-normal" value={form.name} onChange={set('name')} required autoComplete="name" />
            </label>
          )}
          <label className="block text-sm font-medium">Email
            <input className="input mt-1 font-normal" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
          </label>
          <label className="block text-sm font-medium">Password
            <input className="input mt-1 font-normal" type="password" value={form.password} onChange={set('password')} required minLength={mode === 'register' ? 8 : undefined} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
          <p className="text-center text-sm text-muted">
            {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="font-semibold text-violet hover:underline">
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </form>

        <p className="mt-4 rounded-lg bg-white/60 p-3 text-xs text-muted">
          After running <code className="font-semibold text-ink">npm run seed</code>, try <b>alex@demo.com</b> or <b>sam@demo.com</b> with password <b>password123</b>. Sign in as both in two browsers to see live sync.
        </p>
      </div>
    </main>
  );
}
