"use client";

import { useId, useState } from "react";
import { useMutation, useIsMutating } from "@tanstack/react-query";
import type { User } from "@/entities/user";
import { api, unwrap, errorMessage } from "@/shared/api";
import { LanguageSelect, useI18n, type Locale } from "@/shared/i18n";
import { loadDictionary } from "@/shared/i18n/dictionaries";

export function ChangeLanguage({
  profile = false,
  user,
  onSaved,
  disabled = false,
}: {
  profile?: boolean;
  user?: User | null;
  onSaved?: (user: User) => void;
  disabled?: boolean;
}) {
  const changing = useIsMutating({ mutationKey: ["change-language"] });
  const profileUpdating = useIsMutating({
    mutationKey: ["update-profile", user?.id],
  });
  const { locale, setLocale, t } = useI18n();
  const [loadError, setLoadError] = useState("");
  const id = useId();
  const mutation = useMutation({
    mutationKey: ["change-language", user?.id],
    mutationFn: async (next: Locale) => {
      await loadDictionary(next);
      if (user) {
        const updated = unwrap(
          await api.PATCH("/api/users/me/locale", { body: { locale: next } }),
        );
        onSaved?.(updated);
      }
      await setLocale(next);
    },
  });
  const change = (next: Locale) => {
    setLoadError("");
    mutation.mutate(next, {
      onError: () =>
        setLoadError("Не удалось сохранить язык. Повторите попытку."),
    });
  };
  return (
    <div className={`language-control${profile ? " language-profile" : ""}`}>
      {profile && (
        <label className="language-label" htmlFor={`${id}-select`}>
          {t("Язык сайта")}
        </label>
      )}
      <LanguageSelect
        id={`${id}-select`}
        locale={locale}
        onChange={change}
        disabled={disabled || changing > 0 || profileUpdating > 0}
      />
      {profile && (
        <small>
          {t("Язык применяется ко всему сайту и сохраняется в вашем профиле.")}
        </small>
      )}
      {(loadError || mutation.error) && (
        <small className="form-error" role="alert">
          {t(loadError || errorMessage(mutation.error))}
        </small>
      )}
    </div>
  );
}
