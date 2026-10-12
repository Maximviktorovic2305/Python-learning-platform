"use client";
import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { AuthProvider } from "@/features/auth";
import { ApiError } from "@/shared/api";
export function Providers({ children }: { children: ReactNode }) { const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: (count, error) => count < 1 && !(error instanceof ApiError && error.status < 500) } } })); return <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem><MotionConfig reducedMotion="user"><QueryClientProvider client={queryClient}><AuthProvider>{children}</AuthProvider></QueryClientProvider></MotionConfig></ThemeProvider>; }
