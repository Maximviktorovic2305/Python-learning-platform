import type { SnakePose } from "./motion";

type Droplet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  radius: number;
};

export function createVenomReaction() {
  let active = false;
  let opening = 0;
  let elapsed = 0;
  let nextBurst = 0.18;
  let droplets: Droplet[] = [];
  let seed = 17;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  return {
    get opening() {
      return opening;
    },
    get droplets(): readonly Readonly<Droplet>[] {
      return droplets;
    },
    setActive(value: boolean, still = false) {
      if (value !== active) {
        active = value;
        elapsed = 0;
        nextBurst = 0.18;
      }
      if (still) {
        opening = active ? 1 : 0;
        droplets = [];
      }
    },
    advance(delta: number, head: SnakePose, tip: number, scale: number) {
      const step = Math.max(0, Math.min(delta, 0.05));
      opening += ((active ? 1 : 0) - opening) * (1 - Math.exp(-step * 13));
      if (opening < 0.001) opening = 0;
      elapsed += step;
      if (active && elapsed >= nextBurst) {
        nextBurst += 1.6;
        for (let index = 0; index < 18; index++) {
          const side = index % 2 === 0 ? -1 : 1;
          const angle = head.angle + side * (0.08 + random() * 0.3);
          const speed = (85 + random() * 135) * scale;
          const forward = tip + 12 * scale;
          const lateral = side * 6 * scale;
          droplets.push({
            x:
              head.x +
              Math.cos(head.angle) * forward -
              Math.sin(head.angle) * lateral,
            y:
              head.y +
              Math.sin(head.angle) * forward +
              Math.cos(head.angle) * lateral,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            age: 0,
            lifetime: 0.45 + random() * 0.45,
            radius: (1 + random() * 1.7) * scale,
          });
        }
      }
      droplets = droplets.filter((drop) => {
        drop.age += step;
        drop.vy += 160 * scale * step;
        drop.x += drop.vx * step;
        drop.y += drop.vy * step;
        return drop.age < drop.lifetime;
      });
    },
  };
}

export function drawVenomMouth(
  context: CanvasRenderingContext2D,
  tip: number,
  scale: number,
  opening: number,
) {
  if (opening <= 0) return;
  context.save();
  context.translate(tip - 8 * scale, 0);
  context.scale(scale, scale);
  context.globalAlpha = Math.min(1, opening * 3);
  // A wet mouth between the upper snout and a small, lowered green jaw.
  const mouth = context.createLinearGradient(0, -12, 0, 12);
  mouth.addColorStop(0, "#180c0f");
  mouth.addColorStop(0.55, "#482129");
  mouth.addColorStop(1, "#794238");
  context.fillStyle = mouth;
  context.beginPath();
  context.ellipse(5, 0, 16 * opening, 13 * opening, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#759143";
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(
    7,
    0,
    16 * opening,
    13 * opening,
    0,
    -Math.PI / 2,
    Math.PI / 2,
  );
  context.stroke();

  for (const side of [-1, 1]) {
    context.save();
    context.scale(1, side);
    context.translate(0, 7 * opening);
    const ivory = context.createLinearGradient(0, 0, 21, 4);
    ivory.addColorStop(0, "#b9b49c");
    ivory.addColorStop(0.35, "#fffdef");
    ivory.addColorStop(1, "#d8dec2");
    context.fillStyle = ivory;
    context.shadowColor = "rgb(0 0 0 / 0.4)";
    context.shadowBlur = 2;
    context.beginPath();
    context.moveTo(-1, -3);
    context.bezierCurveTo(9 * opening, -4, 19 * opening, -1, 23 * opening, -2);
    context.bezierCurveTo(18 * opening, 4, 8 * opening, 5, -1, 2);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "rgb(185 223 86 / 0.85)";
    context.beginPath();
    context.ellipse(22 * opening, -1, 2, 1.6, -0.3, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.restore();
}

export function drawVenomDroplets(
  context: CanvasRenderingContext2D,
  droplets: ReturnType<typeof createVenomReaction>["droplets"],
) {
  context.save();
  for (const drop of droplets) {
    const opacity = Math.min(1, (1 - drop.age / drop.lifetime) * 2);
    context.save();
    context.translate(drop.x, drop.y);
    context.rotate(Math.atan2(drop.vy, drop.vx));
    context.globalAlpha = opacity * 0.85;
    context.fillStyle = "#b7d95b";
    context.strokeStyle = "rgb(183 217 91 / 0.35)";
    context.lineWidth = drop.radius * 0.8;
    context.beginPath();
    context.moveTo(-drop.radius * 3, 0);
    context.lineTo(0, 0);
    context.stroke();
    context.beginPath();
    context.ellipse(0, 0, drop.radius * 1.5, drop.radius, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgb(250 255 214 / 0.8)";
    context.beginPath();
    context.ellipse(
      0,
      -drop.radius * 0.35,
      drop.radius * 0.65,
      drop.radius * 0.3,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
  }
  context.restore();
}
