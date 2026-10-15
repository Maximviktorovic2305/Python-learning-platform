import { test, expect, type Page } from "./fixtures";

async function register(page: Page, prefix: string) {
  const username = `${prefix}_${Date.now()}`;
  await page.goto("/register");
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await page.getByLabel("Имя пользователя").fill(username);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${username}@example.com`);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("query-test-password-1234");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  const registered = page.waitForResponse((response) =>
    response.url().endsWith("/api/auth/register"),
  );
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  const cookie = await (await registered).headerValue("set-cookie");
  expect(/\bHttpOnly\b/i.test(cookie ?? "")).toBe(true);
  expect(/\bSameSite=Strict\b/i.test(cookie ?? "")).toBe(true);
  expect(/\bPath=\/api\/auth\b/i.test(cookie ?? "")).toBe(true);
  await expect(
    page.getByRole("heading", { name: `Привет, ${username}.` }),
  ).toBeVisible();
  return username;
}

test("tabs serialize refresh and logout clears every tab without storing tokens", async ({
  page,
  context,
  browserName,
}) => {
  const username = await register(page, "tabs");
  const other = await context.newPage();
  await Promise.all([page.reload(), other.goto("/dashboard")]);
  for (const tab of [page, other]) {
    await expect(
      tab.getByRole("heading", { name: `Привет, ${username}.` }),
    ).toBeVisible();
    const stored = await tab.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
      cookie: document.cookie,
    }));
    expect(
      [...stored.local, ...stored.session].filter((key) =>
        /token|session|auth/i.test(key),
      ),
    ).toEqual([]);
    expect(stored.cookie).not.toContain("refresh=");
  }
  const refreshCookie = (await context.cookies()).find(
    (cookie) => cookie.name === "refresh",
  );
  expect(refreshCookie?.httpOnly).toBe(true);
  // SameSite is checked on the wire in register(): Windows WebKit reports None
  // in its cookie inspector even when the response specifies Strict.
  if (browserName !== "webkit" || process.platform !== "win32")
    expect(refreshCookie?.sameSite).toBe("Strict");
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL("/login");
  await expect(other).toHaveURL("/login");
  for (const tab of [page, other]) {
    await tab.goto("/curriculum");
    await expect(
      tab.getByRole("link", { name: "Создать аккаунт", exact: true }),
    ).toBeVisible();
    await expect(tab.locator(".sidebar-user")).toHaveCount(0);
  }
});

test("an expired session removes the private UI and cache", async ({
  page,
}) => {
  await register(page, "expired");
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "Ваша точка отсчёта." }),
  ).toBeVisible();
  await page.route("**/api/users/me", async (route) => {
    await route.fulfill({ status: 401, json: { detail: "expired" } });
  });
  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({ status: 401, json: { detail: "expired" } });
  });
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(page).toHaveURL("/login");
  await expect(page.locator(".sidebar-user")).toHaveCount(0);
  await page.goto("/curriculum");
  await expect(
    page.getByRole("link", { name: "Создать аккаунт", exact: true }),
  ).toBeVisible();
});

test("cached navigation preserves the shell and never inserts skeletons or a second header", async ({
  page,
}) => {
  const username = await register(page, "cache");
  const routes = [
    {
      name: "Программа курса",
      path: "/curriculum",
      title: "Твой маршрут в Python.",
    },
    { name: "Практика", path: "/practice", title: "Территория практики." },
    {
      name: "Проекты",
      path: "/projects",
      title: "От знаний к работающим вещам.",
    },
    {
      name: "Достижения",
      path: "/achievements",
      title: "Каждый шаг имеет значение.",
    },
    { name: "Профиль", path: "/profile", title: "Ваша точка отсчёта." },
    { name: "Мой прогресс", path: "/dashboard", title: `Привет, ${username}.` },
  ];
  await page.getByRole("link", { name: "Начать первый урок" }).click();
  await expect(
    page.getByRole("heading", { name: "Первая программа и инструменты" }),
  ).toBeVisible();
  // SSR theory can appear before the client exercise query starts. Warm the
  // actual practice data before checking that revisits use the cache.
  await page.getByRole("tab", { name: "Практика", exact: true }).click();
  await expect(
    page.getByLabel("Редактор Python", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Теория", exact: true }).click();
  await expect(page.locator("main .skeleton")).toHaveCount(0);
  for (const { name, path, title } of routes) {
    await page
      .getByRole("navigation", { name: "Навигация кабинета" })
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page).toHaveURL(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.locator("main .skeleton")).toHaveCount(0);
  }
  const reads: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "GET" &&
      new URL(request.url()).pathname.startsWith("/api/")
    )
      reads.push(new URL(request.url()).pathname);
  });
  await page.locator(".app-sidebar").evaluate((el) => {
    el.setAttribute("data-persistent", "yes");
  });
  await page.evaluate(() => {
    document.documentElement.dataset.skeletonSeen = "no";
    const observer = new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (
            node instanceof Element &&
            (node.matches(".page-skeleton, .skeleton") ||
              node.querySelector(".page-skeleton, .skeleton"))
          )
            document.documentElement.dataset.skeletonSeen = "yes";
        }
    });
    observer.observe(document.querySelector("main")!, {
      childList: true,
      subtree: true,
    });
  });
  for (const { name, path, title } of routes) {
    await page
      .getByRole("navigation", { name: "Навигация кабинета" })
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page).toHaveURL(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".app-topbar")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator(".app-shell")).toHaveCount(1);
    await expect(page.locator(".app-sidebar")).toHaveAttribute(
      "data-persistent",
      "yes",
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-skeleton-seen",
      "no",
    );
  }
  await page.getByRole("link", { name: "Начать первый урок" }).click();
  await expect(page).toHaveURL("/learn/first-program");
  await expect(
    page.getByRole("heading", { name: "Первая программа и инструменты" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-skeleton-seen",
    "no",
  );
  await expect(page.locator(".app-topbar")).toHaveCount(1);
  await expect(page.locator(".app-sidebar")).toHaveAttribute(
    "data-persistent",
    "yes",
  );
  // Progress refreshes in the background so another device cannot leave a
  // recently visited page showing old completion or XP. Public content stays cached.
  expect(reads.length).toBeGreaterThan(0);
  expect(reads.every((path) => path === "/api/progress")).toBe(true);
});

test("logout clears cached account data even when the server fails and an old save arrives late", async ({
  page,
}) => {
  const oldUser = await register(page, "oldcache");
  await page
    .getByRole("navigation", { name: "Навигация кабинета" })
    .getByRole("link", { name: "Профиль", exact: true })
    .click();
  await expect(page.getByLabel("Имя пользователя")).toBeVisible();
  let releaseSave!: () => void;
  const saved = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  let saveStarted = false;
  await page.route("**/api/users/me", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    const response = await route.fetch();
    saveStarted = true;
    await saved;
    await route.fulfill({ response }).catch(() => {});
  });
  await page.getByLabel("Имя пользователя").fill(`updated_${Date.now()}`);
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect.poll(() => saveStarted).toBe(true);
  await page.route("**/api/auth/logout", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "temporarily unavailable" }),
    }),
  );
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  releaseSave();
  let refreshes = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/auth/refresh")) refreshes += 1;
  });
  await page
    .getByRole("navigation", { name: "Главная навигация" })
    .getByRole("link", { name: "Программа", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Твой маршрут в Python." }),
  ).toBeVisible();
  await expect(page.locator(".user-chip")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Создать аккаунт", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Создать аккаунт", exact: true })
    .click();
  const newUser = `newcache_${Date.now()}`;
  await page.getByLabel("Имя пользователя").fill(newUser);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${newUser}@example.com`);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill("query-test-password-1234");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(
    page.getByRole("heading", { name: `Привет, ${newUser}.` }),
  ).toBeVisible();
  await expect(page.locator(".user-chip strong")).toHaveText(newUser);
  await expect(page.locator("main")).not.toContainText(oldUser);
  expect(refreshes).toBe(0);
});
