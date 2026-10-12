import { expect, test, type Page } from "@playwright/test";
import { createVenomReaction } from "../src/widgets/landing-snake/reaction";

async function bodyPoint(page: Page, fraction = 0.25) {
  return page
    .locator(".landing-snake")
    .evaluate((canvas: HTMLCanvasElement, fraction) => {
      const context = canvas.getContext("2d")!;
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      const points: { x: number; y: number }[] = [];
      for (let y = 0; y < canvas.height; y += 3) {
        for (let x = 0; x < canvas.width; x += 3) {
          const offset = (y * canvas.width + x) * 4;
          if (
            pixels[offset + 3]! > 230 &&
            pixels[offset + 1]! > pixels[offset]! * 1.04 &&
            pixels[offset + 1]! > pixels[offset + 2]! * 1.3
          )
            points.push({ x, y });
        }
      }
      if (!points.length) return null;
      points.sort((a, b) => a.x - b.x);
      const point = points[Math.floor(points.length * fraction)]!;
      const bounds = canvas.getBoundingClientRect();
      return {
        x: bounds.left + (point.x / canvas.width) * bounds.width,
        y: bounds.top + (point.y / canvas.height) * bounds.height,
      };
    }, fraction);
}

async function openLanding(page: Page) {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await expect.poll(() => bodyPoint(page)).not.toBeNull();
  return (await bodyPoint(page))!;
}

async function bodyPixels(page: Page, point: { x: number; y: number }) {
  return page
    .locator(".landing-snake")
    .evaluate((canvas: HTMLCanvasElement, point) => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = canvas.width / bounds.width;
      return Array.from(
        canvas
          .getContext("2d")!
          .getImageData(
            Math.round((point.x - bounds.left - 5) * ratio),
            Math.round((point.y - bounds.top - 5) * ratio),
            Math.round(10 * ratio),
            Math.round(10 * ratio),
          ).data,
      );
    }, point);
}

const wholeSnake = (page: Page) =>
  page
    .locator(".landing-snake")
    .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());

test("hover pauses the body while venom animates; leaving resumes crawling", async ({
  page,
}) => {
  const point = await openLanding(page);
  const snake = page.locator(".landing-snake");
  await page.mouse.move(point.x, point.y);
  await expect(snake).toHaveAttribute("data-hovered", "true");
  const body = await bodyPixels(page, point);
  const firstReaction = await wholeSnake(page);
  await page.waitForTimeout(400);
  expect(await bodyPixels(page, point)).toEqual(body);
  expect(await wholeSnake(page)).not.toEqual(firstReaction);
  await page.screenshot({ path: "../.local/snake-hover-tested.png" });
  await page.mouse.move(20, 450);
  await expect(snake).toHaveAttribute("data-hovered", "false");
  await expect.poll(() => bodyPixels(page, point)).not.toEqual(body);
  const head = (await bodyPoint(page, 0.98))!;
  await page.mouse.move(head.x, head.y);
  await expect(snake).toHaveAttribute("data-hovered", "true");
});

test("hover respects manual pause and leaves navigation clickable", async ({
  page,
}) => {
  await openLanding(page);
  await page.getByRole("button", { name: "Приостановить анимации" }).click();
  const point = (await bodyPoint(page))!;
  await page.mouse.move(point.x, point.y);
  await expect(page.locator(".landing-snake")).toHaveAttribute(
    "data-hovered",
    "true",
  );
  const still = await wholeSnake(page);
  await page.waitForTimeout(250);
  expect(await wholeSnake(page)).toEqual(still);
  await page.mouse.move(20, 450);
  const closed = await wholeSnake(page);
  await page.waitForTimeout(250);
  expect(await wholeSnake(page)).toEqual(closed);
  await page.getByRole("button", { name: "Продолжить анимации" }).click();
  await expect.poll(() => wholeSnake(page)).not.toEqual(closed);
  await page.getByRole("link", { name: "Начать свой путь" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.locator(".landing-snake")).toHaveCount(0);
});

test("reduced motion shows static fangs and ignores touch hover", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const point = await openLanding(page);
  const snake = page.locator(".landing-snake");
  const before = await wholeSnake(page);
  await page.mouse.move(point.x, point.y);
  await expect(snake).toHaveAttribute("data-hovered", "true");
  const still = await wholeSnake(page);
  expect(still).not.toEqual(before);
  await page.waitForTimeout(250);
  expect(await wholeSnake(page)).toEqual(still);
  await page.mouse.move(20, 450);
  await page.locator(".landing-page").dispatchEvent("pointermove", {
    pointerType: "touch",
    clientX: point.x,
    clientY: point.y,
  });
  await expect(snake).toHaveAttribute("data-hovered", "false");
  expect(await wholeSnake(page)).toEqual(before);
});

test("venom particles stay bounded, expire and stop spawning after hover", () => {
  const reaction = createVenomReaction();
  const head = { x: 100, y: 100, angle: 0 };
  reaction.setActive(true);
  let maximum = 0;
  for (let step = 0; step < 1200; step++) {
    reaction.advance(1 / 60, head, 85, 1);
    maximum = Math.max(maximum, reaction.droplets.length);
  }
  expect(maximum).toBe(18);
  reaction.setActive(false);
  for (let step = 0; step < 120; step++) reaction.advance(1 / 60, head, 85, 1);
  expect(reaction.droplets).toHaveLength(0);
  expect(reaction.opening).toBe(0);
});
