import { api, unwrap } from "@/shared/api";
import { queryOptions } from "@tanstack/react-query";
export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  staleTime: 15 * 60_000,
  queryFn: async ({ signal }) =>
    unwrap(await api.GET("/api/projects", { signal })),
});
export const submissionsQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["submissions", userId ?? null],
    enabled: !!userId,
    queryFn: async ({ signal }) =>
      unwrap(await api.GET("/api/projects/submissions", { signal })),
  });
