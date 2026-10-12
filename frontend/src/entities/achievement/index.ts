import { api, unwrap } from "@/shared/api";
import { queryOptions } from "@tanstack/react-query";
export const achievementsQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["achievements", userId ?? null],
    enabled: !!userId,
    queryFn: async ({ signal }) =>
      unwrap(await api.GET("/api/achievements", { signal })),
  });
