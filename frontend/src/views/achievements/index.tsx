"use client";
import { useQuery } from "@tanstack/react-query";
import { Award, Flame, Code2, Trophy, LockKeyhole, Check } from "lucide-react";
import { AppShell, PageSkeleton } from "@/widgets/app-shell";
import { achievementsQuery } from "@/entities/achievement";
import { useAuth } from "@/features/auth";
import { PageHeading, Tag, ErrorState, Skeleton } from "@/shared/ui";
import { errorMessage } from "@/shared/api";
export function AchievementsPage() {
  const { user } = useAuth();
  const query = useQuery({ ...achievementsQuery, enabled: !!user });
  const earned = query.data?.filter((a) => a.earned_at).length ?? 0;
  return (
    <AppShell>
      <PageHeading
        eyebrow="MILESTONES / SMALL WINS MATTER"
        title="Каждый шаг имеет значение."
        description="Достижения отмечают вашу практику, точность и регулярность."
        action={
          <Tag tone="yellow">
            {query.isPending ? (
              <Skeleton width={110} height={15} />
            ) : (
              <>
                {earned} / {query.data?.length ?? 16} ОТКРЫТО
              </>
            )}
          </Tag>
        }
      />
      {query.error ? (
        <ErrorState message={errorMessage(query.error)} />
      ) : query.isPending ? (
        <PageSkeleton variant="achievements" />
      ) : (
        <div className="achievements-grid">
          {query.data.map((a) => {
            const Icon = a.id.includes("streak")
              ? Flame
              : a.id.includes("exercise")
                ? Code2
                : a.id.includes("perfect") || a.id === "master"
                  ? Trophy
                  : Award;
            return (
              <article
                key={a.id}
                className={`achievement-card ${a.earned_at ? "earned" : "locked"}`}
              >
                <div className="achievement-medal">
                  <Icon size={34} strokeWidth={1.4} />
                </div>
                <Tag tone={a.earned_at ? "yellow" : ""}>
                  {a.earned_at ? (
                    <>
                      <Check size={11} />
                      ОТКРЫТО
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={11} />
                      ВПЕРЕДИ
                    </>
                  )}
                </Tag>
                <h2>{a.title}</h2>
                <p>{a.description}</p>
                {a.earned_at && (
                  <small>
                    {new Date(a.earned_at).toLocaleDateString("ru-RU")}
                  </small>
                )}
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
