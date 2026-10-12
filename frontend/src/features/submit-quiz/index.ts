import { api, unwrap } from "@/shared/api";
export async function startQuiz(id: string) { return unwrap(await api.POST("/api/quizzes/{topic_id}/attempts", { params: { path: { topic_id: id } } })); }
export async function submitQuiz(id: string, selections: Record<string, number[]>) { return unwrap(await api.POST("/api/attempts/{attempt_id}/submit", { params: { path: { attempt_id: id } }, body: { answers: Object.entries(selections).map(([question_id, selected]) => ({ question_id, selected })) } })); }
