import { localizeMetadata } from "@/shared/i18n/server";
export const generateMetadata = () =>
  localizeMetadata({
    title: "Профиль",
    robots: { index: false, follow: false },
  });
import { ProfilePage } from "@/views/profile";
export default ProfilePage;
