"use client";
import { useI18n } from "@/shared/i18n";
import { ArrowUpRight, Heart } from "lucide-react";

export function AuthorSupport() {
  const { text: localize } = useI18n();

  return (
    <a
      className="author-support"
      href="https://tips.yandex.ru/guest/payment/9462891"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={localize(
        "Поддержать автора донатом на запись музыкального альбома (откроется в новой вкладке)",
      )}
    >
      <Heart size={17} aria-hidden="true" />
      <span>
        <strong>{localize("Поддержать автора")}</strong>
        <small>{localize("Донат на запись музыкального альбома")}</small>
      </span>
      <ArrowUpRight size={15} aria-hidden="true" />
    </a>
  );
}
