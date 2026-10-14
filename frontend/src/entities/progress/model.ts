import type { Schema } from "@/shared/api";

export type Progress = Schema<"ProgressView">;
export type TopicStatus = "not-started" | "in-progress" | "completed";

export function getTopicStatus(
  topicId: string,
  progress?: Progress,
  currentId?: string,
): TopicStatus {
  // Completing theory alone does not complete the topic: trust the server's full criteria.
  if (progress?.completed_topics?.includes(topicId)) return "completed";
  if (
    currentId === topicId ||
    progress?.lesson_ids?.includes(topicId) ||
    progress?.exercise_ids?.some((id) => id.startsWith(`${topicId}-e`)) ||
    progress?.quiz_ids?.includes(`${topicId}-quiz`) ||
    progress?.weak_topics?.some((topic) => topic.id === topicId)
  )
    return "in-progress";
  return "not-started";
}
