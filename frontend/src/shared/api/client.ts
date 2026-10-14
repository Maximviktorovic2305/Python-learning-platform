import createClient from "openapi-fetch";
import type { paths, components } from "./schema";

let accessToken: string | null = null;
let refreshPending: Promise<Schema<"AuthView"> | null> | null = null;
let sessionVersion = 0;
let sessionController = new AbortController();
let refreshAllowed = true;
let authenticatedSession = false;
const sessionEndListeners = new Set<() => void>();
let sessionChannel: BroadcastChannel | null = null;

// Serialize cookie rotation across tabs; no credentials cross this channel.
async function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks)
    return navigator.locks.request("python-lab-session", action);
  return action();
}

export function subscribeSessionEnd(listener: () => void): () => void {
  sessionEndListeners.add(listener);
  if (
    typeof window !== "undefined" &&
    typeof BroadcastChannel !== "undefined" &&
    !sessionChannel
  ) {
    sessionChannel = new BroadcastChannel("python-lab-session");
    sessionChannel.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data !== "ended") return;
      endSession();
      sessionEndListeners.forEach((notify) => notify());
    };
  }
  return () => {
    sessionEndListeners.delete(listener);
    if (!sessionEndListeners.size) {
      sessionChannel?.close();
      sessionChannel = null;
    }
  };
}

function expireSession() {
  if (!authenticatedSession) {
    // An anonymous bootstrap response must not abort a queued login.
    refreshAllowed = false;
    return;
  }
  endSession();
  sessionChannel?.postMessage("ended");
  sessionEndListeners.forEach((notify) => notify());
}

export function setAccessToken(token: string | null) {
  sessionVersion += 1;
  accessToken = token;
  authenticatedSession = token !== null;
  refreshAllowed = token !== null;
}

export function endSession() {
  const previousToken = accessToken;
  setAccessToken(null);
  sessionController.abort();
  sessionController = new AbortController();
  refreshPending = null;
  return previousToken;
}
export type Schema<K extends keyof components["schemas"]> =
  components["schemas"][K];

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields: readonly string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError))
    return "Не удалось связаться с сервером. Проверьте соединение и повторите попытку.";
  if (error.status === 429)
    return "Слишком много запросов. Подождите минуту и попробуйте ещё раз.";
  if (error.status >= 500)
    return "Сервис временно недоступен. Попробуйте ещё раз позже.";
  if (error.status === 401)
    return "Сессия завершена. Войдите снова и повторите действие.";
  return error.message;
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
  // Keep only field names: validation payloads can contain passwords in input/ctx.
  const detail =
    typeof result.error === "object" &&
    result.error !== null &&
    "detail" in result.error
      ? result.error.detail
      : undefined;
  const fields = Array.isArray(detail)
    ? detail.flatMap((issue: unknown) => {
        if (
          typeof issue !== "object" ||
          issue === null ||
          !("loc" in issue) ||
          !Array.isArray(issue.loc)
        )
          return [];
        return issue.loc[0] === "body" && typeof issue.loc[1] === "string"
          ? [issue.loc[1]]
          : [];
      })
    : [];
  throw new ApiError(
    result.response.status,
    detailMessage(result.error),
    fields,
  );
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
  const authentication = /\/api\/auth\/(login|register)$/.test(
    new URL(request.url).pathname,
  );
  const response = authentication
    ? await withSessionLock(() => fetch(request))
    : await fetch(request);
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
    if (result.status === 401) expireSession();
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
  const pending = withSessionLock(async () => {
    // A queued refresh must not restart a session after logout.
    if (version !== sessionVersion || !refreshAllowed) return null;
    return api.POST("/api/auth/refresh");
  })
    .then((result) => {
      if (!result || version !== sessionVersion || !refreshAllowed) return null;
      if (result.response.status === 401) {
        expireSession();
        return null;
      }
      if (result.data) {
        accessToken = result.data.access_token;
        authenticatedSession = true;
      }
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

export async function revokeSession(token: string | null): Promise<void> {
  sessionChannel?.postMessage("ended");
  await withSessionLock(async () => {
    // Preserve the old session ID for revocation if its cookie just rotated.
    unwrap(
      await api.POST("/api/auth/logout", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }),
    );
  });
}
