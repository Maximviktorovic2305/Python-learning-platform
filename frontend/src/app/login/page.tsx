import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Вход",
  robots: { index: false, follow: false },
};
import { AuthPage } from "@/views/auth";
export default function Page() {
  return <AuthPage mode="login" />;
}
