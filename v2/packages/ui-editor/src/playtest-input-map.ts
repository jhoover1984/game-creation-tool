export interface PlaytestDirectionalInput {
  moveX: number;
  moveY: number;
}

const NEGATIVE_X_KEYS = new Set(['ArrowLeft', 'a', 'A']);
const POSITIVE_X_KEYS = new Set(['ArrowRight', 'd', 'D']);
const NEGATIVE_Y_KEYS = new Set(['ArrowUp', 'w', 'W']);
const POSITIVE_Y_KEYS = new Set(['ArrowDown', 's', 'S']);

export function isPlaytestMovementKey(key: string): boolean {
  return (
    NEGATIVE_X_KEYS.has(key)
    || POSITIVE_X_KEYS.has(key)
    || NEGATIVE_Y_KEYS.has(key)
    || POSITIVE_Y_KEYS.has(key)
  );
}

export function mapPlaytestMovementVector(keys: ReadonlySet<string>): PlaytestDirectionalInput {
  let moveX = 0;
  let moveY = 0;

  if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) moveX -= 1;
  if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) moveX += 1;
  if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) moveY -= 1;
  if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) moveY += 1;

  if (moveX > 1) moveX = 1;
  if (moveX < -1) moveX = -1;
  if (moveY > 1) moveY = 1;
  if (moveY < -1) moveY = -1;

  return { moveX, moveY };
}
