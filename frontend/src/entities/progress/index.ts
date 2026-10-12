import { api, unwrap, type Schema } from "@/shared/api";
import { queryOptions } from "@tanstack/react-query";
export type Progress = Schema<"ProgressView">;
export const progressQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["progress", userId ?? null],
    enabled: !!userId,
    queryFn: async ({ signal }) =>
      unwrap(await api.GET("/api/progress", { signal })),
  });
