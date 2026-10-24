import type { MetadataRoute } from "next";
import { SITE_URL, LEGAL_ROUTES } from "@/shared/config";
import { getPublicCourse, getPublicTasks } from "@/shared/api/public-content";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [course, tasks] = await Promise.all([
    getPublicCourse(),
    getPublicTasks(),
  ]);
  if (!course) throw new Error("Public catalogue temporarily unavailable");
  const lessons =
    course?.levels.flatMap((level) =>
      level.modules.flatMap((module) =>
        module.topics
          .filter((topic) => topic.published)
          .map((topic) => `/learn/${topic.id}`),
      ),
    ) ?? [];
  return [
    "/",
    "/curriculum",
    "/tasks",
    "/projects",
    "/stack",
    "/legal-documents",
    ...Object.values(LEGAL_ROUTES),
    ...lessons,
    ...tasks.map((task) => `/tasks/${task.id}`),
  ].map((path) => ({ url: `${SITE_URL}${path}` }));
}
