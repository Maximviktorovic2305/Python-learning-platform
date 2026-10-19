"use client";
import { useI18n } from "@/shared/i18n";
import Link from "next/link";
import {
  ArrowUpRight,
  Cookie,
  Database,
  LockKeyhole,
  ScrollText,
} from "lucide-react";
import { LEGAL_ROUTES } from "@/shared/config";
import { PageHeading } from "@/shared/ui";
import styles from "./LegalDocuments.module.css";

const documents = [
  {
    title: "Конфиденциальность",
    href: LEGAL_ROUTES.privacy,
    icon: LockKeyhole,
    description:
      "Какие данные мы используем, как их защищаем и какие права есть у вас.",
  },
  {
    title: "Cookie",
    href: LEGAL_ROUTES.cookies,
    icon: Cookie,
    description:
      "Как платформа использует cookie для работы сайта и сохранения сессии.",
  },
  {
    title: "Условия",
    href: LEGAL_ROUTES.terms,
    icon: ScrollText,
    description: "Правила использования платформы и учебных материалов.",
  },
  {
    title: "Согласие на данные",
    href: LEGAL_ROUTES.consent,
    icon: Database,
    description:
      "Цели и условия обработки персональных данных при регистрации.",
  },
];

export function LegalDocumentsPage() {
  const { text: localize } = useI18n();

  return (
    <>
      <PageHeading
        eyebrow={localize("Правовые документы")}
        title={localize("Правовые документы")}
        description={localize(
          "Условия использования платформы и информация о ваших данных.",
        )}
      />
      <nav className={styles.grid} aria-label={localize("Документы платформы")}>
        {documents.map(({ title, href, icon: Icon, description }) => (
          <Link className={styles.card} href={href} key={href}>
            <Icon className={styles.icon} size={24} aria-hidden="true" />
            <div>
              <h2>{localize(title)}</h2>
              <p>{localize(description)}</p>
            </div>
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </>
  );
}
