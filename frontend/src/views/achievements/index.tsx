"use client";
import { useI18n } from "@/shared/i18n";

import { useQuery } from "@tanstack/react-query";
import { Award, Flame, Trophy, LockKeyhole, Check } from "lucide-react";
import { PageSkeleton } from "@/widgets/app-shell";
import { achievementsQuery } from "@/entities/achievement";
import { useAuth } from "@/features/auth";
import {
  PageHeading,
  Tag,
  ErrorState,
  Skeleton,
  CachedDataNotice,
} from "@/shared/ui";
import { errorMessage } from "@/shared/api";
import { PythonLogo } from "@/shared/ui/python-logo";
export function AchievementsPage() {
  const { text: localize, locale } = useI18n();

  const { user } = useAuth();
  const query = useQuery(achievementsQuery(user?.id));
  const earned = query.data?.filter((a) => a.earned_at).length ?? 0;
  return (
    <>
      <CachedDataNotice query={query} />
      <PageHeading
        eyebrow={localize("Достижения")}
        title={localize("Каждый шаг имеет значение.")}
        description={localize(
          "Достижения отмечают вашу практику, точность и регулярность.",
        )}
        action={
          <Tag tone="yellow">
            {query.isPending ? (
              <Skeleton width={110} height={15} />
            ) : (
              <>
                {localize(
                  query.data
                    ? `${earned} / ${query.data.length} ОТКРЫТО`
                    : "Нет данных",
                )}
              </>
            )}
          </Tag>
        }
      />
      {query.error && !query.data ? (
        <ErrorState
          message={localize(errorMessage(query.error))}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : query.isPending ? (
        <PageSkeleton variant="achievements" />
      ) : (
        <div className="achievements-grid">
          {query.data.map((a) => {
            const Icon = a.id.includes("streak")
              ? Flame
              : a.id.includes("perfect") || a.id === "master"
                ? Trophy
                : Award;
            return (
              <article
                key={a.id}
                className={`achievement-card ${a.earned_at ? "earned" : "locked"}`}
              >
                <div className="achievement-medal">
                  {a.id.includes("exercise") && !a.id.includes("streak") ? (
                    <PythonLogo size={34} />
                  ) : (
                    <Icon size={34} strokeWidth={1.4} />
                  )}
                </div>
                <Tag tone={a.earned_at ? "yellow" : ""}>
                  {a.earned_at ? (
                    <>
                      <Check size={11} />
                      {localize(" ОТКРЫТО ")}
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={11} />
                      {localize(" ВПЕРЕДИ ")}
                    </>
                  )}
                </Tag>
                <h2>{localize(a.title)}</h2>
                <p>{localize(a.description)}</p>
                {a.earned_at && (
                  <small>
                    {new Date(a.earned_at).toLocaleDateString(locale)}
                  </small>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
