// Must match server/src/lib.js so optimistic moves land where the server will put them.
export const GAP = 1024;

export function computePosition(positions, index) {
  const i = Math.max(0, Math.min(index, positions.length));
  const prev = positions[i - 1];
  const next = positions[i];
  if (prev === undefined && next === undefined) return GAP;
  if (prev === undefined) return next / 2;
  if (next === undefined) return prev + GAP;
  return (prev + next) / 2;
}
