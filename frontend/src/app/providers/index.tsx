"use client";
import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { AuthProvider } from "@/features/auth";
import { createQueryClient } from "@/shared/api";
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
