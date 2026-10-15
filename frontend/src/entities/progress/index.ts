import { api, unwrap } from "@/shared/api";
import { queryOptions } from "@tanstack/react-query";
export { getTopicStatus } from "./model";
export type { Progress, TopicStatus } from "./model";
export { TopicStatusBadge, TopicStatusLegend } from "./ui";
export const progressQuery = (userId?: string) =>
  queryOptions({
    queryKey: ["progress", userId ?? null],
    enabled: !!userId,
    staleTime: 0,
    queryFn: async ({ signal }) =>
      unwrap(await api.GET("/api/progress", { signal })),
  });
