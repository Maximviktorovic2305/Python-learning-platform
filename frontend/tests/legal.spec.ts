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

test("cookie preference persists and donation information supports mouse and keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Понятно", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Понятно", exact: true }),
  ).toHaveCount(0);
  const support = page.getByRole("button", {
    name: "Поддержать автора",
    exact: true,
  });
  await support.hover();
  await expect(
    page.getByRole("link", { name: "Поддержать донатом" }),
  ).toHaveAttribute("href", "https://tips.yandex.ru/guest/payment/9462891");
  await page.keyboard.press("Escape");
  await expect(support).toHaveAttribute("aria-expanded", "false");
  await page.mouse.move(0, 0);
  await page.getByRole("button", { name: "Cookie", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Понятно", exact: true }),
  ).toBeVisible();
  await expect(support).toHaveAttribute("aria-expanded", "false");
});
