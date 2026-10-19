import { localizeMetadata } from "@/shared/i18n/server";
import { publicMetadata } from "@/shared/config";
import { LegalDocumentsPage } from "@/views/legal-documents";

export const generateMetadata = () =>
  localizeMetadata(
    publicMetadata(
      "Правовые документы Python Lab",
      "Конфиденциальность, использование cookie, условия платформы и согласие на обработку персональных данных.",
      "/legal-documents",
    ),
  );

export default LegalDocumentsPage;
