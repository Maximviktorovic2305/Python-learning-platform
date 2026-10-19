"use client";
import { useI18n } from "@/shared/i18n";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageSkeleton } from "@/widgets/app-shell";
import { courseQuery, allTopics } from "@/entities/course";
import {
  progressQuery,
  getTopicStatus,
  TopicStatusBadge,
  TopicStatusLegend,
} from "@/entities/progress";
import { useAuth } from "@/features/auth";
import {
  PageHeading,
  Tag,
  Skeleton,
  ErrorState,
  CachedDataNotice,
} from "@/shared/ui";
import { errorMessage } from "@/shared/api";
import { PythonLogo } from "@/shared/ui/python-logo";
export function PracticePage() {
  const { text: localize } = useI18n();

  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const course = useQuery(courseQuery);
  const progress = useQuery(progressQuery(user?.id));
  const weak = new Set(progress.data?.weak_topics.map((t) => t.id));
  const topics = course.data
    ? allTopics(course.data).filter(
        (t) =>
          t.published &&
          (t.exercise_count ?? 0) > 0 &&
          (filter !== "weak" || weak.has(t.id)),
      )
    : [];
  return (
    <>
      <CachedDataNotice query={progress} />
      <CachedDataNotice query={course} />
      <PageHeading
        eyebrow={localize("Практика")}
        title={localize("Территория практики.")}
        description={localize(
          "Пиши, запускай, разбирай ошибки. Именно так формируется уверенность.",
        )}
      />
      <div className="curriculum-toolbar">
        <p>
          {course.isPending || (user && progress.isPending) ? (
            <Skeleton width={170} height={16} />
          ) : (
            <>
              {localize(progress.data?.exercise_ids.length ?? "—")} /{" "}
              {localize(course.data?.exercise_count ?? "—")}
              {localize(" заданий решено ")}
            </>
          )}
        </p>
        <div className="filter-tabs">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            {localize(" Все темы ")}
          </button>
          <button
            className={filter === "weak" ? "active" : ""}
            onClick={() => setFilter("weak")}
          >
            {localize(" Стоит повторить ")}
          </button>
        </div>
      </div>
      {progress.data && <TopicStatusLegend />}
      {course.isPending || (!course.error && user && progress.isPending) ? (
        <PageSkeleton variant="practice" />
      ) : course.error && !course.data ? (
        <ErrorState
          message={localize(errorMessage(course.error))}
          retry={() => {
            void course.refetch();
          }}
        />
      ) : progress.error && !progress.data ? (
        <ErrorState
          message={localize(errorMessage(progress.error))}
          retry={() => {
            void progress.refetch();
          }}
        />
      ) : !topics.length ? (
        <div className="state">
          <p>
            {localize(
              " Пока нет тем для повторения. Пройдите тест, чтобы получить рекомендации. ",
            )}
          </p>
        </div>
      ) : (
        <div className="practice-grid">
          {topics.map((topic, i) => (
            <Link
              key={topic.id}
              href={`/learn/${topic.id}?tab=practice`}
              className="practice-card"
              data-topic-status={getTopicStatus(topic.id, progress.data)}
            >
              <div>
                <span>{localize(String(i + 1).padStart(2, "0"))}</span>
                <PythonLogo size={21} />
              </div>
              <h2>{localize(topic.title)}</h2>
              {user && (
                <TopicStatusBadge
                  status={getTopicStatus(topic.id, progress.data)}
                />
              )}
              <p>{localize(topic.summary)}</p>
              <div>
                {Object.entries(topic.practice_difficulties ?? {}).map(
                  ([difficulty, count]) => (
                    <Tag key={difficulty}>
                      {count}{" "}
                      {localize(
                        (
                          {
                            easy: "Лёгкие",
                            medium: "Средние",
                            hard: "Сложные",
                          } as Record<string, string>
                        )[difficulty] ?? difficulty,
                      )}
                    </Tag>
                  ),
                )}
              </div>
              <footer>
                <span>
                  {progress.data?.exercise_ids.filter((id) =>
                    id.startsWith(`${topic.id}-e`),
                  ).length ?? 0}{" "}
                  / {topic.exercise_count ?? "—"}
                  {localize(" решено ")}
                </span>
                <ArrowUpRight size={18} />
              </footer>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
