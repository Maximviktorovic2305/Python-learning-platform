import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Progress } from "../src/entities/progress/model";

const user = {
  id: "validation-user",
  username: "python_student",
  email: "student@example.com",
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

async function mockApi(page: Page, authenticated = false) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/refresh") {
      await route.fulfill(
        authenticated
          ? { json: { access_token: "test-token", user } }
          : { status: 401, json: { detail: "anonymous" } },
      );
    } else if (path === "/api/users/me") await route.fulfill({ json: user });
    else if (path === "/api/projects")
      await route.fulfill({
        json: [
          {
            id: "project-test",
            title: "Учебный проект",
            description: "Описание",
            level_id: "level-0",
            requirements: [],
            rubric: [],
          },
        ],
      });
    else if (path === "/api/projects/submissions")
      await route.fulfill({ json: [] });
    else await route.fulfill({ json: {} });
  });
}

test("registration validates every field and consent, with compact focus and aligned checkboxes", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/register");
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  const submit = page.getByRole("button", {
    name: "Создать аккаунт",
    exact: true,
  });
  await expect(submit).toBeDisabled();
  await page.getByLabel("Имя пользователя", { exact: true }).fill("имя!");
  await page.getByLabel("Email", { exact: true }).fill("wrong");
  await page.getByLabel("Пароль", { exact: true }).fill("short");
  for (const name of ["username", "email", "password"]) {
    const field = page.locator(`input[name="${name}"]`);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    const errorId = await field.getAttribute("aria-describedby");
    await expect(page.locator(`[id="${errorId}"]`)).toBeVisible();
  }
  await page
    .getByLabel("Имя пользователя", { exact: true })
    .fill("python_student");
  await page.getByLabel("Email", { exact: true }).fill("student@example.com");
  await page.getByLabel("Пароль", { exact: true }).fill("valid-password-123");
  const terms = page.locator('input[name="acceptTerms"]');
  const processing = page.locator('input[name="acceptDataProcessing"]');
  await terms.check();
  await expect(submit).toBeDisabled();
  await processing.check();
  await expect(submit).toBeEnabled();
  await terms.uncheck();
  await expect(submit).toBeDisabled();
  await expect(
    page.getByText(
      "Для регистрации подтвердите принятие условий использования.",
    ),
  ).toBeVisible();
  await expect(terms.locator("..")).toHaveCSS("flex-direction", "row");
  await terms.check();
  await expect(submit).toBeEnabled();
  for (const theme of ["dark", "light"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    const email = page.getByLabel("Email", { exact: true });
    await email.focus();
    await expect(email).toHaveCSS("outline-width", "1px");
    await expect(email).toHaveCSS("outline-offset", "-1px");
    await email.fill("invalid");
    await expect(page.locator(".field-error")).toHaveCSS(
      "color",
      theme === "dark" ? "rgb(255, 139, 139)" : "rgb(180, 35, 24)",
    );
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations.map(({ id }) => id)).toEqual([]);
    await email.fill("student@example.com");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const alignment = await terms.evaluate((checkbox) => {
    const control = checkbox.getBoundingClientRect();
    const text = checkbox
      .parentElement!.querySelector("span")!
      .getBoundingClientRect();
    return {
      difference: Math.abs(control.top - text.top),
      sameRow: control.right < text.left,
    };
  });
  expect(alignment.sameRow).toBe(true);
  expect(alignment.difference).toBeLessThan(6);
});

test("server field errors remain until that field changes and sensitive details are hidden", async ({
  page,
}) => {
  await mockApi(page);
  await page.route("**/api/auth/register", (route) =>
    route.fulfill({
      status: 422,
      json: {
        detail: [
          {
            loc: ["body", "email"],
            input: "private-secret",
            msg: "internal trace",
          },
          { loc: ["body", "password"], input: "private-secret" },
        ],
      },
    }),
  );
  await page.goto("/register");
  await page
    .getByLabel("Имя пользователя", { exact: true })
    .fill("python_student");
  await page.getByLabel("Email", { exact: true }).fill("student@example.com");
  await page.getByLabel("Пароль", { exact: true }).fill("valid-password-123");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  const submit = page.getByRole("button", {
    name: "Создать аккаунт",
    exact: true,
  });
  await submit.click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(submit).toBeDisabled();
  await page.getByLabel("Email", { exact: true }).focus();
  await page.getByLabel("Имя пользователя", { exact: true }).focus();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page
    .getByLabel("Имя пользователя", { exact: true })
    .fill("other_student");
  await expect(submit).toBeDisabled();
  await page.getByLabel("Email", { exact: true }).fill("other@example.com");
  await expect(submit).toBeDisabled();
  await page.getByLabel("Пароль", { exact: true }).fill("other-password-123");
  await expect(submit).toBeEnabled();
  await expect(page.locator("body")).not.toContainText("private-secret");
  await expect(page.locator("body")).not.toContainText("internal trace");
});

test("login uses a loader while pending, prevents duplicate submits, and shows a safe authentication error", async ({
  page,
}) => {
  await mockApi(page);
  let release!: () => void;
  const responseReady = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("**/api/auth/login", async (route) => {
    requests += 1;
    await responseReady;
    await route.fulfill({
      status: 401,
      json: { detail: "Account student@example.com does not exist" },
    });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("student@example.com");
  await page.getByLabel("Пароль", { exact: true }).fill("password");
  const submit = page.getByRole("button", { name: "Войти в лабораторию" });
  await submit.click();
  await expect(submit).toHaveAttribute("aria-busy", "true");
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveCSS("opacity", "0.5");
  await expect(submit).toHaveCSS("cursor", "not-allowed");
  await expect(submit.locator(".button-loader")).toBeVisible();
  await expect(submit.locator(".skeleton")).toHaveCount(0);
  await page.getByLabel("Пароль", { exact: true }).fill("changed-password");
  await expect(submit).toBeDisabled();
  await page
    .locator("form")
    .evaluate((form: HTMLFormElement) => form.requestSubmit());
  expect(requests).toBe(1);
  release();
  await expect(page.locator(".form-error")).toContainText(
    "Неверный email или пароль",
  );
  await expect(page.locator(".form-error")).not.toContainText("does not exist");
  await expect(submit).toBeDisabled();
  await page.getByLabel("Пароль", { exact: true }).fill("corrected-password");
  await expect(submit).toBeEnabled();
});

test("profile and password forms block invalid values and map current password errors", async ({
  page,
}) => {
  await mockApi(page, true);
  await page.route("**/api/users/me/password", (route) =>
    route.fulfill({ status: 400, json: { detail: "Текущий пароль неверен" } }),
  );
  await page.goto("/profile");
  const save = page.getByRole("button", { name: "Сохранить изменения" });
  await expect(save).toBeEnabled();
  await page.getByLabel("Ежедневная цель, XP", { exact: true }).fill("19");
  await expect(save).toBeDisabled();
  await expect(
    page.getByText("Введите ежедневную цель: целое число от 20 до 1000 XP."),
  ).toBeVisible();
  await page.getByLabel("Ежедневная цель, XP", { exact: true }).fill("20.5");
  await expect(save).toBeDisabled();
  await page.getByLabel("Ежедневная цель, XP", { exact: true }).fill("100");
  await page.getByLabel("Имя пользователя", { exact: true }).fill("!");
  await expect(save).toBeDisabled();
  await page
    .getByLabel("Имя пользователя", { exact: true })
    .fill("python_student");
  await expect(save).toBeEnabled();
  const change = page.getByRole("button", { name: "Изменить пароль" });
  await expect(change).toBeDisabled();
  await page
    .getByLabel("Текущий пароль", { exact: true })
    .fill("current-password");
  await page.getByLabel("Новый пароль", { exact: true }).fill("short");
  await expect(change).toBeDisabled();
  await page
    .getByLabel("Новый пароль", { exact: true })
    .fill("new-password-123");
  await change.click();
  await expect(
    page.getByText("Проверьте текущий пароль и введите его ещё раз."),
  ).toBeVisible();
  await expect(change).toBeDisabled();
  await page
    .getByLabel("Новый пароль", { exact: true })
    .fill("other-password-123");
  await expect(change).toBeDisabled();
  await page
    .getByLabel("Текущий пароль", { exact: true })
    .fill("correct-current-password");
  await expect(change).toBeEnabled();
});

test("project submission validates URL and notes; sidebar exposes legal documents and the complete stack", async ({
  page,
}) => {
  await mockApi(page, true);
  await page.goto("/projects");
  await page.getByText("Отправить свою работу", { exact: true }).click();
  const submit = page.getByRole("button", { name: "Сохранить работу" });
  await expect(submit).toBeDisabled();
  await page
    .getByLabel("Ссылка на репозиторий", { exact: true })
    .fill("javascript:alert(1)");
  await page
    .getByLabel("Что реализовано и как запустить", { exact: true })
    .fill("short");
  await expect(page.locator(".field-error")).toHaveCount(2);
  await expect(submit).toBeDisabled();
  await page
    .getByLabel("Ссылка на репозиторий", { exact: true })
    .fill("https://github.com/student/project");
  await page
    .getByLabel("Что реализовано и как запустить", { exact: true })
    .fill("Implemented a project. Run python main.py.");
  await expect(submit).toBeEnabled();
  const sidebar = page.locator(".app-sidebar");
  await expect(sidebar.locator(".sidebar-course")).toHaveCount(0);
  await expect(
    sidebar.getByRole("link", { name: "Конфиденциальность" }),
  ).toHaveCount(0);
  await sidebar
    .getByRole("link", { name: "Правовые документы", exact: true })
    .click();
  const legal = page.getByRole("navigation", { name: "Документы платформы" });
  await expect(legal.getByRole("link")).toHaveCount(4);
  await expect(
    legal.getByRole("link", { name: /^Конфиденциальность/ }),
  ).toHaveAttribute("href", "/private-policy");
  await sidebar.getByRole("link", { name: "Стек", exact: true }).click();
  await expect(page).toHaveURL("/stack");
  await expect(
    page.getByRole("heading", { name: "Стек проекта", exact: true }),
  ).toBeVisible();
  for (const text of [
    "Next.js",
    "React",
    "FastAPI",
    "PostgreSQL",
    "Pyodide",
    "Docker Compose",
    "Playwright",
    "Argon2",
    "GitHub Actions",
  ])
    await expect(page.locator("main")).toContainText(text);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("code editor focuses from the gutter, shows a caret without a frame, and highlights failed and passed results", async ({
  page,
}) => {
  await mockApi(page, true);
  const topic = {
    id: "academy-introduction",
    module_id: "module-0",
    position: 0,
    title: "Первая программа",
    summary: "Описание урока",
    minutes: 20,
    published: true,
    tags: ["python"],
  };
  await page.route("**/api/courses/python", (route) =>
    route.fulfill({
      json: {
        id: "python",
        title: "Python",
        description: "Курс",
        published_topics: 1,
        exercise_count: 1,
        question_count: 0,
        levels: [
          {
            id: "level-0",
            course_id: "python",
            title: "Основы",
            description: "",
            position: 0,
            modules: [
              {
                id: "module-0",
                level_id: "level-0",
                title: "Старт",
                position: 0,
                topics: [topic],
              },
            ],
          },
        ],
      },
    }),
  );
  await page.route("**/api/lessons/academy-introduction", (route) =>
    route.fulfill({
      json: {
        id: "academy-introduction",
        topic,
        theory: [],
        examples: [],
        review: [],
      },
    }),
  );
  await page.route("**/api/progress**", (route) =>
    route.fulfill({
      json: {
        user,
        lesson_ids: [],
        exercise_ids: [],
        quiz_ids: [],
        completed_topics: [],
        continue_topic: "academy-introduction",
        course_percent: 0,
        level_percent: {},
        module_percent: {},
        daily_xp: 0,
        activity: [],
        weak_topics: [],
        week_xp: [0, 0, 0, 0, 0, 0, 0],
      } satisfies Progress,
    }),
  );
  await page.route("**/api/exercises?*", (route) =>
    route.fulfill({
      json: [
        {
          id: "academy-introduction-e1",
          topic_id: "academy-introduction",
          title: "Выведите приветствие",
          description: "Напишите программу",
          difficulty: "easy",
          kind: "code_writing",
          starter_code: "# Допишите решение здесь\n",
          hints: [],
        },
      ],
    }),
  );
  let passed = false;
  let releaseVerification!: () => void;
  const verificationReady = new Promise<void>((resolve) => {
    releaseVerification = resolve;
  });
  await page.route(
    "**/api/exercises/academy-introduction-e1/submit",
    async (route) => {
      if (passed) await verificationReady;
      await route.fulfill({
        json: {
          status: passed ? "passed" : "failed",
          stdout: passed ? "Hello, Python!\n" : "",
          stderr: "",
          passed: passed ? 1 : 0,
          total: 1,
          xp: passed ? 30 : 0,
        },
      });
    },
  );
  await page.goto("/learn/academy-introduction?tab=practice");
  const editor = page.getByLabel("Редактор Python", { exact: true });
  await expect(editor).toBeVisible();
  await expect(editor).not.toHaveValue("print('Hello, Python!')");
  await page.locator(".editor-numbers").click();
  await expect(editor).toBeFocused();
  await expect(editor).toHaveCSS("outline-style", "none");
  await expect(editor).toHaveCSS("box-shadow", "none");
  await expect(editor).toHaveCSS("border-width", "0px");
  for (const theme of ["dark", "light"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    await editor.focus();
    await expect(editor).toHaveCSS(
      "caret-color",
      theme === "dark" ? "rgb(99, 184, 251)" : "rgb(23, 101, 150)",
    );
  }
  await editor.fill("print('wrong')");
  await page.getByRole("button", { name: "Проверить" }).click();
  await expect(page.locator(".execution-message.error")).toContainText(
    "Проверка не пройдена",
  );
  await expect(page.locator(".execution-message.error")).toContainText(
    "Пройдено 0/1 проверок",
  );
  await expect(page.locator(".execution-message.error")).toHaveCSS(
    "color",
    "rgb(180, 35, 24)",
  );
  await page
    .locator(".editor")
    .screenshot({ path: "../.local/editor-result-failed.png" });
  passed = true;
  await editor.fill("print('Hello, Python!')");
  await page.getByRole("button", { name: "Проверить" }).click();
  await expect(
    page.getByRole("button", { name: "Запустить локально" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Сбросить код" }),
  ).toBeDisabled();
  await expect(editor).toHaveAttribute("readonly", "");
  releaseVerification();
  await expect(page.locator(".execution-message.success")).toContainText(
    "Задание выполнено",
  );
  await expect(page.locator(".execution-message.success")).toContainText(
    "Пройдено 1/1 проверок",
  );
  await editor.focus();
  await editor.evaluate((element: HTMLTextAreaElement) =>
    element.setSelectionRange(0, 0),
  );
  await page
    .locator(".editor")
    .screenshot({ path: "../.local/editor-caret.png", caret: "initial" });
});
