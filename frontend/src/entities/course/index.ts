import { api, unwrap, type Schema } from "@/shared/api";
export type Course = Schema<"CourseView">;
export type Topic = Schema<"TopicView">;
export type Level = Schema<"LevelView">;
export const courseQuery = { queryKey: ["course"], queryFn: async () => unwrap(await api.GET("/api/courses/{course_id}", { params: { path: { course_id: "python" } } })) };
export function allTopics(course: Course) { return course.levels.flatMap(l => l.modules.flatMap(m => m.topics)); }
