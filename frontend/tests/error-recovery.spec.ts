import { test, expect } from "./fixtures";

test("a failed new quiz attempt keeps the review and offers a visible retry", async ({
  page,
}) => {
  const user = {
    id: "recovery-user",
    username: "recovery_student",
    email: "recovery@example.com",
    avatar: null,
    role: "student",
    total_xp: 0,
    current_level: 0,
    streak: 0,
    longest_streak: 0,
    daily_goal: 100,
    timezone: "Asia/Vladivostok",
    created_at: "2026-10-14T00:00:00Z",
  };
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({ json: { access_token: "test-token", user } }),
  );
  await page.route("**/api/users/me", (route) => route.fulfill({ json: user }));
  await page.route("**/api/progress**", (route) =>
    route.fulfill({
      json: {
        lesson_ids: [],
        exercise_ids: [],
        quiz_topic_ids: [],
        weak_topics: [],
      },
    }),
  );
  await page.route("**/api/achievements", (route) =>
    route.fulfill({ json: [] }),
  );
  const question = {
    id: "recovery-question",
    prompt: "Что выведет print(1)?",
    code: "print(1)",
    difficulty: "easy",
    kind: "single_select",
    options: ["1", "2"],
    hint: "Посмотрите на число.",
  };
  let starts = 0;
  await page.route("**/api/quizzes/first-program/attempts", (route) => {
    starts += 1;
    return route.fulfill(
      starts === 2
        ? { status: 503, json: { detail: "Сервис временно недоступен" } }
        : { json: { id: `recovery-attempt-${starts}`, questions: [question] } },
    );
  });
  await page.route("**/api/attempts/*/submit", (route) =>
    route.fulfill({
      json: {
        score: 100,
        correct_count: 1,
        total: 1,
        seconds: 2,
        xp: 50,
        review: [
          {
            question,
            selected: [0],
            correct_answer: [0],
            correct: true,
            explanation: "Выводится число 1.",
          },
        ],
      },
    }),
  );
  await page.goto("/learn/first-program?tab=quiz");
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await page.getByRole("button", { name: "Начать тест" }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Завершить тест" }).click();
  await expect(
    page.getByRole("heading", { name: "Разбор каждого ответа" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Новая попытка" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Сервис временно недоступен" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Разбор каждого ответа" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Новая попытка" }).click();
  await expect(page.locator(".quiz-progress")).toContainText("ВОПРОС 1 / 1");
  await expect(page.locator(".quiz-options input:checked")).toHaveCount(0);
  await expect(page.locator(".form-error")).toHaveCount(0);
});

test("practice recovers from a failed course request without reloading", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  const username = `recovery_${Date.now()}`;
  await page.getByLabel("Имя пользователя").fill(username);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${username}@example.com`);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("recovery-password-1234");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(
    page.getByRole("heading", { name: `Привет, ${username}.` }),
  ).toBeVisible();
  let failed = true;
  await page.route("**/api/courses/python", (route) =>
    failed
      ? route.fulfill({
          status: 503,
          json: { detail: "Сервис временно недоступен" },
        })
      : route.continue(),
  );
  await page.goto("/practice");
  await expect(
    page.getByRole("alert").filter({ hasText: "Сервис временно недоступен" }),
  ).toBeVisible();
  failed = false;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.locator(".practice-card")).toHaveCount(15);
});
