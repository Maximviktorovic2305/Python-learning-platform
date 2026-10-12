import createClient from "openapi-fetch";
import type { paths, components } from "./schema";

let accessToken: string | null = null;
let refreshPending: Promise<Schema<"AuthView"> | null> | null = null;
let sessionVersion = 0;
let sessionController = new AbortController();
let refreshAllowed = true;

export function setAccessToken(token: string | null) {
  sessionVersion += 1;
  accessToken = token;
  refreshAllowed = token !== null;
}

export function endSession() {
  setAccessToken(null);
  sessionController.abort();
  sessionController = new AbortController();
  refreshPending = null;
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
  const version = sessionVersion;
  const source = input instanceof Request ? input.clone() : new Request(input);
  const original = new Request(source, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.any([
      init?.signal ?? source.signal,
      sessionController.signal,
    ]),
  });
  const request = original.clone();
  if (accessToken)
    request.headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(request);
  original.signal.throwIfAborted();
  if (version !== sessionVersion)
    throw new DOMException("Session changed", "AbortError");
  if (response.status !== 401 || original.url.includes("/auth/"))
    return response;
  if (refreshAllowed && (await refreshSession())) {
    original.signal.throwIfAborted();
    if (version !== sessionVersion)
      throw new DOMException("Session changed", "AbortError");
    const retry = original.clone();
    if (accessToken)
      retry.headers.set("Authorization", `Bearer ${accessToken}`);
    const result = await fetch(retry);
    original.signal.throwIfAborted();
    if (version !== sessionVersion)
      throw new DOMException("Session changed", "AbortError");
    return result;
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
  if (!refreshAllowed) return Promise.resolve(null);
  if (refreshPending) return refreshPending;
  const version = sessionVersion;
  const pending = api
    .POST("/api/auth/refresh")
    .then((result) => {
      if (version !== sessionVersion || !refreshAllowed) return null;
      accessToken = result.data?.access_token ?? null;
      return result.data ?? null;
    })
    .catch(() => {
      if (version === sessionVersion) accessToken = null;
      return null;
    })
    .finally(() => {
      if (refreshPending === pending) refreshPending = null;
    });
  refreshPending = pending;
  return pending;
}
