import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("privacy-choice-2026-10-13", "essential"),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({ status: 401, json: { detail: "anonymous" } }),
  );
});

test("all course sections and lesson stages fit phone, tablet and laptop", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/curriculum");
  for (const width of [320, 390, 768, 1024, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      // Follow the app's links. Replacing the document while WebKit is
      // prefetching produces unload-related fetch errors, unrelated to layout.
      if (!new URL(page.url()).pathname.endsWith("/curriculum")) {
        const navigation = page.getByRole("button", {
          name: "Навигация по урокам",
        });
        if (await navigation.isVisible()) await navigation.click();
        await page.locator('.lesson-sidebar > a[href="/curriculum"]').click();
      }
      await page.evaluate((value) => {
        localStorage.setItem("theme", value);
        document.documentElement.setAttribute("data-theme", value);
      }, theme);
      await expect(page.locator(".curriculum-level")).toHaveCount(4);
      await expect(page.locator(".topic-row:not(.unpublished)")).toHaveCount(
        50,
      );
      await expect(page.locator(".topic-row.unpublished")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page
        .locator('.topic-row[href="/learn/academy-asyncio-advanced"]')
        .click();
      const notice = page.getByRole("button", { name: "Понятно", exact: true });
      if (await notice.isVisible()) await notice.click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Продвинутое асинхронное программирование",
      );
      if (width <= 1100) {
        const toggle = page.getByRole("button", {
          name: "Навигация по урокам",
        });
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await expect(page.locator(".lesson-sidebar details")).toHaveCount(4);
        await expect(page.locator(".lesson-sidebar a.current")).toBeVisible();
        await toggle.click();
      } else {
        await expect(page.locator(".lesson-sidebar a.current")).toBeVisible();
      }
      for (const stage of [
        "Теория",
        "Примеры",
        "Практика",
        "Тест",
        "Закрепление",
      ]) {
        const tab = page.getByRole("tab", { name: stage, exact: true });
        await tab.click();
        await expect(tab).toHaveAttribute("aria-selected", "true");
        if (stage === "Примеры")
          await expect(page.locator(".examples-content section")).toHaveCount(
            4,
          );
        if (stage === "Практика") {
          await expect(page.locator(".exercise-selector button")).toHaveCount(
            2,
          );
          const input = page.getByLabel("Входные данные для input()");
          await expect(input).toHaveValue("мир python");
          await input.fill("новый ввод");
          await page.locator(".exercise-selector button").nth(1).click();
          await expect(input).toHaveValue("7");
          await page.locator(".editor").screenshot({
            path: `../.local/academy-editor-${width}-${theme}.png`,
          });
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${width} ${theme} ${stage}`,
        ).toBe(true);
      }
    }
  }
  expect(errors).toEqual([]);
});

test("stdin, SQLAlchemy, pytest and asyncio run in the browser", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/learn/academy-introduction?tab=practice");
  const notice = page.getByRole("button", { name: "Понятно", exact: true });
  if (await notice.isVisible()) await notice.click();
  const editor = page.getByLabel("Редактор Python");
  await page
    .getByLabel("Входные данные для input()")
    .fill("Мира\nвторая строка");
  await editor.fill("print(input())\nprint(input())");
  await page.getByRole("button", { name: "Запустить локально" }).click();
  await expect(page.locator(".editor-output pre").first()).toHaveText(
    "Мира\nвторая строка\n",
    { timeout: 50000 },
  );
  await page.getByLabel("Входные данные для input()").fill("строка\n");
  await editor.fill(
    "print(input())\ntry:\n    print(input())\nexcept EOFError:\n    print('EOF')",
  );
  await page.getByRole("button", { name: "Запустить локально" }).click();
  await expect(page.locator(".editor-output pre").first()).toHaveText(
    "строка\nEOF\n",
    { timeout: 50000 },
  );
  for (const slug of [
    "academy-sqlite",
    "academy-sqlalchemy-core",
    "academy-sqlalchemy-orm",
    "academy-pytest",
    "academy-pytest-fixtures",
    "academy-asyncio",
    "academy-asyncio-advanced",
  ]) {
    const response = await page.request.get(`/api/lessons/${slug}`);
    const lesson = await response.json();
    for (const index of [0, 2]) {
      const example = lesson.examples[index];
      await editor.fill(example.code);
      await page.getByRole("button", { name: "Запустить локально" }).click();
      await expect(page.locator(".editor-output .tag")).toHaveText("OK", {
        timeout: 50000,
      });
      const output = await page
        .locator(".editor-output pre")
        .first()
        .textContent();
      expect(output?.replace(/[\r\n]+$/, "")).toBe(
        example.output || "Программа завершилась без вывода.",
      );
      await expect(page.locator(".execution-error")).toHaveCount(0);
    }
  }
});
