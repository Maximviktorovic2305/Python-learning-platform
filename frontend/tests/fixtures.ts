import { test as base, expect as baseExpect } from "@playwright/test";

export { type Page } from "@playwright/test";
export const expect = baseExpect.configure({ timeout: 15000 });

let nextAuthRequestAt = 0;
let authDispatch = Promise.resolve();

export const test = base.extend<{ authRequestBudget: void }>({
  authRequestBudget: [
    async ({ context }, use) => {
      let disposed = false;
      // Respect the real API's 30 requests/minute limit across browser scenarios.
      // The application limiter remains enabled during the entire test suite.
      await context.route("**/api/auth/**", async (route) => {
        const dispatch = authDispatch.then(async () => {
          if (disposed) return;
          const delay = Math.max(0, nextAuthRequestAt - Date.now());
          if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
          if (disposed) return;
          // Only dispatched requests consume the budget; closed pages do not.
          nextAuthRequestAt = Date.now() + 2100;
          await route.continue();
        });
        authDispatch = dispatch.catch(() => undefined);
        await dispatch;
      });
      await use();
      disposed = true;
    },
    { auto: true },
  ],
});
