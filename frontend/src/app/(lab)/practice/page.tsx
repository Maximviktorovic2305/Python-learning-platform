import { localizeMetadata } from "@/shared/i18n/server";
export const generateMetadata = () =>
  localizeMetadata({
    title: "Практика",
    robots: { index: false, follow: false },
  });
import { PracticePage } from "@/views/practice";
export default PracticePage;
