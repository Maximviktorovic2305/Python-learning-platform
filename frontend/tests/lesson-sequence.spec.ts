import { test, expect } from "@playwright/test";
import type { Course } from "../src/entities/course";
import { allTopics } from "../src/entities/course";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({ status: 401, json: { detail: "anonymous" } }),
  );
});

test("every published lesson follows the five stages using footer buttons", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/courses/python");
  expect(response.ok()).toBe(true);
  const course: Course = await response.json();
  const topics = allTopics(course).filter((topic) => topic.published);
  expect(topics).toHaveLength(15);
  for (const [index, topic] of topics.entries()) {
    await page.goto(`/learn/${topic.id}`);
    const notice = page.getByRole("button", { name: "Понятно", exact: true });
    if (await notice.isVisible()) await notice.click();
    const assertStage = async (name: string) => {
      const tab = page.getByRole("tab", { name, exact: true });
      await expect(tab).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("tabpanel")).toHaveAttribute(
        "aria-labelledby",
        (await tab.getAttribute("id")) as string,
      );
    };
    await assertStage("Теория");
    const theory = page.locator(".theory-content");
    await expect(theory.locator("section")).toHaveCount(5);
    expect(await theory.locator("section p").count()).toBeGreaterThan(5);
    await expect(theory.locator(".code-block")).toHaveCount(1);
    for (const paragraph of await theory.locator("section p").all())
      expect(await paragraph.textContent()).not.toContain("`");
    await page
      .getByRole("button", { name: "Перейти к примерам", exact: true })
      .click();
    await assertStage("Примеры");
    await expect(
      page.getByRole("tab", { name: "Примеры", exact: true }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Перейти к практике", exact: true })
      .click();
    await assertStage("Практика");
    await expect(
      page.getByRole("textbox", { name: "Редактор Python", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Перейти к тесту", exact: true })
      .click();
    await assertStage("Тест");
    await page
      .getByRole("button", { name: "Перейти к закреплению", exact: true })
      .click();
    await assertStage("Закрепление");
    const nextTopic = topics[index + 1];
    if (nextTopic)
      await expect(page.locator(".review-content .button")).toHaveAttribute(
        "href",
        `/learn/${nextTopic.id}`,
      );
    else await expect(page.locator(".review-content .button")).toHaveCount(0);
    for (const name of ["Тест", "Практика", "Примеры", "Теория"]) {
      await page
        .getByRole("button", { name: `Назад: ${name}`, exact: true })
        .click();
      await assertStage(name);
    }
  }
});

test("theory code blocks preserve Python source and tabs support keyboard navigation on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn/variables-types");
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  const code = page.locator(".theory-content .code-block code");
  await expect(code).toContainText("a = 7");
  await expect(code).toContainText("print(a, b)");
  const theory = page.getByRole("tab", { name: "Теория", exact: true });
  await theory.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("tab", { name: "Закрепление", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(theory).toBeFocused();
  await expect(theory).toHaveAttribute("aria-selected", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
