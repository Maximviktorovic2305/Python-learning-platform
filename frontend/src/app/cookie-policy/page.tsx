import { publicMetadata, LEGAL_DOCUMENTS } from "@/shared/config";
import { LegalPage } from "@/views/legal";
export const metadata = publicMetadata(
  LEGAL_DOCUMENTS.cookies.title,
  "Правовые документы Python Lab: условия использования и обработка персональных данных.",
  "/cookie-policy",
);
export default function Page() {
  return <LegalPage document="cookies" />;
}
