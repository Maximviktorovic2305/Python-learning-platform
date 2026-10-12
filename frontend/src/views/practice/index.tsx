"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Code2, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/widgets/app-shell";
import { courseQuery, allTopics } from "@/entities/course";
import { progressQuery } from "@/entities/progress";
import { useAuth } from "@/features/auth";
import { PageHeading, Tag, Loading, ErrorState } from "@/shared/ui";
import { errorMessage } from "@/shared/api";
export function PracticePage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const course = useQuery(courseQuery);
  const progress = useQuery({ ...progressQuery, enabled: !!user });
  const weak = new Set(progress.data?.weak_topics.map((t) => t.id));
  const topics = course.data
    ? allTopics(course.data).filter(
        (t) => t.published && (filter !== "weak" || weak.has(t.id)),
      )
    : [];
  return (
    <AppShell>
      <PageHeading
        eyebrow="PRACTICE / EXPERIMENT / REPEAT"
        title="Территория практики."
        description="Пиши, запускай, разбирай ошибки. Именно так формируется уверенность."
      />
      <div className="curriculum-toolbar">
        <p>
          {progress.data?.exercise_ids.length ?? 0} /{" "}
          {course.data?.exercise_count ?? 120} заданий решено
        </p>
        <div className="filter-tabs">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            Все темы
          </button>
          <button
            className={filter === "weak" ? "active" : ""}
            onClick={() => setFilter("weak")}
          >
            Стоит повторить
          </button>
        </div>
      </div>
      {course.isPending ? (
        <Loading />
      ) : course.error ? (
        <ErrorState message={errorMessage(course.error)} />
      ) : !topics.length ? (
        <div className="state">
          <p>
            Пока нет тем для повторения. Пройдите тест, чтобы получить
            рекомендации.
          </p>
        </div>
      ) : (
        <div className="practice-grid">
          {topics.map((topic, i) => (
            <Link
              key={topic.id}
              href={`/learn/${topic.id}?tab=practice`}
              className="practice-card"
            >
              <div>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <Code2 size={21} />
              </div>
              <h2>{topic.title}</h2>
              <p>{topic.summary}</p>
              <div>
                <Tag>3 EASY</Tag>
                <Tag>3 MEDIUM</Tag>
                <Tag>2 HARD</Tag>
              </div>
              <footer>
                <span>
                  {progress.data?.exercise_ids.filter((id) =>
                    id.startsWith(`${topic.id}-e`),
                  ).length ?? 0}{" "}
                  / 8 решено
                </span>
                <ArrowUpRight size={18} />
              </footer>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
