import "server-only";
import { cache } from "react";
import type { components } from "./schema";
type Schema<K extends keyof components["schemas"]> = components["schemas"][K];

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const fields = (value: unknown, names: string[]) =>
  record(value) && names.every((name) => typeof value[name] === "string");
const topic = (value: unknown): boolean =>
  record(value) &&
  fields(value, ["id", "module_id", "title", "summary"]) &&
  typeof value.position === "number" &&
  typeof value.minutes === "number" &&
  typeof value.published === "boolean" &&
  strings(value.tags);
function isCourse(value: unknown): value is Schema<"CourseView"> {
  return (
    record(value) &&
    fields(value, ["id", "title", "description"]) &&
    typeof value.published_topics === "number" &&
    typeof value.exercise_count === "number" &&
    typeof value.question_count === "number" &&
    Array.isArray(value.levels) &&
    value.levels.every(
      (level: unknown) =>
        record(level) &&
        fields(level, ["id", "course_id", "title", "description"]) &&
        typeof level.position === "number" &&
        Array.isArray(level.modules) &&
        level.modules.every(
          (module: unknown) =>
            record(module) &&
            fields(module, ["id", "level_id", "title"]) &&
            typeof module.position === "number" &&
            Array.isArray(module.topics) &&
            module.topics.every(topic),
        ),
    )
  );
}
function isLesson(value: unknown): value is Schema<"LessonView"> {
  return (
    record(value) &&
    typeof value.id === "string" &&
    topic(value.topic) &&
    Array.isArray(value.theory) &&
    value.theory.every((section: unknown) =>
      fields(section, ["title", "body"]),
    ) &&
    Array.isArray(value.examples) &&
    value.examples.every((example: unknown) =>
      fields(example, ["title", "code", "output", "explanation"]),
    ) &&
    strings(value.review)
  );
}
async function readPublic(path: string): Promise<unknown> {
  try {
    const origin = new URL(process.env.API_URL ?? "http://127.0.0.1:8010");
    if (!["http:", "https:"].includes(origin.protocol))
      throw new Error("Invalid public API protocol");
    const response = await fetch(new URL(path, origin), {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 404) return null;
    if (!response.ok || !response.body)
      throw new Error("Public content unavailable");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) {
        await reader.cancel();
        throw new Error("Public content exceeds the response limit");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    // An outage must remain an HTTP failure, not an indexable empty page or a
    // successful sitemap silently missing every lesson.
    throw new Error("Public content temporarily unavailable");
  }
}
export const getPublicCourse = cache(async () => {
  const value = await readPublic("/api/courses/python");
  if (value === null) return undefined;
  if (!isCourse(value)) throw new Error("Invalid public course response");
  return value;
});
export const getPublicLesson = cache(async (id: string) => {
  if (!/^[a-z0-9-]{1,120}$/.test(id)) return undefined;
  const value = await readPublic(`/api/lessons/${encodeURIComponent(id)}`);
  if (value === null) return undefined;
  if (!isLesson(value)) throw new Error("Invalid public lesson response");
  return value;
});

function isExercise(value: unknown): value is Schema<"ExerciseView"> {
  return (
    record(value) &&
    fields(value, [
      "id",
      "title",
      "description",
      "difficulty",
      "kind",
      "starter_code",
      "catalog",
      "sample_stdin",
    ]) &&
    /^[a-z0-9-]{1,120}$/.test(String(value.id)) &&
    (value.topic_id === null || typeof value.topic_id === "string") &&
    strings(value.hints) &&
    strings(value.tags) &&
    typeof value.test_count === "number" &&
    Number.isInteger(value.test_count) &&
    typeof value.local_supported === "boolean" &&
    typeof value.requires_stdin === "boolean"
  );
}
function isProject(value: unknown): value is Schema<"ProjectView"> {
  return (
    record(value) &&
    fields(value, ["id", "level_id", "title", "description"]) &&
    strings(value.requirements) &&
    strings(value.rubric)
  );
}
export const getPublicTasks = cache(async () => {
  const value = await readPublic("/api/tasks");
  if (!Array.isArray(value) || !value.every(isExercise))
    throw new Error("Invalid public task response");
  return value;
});
export const getPublicProjects = cache(async () => {
  const value = await readPublic("/api/projects");
  if (!Array.isArray(value) || !value.every(isProject))
    throw new Error("Invalid public project response");
  return value;
});
