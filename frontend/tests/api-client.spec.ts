import { test, expect } from "@playwright/test";
import {
  api,
  endSession,
  refreshSession,
  revokeSession,
  subscribeSessionEnd,
  setAccessToken,
  unwrap,
} from "../src/shared/api/client";
import { createQueryClient } from "../src/shared/api/query-client";

test.describe("session request lifecycle", () => {
  const originalFetch = globalThis.fetch;
  test.beforeEach(() => {
    setAccessToken("initial-token");
  });
  test.afterEach(() => {
    endSession();
    globalThis.fetch = originalFetch;
  });

  test("retries a POST after refresh with its complete body and a fresh Request", async () => {
    const bodies: string[] = [];
    const headers: string[] = [];
    let refreshes = 0;
    globalThis.fetch = async (input) => {
      const request = input as Request;
      expect(request.cache).toBe("no-store");
      if (request.url.endsWith("/auth/refresh")) {
        refreshes += 1;
        return Response.json({
          access_token: "renewed-token",
          user: { id: "a" },
        });
      }
      bodies.push(await request.text());
      headers.push(request.headers.get("Authorization") ?? "");
      return bodies.length === 1
        ? Response.json({ detail: "expired" }, { status: 401 })
        : Response.json({ status: "passed", xp: 30 });
    };
    const code = 'print("Hello, Python!")';
    const result = unwrap(
      await api.POST("/api/exercises/{exercise_id}/submit", {
        params: { path: { exercise_id: "academy-introduction-e1" } },
        body: { code },
      }),
    );
    expect(result.status).toBe("passed");
    expect(bodies).toEqual([
      JSON.stringify({ code }),
      JSON.stringify({ code }),
    ]);
    expect(headers).toEqual(["Bearer initial-token", "Bearer renewed-token"]);
    expect(refreshes).toBe(1);
  });

  test("logout blocks refresh and discards a late refresh response", async () => {
    let resolveRefresh!: (value: Response) => void;
    let calls = 0;
    globalThis.fetch = async (input) => {
      calls += 1;
      return (input as Request).url.endsWith("/auth/refresh")
        ? new Promise<Response>((resolve) => {
            resolveRefresh = resolve;
          })
        : Response.json({ detail: "unauthorized" }, { status: 401 });
    };
    const refresh = refreshSession();
    expect(refreshSession()).toBe(refresh);
    await expect.poll(() => calls).toBe(1);
    endSession();
    resolveRefresh(
      Response.json({ access_token: "old-token", user: { id: "a" } }),
    );
    expect(await refresh).toBeNull();
    expect(await refreshSession()).toBeNull();
    const result = await api.GET("/api/users/me");
    expect(result.response.status).toBe(401);
    expect(calls).toBe(2);
  });

  test("logout keeps the session bearer for server revocation", async () => {
    let authorization: string | null = null;
    globalThis.fetch = async (input) => {
      authorization = (input as Request).headers.get("Authorization");
      return Response.json({ message: "logged out" });
    };
    await revokeSession(endSession());
    expect(authorization).toBe("Bearer initial-token");
    expect(await refreshSession()).toBeNull();
  });

  test("rejected refresh expires the session once and blocks further refresh", async () => {
    let ended = 0;
    let refreshes = 0;
    const unsubscribe = subscribeSessionEnd(() => {
      ended += 1;
    });
    globalThis.fetch = async (input) => {
      if ((input as Request).url.endsWith("/auth/refresh")) refreshes += 1;
      return Response.json({ detail: "expired" }, { status: 401 });
    };
    try {
      expect(await refreshSession()).toBeNull();
      expect(await refreshSession()).toBeNull();
      expect(ended).toBe(1);
      expect(refreshes).toBe(1);
    } finally {
      unsubscribe();
    }
  });

  test("late query and mutation responses cannot repopulate the cleared cache", async () => {
    const client = createQueryClient();
    const replies: Array<(value: Response) => void> = [];
    globalThis.fetch = async () =>
      new Promise<Response>((resolve) => {
        replies.push(resolve);
      });
    client.setQueryData(["progress", "a"], { xp: 42 });
    const query = client
      .fetchQuery({
        queryKey: ["delayed", "a"],
        queryFn: async ({ signal }) =>
          unwrap(await api.GET("/api/users/me", { signal })),
      })
      .catch((error: unknown) => error);
    const mutation = client
      .getMutationCache()
      .build(client, {
        mutationFn: async () =>
          unwrap(
            await api.PATCH("/api/users/me", {
              body: { username: "old-user", daily_goal: 100, timezone: "UTC" },
            }),
          ),
        onSuccess: () => {
          client.setQueryData(["progress", "a"], { xp: 99 });
        },
      })
      .execute(undefined)
      .catch((error: unknown) => error);
    await expect.poll(() => replies.length).toBe(2);
    endSession();
    await client.cancelQueries();
    client.clear();
    for (const reply of replies)
      reply(Response.json({ id: "a", username: "old-user" }));
    await query;
    const error = await mutation;
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe("AbortError");
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(client.getMutationCache().getAll()).toHaveLength(0);
  });
});
