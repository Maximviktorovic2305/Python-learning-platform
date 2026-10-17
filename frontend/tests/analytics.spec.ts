import { test, expect, type Page } from "@playwright/test";
import {
  HAS_ANALYTICS,
  YANDEX_METRIKA_ID,
} from "../src/shared/config/analytics";

const key = "privacy-choice-2026-10-13";
const sdk = `const queued = window.ym?.a ?? [];
window.__metrikaCalls = [];
window.ym = (...args) => window.__metrikaCalls.push(args);
for (const args of queued) window.ym(...args);`;
async function calls(page: Page, method: string) {
  return page.evaluate((command) => {
    const state = window as unknown as { __metrikaCalls?: unknown[][] };
    return (state.__metrikaCalls ?? []).filter((args) => args[1] === command);
  }, method);
}

test.beforeEach(async ({ page, context }) => {
  test.skip(
    !HAS_ANALYTICS,
    "Set NEXT_PUBLIC_YANDEX_METRIKA_ID for analytics checks",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await context.route("**/api/auth/refresh", (route) =>
    route.fulfill({ status: 401, json: { detail: "anonymous" } }),
  );
  await context.route("https://mc.yandex.ru/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: sdk }),
  );
});

test("essential choice never loads analytics and survives reload", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://mc.yandex.ru/"))
      requests.push(request.url());
  });
  await page.goto("/tasks");
  const consent = page.getByRole("checkbox", { name: /Разрешаю аналитику/ });
  await expect(consent).not.toBeChecked();
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await page
    .getByRole("link", { name: "Следующая задача", exact: true })
    .click();
  await expect(page.getByLabel("Редактор Python")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Редактор Python")).toBeVisible();
  expect(requests).toEqual([]);
  expect(await page.evaluate((name) => localStorage.getItem(name), key)).toBe(
    "essential",
  );
});

test("opt in initializes once and records SPA routes without URL secrets", async ({
  page,
}) => {
  await page.goto("/tasks?token=do-not-transmit#private");
  await page.getByRole("checkbox", { name: /Разрешаю аналитику/ }).check();
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await expect.poll(() => calls(page, "init")).toHaveLength(1);
  const initialization = (await calls(page, "init"))[0]!;
  expect(initialization[0]).toBe(YANDEX_METRIKA_ID);
  expect(initialization[2]).toMatchObject({
    ssr: true,
    defer: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    accurateTrackBounce: true,
    trackLinks: true,
  });
  await expect.poll(() => calls(page, "hit")).toHaveLength(1);
  await page
    .getByRole("link", { name: "Следующая задача", exact: true })
    .click();
  await expect.poll(() => calls(page, "hit")).toHaveLength(2);
  expect((await calls(page, "hit"))[1]![2]).toMatch(/\/tasks\/trainer-02$/);
  expect(JSON.stringify(await calls(page, "init"))).not.toContain(
    "do-not-transmit",
  );
  expect(JSON.stringify(await calls(page, "hit"))).not.toContain("private");
  expect(await calls(page, "init")).toHaveLength(1);
  await expect(
    page.locator('script[src^="https://mc.yandex.ru/metrika/tag.js"]'),
  ).toHaveCount(1);
});

test("stored analytics consent starts the counter on a direct visit", async ({
  page,
}) => {
  await page.addInitScript(
    (name) => localStorage.setItem(name, "analytics"),
    key,
  );
  await page.goto("/tasks/trainer-24");
  await expect.poll(() => calls(page, "init")).toHaveLength(1);
  await expect.poll(() => calls(page, "hit")).toHaveLength(1);
  expect((await calls(page, "hit"))[0]![2]).toMatch(/\/tasks\/trainer-24$/);
});

test("cookie settings revoke consent and reload without starting the counter", async ({
  page,
}) => {
  await page.goto("/cookie-policy");
  await page.getByRole("checkbox", { name: /Разрешаю аналитику/ }).check();
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await expect.poll(() => calls(page, "init")).toHaveLength(1);
  await page
    .getByRole("button", { name: "Настройки аналитики и cookie", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /Разрешаю аналитику/ }).uncheck();
  const loaded = page.waitForEvent("domcontentloaded");
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await loaded;
  await expect(
    page.getByRole("button", {
      name: "Настройки аналитики и cookie",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate((name) => localStorage.getItem(name), key)).toBe(
    "essential",
  );
  await expect(page.locator("#yandex-metrika-sdk")).toHaveCount(0);
  expect(await calls(page, "init")).toHaveLength(0);
});

test("revocation in another tab destroys an active counter", async ({
  page,
}) => {
  await page.goto("/tasks");
  await page.getByRole("checkbox", { name: /Разрешаю аналитику/ }).check();
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await expect.poll(() => calls(page, "init")).toHaveLength(1);
  const other = await page.context().newPage();
  await other.goto("/cookie-policy");
  await other.evaluate((name) => localStorage.setItem(name, "essential"), key);
  await expect.poll(() => calls(page, "destruct")).toHaveLength(1);
  const previous = (await calls(page, "hit")).length;
  await page
    .getByRole("link", { name: "Следующая задача", exact: true })
    .click();
  await expect(page.getByLabel("Редактор Python")).toBeVisible();
  expect(await calls(page, "hit")).toHaveLength(previous);
});

test("a blocked analytics script does not break navigation or editing", async ({
  page,
}) => {
  await page.route("https://mc.yandex.ru/**", (route) =>
    route.abort("blockedbyclient"),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tasks");
  await page.getByRole("checkbox", { name: /Разрешаю аналитику/ }).check();
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await page
    .getByRole("link", { name: "Следующая задача", exact: true })
    .click();
  await expect(page).toHaveURL((url) => url.pathname === "/tasks/trainer-02");
  await expect(
    page.getByRole("heading", { level: 2, name: "Сумма цифр", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Редактор Python").fill("print('works')");
  await expect(page.getByLabel("Редактор Python")).toHaveValue(
    "print('works')",
  );
  expect(errors).toEqual([]);
});

test("removing stored consent in another tab stops analytics", async ({
  page,
}) => {
  await page.goto("/cookie-policy");
  await page.getByRole("checkbox", { name: /Разрешаю аналитику/ }).check();
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await expect.poll(() => calls(page, "init")).toHaveLength(1);
  const other = await page.context().newPage();
  await other.goto("/cookie-policy");
  await other.evaluate((name) => localStorage.removeItem(name), key);
  await expect.poll(() => calls(page, "destruct")).toHaveLength(1);
  await expect(
    page.getByRole("checkbox", { name: /Разрешаю аналитику/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /Разрешаю аналитику/ }),
  ).not.toBeChecked();
});

test("a changed choice applies when storage writes are blocked", async ({
  page,
}) => {
  await page.addInitScript((choiceKey) => {
    localStorage.setItem(choiceKey, "essential");
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === choiceKey)
        throw new DOMException("Storage is blocked", "QuotaExceededError");
      setItem.call(this, name, value);
    };
  }, key);
  await page.goto("/cookie-policy");
  await page
    .getByRole("button", { name: "Настройки аналитики и cookie", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /Разрешаю аналитику/ }).check();
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await expect.poll(() => calls(page, "init")).toHaveLength(1);
  expect(await page.evaluate((name) => localStorage.getItem(name), key)).toBe(
    "essential",
  );
  await page
    .getByRole("button", { name: "Настройки аналитики и cookie", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /Разрешаю аналитику/ }),
  ).toBeChecked();
});

test("recording excludes source code, input and account forms", async ({
  page,
}) => {
  await page.goto("/tasks");
  for (const label of ["Редактор Python", "Входные данные для input()"])
    expect(
      await page
        .getByLabel(label)
        .evaluate((element) => Boolean(element.closest(".ym-hide-content"))),
    ).toBe(true);
  await page.goto("/register");
  await expect(
    page.locator("form.ym-hide-content.ym-disable-submit"),
  ).toHaveCount(1);
});
