import { api, unwrap, type Schema } from "@/shared/api";
import { queryOptions } from "@tanstack/react-query";
export type Exercise = Schema<"ExerciseView">;
export const taskCatalogQuery = queryOptions({
  queryKey: ["task-catalog"],
  staleTime: 15 * 60_000,
  queryFn: async ({ signal }) =>
    unwrap(await api.GET("/api/tasks", { signal })),
});
export const exerciseQuery = (topicId: string) =>
  queryOptions({
    queryKey: ["exercises", topicId],
    staleTime: 15 * 60_000,
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET("/api/exercises", {
          params: { query: { topic_id: topicId } },
          signal,
        }),
      ),
  });
