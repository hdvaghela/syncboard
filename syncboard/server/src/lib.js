// Shared ordering helper. Tasks use fractional positions so that moving a card is a
// single-document write (no need to renumber every card in the column).
export const GAP = 1024;
export const MIN_GAP = 1e-4;

/** `positions` = ascending positions of the OTHER cards in the target column. */
export function computePosition(positions, index) {
  const i = Math.max(0, Math.min(index, positions.length));
  const prev = positions[i - 1];
  const next = positions[i];
  if (prev === undefined && next === undefined) return GAP;
  if (prev === undefined) return next / 2;
  if (next === undefined) return prev + GAP;
  return (prev + next) / 2;
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
