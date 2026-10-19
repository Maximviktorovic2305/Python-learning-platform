import { localizeMetadata } from "@/shared/i18n/server";
import { publicMetadata, LEGAL_DOCUMENTS } from "@/shared/config";
import { LegalPage } from "@/views/legal";
export const generateMetadata = () =>
  localizeMetadata(
    publicMetadata(
      LEGAL_DOCUMENTS.privacy.title,
      "Правовые документы Python Lab: условия использования и обработка персональных данных.",
      "/private-policy",
    ),
  );
export default function Page() {
  return <LegalPage document="privacy" />;
}
