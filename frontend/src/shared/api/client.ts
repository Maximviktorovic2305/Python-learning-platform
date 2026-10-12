import createClient from "openapi-fetch";
import type { paths, components } from "./schema";

let accessToken: string | null = null;
let refreshPending: Promise<Schema<"AuthView"> | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export type Schema<K extends keyof components["schemas"]> =
  components["schemas"][K];

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Не удалось выполнить запрос. Попробуйте ещё раз.";
}

function detailMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof error.detail === "string"
  )
    return error.detail;
  return "Проверьте введённые данные и повторите запрос.";
}

export function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  if (result.data !== undefined) return result.data;
  throw new ApiError(result.response.status, detailMessage(result.error));
}

const apiFetch: typeof fetch = async (input, init) => {
  const original = new Request(input, init);
  const request = original.clone();
  if (accessToken)
    request.headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(request);
  if (response.status !== 401 || original.url.includes("/auth/"))
    return response;
  if (await refreshSession()) {
    const retry = original.clone();
    if (accessToken)
      retry.headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(retry);
  }
  return response;
};

export const api = createClient<paths>({
  baseUrl:
    typeof window === "undefined"
      ? "http://localhost:3010"
      : window.location.origin,
  fetch: apiFetch,
});

export function refreshSession(): Promise<Schema<"AuthView"> | null> {
  refreshPending ??= api
    .POST("/api/auth/refresh")
    .then((result) => {
      accessToken = result.data?.access_token ?? null;
      return result.data ?? null;
    })
    .catch(() => {
      accessToken = null;
      return null;
    })
    .finally(() => {
      refreshPending = null;
    });
  return refreshPending;
}
