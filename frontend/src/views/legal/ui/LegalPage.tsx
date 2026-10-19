"use client";
import { useI18n } from "@/shared/i18n";
import Link from "next/link";
import {
  LEGAL_DOCUMENTS,
  LEGAL_VERSION,
  PRIVACY_VERSION,
  LEGAL_SITE_NAME,
  type LegalDocument,
} from "@/shared/config";
import { LegalLinks } from "@/shared/ui/legal";
import styles from "@/shared/ui/legal/Legal.module.css";
import { PrivacySettingsButton } from "@/features/privacy-preferences";
import { Header } from "@/widgets/header";
export function LegalPage({ document }: { document: LegalDocument }) {
  const { text: localize } = useI18n();

  const content = LEGAL_DOCUMENTS[document];
  return (
    <>
      <Header />
      <main id="main" className={styles.legalPage}>
        <Link href="/">← {localize(LEGAL_SITE_NAME)}</Link>
        <h1>{localize(content.title)}</h1>
        <p>
          {localize(" Редакция от")}{" "}
          {localize(
            document === "privacy" || document === "cookies"
              ? PRIVACY_VERSION
              : LEGAL_VERSION,
          )}
        </p>
        <LegalLinks />
        {document === "cookies" && <PrivacySettingsButton />}
        {content.sections.map((section) => (
          <section key={section.title}>
            <h2>{localize(section.title)}</h2>
            {section.paragraphs.map((text) => (
              <p key={text}>{localize(text)}</p>
            ))}
          </section>
        ))}
        <LegalLinks />
      </main>
    </>
  );
}
