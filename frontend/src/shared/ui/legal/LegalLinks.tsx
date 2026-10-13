import Link from "next/link";
import { LEGAL_ROUTES } from "@/shared/config";
import styles from "./Legal.module.css";
export function LegalLinks() {
  return (
    <nav className={styles.legalLinks} aria-label="Правовые документы">
      <Link href={LEGAL_ROUTES.privacy}>Конфиденциальность</Link>
      <Link href={LEGAL_ROUTES.cookies}>Cookie</Link>
      <Link href={LEGAL_ROUTES.terms}>Условия</Link>
      <Link href={LEGAL_ROUTES.consent}>Согласие на данные</Link>
    </nav>
  );
}
