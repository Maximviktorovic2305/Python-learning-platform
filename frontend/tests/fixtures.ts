import { test as base, expect as baseExpect } from "@playwright/test";

export { type Page } from "@playwright/test";
export const expect = baseExpect.configure({ timeout: 15000 });

let nextAuthRequestAt = 0;

export const test = base.extend<{ authRequestBudget: void }>({
  authRequestBudget: [
    async ({ context }, use) => {
      // Respect the real API's 30 requests/minute limit across browser scenarios.
      // The application limiter remains enabled during the entire test suite.
      await context.route("**/api/auth/**", async (route) => {
        const now = Date.now();
        const delay = Math.max(0, nextAuthRequestAt - now);
        nextAuthRequestAt = now + delay + 2100;
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        await route.continue();
      });
      await use();
    },
    { auto: true },
  ],
});
