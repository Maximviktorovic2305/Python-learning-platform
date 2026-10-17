import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

test("public pages meet automated WCAG checks in both themes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const theme of ["dark", "light"]) {
    await page.goto("/");
    await page.evaluate((value) => localStorage.setItem("theme", value), theme);
    for (const route of [
      "/",
      "/curriculum",
      "/learn/academy-introduction",
      "/login",
      "/projects",
      "/private-policy",
      "/cookie-policy",
      "/data-consent",
      "/user-agreement",
    ]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map(({ id, nodes }) => ({
          id,
          nodes: nodes.map(({ target, failureSummary }) => ({
            target,
            failureSummary,
          })),
        })),
        `${theme} ${route}`,
      ).toEqual([]);
    }
  }
});
