import { expect, test } from "@playwright/test";

test("new visitors see the light theme even when the OS uses dark mode", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(247, 248, 250)",
  );
});

for (const theme of ["dark", "light"] as const) {
  test(`saved ${theme} theme is applied before hydration and survives reload`, async ({
    page,
  }) => {
    await page.addInitScript((savedTheme) => {
      localStorage.setItem("theme", savedTheme);
    }, theme);
    // Delay application scripts to expose a theme that is applied only on mount.
    await page.route("**/_next/static/**/*.js", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.continue();
    });
    for (let visit = 0; visit < 2; visit++) {
      if (visit === 0) await page.goto("/", { waitUntil: "commit" });
      else await page.reload({ waitUntil: "commit" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator("html")).toHaveCSS(
        "background-color",
        theme === "dark" ? "rgb(12, 16, 21)" : "rgb(247, 248, 250)",
      );
      await expect(page.locator("body")).toHaveCSS(
        "background-color",
        theme === "dark" ? "rgb(12, 16, 21)" : "rgb(247, 248, 250)",
      );
    }
  });
}
