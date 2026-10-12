import { expect, test } from "@playwright/test";
import {
  createSnakeMotion,
  type SnakePose,
} from "../src/widgets/landing-snake/motion";

const separation = (a: SnakePose, b: SnakePose) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rotation = (a: SnakePose, b: SnakePose) =>
  Math.abs(
    Math.atan2(Math.sin(a.angle - b.angle), Math.cos(a.angle - b.angle)),
  );

test("motion is identical at 30, 60 and 120 FPS and ignores long tab stalls", () => {
  const motions = [30, 60, 120].map((fps) => {
    const motion = createSnakeMotion(1440, 900);
    for (let frame = 0; frame < fps * 20; frame++) motion.advance(1 / fps);
    return motion;
  });
  const reference = motions[0]!;
  for (const motion of motions.slice(1)) {
    expect(motion.time).toBeCloseTo(reference.time, 8);
    expect(motion.poses()).toEqual(reference.poses());
  }
  const before = reference.poses()[0]!;
  reference.advance(60);
  expect(separation(before, reference.poses()[0]!)).toBeLessThan(7);
});

test("body follows the head's earlier trail without sliding sideways", () => {
  const motion = createSnakeMotion(1440, 900);
  const trail: { pose: SnakePose; distance: number }[] = [
    { pose: motion.poses()[0]!, distance: 0 },
  ];
  let travelled = 0;
  let maximumError = 0;
  for (let frame = 0; frame < 30 * 30; frame++) {
    motion.advance(1 / 30);
    const poses = motion.poses();
    const head = poses[0]!;
    travelled += separation(head, trail.at(-1)!.pose);
    trail.push({ pose: head, distance: travelled });
    for (const index of [1, 30, poses.length - 1]) {
      const target = travelled - index * motion.spacing;
      if (target <= 0) continue;
      const afterIndex = trail.findIndex((sample) => sample.distance >= target);
      const before = trail[afterIndex - 1]!;
      const after = trail[afterIndex]!;
      const fraction =
        (target - before.distance) / (after.distance - before.distance);
      const earlierHead = {
        x: before.pose.x + (after.pose.x - before.pose.x) * fraction,
        y: before.pose.y + (after.pose.y - before.pose.y) * fraction,
        angle: 0,
      };
      maximumError = Math.max(
        maximumError,
        separation(poses[index]!, earlierHead),
      );
    }
  }
  expect(travelled).toBeGreaterThan(motion.spacing * 87);
  expect(maximumError).toBeLessThan(0.1);
});

test("the complete route preserves body length, smooth bends and screen bounds", () => {
  for (const [width, height] of [
    [320, 1266],
    [390, 1266],
    [768, 1100],
    [1440, 900],
    [2560, 900],
  ] as const) {
    let minimumSpacing = Infinity;
    let maximumSpacing = 0;
    let maximumRotation = 0;
    let minimumClearance = Infinity;
    for (let phase = 0; phase < 100; phase++) {
      const motion = createSnakeMotion(width, height, phase / 100);
      const poses = motion.poses();
      for (const [index, pose] of poses.entries()) {
        const previous = poses[index - 1];
        if (previous) {
          const spacing = separation(previous, pose) / motion.spacing;
          minimumSpacing = Math.min(minimumSpacing, spacing);
          maximumSpacing = Math.max(maximumSpacing, spacing);
          maximumRotation = Math.max(maximumRotation, rotation(previous, pose));
        }
        const extent = index === 0 ? 100 * motion.scale : 22 * motion.scale;
        minimumClearance = Math.min(
          minimumClearance,
          pose.x - extent,
          width - pose.x - extent,
          pose.y - extent,
          height - pose.y - extent,
        );
      }
    }
    expect(minimumSpacing, `body compression at ${width}px`).toBeGreaterThan(
      0.99,
    );
    expect(maximumSpacing, `body stretching at ${width}px`).toBeLessThanOrEqual(
      1.000001,
    );
    expect(maximumRotation, `bend at ${width}px`).toBeLessThan(0.2);
    expect(minimumClearance, `edge clearance at ${width}px`).toBeGreaterThan(0);
  }
});

test("the loop closes without a position or heading jump", () => {
  const start = createSnakeMotion(390, 1266, 0).poses();
  const end = createSnakeMotion(390, 1266, 1).poses();
  for (const [index, pose] of start.entries()) {
    expect(separation(pose, end[index]!)).toBeLessThan(1e-8);
    expect(rotation(pose, end[index]!)).toBeLessThan(1e-8);
  }
  const before = createSnakeMotion(390, 1266, 0.99999).poses();
  const after = createSnakeMotion(390, 1266, 0.00001).poses();
  for (const [index, pose] of before.entries()) {
    expect(separation(pose, after[index]!)).toBeLessThan(0.1);
    expect(rotation(pose, after[index]!)).toBeLessThan(0.01);
  }
});
