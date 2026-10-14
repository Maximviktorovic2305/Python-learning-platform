"use client";
import { useEffect, useId, useRef, useState } from "react";
import styles from "@/shared/ui/legal/Legal.module.css";
export function AuthorSupportButton() {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const open = !dismissed && (pinned || hovered || focused);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target)
      ) {
        setPinned(false);
        setFocused(false);
        setDismissed(true);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPinned(false);
        setDismissed(true);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const close = () => {
    setPinned(false);
    setDismissed(true);
    button.current?.focus();
  };
  return (
    <div
      ref={root}
      className={styles.supportFloating}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") {
          setHovered(true);
          setDismissed(false);
        }
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
          setDismissed(false);
        }
      }}
    >
      {open && (
        <section
          className={styles.supportPanel}
          id={id}
          aria-label="Поддержать автора"
        >
          <button
            type="button"
            className={styles.closeSupport}
            onClick={close}
            aria-label="Закрыть информацию о поддержке"
          >
            ×
          </button>
          <h2>Помогите музыке появиться</h2>
          <p>
            Вы можете поддержать автора добровольным донатом на создание и
            запись музыкального альбома.
          </p>
          <a
            className={styles.donate}
            href="https://tips.yandex.ru/guest/payment/9462891"
            target="_blank"
            rel="noopener noreferrer"
          >
            Поддержать донатом ↗
          </a>
        </section>
      )}
      <button
        ref={button}
        type="button"
        className={styles.supportButton}
        aria-label="Поддержать автора"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          if (pinned) close();
          else {
            setPinned(true);
            setDismissed(false);
          }
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
        </svg>
      </button>
    </div>
  );
}
