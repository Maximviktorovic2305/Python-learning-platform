import { localizeMetadata } from "@/shared/i18n/server";
export const generateMetadata = () =>
  localizeMetadata({
    title: "Мой прогресс",
    robots: { index: false, follow: false },
  });
import { DashboardPage } from "@/views/dashboard";
export default DashboardPage;
