"use client";
import { useEffect, useId, useState } from "react";
import { HAS_ANALYTICS, LEGAL_ROUTES } from "@/shared/config";
import {
  OPEN_PRIVACY_EVENT,
  savePrivacyChoice,
  usePrivacyChoice,
  type PrivacyChoice,
} from "@/shared/lib/privacy-choice";
import styles from "@/shared/ui/legal/Legal.module.css";

export function PrivacyPreferences({ inline = false }: { inline?: boolean }) {
  const choice = usePrivacyChoice();
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const id = useId();
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    const open = () => {
      setAnalyticsAllowed(choice === "analytics");
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
      HAS_ANALYTICS && analyticsAllowed ? "analytics" : "essential";
    const revoke = choice === "analytics" && next === "essential";
    savePrivacyChoice(next);
    setEditing(false);
    if (revoke) window.location.reload();
  };
  return (
    <aside
      className={`${styles.privacyNotice} ${inline ? styles.privacyInline : ""}`}
      aria-label="Информация о cookie"
    >
      <h2>Мы используем cookie</h2>
      <p>
        Технические cookie и локальное хранилище помогают сайту работать
        безопасно и сохранять ваши настройки.{" "}
        <a href={LEGAL_ROUTES.cookies}>Подробнее о cookie</a>.
      </p>
      {HAS_ANALYTICS && (
        <label className={styles.analyticsConsent} htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={analyticsAllowed}
            onChange={(event) => setAnalyticsAllowed(event.target.checked)}
          />
          <span>
            Разрешаю аналитику Яндекс Метрики{" "}
            <small>Необязательно. Помогает улучшать сайт.</small>
          </span>
        </label>
      )}
      <button
        type="button"
        className={styles.privacyChoice}
        onClick={acknowledge}
      >
        Понятно
      </button>
    </aside>
  );
}
