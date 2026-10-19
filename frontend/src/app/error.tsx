"use client";
import { useI18n } from "@/shared/i18n";

import { ErrorState } from "@/shared/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { text: localize } = useI18n();

  return (
    <ErrorState
      message={localize("Страница временно недоступна. Попробуйте ещё раз.")}
      retry={reset}
    />
  );
}
