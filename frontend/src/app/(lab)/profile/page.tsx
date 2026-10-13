import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Профиль",
  robots: { index: false, follow: false },
};
import { ProfilePage } from "@/views/profile";
export default ProfilePage;
