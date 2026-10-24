import type { ReactNode } from "react";
import { TasksPage } from "@/views/tasks";
import { getPublicTasks } from "@/shared/api/public-content";
export default async function TasksLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <TasksPage initialTasks={await getPublicTasks()} />
      {children}
    </>
  );
}
