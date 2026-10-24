import { localizeMetadata } from "@/shared/i18n/server";
import { publicMetadata } from "@/shared/config";
export const generateMetadata = () =>
  localizeMetadata(
    publicMetadata(
      "Задачи по Python — тренажёр",
      "Практические задачи по Python: условия, редактор кода и бесплатная проверка решений. От простых упражнений до алгоритмов.",
      "/tasks",
    ),
  );
export default function Page() {
  return null;
}
