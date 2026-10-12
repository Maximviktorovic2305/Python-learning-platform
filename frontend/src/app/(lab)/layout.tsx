import type { ReactNode } from "react";
import { AppShell } from "@/widgets/app-shell";

export default function LearningLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
