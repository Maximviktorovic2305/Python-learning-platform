import { expect, test } from "./fixtures";

test("registration requires two separate unchecked consents and login remains available", async ({
  page,
}) => {
  await page.goto("/register");
  const terms = page.locator('input[name="acceptTerms"]');
  const processing = page.locator('input[name="acceptDataProcessing"]');
  await expect(terms).not.toBeChecked();
  await expect(processing).not.toBeChecked();
  await expect(terms).toHaveAttribute("required", "");
  await expect(processing).toHaveAttribute("required", "");
  await terms.check();
  await expect(processing).not.toBeChecked();
  await page.goto("/login");
  await expect(page.locator('input[name="acceptTerms"]')).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Конфиденциальность", exact: true }),
  ).toBeVisible();
});

test("cookie notice persists and donation information supports mouse and keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("complementary", { name: "Информация о cookie" }),
  ).toHaveCSS("position", "fixed");
  await expect(
    page.getByRole("heading", { name: "Мы используем cookie" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Только необходимые" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Понятно", exact: true }),
  ).toHaveCount(0);
  const support = page.getByRole("button", {
    name: "Поддержать автора",
    exact: true,
  });
  await expect(support.locator("..")).toHaveCSS("position", "fixed");
  await support.hover();
  await expect(
    page.getByRole("link", { name: "Поддержать донатом" }),
  ).toHaveAttribute("href", "https://tips.yandex.ru/guest/payment/9462891");
  await page.keyboard.press("Escape");
  await expect(support).toHaveAttribute("aria-expanded", "false");
  await page.mouse.move(0, 0);
  await expect(
    page.getByRole("button", { name: "Cookie", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("footer .author-support")).toHaveAttribute(
    "href",
    "https://tips.yandex.ru/guest/payment/9462891",
  );
});
