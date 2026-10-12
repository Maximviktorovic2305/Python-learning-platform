import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./client";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 15 * 60_000,
        retry: (count, error) =>
          count < 1 &&
          !(error instanceof ApiError && error.status < 500) &&
          !(error instanceof DOMException && error.name === "AbortError"),
      },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}
