import { publicMetadata, LEGAL_DOCUMENTS } from "@/shared/config";
import { LegalPage } from "@/views/legal";
export const metadata = publicMetadata(
  LEGAL_DOCUMENTS.consent.title,
  "Правовые документы Python Lab: условия использования и обработка персональных данных.",
  "/data-consent",
);
export default function Page() {
  return <LegalPage document="consent" />;
}
