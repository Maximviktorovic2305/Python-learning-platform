type Point = Readonly<{ x: number; y: number }>;
type PathPoint = Point & Readonly<{ distance: number }>;
type BodyPoint = Point &
  Readonly<{ angle: number; radius: number; sourceX: number }>;
type SourceColumn = Readonly<{ center: number; radius: number }>;
type SnakeSprite = Readonly<{
  image: HTMLImageElement;
  columns: readonly SourceColumn[];
  bodyStart: number;
  bodyEnd: number;
  headTop: number;
  headBottom: number;
}>;

const TAU = Math.PI * 2;
const PATH_SAMPLES = 1600;
const BODY_SEGMENTS = 88;

function makePath(width: number, height: number): PathPoint[] {
  const path: PathPoint[] = [];
  let distance = 0;
  for (let index = 0; index <= PATH_SAMPLES; index++) {
    const phase = (index / PATH_SAMPLES) * TAU;
    const point = {
      x: width * (0.5 + 0.42 * Math.cos(phase - 0.3)),
      y: height * (0.5 + 0.455 * Math.sin((phase - 0.3) * 2)),
    };
    const previous = path.at(-1);
    if (previous)
      distance += Math.hypot(point.x - previous.x, point.y - previous.y);
    path.push({ ...point, distance });
  }
  return path;
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

function readSprite(image: HTMLImageElement): SnakeSprite | null {
  const buffer = document.createElement("canvas");
  buffer.width = image.naturalWidth;
  buffer.height = image.naturalHeight;
  const context = buffer.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, buffer.width, buffer.height);
  const bodyStart = Math.ceil(buffer.width * 0.005);
  const bodyEnd = Math.floor(buffer.width * 0.85);
  let headTop = buffer.height;
  let headBottom = 0;
  // Read alpha once to keep the original anatomical taper and neck width.
  const columns = Array.from({ length: buffer.width }, (_, x) => {
    let top = buffer.height;
    let bottom = 0;
    for (let y = 0; y < buffer.height; y++) {
      if ((data[(y * buffer.width + x) * 4 + 3] ?? 0) > 40) {
        top = Math.min(top, y);
        bottom = y;
      }
    }
    if (x >= bodyEnd && bottom > top) {
      headTop = Math.min(headTop, top);
      headBottom = Math.max(headBottom, bottom);
    }
    return bottom > top
      ? { center: (top + bottom) / 2, radius: (bottom - top) / 2 }
      : { center: buffer.height / 2, radius: 0 };
  });
  return { image, columns, bodyStart, bodyEnd, headTop, headBottom };
}

function bodyOutline(points: readonly BodyPoint[]): Path2D {
  const outline = new Path2D();
  for (const side of [-1, 1]) {
    const ordered = side === -1 ? points : points.toReversed();
    ordered.forEach((point, index) => {
      const x = point.x - Math.sin(point.angle) * point.radius * side;
      const y = point.y + Math.cos(point.angle) * point.radius * side;
      if (side === -1 && index === 0) outline.moveTo(x, y);
      else outline.lineTo(x, y);
    });
  }
  outline.closePath();
  return outline;
}

function drawBody(
  context: CanvasRenderingContext2D,
  points: readonly BodyPoint[],
  sprite: SnakeSprite,
  pixelScale: number,
  spacing: number,
  light: boolean,
) {
  const outline = bodyOutline(points);
  context.save();
  context.shadowColor = light ? "rgb(16 46 26 / 0.3)" : "rgb(0 0 0 / 0.55)";
  context.shadowBlur = spacing;
  context.shadowOffsetY = spacing * 0.4;
  context.fillStyle = "#587936";
  context.fill(outline);
  context.shadowColor = "transparent";
  context.clip(outline);
  const sourceStep = (sprite.bodyEnd - sprite.bodyStart) / (BODY_SEGMENTS - 1);
  for (let index = points.length - 1; index >= 0; index--) {
    const point = points[index];
    if (!point) continue;
    const center =
      sprite.columns[Math.round(point.sourceX)]?.center ??
      sprite.image.naturalHeight / 2;
    const sourceX = Math.max(0, point.sourceX - sourceStep * 0.8);
    const sourceWidth = Math.min(
      sourceStep * 1.6,
      sprite.image.naturalWidth - sourceX,
    );
    context.save();
    context.translate(point.x, point.y);
    context.rotate(point.angle);
    context.drawImage(
      sprite.image,
      sourceX,
      0,
      sourceWidth,
      sprite.image.naturalHeight,
      -spacing * 0.8,
      -center * pixelScale,
      spacing * 1.6,
      sprite.image.naturalHeight * pixelScale,
    );
    context.restore();
  }
  context.restore();
}

function drawHead(
  context: CanvasRenderingContext2D,
  head: BodyPoint,
  sprite: SnakeSprite,
  pixelScale: number,
  spacing: number,
  time: number,
) {
  context.save();
  context.translate(head.x, head.y);
  context.rotate(head.angle);
  const center =
    sprite.columns[sprite.bodyEnd]?.center ?? sprite.image.naturalHeight / 2;
  const overlap = spacing;
  const sourceX = sprite.bodyEnd - overlap / pixelScale;
  const sourceWidth = sprite.image.naturalWidth - sourceX;
  const height = sprite.headBottom - sprite.headTop + 2;
  const tip = (sprite.image.naturalWidth - sprite.bodyEnd) * pixelScale;
  const tongue = Math.max(0, Math.sin(time * 2.2) - 0.75) / 0.25;
  if (tongue > 0) {
    context.strokeStyle = "#a46978";
    context.lineWidth = spacing * 0.16;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(tip - spacing, 0);
    context.lineTo(tip + spacing * 2.5 * tongue, 0);
    context.lineTo(tip + spacing * 3.3 * tongue, -spacing * 0.6 * tongue);
    context.moveTo(tip + spacing * 2.5 * tongue, 0);
    context.lineTo(tip + spacing * 3.3 * tongue, spacing * 0.6 * tongue);
    context.stroke();
  }
  context.drawImage(
    sprite.image,
    sourceX,
    sprite.headTop - 1,
    sourceWidth,
    height,
    -overlap,
    (sprite.headTop - 1 - center) * pixelScale,
    sourceWidth * pixelScale,
    height * pixelScale,
  );
  context.restore();
}

function drawSnake(
  context: CanvasRenderingContext2D,
  path: readonly PathPoint[],
  distance: number,
  time: number,
  scale: number,
  light: boolean,
  sprite: SnakeSprite,
) {
  const spacing = 5.5 * scale;
  const pixelScale =
    (spacing * (BODY_SEGMENTS - 1)) / (sprite.bodyEnd - sprite.bodyStart);
  const centers = Array.from({ length: BODY_SEGMENTS }, (_, index) => {
    const offset = distance - index * spacing;
    const point = pointAt(path, offset);
    const ahead = pointAt(path, offset + 2);
    const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x);
    const wave =
      Math.sin(index * 0.18 - time * 2.3) *
      7 *
      scale *
      Math.sin((index / BODY_SEGMENTS) * Math.PI);
    return {
      x: point.x - Math.sin(angle) * wave,
      y: point.y + Math.cos(angle) * wave,
    };
  });
  const points: BodyPoint[] = centers.map((point, index) => {
    const ahead = centers[Math.max(0, index - 1)];
    const behind = centers[Math.min(centers.length - 1, index + 1)];
    const sourceX =
      sprite.bodyEnd -
      (index / (BODY_SEGMENTS - 1)) * (sprite.bodyEnd - sprite.bodyStart);
    return {
      ...point,
      sourceX,
      angle:
        ahead && behind
          ? Math.atan2(ahead.y - behind.y, ahead.x - behind.x)
          : 0,
      radius: Math.max(
        0.6 * scale,
        (sprite.columns[Math.round(sourceX)]?.radius ?? 0) * pixelScale,
      ),
    };
  });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  drawBody(context, points, sprite, pixelScale, spacing, light);
  const head = points[0];
  if (head) drawHead(context, head, sprite, pixelScale, spacing, time);
}

export function startSnakeAnimation(canvas: HTMLCanvasElement): {
  dispose: () => void;
  setPaused: (paused: boolean) => void;
} {
  const context = canvas.getContext("2d");
  const container = canvas.closest<HTMLElement>(".landing-page");
  const boundary = document.getElementById("landing-metrics");
  if (!context || !container || !boundary)
    return { dispose: () => {}, setPaused: () => {} };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0;
  let height = 0;
  let scale = 1;
  let path: PathPoint[] = [];
  let distance = 0;
  let time = 0;
  let lastFrame = 0;
  let frame: number | null = null;
  let paused = false;
  let visible = true;
  let sprite: SnakeSprite | null = null;
  let light = document.documentElement.dataset.theme === "light";

  function draw() {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    if (sprite) drawSnake(context, path, distance, time, scale, light, sprite);
  }
  function tick(timestamp: number) {
    const delta = lastFrame
      ? Math.min((timestamp - lastFrame) / 1000, 0.05)
      : 0;
    lastFrame = timestamp;
    time += delta;
    distance += delta * (width < 600 ? 42 : 68);
    draw();
    frame = window.requestAnimationFrame(tick);
  }
  function synchronize() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
    draw();
    if (
      sprite &&
      !paused &&
      visible &&
      !reducedMotion.matches &&
      !document.hidden
    )
      frame = window.requestAnimationFrame(tick);
  }
  function resize() {
    if (!container || !boundary) return;
    const oldLength = path.at(-1)?.distance ?? 0;
    const progress = oldLength ? distance / oldLength : 0;
    width = container.clientWidth;
    height = Math.max(
      1,
      boundary.getBoundingClientRect().bottom -
        container.getBoundingClientRect().top,
    );
    canvas.style.height = `${height}px`;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    scale = Math.max(0.55, Math.min(1.1, width / 1250));
    path = makePath(width, height);
    distance = progress * (path.at(-1)?.distance ?? 0);
    synchronize();
  }
  const image = new Image();
  image.onload = () => {
    sprite = readSprite(image);
    synchronize();
  };
  image.src = "/green-python.png";
  const themeObserver = new MutationObserver(() => {
    light = document.documentElement.dataset.theme === "light";
    draw();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resizeObserver.observe(boundary);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    const next = entry?.isIntersecting ?? false;
    if (next !== visible) {
      visible = next;
      synchronize();
    }
  });
  visibilityObserver.observe(canvas);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", synchronize);
  reducedMotion.addEventListener("change", synchronize);
  resize();
  return {
    setPaused(value) {
      paused = value;
      synchronize();
    },
    dispose() {
      if (frame !== null) window.cancelAnimationFrame(frame);
      image.onload = null;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", synchronize);
      reducedMotion.removeEventListener("change", synchronize);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    },
  };
}
