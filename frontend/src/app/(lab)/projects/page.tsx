import { localizeMetadata } from "@/shared/i18n/server";
import { publicMetadata } from "@/shared/config";
export const generateMetadata = () =>
  localizeMetadata(
    publicMetadata(
      "Учебные проекты на Python",
      "Практические проекты по Python для портфолио: от основ языка до самостоятельной разработки.",
      "/projects",
    ),
  );
import { ProjectsPage } from "@/views/projects";
export default ProjectsPage;
