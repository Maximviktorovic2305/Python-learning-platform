import { CurriculumPage } from "@/views/curriculum";
import { publicMetadata } from "@/shared/config";
import { getPublicCourse } from "@/shared/api/public-content";
export const metadata = publicMetadata(
  "Программа бесплатного курса Python",
  "50 тем Python в четырёх разделах: теория, примеры, практика, тесты. От переменных до SQLAlchemy, pytest и asyncio.",
  "/curriculum",
);
export default async function Page() {
  return <CurriculumPage initialCourse={await getPublicCourse()} />;
}
