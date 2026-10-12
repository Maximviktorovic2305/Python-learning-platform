import { expect, test } from "@playwright/test";

test("browser Python can print but cannot reach authenticated API routes", async ({
  page,
}) => {
  const apiResponses: string[] = [];
  page.on("response", (response) => {
    if (response.url().endsWith("/api/health"))
      apiResponses.push(response.url());
  });
  await page.goto("/learn/first-program");
  await page.getByRole("tab", { name: "Практика", exact: true }).click();
  const editor = page.getByLabel("Редактор Python");
  await editor.fill("print('local Python works')");
  await page.getByRole("button", { name: "Запустить локально" }).click();
  await expect(page.locator(".editor-output pre").first()).toHaveText(
    "local Python works\n",
    { timeout: 50000 },
  );
  await editor.fill("from js import fetch\nawait fetch('/api/health')");
  await page.getByRole("button", { name: "Запустить локально" }).click();
  await expect(page.locator(".execution-error")).toContainText(
    "Failed to fetch",
    { timeout: 50000 },
  );
  expect(apiResponses).toEqual([]);
});
