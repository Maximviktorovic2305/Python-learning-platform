"use client";
import { useI18n } from "@/shared/i18n";

import { useTheme } from "next-themes";
import { SunMoon } from "lucide-react";
export function ThemeToggle() {
  const { text: localize } = useI18n();

  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      className="icon-button"
      aria-label={localize("Переключить тему")}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunMoon size={19} />
    </button>
  );
}
