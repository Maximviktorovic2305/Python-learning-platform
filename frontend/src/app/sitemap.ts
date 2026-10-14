import type { MetadataRoute } from "next";
import { SITE_URL, LEGAL_ROUTES } from "@/shared/config";
import { getPublicCourse } from "@/shared/api/public-content";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const course = await getPublicCourse();
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
    "/projects",
    "/stack",
    "/legal-documents",
    ...Object.values(LEGAL_ROUTES),
    ...lessons,
  ].map((path) => ({ url: `${SITE_URL}${path}` }));
}
