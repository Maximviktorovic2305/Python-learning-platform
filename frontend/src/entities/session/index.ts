import { queryOptions } from "@tanstack/react-query";
import { refreshSession } from "@/shared/api";

export const sessionQuery = (revision = 0) =>
  queryOptions({
    queryKey: ["session", revision],
    queryFn: async () => (await refreshSession())?.user ?? null,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
