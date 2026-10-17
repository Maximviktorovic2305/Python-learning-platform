import type { ReactNode } from "react";
import { TasksPage } from "@/views/tasks";
export default function TasksLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TasksPage />
      {children}
    </>
  );
}
