import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { documentation } from "../src/views/stack/documentation";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({ status: 401, json: { detail: "anonymous" } }),
  );
});

test("cookie notice leaves sidebar navigation usable on phone, tablet and laptop", async ({
  page,
}) => {
  await page.goto("/tasks");
  const notice = page.getByRole("complementary", {
    name: "Информация о cookie",
  });
  const sidebar = page.locator(".app-sidebar");
  const menuToggle = page.getByRole("button", {
    name: "Навигация курса",
    exact: true,
  });
  for (const width of [320, 390, 640, 641, 768, 1024, 1366]) {
    await page.setViewportSize({ width, height: 600 });
    await expect(notice).toBeVisible();
    // WebKit can exclude its scrollbar when evaluating the CSS breakpoint.
    const mobileMenu = await menuToggle.isVisible();
    if (mobileMenu) {
      await menuToggle.click();
      await expect(menuToggle).toHaveAttribute("aria-expanded", "true");
    } else {
      const bounds = await notice.boundingBox();
      const menu = await sidebar.boundingBox();
      expect(menu!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x).toBeGreaterThanOrEqual(menu!.x + menu!.width);
    }
    await sidebar
      .getByRole("link", { name: "Правовые документы", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Правовые документы", exact: true }),
    ).toBeVisible();
    await expect(notice).toBeVisible();
    if (mobileMenu) {
      await expect(menuToggle).toHaveAttribute("aria-expanded", "false");
      await menuToggle.click();
    }
    await sidebar.getByRole("link", { name: "Задачи", exact: true }).click();
    await expect(page.getByLabel("Редактор Python")).toBeVisible();
  }
  await notice.getByRole("button", { name: "Понятно", exact: true }).click();
  await expect(notice).toBeHidden();
});

test("sidebar opens the legal documents page and each policy is available in the content", async ({
  page,
}) => {
  await page.goto("/stack");
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  const sidebar = page.locator(".app-sidebar");
  for (const name of [
    "Конфиденциальность",
    "Cookie",
    "Условия",
    "Согласие на данные",
  ])
    await expect(sidebar.getByRole("link", { name, exact: true })).toHaveCount(
      0,
    );
  await sidebar
    .getByRole("link", { name: "Правовые документы", exact: true })
    .click();
  await expect(page).toHaveURL("/legal-documents");
  await expect(
    page.getByRole("heading", { name: "Правовые документы", exact: true }),
  ).toBeVisible();
  await expect(
    sidebar.getByRole("link", { name: "Правовые документы", exact: true }),
  ).toHaveClass("selected");
  const policies = [
    {
      name: "Конфиденциальность",
      href: "/private-policy",
      title: "Политика конфиденциальности",
    },
    {
      name: "Cookie",
      href: "/cookie-policy",
      title: "Политика cookie",
    },
    {
      name: "Условия",
      href: "/user-agreement",
      title: "Условия использования",
    },
    {
      name: "Согласие на данные",
      href: "/data-consent",
      title: "Согласие на обработку персональных данных",
    },
  ];
  const documents = page.getByRole("navigation", {
    name: "Документы платформы",
  });
  await expect(documents.getByRole("link")).toHaveCount(4);
  for (const policy of policies) {
    const link = documents.getByRole("link", {
      name: new RegExp(`^${policy.name}`),
    });
    await expect(link).toHaveAttribute("href", policy.href);
    await link.click();
    await expect(page).toHaveURL(policy.href);
    await expect(
      page.getByRole("heading", { level: 1, name: policy.title, exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(documents).toBeVisible();
  }
});

for (const theme of ["light", "dark"]) {
  test(`technology icons, documentation links and legal page are accessible in ${theme} theme`, async ({
    page,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem("theme", value),
      theme,
    );
    await page.goto("/stack");
    await page.getByRole("button", { name: "Понятно", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const links = page.locator("main dt a");
    expect(await links.count()).toBeGreaterThan(50);
    for (const link of await links.all()) {
      const name = (await link.locator(":scope > span").textContent())!;
      await expect(link).toHaveAttribute("href", documentation[name]!.href);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      await expect(
        link.locator(":scope > svg:first-child, :scope > img:first-child"),
      ).toBeVisible();
    }
    const typescript = page.getByRole("link", {
      name: "TypeScript 5.9",
      exact: true,
    });
    await typescript.hover();
    await expect(typescript.locator("span")).toHaveCSS(
      "text-decoration-line",
      "underline",
    );
    await typescript.focus();
    await expect(typescript).toHaveCSS("outline-width", "1px");
    await expect(typescript.locator("span")).toHaveCSS(
      "text-decoration-line",
      "underline",
    );
    for (const route of ["/stack", "/legal-documents"]) {
      await page.goto(route);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map(({ id, nodes }) => ({
          id,
          nodes: nodes.map(({ target }) => target),
        })),
      ).toEqual([]);
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page
        .locator("main")
        .screenshot({ path: `../.local/${route.slice(1)}-${theme}.png` });
      await page.setViewportSize({ width: 1280, height: 720 });
    }
  });
}
