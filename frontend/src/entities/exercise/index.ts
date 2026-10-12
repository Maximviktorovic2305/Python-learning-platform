import { api, unwrap, type Schema } from "@/shared/api";
export type Exercise = Schema<"ExerciseView">;
export const exerciseQuery = (topicId: string) => ({
  queryKey: ["exercises", topicId],
  queryFn: async () =>
    unwrap(
      await api.GET("/api/exercises", {
        params: { query: { topic_id: topicId } },
      }),
    ),
});
