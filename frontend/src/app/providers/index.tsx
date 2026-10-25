"use client";
import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { AuthProvider } from "@/features/auth";
import { Analytics } from "@/features/analytics";
import { createQueryClient, subscribeLearningUpdates } from "@/shared/api";
import { LanguageProvider, type Locale } from "@/shared/i18n";
import type { Dictionary } from "@/shared/i18n/translate";
export function Providers({
  children,
  locale,
  dictionary,
  nonce,
}: {
  children: ReactNode;
  locale: Locale;
  dictionary: Dictionary;
  nonce?: string;
}) {
  const [queryClient] = useState(createQueryClient);
  useEffect(() => subscribeLearningUpdates(queryClient), [queryClient]);
  return (
    <LanguageProvider initialLocale={locale} dictionary={dictionary}>
      <ThemeProvider
        nonce={nonce}
        attribute="data-theme"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <MotionConfig reducedMotion="user">
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <Analytics />
              {children}
            </AuthProvider>
          </QueryClientProvider>
        </MotionConfig>
      </ThemeProvider>
    </LanguageProvider>
  );
}
