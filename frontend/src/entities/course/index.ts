import { api, unwrap, type Schema } from "@/shared/api";
import { queryOptions } from "@tanstack/react-query";
export type Course = Schema<"CourseView">;
export type Topic = Schema<"TopicView">;
export type Level = Schema<"LevelView">;
export const courseQuery = queryOptions({
  queryKey: ["course"],
  staleTime: 15 * 60_000,
  queryFn: async ({ signal }) =>
    unwrap(
      await api.GET("/api/courses/{course_id}", {
        params: { path: { course_id: "python" } },
        signal,
      }),
    ),
});
export function allTopics(course: Course) {
  return course.levels.flatMap((l) => l.modules.flatMap((m) => m.topics));
}
