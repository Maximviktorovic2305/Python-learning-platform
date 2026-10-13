import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Мой прогресс",
  robots: { index: false, follow: false },
};
import { DashboardPage } from "@/views/dashboard";
export default DashboardPage;
