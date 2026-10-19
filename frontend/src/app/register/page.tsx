import { localizeMetadata } from "@/shared/i18n/server";
export const generateMetadata = () =>
  localizeMetadata({
    title: "Регистрация",
    robots: { index: false, follow: false },
  });
import { AuthPage } from "@/views/auth";
export default function Page() {
  return <AuthPage mode="register" />;
}
