export const initials = (name = '?') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export function formatDue(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function isOverdue(iso) {
  if (!iso) return false;
  const today = new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10) < today;
}

export const PRIORITY = {
  high: { label: 'High', bar: 'border-l-danger', text: 'text-danger' },
  medium: { label: 'Medium', bar: 'border-l-amber', text: 'text-amber' },
  low: { label: 'Low', bar: 'border-l-ok', text: 'text-ok' },
};
