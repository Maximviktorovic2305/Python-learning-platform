"use client";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/widgets/app-shell";
import { DashboardOverview } from "@/widgets/dashboard-overview";
import { courseQuery } from "@/entities/course";
import { progressQuery } from "@/entities/progress";
import { useAuth } from "@/features/auth";
import { ErrorState, Loading } from "@/shared/ui";
import { errorMessage } from "@/shared/api";
export function DashboardPage() { const { user } = useAuth(); const course = useQuery(courseQuery); const progress = useQuery({ ...progressQuery, enabled: !!user }); return <AppShell>{course.error || progress.error ? <ErrorState message={errorMessage(course.error ?? progress.error)} retry={() => { void course.refetch(); void progress.refetch(); }} /> : course.data && progress.data ? <DashboardOverview course={course.data} progress={progress.data} /> : <Loading />}</AppShell>; }
