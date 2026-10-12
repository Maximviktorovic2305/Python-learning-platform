"use client";
import { ErrorState } from "@/shared/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      message="Страница временно недоступна. Попробуйте ещё раз."
      retry={reset}
    />
  );
}
