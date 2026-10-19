import { LessonPage } from "@/views/lesson";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicCourse, getPublicLesson } from "@/shared/api/public-content";
import { publicMetadata } from "@/shared/config";
import { localizeMetadata } from "@/shared/i18n/server";
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
  );
}
