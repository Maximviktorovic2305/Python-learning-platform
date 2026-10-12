import { LessonPage } from "@/views/lesson";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  return (
    <LessonPage
      key={id}
      id={id}
      initialTab={
        ["theory", "examples", "practice", "quiz", "review"].includes(tab ?? "")
          ? tab
          : "theory"
      }
    />
  );
}
