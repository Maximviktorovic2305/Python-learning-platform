import { api, unwrap, type Schema } from "@/shared/api";
import { queryOptions } from "@tanstack/react-query";
export type Lesson = Schema<"LessonView">;
export const lessonQuery = (id: string) =>
  queryOptions({
    queryKey: ["lesson", id],
    staleTime: 15 * 60_000,
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET("/api/lessons/{topic_id}", {
          params: { path: { topic_id: id } },
          signal,
        }),
      ),
  });
