import { test, expect, type Page } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

const user = {
  id: "recovery-flows-user",
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

async function session(page: Page, authenticated = true) {
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill(
      authenticated
        ? { json: { access_token: "test-token", user } }
        : { status: 401, json: { detail: "anonymous" } },
    ),
  );
  await page.route("**/api/users/me", (route) => route.fulfill({ json: user }));
  await page.route("**/api/projects/submissions", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/progress**", (route) =>
    route.fulfill({
      json: {
        user,
        lesson_ids: [],
        exercise_ids: [],
        quiz_ids: [],
        completed_topics: [],
        continue_topic: null,
        course_percent: 0,
        level_percent: {},
        module_percent: {},
        daily_xp: 0,
        activity: [],
        weak_topics: [],
        week_xp: [0, 0, 0, 0, 0, 0, 0],
      },
    }),
  );
}

async function dismissNotice(page: Page) {
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
}

test("credentials entered before hydration remain valid when the form becomes interactive", async ({
  page,
}) => {
  await session(page, false);
  let booted = false;
  await page.route("**/api/auth/refresh", (route) => {
    booted = true;
    return route.fulfill({ status: 401, json: { detail: "anonymous" } });
  });
  let release!: () => void;
  const scripts = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_next/static/chunks/*.js*", async (route) => {
    await scripts;
    await route.continue();
  });
  try {
    await page.goto("/login", { waitUntil: "commit" });
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    await page
      .getByLabel("Пароль", { exact: true })
      .fill("recovery-password-1234");
  } finally {
    release();
  }
  await expect.poll(() => booted).toBe(true);
  await expect(
    page.getByRole("button", { name: "Войти в лабораторию", exact: true }),
  ).toBeEnabled();
});

for (const failure of ["server", "network", "rate-limit"]) {
  test(`login can retry a ${failure} failure without changing valid credentials`, async ({
    page,
  }) => {
    await session(page, false);
    let requests = 0;
    await page.route("**/api/auth/login", (route) => {
      requests += 1;
      if (requests > 1)
        return route.fulfill({ json: { access_token: "test-token", user } });
      if (failure === "network") return route.abort("failed");
      return route.fulfill({
        status: failure === "server" ? 503 : 429,
        json: { detail: "private server diagnostic" },
      });
    });
    await page.goto("/login");
    await dismissNotice(page);
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    await page
      .getByLabel("Пароль", { exact: true })
      .fill("recovery-password-1234");
    const submit = page.getByRole("button", {
      name: "Войти в лабораторию",
      exact: true,
    });
    await submit.click();
    await expect(page.locator(".form-error")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      "private server diagnostic",
    );
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page).toHaveURL("/dashboard");
    expect(requests).toBe(2);
  });
}

for (const target of [
  { path: "/profile", endpoint: "**/api/users/me", ready: "Имя пользователя" },
  {
    path: "/achievements",
    endpoint: "**/api/achievements",
    ready: "Первая строка",
  },
  { path: "/projects", endpoint: "**/api/projects", ready: "Что построить" },
  {
    path: "/learn/first-program?tab=practice",
    endpoint: "**/api/exercises?*",
    ready: "Редактор Python",
  },
]) {
  test(`${target.path} recovers after a failed read without reloading`, async ({
    page,
  }) => {
    await session(page);
    let failed = true;
    await page.route(target.endpoint, (route) => {
      if (failed)
        return route.fulfill({
          status: 503,
          json: { detail: "Сервис временно недоступен" },
        });
      if (target.path === "/profile") return route.fulfill({ json: user });
      if (target.path === "/achievements")
        return route.fulfill({
          json: [
            {
              id: "first",
              title: "Первая строка",
              description: "Первый шаг",
              threshold: 1,
              earned_at: null,
            },
          ],
        });
      return route.continue();
    });
    await page.goto(target.path);
    await dismissNotice(page);
    await expect(
      page.getByRole("alert").filter({ hasText: "Сервис временно недоступен" }),
    ).toBeVisible();
    failed = false;
    await page.getByRole("button", { name: "Повторить", exact: true }).click();
    if (target.path === "/profile" || target.path.includes("tab=practice"))
      await expect(
        page.getByLabel(target.ready, { exact: true }),
      ).toBeVisible();
    else
      await expect(
        page.getByRole("heading", { name: target.ready, exact: true }).first(),
      ).toBeVisible();
  });
}

test("profile can retry a temporary save failure with the same values", async ({
  page,
}) => {
  await session(page);
  let requests = 0;
  await page.route("**/api/users/me", (route) => {
    if (route.request().method() !== "PATCH")
      return route.fulfill({ json: user });
    requests += 1;
    return route.fulfill(
      requests === 1
        ? { status: 503, json: { detail: "private server diagnostic" } }
        : { json: { ...user, daily_goal: 150 } },
    );
  });
  await page.goto("/profile");
  await dismissNotice(page);
  await page.getByLabel("Ежедневная цель, XP", { exact: true }).fill("150");
  const submit = page.getByRole("button", { name: "Сохранить изменения" });
  await submit.click();
  await expect(page.locator(".form-error")).toBeVisible();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(
    page.getByRole("status").filter({ hasText: "Профиль сохранён" }),
  ).toBeVisible();
  expect(requests).toBe(2);
});

test("registration retries a temporary failure with valid fields and consents", async ({
  page,
}) => {
  await session(page, false);
  let requests = 0;
  await page.route("**/api/auth/register", (route) => {
    requests += 1;
    return route.fulfill(
      requests === 1
        ? { status: 503, json: { detail: "private server diagnostic" } }
        : { status: 201, json: { access_token: "test-token", user } },
    );
  });
  await page.goto("/register");
  await dismissNotice(page);
  await page
    .getByLabel("Имя пользователя", { exact: true })
    .fill(user.username);
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("recovery-password-1234");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  const submit = page.getByRole("button", {
    name: "Создать аккаунт",
    exact: true,
  });
  await submit.click();
  await expect(page.locator(".form-error")).toBeVisible();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page).toHaveURL("/dashboard");
  expect(requests).toBe(2);
});

test("password change retries a temporary failure then ends the session", async ({
  page,
}) => {
  await session(page);
  let requests = 0;
  await page.route("**/api/users/me/password", (route) => {
    requests += 1;
    return route.fulfill(
      requests === 1
        ? { status: 503, json: { detail: "private server diagnostic" } }
        : { json: { message: "Пароль изменён" } },
    );
  });
  await page.goto("/profile");
  await dismissNotice(page);
  await page
    .getByLabel("Текущий пароль", { exact: true })
    .fill("recovery-password-1234");
  await page
    .getByLabel("Новый пароль", { exact: true })
    .fill("changed-password-1234");
  const submit = page.getByRole("button", {
    name: "Изменить пароль",
    exact: true,
  });
  await submit.click();
  await expect(page.locator(".form-error")).toBeVisible();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page).toHaveURL("/login");
  expect(requests).toBe(2);
});

for (const result of [
  {
    status: "passed",
    title: "Задание выполнено",
    message: "+30 XP",
    badge: "OK",
  },
  {
    status: "failed",
    title: "Проверка не пройдена",
    message: "Попробуйте ещё раз",
    badge: "ERROR",
  },
  {
    status: "error",
    title: "Не удалось выполнить действие",
    message: "XP не начислен",
    badge: "ERROR",
  },
  {
    status: "timeout",
    title: "Не удалось выполнить действие",
    message: "Проверка остановлена по лимиту времени",
    badge: "TIMEOUT",
  },
]) {
  test(`verification ${result.status} explains the result with accessible colors in both themes`, async ({
    page,
  }) => {
    await session(page);
    await page.route("**/api/exercises/*/submit", (route) =>
      route.fulfill({
        json: {
          status: result.status,
          stdout: result.status === "passed" ? "Hello, Python!\n" : "",
          stderr:
            result.status === "passed" ? "" : "Проверка завершена с ошибкой.",
          passed: result.status === "passed" ? 1 : 0,
          total: 1,
          xp: result.status === "passed" ? 30 : 0,
        },
      }),
    );
    await page.goto("/learn/first-program?tab=practice");
    await dismissNotice(page);
    await page
      .getByLabel("Редактор Python", { exact: true })
      .fill("print('Hello, Python!')");
    await page.getByRole("button", { name: "Проверить · +30 XP" }).click();
    const message = page.locator(".execution-message");
    await expect(message).toContainText(result.title);
    await expect(message).toContainText(result.message);
    await expect(message).toHaveClass(
      result.status === "passed" ? /success/ : /error/,
    );
    await expect(page.locator(".editor-output .tag")).toHaveText(result.badge);
    for (const theme of ["dark", "light"]) {
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page
          .getByRole("button", { name: "Переключить тему", exact: true })
          .click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        audit.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map(({ target, failureSummary }) => ({
            target,
            failureSummary,
          })),
        })),
        `${result.status} ${theme}`,
      ).toEqual([]);
    }
  });
}

test("project submission can retry a temporary save failure without editing the work", async ({
  page,
}) => {
  await session(page);
  let requests = 0;
  await page.route("**/api/projects/*/submissions", (route) => {
    requests += 1;
    return route.fulfill(
      requests === 1
        ? { status: 503, json: { detail: "private server diagnostic" } }
        : {
            json: {
              id: "submission",
              project_id: "01-cli",
              repository_url: "https://github.com/example/project",
              notes: "Implemented a project. Run python main.py.",
              status: "submitted",
            },
          },
    );
  });
  await page.goto("/projects");
  await dismissNotice(page);
  await page
    .getByText("Отправить свою работу", { exact: true })
    .first()
    .click();
  await page
    .getByLabel("Ссылка на репозиторий", { exact: true })
    .first()
    .fill("https://github.com/example/project");
  await page
    .getByLabel("Что реализовано и как запустить", { exact: true })
    .first()
    .fill("Implemented a project. Run python main.py.");
  const submit = page.getByRole("button", { name: "Сохранить работу" }).first();
  await submit.click();
  await expect(page.locator(".form-error")).toBeVisible();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(
    page.getByRole("status").filter({ hasText: "Работа сохранена" }),
  ).toBeVisible();
  expect(requests).toBe(2);
});

test("Tab cannot change the submitted Python code while verification is pending", async ({
  page,
}) => {
  await session(page);
  let started = false;
  let release!: () => void;
  const finished = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/exercises/*/submit", async (route) => {
    started = true;
    await finished;
    await route.fulfill({
      json: {
        status: "passed",
        stdout: "Hello, Python!\n",
        stderr: "",
        passed: 1,
        total: 1,
        xp: 30,
      },
    });
  });
  await page.goto("/learn/first-program?tab=practice");
  await dismissNotice(page);
  const editor = page.getByLabel("Редактор Python", { exact: true });
  const source = "print('Hello, Python!')";
  await editor.fill(source);
  await page.getByRole("button", { name: "Проверить · +30 XP" }).click();
  await expect.poll(() => started).toBe(true);
  await editor.press("Tab");
  const value = await editor.inputValue();
  release();
  expect(value).toBe(source);
  await expect(
    page.getByRole("status").filter({ hasText: "+30 XP" }),
  ).toBeVisible();
});

test("completed course and a long username fit the mobile dashboard", async ({
  page,
}) => {
  await session(page);
  const completedUser = { ...user, username: "a".repeat(40), total_xp: 4650 };
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({
      json: { access_token: "test-token", user: completedUser },
    }),
  );
  await page.route("**/api/progress**", (route) =>
    route.fulfill({
      json: {
        user: completedUser,
        lesson_ids: Array.from({ length: 15 }, (_, i) => `topic-${i}`),
        exercise_ids: Array.from({ length: 120 }, (_, i) => `task-${i}`),
        quiz_ids: [],
        completed_topics: Array.from({ length: 15 }, (_, i) => `topic-${i}`),
        continue_topic: null,
        course_percent: 100,
        level_percent: {},
        module_percent: {},
        daily_xp: 4650,
        activity: [],
        weak_topics: [],
        week_xp: [0, 0, 0, 0, 0, 0, 4650],
      },
    }),
  );
  await page.goto("/dashboard");
  await dismissNotice(page);
  await expect(
    page.getByRole("heading", { name: "Все опубликованные темы пройдены" }),
  ).toBeVisible();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const continueButton = page.locator(".continue-panel .button");
    await continueButton.evaluate((element) =>
      element.scrollIntoView({ block: "end", behavior: "instant" }),
    );
    const supportButton = page.getByRole("button", {
      name: "Поддержать автора",
      exact: true,
    });
    const continuation = await continueButton.boundingBox();
    const support = await supportButton.boundingBox();
    expect(continuation).not.toBeNull();
    expect(support).not.toBeNull();
    expect(
      continuation!.x < support!.x + support!.width &&
        continuation!.x + continuation!.width > support!.x &&
        continuation!.y < support!.y + support!.height &&
        continuation!.y + continuation!.height > support!.y,
    ).toBe(false);
    await page.screenshot({
      path: `../.local/full-audit-dashboard-completed-${width}.png`,
      fullPage: true,
    });
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll("main *")]
        .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
        .map((el) => ({
          tag: el.tagName,
          class: el.className,
          width: el.getBoundingClientRect().width,
        })),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      JSON.stringify(overflow.slice(0, 8)),
    ).toBe(true);
  }
});

test("legal document cards fit a narrow mobile screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/legal-documents");
  await dismissNotice(page);
  await expect(
    page.getByRole("heading", { name: "Правовые документы", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
