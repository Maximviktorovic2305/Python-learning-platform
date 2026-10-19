"use client";
import { useI18n } from "@/shared/i18n";
import { ActionLink } from "@/shared/ui";
export default function NotFound() {
  const { text: localize } = useI18n();

  return (
    <main id="main" className="state">
      <h1>404</h1>
      <p>{localize("Такой страницы в лаборатории нет.")}</p>
      <ActionLink href="/">{localize("На главную")}</ActionLink>
    </main>
  );
}
