import { api, unwrap, type Schema } from "@/shared/api";
export type Lesson = Schema<"LessonView">;
export const lessonQuery = (id: string) => ({
  queryKey: ["lesson", id],
  queryFn: async () =>
    unwrap(
      await api.GET("/api/lessons/{topic_id}", {
        params: { path: { topic_id: id } },
      }),
    ),
});
