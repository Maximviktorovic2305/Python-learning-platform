import { LessonPage } from "@/views/lesson";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicCourse, getPublicLesson } from "@/shared/api/public-content";
import { publicMetadata } from "@/shared/config";
import { localizeMetadata } from "@/shared/i18n/server";
import { JsonLd } from "@/shared/ui/json-ld";
import { breadcrumb } from "@/shared/lib/seo-data";
import { SITE_URL } from "@/shared/config";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lesson = await getPublicLesson(id);
  return localizeMetadata(
    lesson
      ? publicMetadata(lesson.topic.title, lesson.topic.summary, `/learn/${id}`)
      : { title: "Урок недоступен", robots: { index: false, follow: false } },
  );
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const [lesson, course] = await Promise.all([
    getPublicLesson(id),
    getPublicCourse(),
  ]);
  if (!lesson) notFound();
  if (
    course &&
    !course.levels.some((level) =>
      level.modules.some((module) =>
        module.topics.some((topic) => topic.id === id && topic.published),
      ),
    )
  )
    notFound();
  return (
    <>
      <JsonLd
        data={breadcrumb([
          { name: "Python Lab", path: "/" },
          { name: "Программа курса", path: "/curriculum" },
          { name: lesson.topic.title, path: `/learn/${id}` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: lesson.topic.title,
          description: lesson.topic.summary,
          url: `${SITE_URL}/learn/${id}`,
          inLanguage: "ru",
          isAccessibleForFree: true,
          learningResourceType: "Урок с практикой",
          isPartOf: {
            "@type": "Course",
            name: "Бесплатный курс Python",
            url: `${SITE_URL}/curriculum`,
          },
        }}
      />
      <LessonPage
        key={id}
        id={id}
        initialLesson={lesson}
        initialCourse={course}
        initialTab={
          ["theory", "practice", "quiz", "review"].includes(tab ?? "")
            ? tab
            : "theory"
        }
      />
    </>
  );
}
