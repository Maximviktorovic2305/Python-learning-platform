import { api, unwrap, type Schema } from "@/shared/api";
import { queryOptions } from "@tanstack/react-query";
export type User = Schema<"UserView">;
export const userQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["user", userId ?? null],
    enabled: !!userId,
    queryFn: async ({ signal }) =>
      unwrap(await api.GET("/api/users/me", { signal })),
  });
