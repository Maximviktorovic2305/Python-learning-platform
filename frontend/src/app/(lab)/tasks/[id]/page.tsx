import { localizeMetadata } from "@/shared/i18n/server";
import { notFound } from "next/navigation";
import { getPublicTasks } from "@/shared/api/public-content";
import { publicMetadata, SITE_URL } from "@/shared/config";
import { JsonLd } from "@/shared/ui/json-ld";
import { breadcrumb } from "@/shared/lib/seo-data";

async function taskById(id: string) {
  const task = (await getPublicTasks()).find((task) => task.id === id);
  if (!task) notFound();
  return task;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await taskById(id);
  return localizeMetadata(
    publicMetadata(
      `${task.title} — задача по Python`,
      `Решите задачу «${task.title}» на Python: условие, заготовка кода и бесплатная проверка решения.`,
      `/tasks/${id}`,
    ),
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await taskById(id);
  return (
    <>
      <JsonLd
        data={breadcrumb([
          { name: "Python Lab", path: "/" },
          { name: "Задачи Python", path: "/tasks" },
          { name: task.title, path: `/tasks/${id}` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: task.title,
          description: `Практическая задача по Python: ${task.title}`,
          url: `${SITE_URL}/tasks/${id}`,
          inLanguage: "ru",
          isAccessibleForFree: true,
          learningResourceType: "Практическое задание",
        }}
      />
    </>
  );
}
