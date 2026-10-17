import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("privacy-choice-2026-10-13", "essential"),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("task catalogue filters, direct links and layout work on phone, tablet and laptop", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({ status: 401, json: { detail: "anonymous" } }),
  );
  for (const width of [320, 390, 768, 1024, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tasks");
    await expect(page.locator(".trainer-list li")).toHaveCount(24);
    await page.getByRole("button", { name: "Сложные 8", exact: true }).click();
    await expect(page.locator(".trainer-list li")).toHaveCount(8);
    await page.getByLabel("Поиск задачи").fill("Кеш");
    await expect(page.locator(".trainer-list li")).toHaveCount(1);
    await page.locator('.trainer-list a[href^="/tasks/trainer-21"]').click();
    await expect(
      page.getByRole("button", { name: "Сложные 8", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Поиск задачи")).toHaveValue("Кеш");
    await expect(
      page.getByRole("heading", { level: 2, name: "Кеш LRU", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Редактор Python")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByLabel("Поиск задачи").fill("несуществующая задача");
    await expect(page.locator(".trainer-list li")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Сбросить фильтры", exact: true })
      .click();
    await expect(page.locator(".trainer-list li")).toHaveCount(24);
    await page.getByLabel("Статус решения").selectOption("solved");
    await expect(page.locator(".trainer-list li")).toHaveCount(0);
    await page
      .locator(".trainer-workspace")
      .screenshot({ path: `../.local/trainer-workspace-${width}.png` });
  }
  await page.goto("/tasks/not-a-task");
  await expect(
    page.getByRole("heading", { name: "Задача не найдена", exact: true }),
  ).toBeVisible();
});

test("drafts survive task switches and reload and reset restores initial data", async ({
  page,
}) => {
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({ status: 401, json: { detail: "anonymous" } }),
  );
  await page.goto("/tasks/trainer-01");
  const editor = page.getByLabel("Редактор Python");
  const stdin = page.getByLabel("Входные данные для input()");
  await editor.fill("print('мой черновик')");
  await stdin.fill("59");
  await expect(
    page.getByRole("status").filter({ hasText: "Черновик сохранён" }),
  ).toBeVisible();
  await page.locator('.trainer-list a[href^="/tasks/trainer-02"]').click();
  await expect(editor).not.toHaveValue("print('мой черновик')");
  await page.locator('.trainer-list a[href^="/tasks/trainer-01"]').click();
  await expect(editor).toHaveValue("print('мой черновик')");
  await expect(stdin).toHaveValue("59");
  await page.reload();
  await expect(editor).toHaveValue("print('мой черновик')");
  await expect(stdin).toHaveValue("59");
  await page.getByRole("button", { name: "Сбросить код", exact: true }).click();
  await expect(editor).not.toHaveValue("print('мой черновик')");
  await expect(stdin).toHaveValue("3661");
  await page.reload();
  await expect(stdin).toHaveValue("3661");
});

test("standalone solving awards once, updates filters and does not complete course lessons", async ({
  page,
}) => {
  const id = Date.now().toString();
  await page.goto("/register");
  await page.getByLabel("Имя пользователя").fill(`trainer_${id}`);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`trainer_${id}@example.com`);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("trainer-only-password-1234");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page
    .getByRole("button", { name: "Создать аккаунт", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: `Привет, trainer_${id}.` }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Навигация кабинета" })
    .getByRole("link", { name: "Задачи", exact: true })
    .click();
  await expect(page.getByLabel("Редактор Python")).toBeVisible();
  await page
    .getByLabel("Редактор Python")
    .fill(
      "seconds = int(input())\nhours, rest = divmod(seconds, 3600)\nminutes, seconds = divmod(rest, 60)\nprint(f'{hours:02d}:{minutes:02d}:{seconds:02d}')",
    );
  await page
    .getByRole("button", { name: "Запустить локально", exact: true })
    .click();
  await expect(page.locator(".editor-output pre").first()).toHaveText(
    "01:01:01\n",
    { timeout: 50000 },
  );
  const progressResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/progress") && response.ok(),
  );
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(page.locator(".execution-message")).toContainText(
    "Пройдено 5/5 проверок. +30 XP",
    { timeout: 30000 },
  );
  const progress = await (await progressResponse).json();
  expect(progress.trainer_exercise_ids).toEqual(["trainer-01"]);
  expect(progress.exercise_ids).toEqual([]);
  expect(progress.course_percent).toBe(0);
  await page
    .getByRole("button", { name: "Проверить повторно", exact: true })
    .click();
  await expect(page.locator(".execution-message")).toContainText(
    "Баллы за это задание уже получены",
    { timeout: 30000 },
  );
  await page.getByLabel("Статус решения").selectOption("solved");
  await expect(page.locator(".trainer-list li")).toHaveCount(1);
  await expect(page.locator(".trainer-list a.solved")).toHaveCount(1);
});

for (const theme of ["light", "dark"]) {
  test(`trainer is accessible in ${theme}`, async ({ page }) => {
    await page.addInitScript(
      (value) => localStorage.setItem("theme", value),
      theme,
    );
    await page.goto("/tasks/trainer-23");
    await expect(page.getByLabel("Редактор Python")).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
}
