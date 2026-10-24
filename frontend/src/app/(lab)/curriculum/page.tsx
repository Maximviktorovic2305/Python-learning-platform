import { localizeMetadata } from "@/shared/i18n/server";
import { CurriculumPage } from "@/views/curriculum";
import { publicMetadata } from "@/shared/config";
import { getPublicCourse } from "@/shared/api/public-content";
import { JsonLd } from "@/shared/ui/json-ld";
import { breadcrumb } from "@/shared/lib/seo-data";
import { SITE_URL } from "@/shared/config";
export const generateMetadata = () =>
  localizeMetadata(
    publicMetadata(
      "Программа бесплатного курса Python",
      "50 тем Python в четырёх разделах: теория с примерами, практика и тесты. От переменных до SQLAlchemy, pytest и asyncio.",
      "/curriculum",
    ),
  );
export default async function Page() {
  const course = await getPublicCourse();
  if (!course) throw new Error("Public course unavailable");
  return (
    <>
      <JsonLd
        data={breadcrumb([
          { name: "Python Lab", path: "/" },
          { name: "Программа курса", path: "/curriculum" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Course",
          "@id": `${SITE_URL}/curriculum#course`,
          name: course.title,
          description: course.description,
          url: `${SITE_URL}/curriculum`,
          inLanguage: "ru",
          isAccessibleForFree: true,
          provider: {
            "@type": "Person",
            name: "Максим Викторович",
            url: "https://itmyportfolio.site",
          },
          teaches: course.levels.flatMap((level) =>
            level.modules.flatMap((module) =>
              module.topics
                .filter((topic) => topic.published)
                .map((topic) => topic.title),
            ),
          ),
        }}
      />
      <CurriculumPage initialCourse={course} />
    </>
  );
}
