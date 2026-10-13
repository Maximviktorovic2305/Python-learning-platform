import Link from "next/link";
import {
  LEGAL_DOCUMENTS,
  LEGAL_VERSION,
  LEGAL_SITE_NAME,
  type LegalDocument,
} from "@/shared/config";
import { LegalLinks } from "@/shared/ui/legal";
import styles from "@/shared/ui/legal/Legal.module.css";
export function LegalPage({ document }: { document: LegalDocument }) {
  const content = LEGAL_DOCUMENTS[document];
  return (
    <main id="main" className={styles.legalPage}>
      <Link href="/">← {LEGAL_SITE_NAME}</Link>
      <h1>{content.title}</h1>
      <p>Редакция от {LEGAL_VERSION}</p>
      <LegalLinks />
      {content.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </section>
      ))}
      <LegalLinks />
    </main>
  );
}
