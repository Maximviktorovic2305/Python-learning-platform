export type SnakePose = Readonly<{ x: number; y: number; angle: number }>;
type Point = Readonly<{ x: number; y: number }>;
type PathPoint = Point & Readonly<{ distance: number }>;

const TAU = Math.PI * 2;
const PATH_SAMPLES = 1800;
const SIMULATION_STEP = 1 / 120;
export const BODY_SEGMENTS = 88;

function measure(points: readonly Point[]): PathPoint[] {
  let distance = 0;
  return points.map((point, index) => {
    const previous = points[index - 1];
    if (previous)
      distance += Math.hypot(point.x - previous.x, point.y - previous.y);
    return { ...point, distance };
  });
}

function pointAt(path: readonly PathPoint[], distance: number): Point {
  const length = path.at(-1)?.distance ?? 1;
  const offset = ((distance % length) + length) % length;
  let low = 0;
  let high = path.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((path[middle]?.distance ?? 0) < offset) low = middle + 1;
    else high = middle;
  }
  const after = path[low];
  const before = path[Math.max(0, low - 1)];
  if (!after || !before) return { x: 0, y: 0 };
  const fraction =
    (offset - before.distance) / (after.distance - before.distance || 1);
  return {
    x: before.x + (after.x - before.x) * fraction,
    y: before.y + (after.y - before.y) * fraction,
  };
}

function directionAt(
  path: readonly PathPoint[],
  distance: number,
  span: number,
): number {
  const before = pointAt(path, distance - span);
  const after = pointAt(path, distance + span);
  return Math.atan2(after.y - before.y, after.x - before.x);
}

function angleDifference(after: number, before: number): number {
  return Math.atan2(Math.sin(after - before), Math.cos(after - before));
}

function makePath(width: number, height: number, scale: number): PathPoint[] {
  // Broad corners give the rigid head room to turn, including on tall phones.
  const inset = 130 * scale;
  const radiusX = Math.max(1, width / 2 - inset);
  const radiusY = Math.max(1, height / 2 - inset);
  const rounded = (value: number) =>
    Math.sign(value) * Math.abs(value) ** (2 / 3.5);
  const guide = measure(
    Array.from({ length: PATH_SAMPLES + 1 }, (_, index) => {
      const phase = (index / PATH_SAMPLES) * TAU - 0.8;
      return {
        x: width / 2 + radiusX * rounded(Math.cos(phase)),
        y: height / 2 + radiusY * rounded(Math.sin(phase)),
      };
    }),
  );
  const length = guide.at(-1)?.distance ?? 1;
  const waves = Math.max(3, Math.round(length / (320 * scale)));
  const span = 24 * scale;
  // Put the undulation into the head's route. Every body section then follows
  // that same route at a fixed arc distance, rather than sliding sideways.
  const points = Array.from({ length: PATH_SAMPLES + 1 }, (_, index) => {
    const distance = (index / PATH_SAMPLES) * length;
    const center = pointAt(guide, distance);
    const angle = directionAt(guide, distance, span);
    const bend = angleDifference(
      directionAt(guide, distance + span, span),
      directionAt(guide, distance - span, span),
    );
    const amplitude = (22 * scale) / (1 + (bend * 2) ** 2);
    const phase = (distance / length) * TAU;
    const wave =
      amplitude *
      (Math.sin(phase * waves) + 0.15 * Math.sin(phase * (waves - 1)));
    return {
      x: center.x - Math.sin(angle) * wave,
      y: center.y + Math.cos(angle) * wave,
    };
  });
  return measure(points);
}

export function createSnakeMotion(
  width: number,
  height: number,
  progress = 0,
  initialTime = 0,
) {
  const scale = Math.max(0.55, Math.min(1.1, width / 1250));
  const spacing = 5.5 * scale;
  const path = makePath(width, height, scale);
  const length = path.at(-1)?.distance ?? 1;
  const cruiseSpeed = width < 600 ? 42 : 68;
  let distance = progress * length;
  let time = initialTime;
  let speed = cruiseSpeed * 0.8;
  let pendingTime = 0;

  return {
    scale,
    spacing,
    get time() {
      return time;
    },
    get progress() {
      return distance / length;
    },
    advance(delta: number) {
      // A fixed clock keeps both acceleration and the pose independent of FPS.
      // Drop long stalls so returning to a tab never teleports the snake.
      pendingTime += Math.max(0, Math.min(delta, 0.1));
      while (pendingTime + 1e-10 >= SIMULATION_STEP) {
        pendingTime -= SIMULATION_STEP;
        time += SIMULATION_STEP;
        const lookAhead = 38 * scale;
        const turn = Math.abs(
          angleDifference(
            directionAt(path, distance + lookAhead, spacing * 2),
            directionAt(path, distance, spacing * 2),
          ),
        );
        const rhythm = 0.92 + 0.08 * Math.sin(time * 0.55);
        const targetSpeed = (cruiseSpeed * rhythm) / (1 + turn * 0.85);
        speed += (targetSpeed - speed) * (1 - Math.exp(-SIMULATION_STEP * 2));
        distance = (distance + speed * SIMULATION_STEP) % length;
      }
    },
    poses(): readonly SnakePose[] {
      return Array.from({ length: BODY_SEGMENTS }, (_, index) => {
        const offset = distance - index * spacing;
        return {
          ...pointAt(path, offset),
          angle: directionAt(path, offset, spacing * (index === 0 ? 2 : 1)),
        };
      });
    },
  };
}
