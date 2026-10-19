"use client";
import { useI18n } from "@/shared/i18n";

import { useEffect, useId, useRef, useState } from "react";
import { HAS_ANALYTICS, LEGAL_ROUTES } from "@/shared/config";
import {
  OPEN_PRIVACY_EVENT,
  savePrivacyChoice,
  usePrivacyChoice,
  type PrivacyChoice,
} from "@/shared/lib/privacy-choice";
import styles from "@/shared/ui/legal/Legal.module.css";
import { stopMetrika } from "@/shared/lib/metrika";

export function PrivacyPreferences({ inline = false }: { inline?: boolean }) {
  const { text: localize } = useI18n();

  const choice = usePrivacyChoice();
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const analyticsInput = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    const open = () => {
      setEditing(true);
    };
    window.addEventListener(OPEN_PRIVACY_EVENT, open);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(OPEN_PRIVACY_EVENT, open);
    };
  }, [choice]);
  if (!ready || (choice !== null && !editing)) return null;
  const acknowledge = () => {
    const next: PrivacyChoice =
      HAS_ANALYTICS && analyticsInput.current?.checked
        ? "analytics"
        : "essential";
    const revoke = choice === "analytics" && next === "essential";
    savePrivacyChoice(next);
    setEditing(false);
    if (revoke) {
      stopMetrika();
      window.location.reload();
    }
  };
  return (
    <aside
      className={`${styles.privacyNotice} ${inline ? styles.privacyInline : ""}`}
      aria-label={localize("Информация о cookie")}
    >
      <h2>{localize("Мы используем cookie")}</h2>
      <p>
        {localize(
          " Технические cookie и локальное хранилище помогают сайту работать безопасно и сохранять ваши настройки.",
        )}{" "}
        <a href={LEGAL_ROUTES.cookies}>{localize("Подробнее о cookie")}</a>.
      </p>
      {HAS_ANALYTICS && (
        <label className={styles.analyticsConsent} htmlFor={id}>
          <input
            key={choice ?? "unselected"}
            ref={analyticsInput}
            id={id}
            type="checkbox"
            defaultChecked={choice === "analytics"}
          />
          <span>
            {localize(" Разрешаю аналитику Яндекс Метрики")}{" "}
            <small>{localize("Необязательно. Помогает улучшать сайт.")}</small>
          </span>
        </label>
      )}
      <button
        type="button"
        className={styles.privacyChoice}
        onClick={acknowledge}
      >
        {localize(" Понятно ")}
      </button>
    </aside>
  );
}
