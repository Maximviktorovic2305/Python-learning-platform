import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getTopicStatus, type Progress } from "../src/entities/progress/model";

const user = {
  id: "topic-progress-user",
  username: "progress_student",
  email: "progress@example.com",
  avatar: null,
  role: "student",
  total_xp: 100,
  current_level: 0,
  streak: 1,
  longest_streak: 1,
  daily_goal: 100,
  timezone: "Asia/Vladivostok",
  locale: "ru" as const,
  created_at: "2026-10-14T00:00:00Z",
};
const topics = [
  { id: "academy-introduction", title: "Первая программа" },
  { id: "academy-variables", title: "Переменные и типы" },
  { id: "academy-numbers", title: "Числа и операторы" },
].map((topic, position) => ({
  ...topic,
  position,
  module_id: "module-0",
  summary: "Описание учебной темы",
  minutes: 20,
  published: true,
  tags: ["python"],
}));
const course = {
  id: "python",
  title: "Python",
  description: "Учебный курс",
  published_topics: 3,
  exercise_count: 6,
  question_count: 60,
  levels: [
    {
      id: "level-0",
      course_id: "python",
      position: 0,
      title: "Основы",
      description: "Начало обучения",
      modules: [
        {
          id: "module-0",
          level_id: "level-0",
          position: 0,
          title: "Первые шаги",
          topics,
        },
      ],
    },
  ],
};
const initialProgress: Progress = {
  user,
  lesson_ids: ["academy-introduction", "academy-variables"],
  exercise_ids: Array.from(
    { length: 2 },
    (_, index) => `academy-introduction-e${index + 1}`,
  ),
  quiz_ids: ["academy-introduction-quiz"],
  completed_topics: ["academy-introduction"],
  continue_topic: "academy-variables",
  course_percent: 33,
  level_percent: { "level-0": 33 },
  module_percent: { "module-0": 33 },
  daily_xp: 20,
  activity: [],
  weak_topics: [],
  week_xp: [0, 0, 0, 0, 0, 0, 20],
};

async function mockLearning(page: Page, readProgress = () => initialProgress) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/refresh")
      await route.fulfill({ json: { access_token: "test-token", user } });
    else if (path === "/api/courses/python")
      await route.fulfill({ json: course });
    else if (path === "/api/progress")
      await route.fulfill({ json: readProgress() });
    else if (path.startsWith("/api/lessons/")) {
      const id = path.split("/").at(-1);
      await route.fulfill({
        json: {
          id,
          topic: topics.find((topic) => topic.id === id),
          theory: [],
          examples: [],
          review: [],
        },
      });
    } else if (path === "/api/exercises") await route.fulfill({ json: [] });
    else await route.fulfill({ json: {} });
  });
}

test("topic completion requires the complete server result, while partial study and current topic are in progress", () => {
  expect(getTopicStatus("academy-introduction", initialProgress)).toBe(
    "completed",
  );
  expect(getTopicStatus("academy-variables", initialProgress)).toBe(
    "in-progress",
  );
  expect(getTopicStatus("academy-numbers", initialProgress)).toBe(
    "not-started",
  );
  expect(
    getTopicStatus("academy-numbers", initialProgress, "academy-numbers"),
  ).toBe("in-progress");
  expect(
    getTopicStatus(
      "academy-introduction",
      initialProgress,
      "academy-introduction",
    ),
  ).toBe("completed");
  const exerciseOnly = {
    ...initialProgress,
    lesson_ids: [],
    exercise_ids: ["academy-variables-e1"],
    quiz_ids: [],
    completed_topics: [],
  };
  expect(getTopicStatus("academy-variables", exerciseOnly)).toBe("in-progress");
  expect(getTopicStatus("variables", exerciseOnly)).toBe("not-started");
  const quizOnly = {
    ...exerciseOnly,
    exercise_ids: [],
    quiz_ids: ["academy-variables-quiz"],
  };
  expect(getTopicStatus("academy-variables", quizOnly)).toBe("in-progress");
  expect(
    getTopicStatus("academy-variables", {
      ...quizOnly,
      quiz_ids: [],
      weak_topics: [
        {
          id: "academy-variables",
          title: "Переменные",
          accuracy: 40,
          answers: 10,
        },
      ],
    }),
  ).toBe("in-progress");
  expect(getTopicStatus("academy-introduction")).toBe("not-started");
});

for (const theme of ["light", "dark"]) {
  test(`topics have consistent status colors and accessible labels in ${theme} theme`, async ({
    page,
  }) => {
    await mockLearning(page);
    await page.addInitScript(
      (value) => localStorage.setItem("theme", value),
      theme,
    );
    const colors =
      theme === "light"
        ? { active: "rgb(23, 101, 150)", done: "rgb(28, 114, 72)" }
        : { active: "rgb(99, 184, 251)", done: "rgb(119, 213, 166)" };
    for (const route of ["/curriculum", "/practice"]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      if (
        await page
          .getByRole("button", { name: "Понятно", exact: true })
          .isVisible()
      )
        await page
          .getByRole("button", { name: "Понятно", exact: true })
          .click();
      const selector =
        route === "/curriculum" ? ".topic-row" : ".practice-card";
      const completed = page.locator(
        `${selector}[href^="/learn/academy-introduction"]`,
      );
      const active = page.locator(
        `${selector}[href^="/learn/academy-variables"]`,
      );
      const untouched = page.locator(
        `${selector}[href^="/learn/academy-numbers"]`,
      );
      await expect(completed).toHaveAttribute("data-topic-status", "completed");
      await expect(completed.locator(".topic-status")).toHaveText("Завершена");
      await expect(completed.locator(".topic-status")).toHaveCSS(
        "color",
        colors.done,
      );
      await expect(active).toHaveAttribute("data-topic-status", "in-progress");
      await expect(active.locator(".topic-status")).toHaveText("В процессе");
      await expect(active.locator(".topic-status")).toHaveCSS(
        "color",
        colors.active,
      );
      await expect(untouched).toHaveAttribute(
        "data-topic-status",
        "not-started",
      );
      await expect(untouched.locator(".topic-status")).toHaveText("Не начата");
      await expect(completed).not.toHaveCSS(
        "background-color",
        await untouched.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        ),
      );
      await expect(active).not.toHaveCSS(
        "background-color",
        await untouched.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        ),
      );
      await completed.hover();
      await expect(completed.locator(".topic-status")).toHaveCSS(
        "color",
        colors.done,
      );
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        audit.violations.map(({ id, nodes }) => ({
          id,
          nodes: nodes.map(({ target }) => target),
        })),
      ).toEqual([]);
    }
    await page.goto("/learn/academy-variables");
    const navigation = page.getByRole("navigation", { name: "Уроки курса" });
    const current = navigation.locator('[href="/learn/academy-variables"]');
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect(current).toContainText("Вы сейчас здесь");
    await expect(current).toHaveCSS("color", colors.active);
    await expect(current.locator(".topic-status")).toHaveText("В процессе");
    await expect(
      navigation.locator('[href="/learn/academy-introduction"]'),
    ).toHaveCSS("color", colors.done);
    await expect(page.locator(".lesson-heading .topic-status")).toHaveText(
      "В процессе",
    );
    await page.goto("/learn/academy-introduction");
    const finishedCurrent = navigation.locator(
      '[href="/learn/academy-introduction"]',
    );
    await expect(finishedCurrent).toHaveAttribute("aria-current", "page");
    await expect(finishedCurrent).toHaveCSS("color", colors.done);
    await expect(finishedCurrent).toContainText("Вы сейчас здесь");
    await expect(page.locator(".lesson-heading .topic-status")).toHaveText(
      "Завершена",
    );
    await page.goto("/dashboard");
    await expect(page.locator(".continue-panel .topic-status")).toHaveText(
      "В процессе",
    );
    await expect(page.locator(".continue-panel .topic-status")).toHaveCSS(
      "color",
      colors.active,
    );
    await page.goto("/learn/academy-introduction");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Навигация по урокам" }).click();
    await expect(finishedCurrent).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.goto("/curriculum");
    await expect(
      page.locator('.topic-row[href="/learn/academy-variables"]'),
    ).toHaveAttribute("data-topic-status", "in-progress");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .locator(".curriculum-levels")
      .screenshot({ path: `../.local/topic-progress-${theme}.png` });
  });
}

test("updated completion changes the topic color after a reload", async ({
  page,
}) => {
  let progress = initialProgress;
  await mockLearning(page, () => progress);
  await page.goto("/curriculum");
  const topic = page.locator('.topic-row[href="/learn/academy-variables"]');
  await expect(topic).toHaveAttribute("data-topic-status", "in-progress");
  progress = {
    ...initialProgress,
    completed_topics: ["academy-introduction", "academy-variables"],
  };
  await page.reload();
  await expect(topic).toHaveAttribute("data-topic-status", "completed");
  await expect(topic.locator(".topic-status")).toHaveText("Завершена");
});
