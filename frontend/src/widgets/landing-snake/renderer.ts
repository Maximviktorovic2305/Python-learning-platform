import { BODY_SEGMENTS, createSnakeMotion, type SnakePose } from "./motion";
import {
  createVenomReaction,
  drawVenomDroplets,
  drawVenomMouth,
} from "./reaction";

type BodyPoint = SnakePose & Readonly<{ radius: number; sourceX: number }>;
type SourceColumn = Readonly<{ center: number; radius: number }>;
type SnakeSprite = Readonly<{
  image: HTMLImageElement;
  columns: readonly SourceColumn[];
  bodyStart: number;
  bodyEnd: number;
  headTop: number;
  headBottom: number;
}>;

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
  opening: number,
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
  if (tongue > 0 && opening < 0.1) {
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
  drawVenomMouth(context, tip, spacing / 5.5, opening);
  context.restore();
}

function drawSnake(
  context: CanvasRenderingContext2D,
  motion: ReturnType<typeof createSnakeMotion>,
  light: boolean,
  sprite: SnakeSprite,
  reaction: ReturnType<typeof createVenomReaction>,
): readonly BodyPoint[] {
  const { spacing, scale, time } = motion;
  const pixelScale =
    (spacing * (BODY_SEGMENTS - 1)) / (sprite.bodyEnd - sprite.bodyStart);
  const points: BodyPoint[] = motion.poses().map((point, index) => {
    const sourceX =
      sprite.bodyEnd -
      (index / (BODY_SEGMENTS - 1)) * (sprite.bodyEnd - sprite.bodyStart);
    return {
      ...point,
      sourceX,
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
  if (head)
    drawHead(
      context,
      head,
      sprite,
      pixelScale,
      spacing,
      time,
      reaction.opening,
    );
  drawVenomDroplets(context, reaction.droplets);
  return points;
}

function hitsSnake(
  pointer: Readonly<{ x: number; y: number }>,
  points: readonly BodyPoint[],
  sprite: SnakeSprite,
  scale: number,
): boolean {
  const head = points[0];
  if (!head) return false;
  const pixelScale =
    (5.5 * scale * (BODY_SEGMENTS - 1)) / (sprite.bodyEnd - sprite.bodyStart);
  const dx = pointer.x - head.x;
  const dy = pointer.y - head.y;
  const localX = dx * Math.cos(head.angle) + dy * Math.sin(head.angle);
  const localY = -dx * Math.sin(head.angle) + dy * Math.cos(head.angle);
  const sourceX = Math.round(sprite.bodyEnd + localX / pixelScale);
  const column = sprite.columns[sourceX];
  const neckCenter = sprite.columns[sprite.bodyEnd]?.center ?? 0;
  if (
    sourceX >= sprite.bodyEnd &&
    column &&
    column.radius > 0 &&
    Math.abs(localY - (column.center - neckCenter) * pixelScale) <=
      column.radius * pixelScale + 2 * scale
  )
    return true;
  for (let index = 1; index < points.length; index++) {
    const before = points[index - 1];
    const after = points[index];
    if (!before || !after) continue;
    const x = after.x - before.x;
    const y = after.y - before.y;
    const fraction = Math.max(
      0,
      Math.min(
        1,
        ((pointer.x - before.x) * x + (pointer.y - before.y) * y) /
          (x * x + y * y || 1),
      ),
    );
    const radius = before.radius + (after.radius - before.radius) * fraction;
    if (
      Math.hypot(
        pointer.x - before.x - x * fraction,
        pointer.y - before.y - y * fraction,
      ) <=
      radius + 2 * scale
    )
      return true;
  }
  return false;
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
  let motion: ReturnType<typeof createSnakeMotion> | null = null;
  let pixelRatio = 0;
  let lastFrame = 0;
  let frame: number | null = null;
  let paused = false;
  let visible = true;
  let sprite: SnakeSprite | null = null;
  let points: readonly BodyPoint[] = [];
  let pointer: Readonly<{ x: number; y: number }> | null = null;
  let hovered = false;
  const reaction = createVenomReaction();
  let light = document.documentElement.dataset.theme === "light";

  function draw() {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    if (sprite && motion)
      points = drawSnake(context, motion, light, sprite, reaction);
  }
  function updateHover() {
    if (!sprite || !motion) return;
    const bounds = canvas.getBoundingClientRect();
    const next =
      pointer !== null &&
      hitsSnake(
        { x: pointer.x - bounds.left, y: pointer.y - bounds.top },
        points,
        sprite,
        motion.scale,
      );
    if (next === hovered) return;
    hovered = next;
    reaction.setActive(hovered, paused || reducedMotion.matches);
    canvas.dataset.hovered = String(hovered);
  }
  function movePointer(event: PointerEvent) {
    const interactive =
      event.target instanceof Element &&
      event.target.closest(
        'a, button, input, select, textarea, [role="button"]',
      );
    pointer =
      event.pointerType === "mouse" && !interactive
        ? { x: event.clientX, y: event.clientY }
        : null;
    updateHover();
    draw();
  }
  function clearPointer() {
    pointer = null;
    updateHover();
    draw();
  }
  function tick(timestamp: number) {
    const delta = lastFrame ? (timestamp - lastFrame) / 1000 : 0;
    lastFrame = timestamp;
    updateHover();
    if (!hovered) motion?.advance(delta);
    const head = points[0];
    if (head && sprite && motion) {
      const tip =
        ((sprite.image.naturalWidth - sprite.bodyEnd) *
          motion.spacing *
          (BODY_SEGMENTS - 1)) /
        (sprite.bodyEnd - sprite.bodyStart);
      reaction.advance(delta, head, tip, motion.scale);
    }
    draw();
    frame = window.requestAnimationFrame(tick);
  }
  function synchronize() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
    if (document.hidden) clearPointer();
    reaction.setActive(hovered, paused || reducedMotion.matches);
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
    const nextWidth = container.clientWidth;
    const nextHeight = Math.max(
      1,
      boundary.getBoundingClientRect().bottom -
        container.getBoundingClientRect().top,
    );
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (nextWidth === width && nextHeight === height && ratio === pixelRatio)
      return;
    const geometryChanged = nextWidth !== width || nextHeight !== height;
    width = nextWidth;
    height = nextHeight;
    pixelRatio = ratio;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (geometryChanged)
      motion = createSnakeMotion(width, height, motion?.progress, motion?.time);
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
  container.addEventListener("pointermove", movePointer, { passive: true });
  container.addEventListener("pointerleave", clearPointer);
  container.addEventListener("pointercancel", clearPointer);
  window.addEventListener("blur", clearPointer);
  window.addEventListener("scroll", clearPointer, { passive: true });
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
      container?.removeEventListener("pointermove", movePointer);
      container?.removeEventListener("pointerleave", clearPointer);
      container?.removeEventListener("pointercancel", clearPointer);
      window.removeEventListener("blur", clearPointer);
      window.removeEventListener("scroll", clearPointer);
      delete canvas.dataset.hovered;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", synchronize);
      reducedMotion.removeEventListener("change", synchronize);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    },
  };
}
