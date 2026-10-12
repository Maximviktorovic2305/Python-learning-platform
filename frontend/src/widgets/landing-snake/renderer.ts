type Point = Readonly<{ x: number; y: number }>;
type PathPoint = Point & Readonly<{ distance: number }>;
type BodyPoint = Point & Readonly<{ angle: number; radius: number }>;

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
  scale: number,
  light: boolean,
) {
  const outline = bodyOutline(points);
  context.save();
  context.shadowColor = light ? "rgb(16 46 26 / 0.28)" : "rgb(0 0 0 / 0.5)";
  context.shadowBlur = 9 * scale;
  context.shadowOffsetY = 4 * scale;
  context.fillStyle = "#368548";
  context.fill(outline);
  context.shadowColor = "transparent";
  context.clip(outline);

  // Shade one continuous silhouette; individual joints have no visible seams.
  for (let index = points.length - 1; index >= 0; index--) {
    const point = points[index];
    const ahead = points[Math.max(0, index - 1)];
    if (!point || !ahead) continue;
    context.save();
    context.translate(point.x, point.y);
    context.rotate(point.angle);
    const skin = context.createLinearGradient(
      0,
      -point.radius,
      0,
      point.radius,
    );
    skin.addColorStop(0, "#173f2c");
    skin.addColorStop(0.2, "#479b4d");
    skin.addColorStop(0.38, "#79b956");
    skin.addColorStop(0.42, "#acd17a");
    skin.addColorStop(0.46, "#86bd5a");
    skin.addColorStop(0.65, "#55a44a");
    skin.addColorStop(0.88, "#27683c");
    skin.addColorStop(1, "#b1be70");
    context.strokeStyle = skin;
    context.lineWidth = point.radius * 2 + 2 * scale;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-2 * scale, 0);
    context.lineTo(
      Math.hypot(ahead.x - point.x, ahead.y - point.y) + 2 * scale,
      0,
    );
    context.stroke();
    context.restore();
  }

  for (let index = points.length - 1; index > 0; index--) {
    const point = points[index];
    if (!point) continue;
    context.save();
    context.translate(point.x, point.y);
    context.rotate(point.angle);
    const radius = point.radius;
    if (index % 9 === 0) {
      for (const side of [-1, 1]) {
        context.fillStyle = "rgb(30 77 36 / 0.3)";
        context.beginPath();
        context.ellipse(
          0,
          side * radius * 0.58,
          9 * scale,
          radius * 0.36,
          side * 0.4,
          0,
          TAU,
        );
        context.fill();
        context.fillStyle = "rgb(197 209 110 / 0.24)";
        context.beginPath();
        context.ellipse(
          2 * scale,
          side * radius * 0.58,
          4 * scale,
          radius * 0.15,
          side * 0.4,
          0,
          TAU,
        );
        context.fill();
      }
    }
    // Staggered, individually shaded scales follow the body's orientation.
    for (let row = -3; row <= 3; row++) {
      const y = (row / 3.8) * radius;
      const x = (row % 2 ? 1.7 : -0.3) * scale;
      const size = Math.max(0.5, Math.min(2.6 * scale, radius * 0.2));
      const fleck = Math.sin(index * 12.9898 + row * 78.233);
      context.fillStyle =
        fleck > 0.96
          ? "rgb(220 230 170 / 0.72)"
          : `rgb(25 71 38 / ${0.04 + (fleck + 1) * 0.05})`;
      context.strokeStyle = "rgb(18 60 32 / 0.38)";
      context.lineWidth = 0.45 * scale;
      context.beginPath();
      context.moveTo(x - size, y);
      context.quadraticCurveTo(x, y - size * 0.75, x + size, y);
      context.quadraticCurveTo(x + size * 0.7, y + size, x, y + size * 1.2);
      context.quadraticCurveTo(x - size * 0.7, y + size, x - size, y);
      context.fill();
      context.stroke();
      context.strokeStyle = "rgb(217 242 173 / 0.32)";
      context.beginPath();
      context.moveTo(x - size * 0.7, y);
      context.quadraticCurveTo(x, y - size * 0.45, x + size * 0.7, y);
      context.stroke();
    }
    context.restore();
  }
  context.restore();
}

function drawHead(
  context: CanvasRenderingContext2D,
  head: BodyPoint,
  scale: number,
  time: number,
) {
  context.save();
  context.translate(head.x, head.y);
  context.rotate(head.angle);
  context.scale(scale, scale);
  const tongue = Math.max(0, Math.sin(time * 2.2) - 0.7) / 0.3;
  if (tongue > 0) {
    context.strokeStyle = "#b47580";
    context.lineWidth = 1.1;
    context.beginPath();
    context.moveTo(23, 0);
    context.lineTo(23 + 17 * tongue, 0);
    context.lineTo(23 + 23 * tongue, -3 * tongue);
    context.moveTo(23 + 17 * tongue, 0);
    context.lineTo(23 + 23 * tongue, 3 * tongue);
    context.stroke();
  }
  const skin = context.createLinearGradient(0, -18, 0, 18);
  skin.addColorStop(0, "#274d30");
  skin.addColorStop(0.25, "#76af58");
  skin.addColorStop(0.5, "#96c56c");
  skin.addColorStop(0.8, "#478540");
  skin.addColorStop(1, "#d0ce8c");
  context.fillStyle = skin;
  context.strokeStyle = "#274731";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(-15, -9);
  context.bezierCurveTo(-11, -20, 0, -19, 14, -11);
  context.bezierCurveTo(19, -8, 27, -7, 28, -3);
  context.quadraticCurveTo(30, 0, 28, 3);
  context.bezierCurveTo(27, 7, 19, 8, 14, 11);
  context.bezierCurveTo(0, 19, -11, 20, -15, 9);
  context.closePath();
  context.fill();
  context.stroke();

  context.save();
  context.clip();
  const highlight = context.createRadialGradient(-2, -5, 1, 0, -3, 21);
  highlight.addColorStop(0, "rgb(223 244 183 / 0.3)");
  highlight.addColorStop(1, "rgb(223 244 183 / 0)");
  context.fillStyle = highlight;
  context.fillRect(-20, -20, 55, 40);
  context.restore();

  context.strokeStyle = "rgb(31 75 35 / 0.46)";
  context.lineWidth = 0.6;
  for (let x = -10; x < 22; x += 5) {
    for (let y = -6; y <= 6; y += 6) {
      context.beginPath();
      context.ellipse(x + (y === 0 ? 2 : 0), y, 3.1, 2.7, 0, 0, TAU);
      context.stroke();
    }
  }
  for (const side of [-1, 1]) {
    context.strokeStyle = "#c4cf8d";
    context.lineWidth = 2.4;
    context.beginPath();
    context.moveTo(-7, side * 13);
    context.quadraticCurveTo(10, side * 9, 26, side * 4);
    context.stroke();
    context.strokeStyle = "#254a32";
    context.lineWidth = 0.7;
    context.stroke();
    for (let pit = 0; pit < 4; pit++) {
      context.fillStyle = "#48603d";
      context.beginPath();
      context.ellipse(
        13 + pit * 3.5,
        side * (7 - pit * 0.75),
        0.85,
        1.1,
        side * 0.3,
        0,
        TAU,
      );
      context.fill();
    }
    context.fillStyle = "#203327";
    context.beginPath();
    context.ellipse(8, side * 10.8, 4.1, 3.1, side * -0.3, 0, TAU);
    context.fill();
    context.fillStyle = "#d5c56c";
    context.beginPath();
    context.ellipse(8.5, side * 10.8, 2.6, 2.7, 0, 0, TAU);
    context.fill();
    context.fillStyle = "#0c1d16";
    context.beginPath();
    context.ellipse(8.7, side * 10.8, 0.8, 2.5, 0, 0, TAU);
    context.fill();
    context.fillStyle = "rgb(255 255 235 / 0.85)";
    context.beginPath();
    context.arc(7.8, side * 10.8 - 0.7, 0.65, 0, TAU);
    context.fill();
    context.fillStyle = "#244733";
    context.beginPath();
    context.ellipse(24, side * 3.8, 1.2, 0.7, 0, 0, TAU);
    context.fill();
  }
  context.restore();
}

function drawSnake(
  context: CanvasRenderingContext2D,
  path: readonly PathPoint[],
  distance: number,
  time: number,
  scale: number,
  light: boolean,
) {
  const spacing = 5.5 * scale;
  const centers = Array.from({ length: BODY_SEGMENTS }, (_, index) => {
    const offset = distance - index * spacing;
    const point = pointAt(path, offset);
    const ahead = pointAt(path, offset + 2);
    const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x);
    const wave =
      Math.sin(index * 0.19 - time * 2.6) *
      10 *
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
    const progress = index / (BODY_SEGMENTS - 1);
    const taper = Math.min(1, (1 - progress) * 2.6);
    return {
      ...point,
      angle:
        ahead && behind
          ? Math.atan2(ahead.y - behind.y, ahead.x - behind.x)
          : 0,
      radius:
        (0.7 + 14 * taper * (0.76 + 0.24 * Math.sin(progress * Math.PI))) *
        scale,
    };
  });
  context.lineJoin = "round";
  context.lineCap = "round";
  drawBody(context, points, scale, light);
  const head = points[0];
  if (head) drawHead(context, head, scale, time);
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
  let light = document.documentElement.dataset.theme === "light";

  function draw() {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    drawSnake(context, path, distance, time, scale, light);
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
    if (!paused && visible && !reducedMotion.matches && !document.hidden)
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
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", synchronize);
      reducedMotion.removeEventListener("change", synchronize);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    },
  };
}
