import { localizeMetadata } from "@/shared/i18n/server";
import { publicMetadata } from "@/shared/config";
import { StackPage } from "@/views/stack";

export const generateMetadata = () =>
  localizeMetadata(
    publicMetadata(
      "Стек проекта Python Lab",
      "Технологии Python Lab: интерфейс, API, база данных, выполнение Python, инфраструктура и тестирование.",
      "/stack",
    ),
  );

export default StackPage;
