import { localizeMetadata } from "@/shared/i18n/server";
export const generateMetadata = () =>
  localizeMetadata({
    title: "Достижения",
    robots: { index: false, follow: false },
  });
import { AchievementsPage } from "@/views/achievements";
export default AchievementsPage;
