"use client";
import { useI18n } from "@/shared/i18n";

import { useQuery } from "@tanstack/react-query";
import { PageSkeleton } from "@/widgets/app-shell";
import { DashboardOverview } from "@/widgets/dashboard-overview";
import { courseQuery } from "@/entities/course";
import { progressQuery } from "@/entities/progress";
import { useAuth } from "@/features/auth";
import { ErrorState, CachedDataNotice } from "@/shared/ui";
import { errorMessage } from "@/shared/api";
export function DashboardPage() {
  const { text: localize } = useI18n();

  const { user } = useAuth();
  const course = useQuery(courseQuery);
  const progress = useQuery(progressQuery(user?.id));
  return (
    <>
      <CachedDataNotice query={progress} />
      <CachedDataNotice query={course} />
      {(course.error && !course.data) || (progress.error && !progress.data) ? (
        <ErrorState
          message={localize(errorMessage(course.error ?? progress.error))}
          retry={() => {
            void course.refetch();
            void progress.refetch();
          }}
        />
      ) : course.data && progress.data ? (
        <DashboardOverview course={course.data} progress={progress.data} />
      ) : (
        <PageSkeleton variant="dashboard" heading />
      )}
    </>
  );
}
