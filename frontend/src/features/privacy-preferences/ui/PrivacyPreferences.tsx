"use client";
import { useEffect, useState } from "react";
import { HAS_ANALYTICS, LEGAL_ROUTES } from "@/shared/config";
import {
  OPEN_PRIVACY_EVENT,
  savePrivacyChoice,
  usePrivacyChoice,
  type PrivacyChoice,
} from "@/shared/lib/privacy-choice";
import styles from "@/shared/ui/legal/Legal.module.css";
export function PrivacyPreferences() {
  const choice = usePrivacyChoice();
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    const open = () => setEditing(true);
    window.addEventListener(OPEN_PRIVACY_EVENT, open);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(OPEN_PRIVACY_EVENT, open);
    };
  }, []);
  if (!ready || (choice !== null && !editing)) return null;
  const choose = (next: PrivacyChoice) => {
    const revoke = choice === "analytics" && next === "essential";
    savePrivacyChoice(next);
    setEditing(false);
    if (revoke) window.location.reload();
  };
  return (
    <aside className={styles.privacyNotice} aria-label="Настройки cookie">
      <h2>Ваши данные — ваш выбор</h2>
      <p>
        Используем техническое хранение для работы сайта и сохранения настроек.
        {HAS_ANALYTICS
          ? " Аналитика Яндекс Метрики включается только с вашего разрешения."
          : " Рекламных и аналитических cookie нет."}{" "}
        <a href={LEGAL_ROUTES.cookies}>Подробнее о cookie</a>.
      </p>
      <div className={styles.privacyChoices}>
        <button
          type="button"
          className={`${styles.privacyChoice} ${styles.secondaryChoice}`}
          onClick={() => choose("essential")}
        >
          {HAS_ANALYTICS ? "Только необходимые" : "Понятно"}
        </button>
        {HAS_ANALYTICS && (
          <button
            type="button"
            className={styles.privacyChoice}
            onClick={() => choose("analytics")}
          >
            Разрешить аналитику
          </button>
        )}
      </div>
    </aside>
  );
}
