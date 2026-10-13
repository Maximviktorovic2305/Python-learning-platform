import { test, expect } from "./fixtures";

test("landing, responsive navigation, both themes and public curriculum", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Курс по Python абсолютно бесплатно!",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({
    path: "../.local/landing-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Переключить тему" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "../.local/landing-dark.png", fullPage: true });
  await page.getByRole("button", { name: "Переключить тему" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Программа" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Твой маршрут в Python." }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Поиск темы" }).fill("функции");
  await expect(
    page.getByRole("link", { name: /Функции и возвращаемые значения/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../.local/curriculum-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("register, reload session, complete lesson, quiz review, persisted progress and logout", async ({
  page,
}) => {
  const id = Date.now().toString();
  await page.goto("/register");
  await page.getByLabel("Имя пользователя").fill(`learner_${id}`);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`learner_${id}@example.com`);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("testing-password-1234");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(
    page.getByRole("heading", { name: `Привет, learner_${id}.` }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: `Привет, learner_${id}.` }),
  ).toBeVisible();
  await page.screenshot({ path: "../.local/dashboard.png", fullPage: true });
  await page.getByRole("link", { name: "Начать первый урок" }).click();
  await expect(
    page.getByRole("heading", { name: "Первая программа и инструменты" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Теория изучена/ }).click();
  await expect(page.getByLabel("Редактор Python")).toBeVisible();
  await page.getByLabel("Редактор Python").fill("print('Hello, Python!')");
  await page.getByRole("button", { name: "Запустить локально" }).click();
  await expect(page.locator(".editor-output pre").first()).toHaveText(
    "Hello, Python!\n",
    { timeout: 50000 },
  );
  await page.getByRole("button", { name: "Проверить · +30 XP" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Пройдено 1/1 проверок. +30 XP" }),
  ).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Проверить · +30 XP" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Пройдено 1/1 проверок. +0 XP" }),
  ).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "../.local/lesson-practice.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Перейти к тесту" }).click();
  await page.getByRole("button", { name: "Начать тест" }).click();
  for (let i = 0; i < 10; i++) {
    await expect(page.locator(".quiz-progress").first()).toContainText(
      `ВОПРОС ${i + 1} / 10`,
    );
    await expect(page.locator(".quiz-options input").first()).toBeVisible();
    const checkbox = page.locator('.quiz-options input[type="checkbox"]');
    if (await checkbox.count()) await checkbox.first().check();
    else
      await page.locator('.quiz-options input[type="radio"]').first().check();
    if (i < 9) await page.getByRole("button", { name: "Далее" }).click();
  }
  await page.getByRole("button", { name: "Завершить тест" }).click();
  await expect(
    page.getByRole("heading", { name: "Разбор каждого ответа" }),
  ).toBeVisible();
  await expect(page.locator(".review-question")).toHaveCount(10);
  await page.goto("/dashboard");
  await expect(
    page.locator(".dashboard-metrics").getByText("1", { exact: true }),
  ).toHaveCount(2);
  await page.getByRole("link", { name: "Достижения", exact: true }).click();
  await expect(
    page
      .locator(".achievement-card.earned")
      .filter({ hasText: "Первая строка" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Профиль", exact: true }).click();
  await page.getByLabel("Имя пользователя").fill(`updated_${id}`);
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(page.locator(".user-chip strong")).toHaveText(`updated_${id}`);
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`learner_${id}@example.com`);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("testing-password-1234");
  await page.getByRole("button", { name: "Войти в лабораторию" }).click();
  await expect(
    page.getByRole("heading", { name: `Привет, updated_${id}.` }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/dashboard",
    "/learn/first-program",
    "/practice",
    "/profile",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBe(true);
  }
  await page.goto("/learn/first-program");
  await page.getByRole("tab", { name: "Практика", exact: true }).click();
  await page.screenshot({
    path: "../.local/lesson-mobile.png",
    fullPage: true,
  });
});
