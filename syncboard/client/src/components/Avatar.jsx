import { initials } from '../lib/format.js';

export default function Avatar({ user, size = 28, ring = false, title }) {
  if (!user) return null;
  return (
    <span
      title={title ?? user.name}
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ${ring ? 'ring-2 ring-offset-2 ring-offset-ink' : ''}`}
      style={{ width: size, height: size, background: user.color, fontSize: size * 0.4, ...(ring ? { '--tw-ring-color': user.color } : {}) }}
    >
      {initials(user.name)}
    </span>
  );
}
