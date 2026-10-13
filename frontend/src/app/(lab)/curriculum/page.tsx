import { CurriculumPage } from "@/views/curriculum";
import { publicMetadata } from "@/shared/config";
import { getPublicCourse } from "@/shared/api/public-content";
export const metadata = publicMetadata(
  "Программа бесплатного курса Python",
  "12 уровней изучения Python: основы, коллекции, функции, ООП, работа с данными и проекты. Открытые уроки и практические задачи.",
  "/curriculum",
);
export default async function Page() {
  return <CurriculumPage initialCourse={await getPublicCourse()} />;
}
