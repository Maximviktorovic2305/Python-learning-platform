import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import type { Progress } from "../src/entities/progress/model";

const user = {
  id: "learning-consistency-user",
  username: "repeat_student",
  email: "repeat@example.com",
  avatar: null,
  role: "student",
  total_xp: 210,
  current_level: 0,
  streak: 1,
  longest_streak: 1,
  daily_goal: 100,
  timezone: "Asia/Vladivostok",
  locale: "ru" as const,
  created_at: "2026-10-14T00:00:00Z",
};

async function learning(context: BrowserContext) {
  const exercises = await (
    await context.request.get("/api/exercises?topic_id=academy-introduction")
  ).json();
  const state: Progress = {
    user: { ...user },
    lesson_ids: [],
    exercise_ids: exercises
      .slice(1)
      .map((exercise: { id: string }) => exercise.id),
    quiz_ids: [],
    completed_topics: [],
    continue_topic: "academy-introduction",
    course_percent: 0,
    level_percent: {},
    module_percent: {},
    daily_xp: 210,
    activity: [],
    weak_topics: [],
    week_xp: [0, 0, 0, 0, 0, 0, 210],
  };
  let theoryRequests = 0;
  let lostResponse = false;
  let failedProgress = false;
  let attemptNumber = 0;
  const question = {
    id: "repeat-question",
    topic_id: "academy-introduction",
    difficulty: "easy",
    kind: "single_choice",
    prompt: "Выберите правильный ответ",
    code: null,
    options: ["Первый", "Второй"],
    hint: "Первый ответ верный",
  };
  const award = (ids: string[], id: string, xp: number) => {
    if (ids.includes(id)) return 0;
    ids.push(id);
    state.user.total_xp += xp;
    state.daily_xp += xp;
    return xp;
  };
  await context.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/refresh")
      return route.fulfill({
        json: { access_token: "test-token", user: state.user },
      });
    if (path === "/api/users/me") return route.fulfill({ json: state.user });
    if (path === "/api/achievements") return route.fulfill({ json: [] });
    if (path === "/api/progress") {
      if (failedProgress)
        return route.fulfill({ status: 503, json: { detail: "unavailable" } });
      if (
        state.lesson_ids.length &&
        state.exercise_ids.length === 2 &&
        state.quiz_ids.length
      ) {
        state.completed_topics = ["academy-introduction"];
        state.continue_topic = "academy-variables";
        state.course_percent = 2;
      }
      return route.fulfill({ json: state });
    }
    if (path === "/api/exercises") return route.fulfill({ json: exercises });
    if (path === "/api/lessons/academy-introduction/complete") {
      theoryRequests++;
      const xp = award(state.lesson_ids, "academy-introduction", 20);
      if (lostResponse) return route.abort("failed");
      return route.fulfill({ json: { message: `Урок завершён. +${xp} XP` } });
    }
    if (path === "/api/exercises/academy-introduction-e1/submit") {
      const xp = award(state.exercise_ids, "academy-introduction-e1", 30);
      return route.fulfill({
        json: {
          status: "passed",
          passed: 1,
          total: 1,
          xp,
          stdout: "",
          stderr: "",
        },
      });
    }
    if (path === "/api/quizzes/academy-introduction/attempts")
      return route.fulfill({
        json: {
          id: `attempt-${++attemptNumber}`,
          quiz_id: "academy-introduction-quiz",
          created_at: user.created_at,
          questions: [question],
        },
      });
    if (/\/api\/attempts\/.*\/submit$/.test(path)) {
      const xp = award(state.quiz_ids, "academy-introduction-quiz", 50);
      return route.fulfill({
        json: {
          id: `attempt-${attemptNumber}`,
          score: 100,
          correct_count: 1,
          total: 1,
          seconds: 1,
          xp,
          review: [
            {
              question,
              selected: [0],
              correct_answer: [0],
              correct: true,
              explanation: "Верно",
            },
          ],
        },
      });
    }
    return route.continue();
  });
  return {
    state,
    theoryRequests: () => theoryRequests,
    loseResponse: () => {
      lostResponse = true;
    },
    failProgress: (value: boolean) => {
      failedProgress = value;
    },
  };
}

async function open(page: Page, url: string) {
  await page.goto(url);
  const notice = page.getByRole("button", { name: "Понятно", exact: true });
  if (await notice.isVisible()) await notice.click();
}

async function passQuiz(page: Page) {
  await page.locator('.quiz-options input[type="radio"]').first().check();
  await page.getByRole("button", { name: "Завершить тест" }).click();
  await expect(
    page.getByRole("heading", { name: "Разбор каждого ответа" }),
  ).toBeVisible();
}

test("completion and rewards refresh across all learning views without reloading", async ({
  context,
  page,
}) => {
  const app = await learning(context);
  await open(page, "/curriculum"); // Prime the curriculum and progress caches.
  await page.locator('.topic-row[href="/learn/academy-introduction"]').click();
  await page.getByRole("button", { name: "Перейти к примерам" }).click();
  await expect(
    page.getByRole("tab", { name: "Примеры", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", { name: "Перейти к практике", exact: true })
    .click();
  const verify = page.getByRole("button", {
    name: "Проверить",
    exact: true,
  });
  await verify.click();
  await expect(page.locator(".execution-message")).toContainText("+30 XP");
  const repeat = page.getByRole("button", {
    name: "Проверить повторно",
  });
  await repeat.click();
  await expect(
    page.getByRole("button").filter({ hasText: /XP|начислен/i }),
  ).toHaveCount(0);
  await expect(page.locator(".execution-message")).toContainText(
    "Баллы за это задание уже получены",
  );
  await page.getByRole("tab", { name: "Теория", exact: true }).click();
  await page
    .getByRole("button", { name: "Перейти к примерам", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Перейти к практике", exact: true })
    .click();
  expect(app.theoryRequests()).toBe(1);
  await page.locator(".exercise-selector button").last().click();
  await page.getByRole("button", { name: "Перейти к тесту" }).click();
  await page.getByRole("button", { name: "Начать тест" }).click();
  await passQuiz(page);
  await expect(page.locator(".lesson-heading .topic-status")).toHaveText(
    "Завершена",
  );
  await expect(page.locator(".lesson-heading")).toContainText("Практика: 2/2");
  await page.getByRole("button", { name: "Новая попытка" }).click();
  await passQuiz(page);
  await expect(page.locator(".result-summary")).toContainText(
    "Баллы за тест уже получены",
  );
  expect(app.state.user.total_xp).toBe(310);
  for (const [name, selector] of [
    ["Программа курса", ".topic-row"],
    ["Практика", ".practice-card"],
  ]) {
    await page
      .getByRole("navigation", { name: "Навигация кабинета" })
      .getByRole("link", { name, exact: true })
      .click();
    await expect(
      page.locator(`${selector}[href^="/learn/academy-introduction"]`),
    ).toHaveAttribute("data-topic-status", "completed");
  }
  await page.getByRole("link", { name: "Мой прогресс", exact: true }).click();
  await expect(page.locator(".dashboard-metrics")).toContainText("310");
});

for (const theme of ["light", "dark"]) {
  test(`radio stays round when selected and keyboard focused in ${theme}`, async ({
    context,
    page,
  }, info) => {
    await learning(context);
    await page.addInitScript(
      (value) => localStorage.setItem("theme", value),
      theme,
    );
    await open(page, "/learn/academy-introduction?tab=quiz");
    await page.getByRole("button", { name: "Начать тест" }).click();
    const radio = page.getByRole("radio").first();
    await radio.check();
    await expect(radio).toHaveCSS("padding", "0px");
    await expect(radio).toHaveCSS("border-radius", "50%");
    await expect(radio).toHaveCSS("outline-style", "none");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(radio).toBeFocused();
    await expect(radio).toHaveCSS("outline-style", "none");
    await expect(radio).not.toHaveCSS("box-shadow", "none");
    await page
      .locator(".quiz-options")
      .screenshot({ path: info.outputPath(`radio-${theme}.png`) });
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("radio").nth(1)).toBeChecked();
  });
}

test("a completion in another tab immediately refreshes status and repeat rewards", async ({
  context,
  page,
}) => {
  const app = await learning(context);
  app.state.lesson_ids = ["academy-introduction"];
  app.state.quiz_ids = ["academy-introduction-quiz"];
  await open(page, "/learn/academy-introduction?tab=practice");
  const second = await context.newPage();
  await open(second, "/curriculum");
  const topic = second.locator(
    '.topic-row[href="/learn/academy-introduction"]',
  );
  await expect(topic).toHaveAttribute("data-topic-status", "in-progress");
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(topic).toHaveAttribute("data-topic-status", "completed");
  await expect(page.locator(".lesson-heading .topic-status")).toHaveText(
    "Завершена",
  );
});

test("a committed completion with a lost response refreshes before retry", async ({
  context,
  page,
}) => {
  const app = await learning(context);
  app.loseResponse();
  await open(page, "/learn/academy-introduction");
  await page.getByRole("button", { name: "Перейти к примерам" }).click();
  await expect(page.locator(".lesson-heading")).toContainText("Теория изучена");
  await expect(
    page.getByRole("button", { name: "Перейти к примерам", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Перейти к примерам", exact: true })
    .click();
  expect(app.theoryRequests()).toBe(1);
  expect(app.state.user.total_xp).toBe(230);
  await expect(page.locator(".form-error")).toHaveCount(0);
});

test("editing a checked solution clears the result for the previous code", async ({
  context,
  page,
}) => {
  await learning(context);
  await open(page, "/learn/academy-introduction?tab=practice");
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(page.locator(".execution-message")).toContainText(
    "Задание выполнено",
  );
  const repeat = page.getByRole("button", {
    name: "Проверить повторно",
  });
  await expect(repeat).toBeEnabled();
  await page
    .getByRole("textbox", { name: "Редактор Python", exact: true })
    .fill("print('changed')");
  await expect(page.locator(".execution-message")).toHaveCount(0);
  await expect(repeat).toBeVisible();
});

test("failed refresh labels cached progress and keeps a verified task free of repeat rewards", async ({
  context,
  page,
}) => {
  const app = await learning(context);
  await open(page, "/learn/academy-introduction?tab=practice");
  const verify = page.getByRole("button", {
    name: "Проверить",
    exact: true,
  });
  await expect(verify).toBeVisible();
  app.failProgress(true);
  await verify.click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Показаны последние загруженные значения" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Проверить повторно" }),
  ).toBeVisible();
  app.failProgress(false);
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Показаны последние загруженные значения" }),
  ).toHaveCount(0);
  expect(app.state.user.total_xp).toBe(240);
});

test("missing counters show unknown values instead of invented zero results", async ({
  context,
  page,
}) => {
  await learning(context);
  await context.route("**/api/progress", (route) =>
    route.fulfill({ status: 503, json: { detail: "unavailable" } }),
  );
  await open(page, "/practice");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".curriculum-toolbar p")).not.toContainText("0 /");
  await context.route("**/api/achievements", (route) =>
    route.fulfill({ status: 503, json: { detail: "unavailable" } }),
  );
  await page.goto("/achievements");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".page-heading")).toContainText("Нет данных");
  await expect(page.locator(".page-heading")).not.toContainText("0 / 16");
});
