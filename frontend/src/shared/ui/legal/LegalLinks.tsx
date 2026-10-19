"use client";
import { useI18n } from "@/shared/i18n";
import Link from "next/link";
import { LEGAL_ROUTES } from "@/shared/config";
import styles from "./Legal.module.css";
export function LegalLinks() {
  const { text: localize } = useI18n();

  return (
    <nav
      className={styles.legalLinks}
      aria-label={localize("Правовые документы")}
    >
      <Link href={LEGAL_ROUTES.privacy}>{localize("Конфиденциальность")}</Link>
      <Link href={LEGAL_ROUTES.cookies}>Cookie</Link>
      <Link href={LEGAL_ROUTES.terms}>{localize("Условия")}</Link>
      <Link href={LEGAL_ROUTES.consent}>{localize("Согласие на данные")}</Link>
    </nav>
  );
}
