"use client";
import { useI18n } from "@/shared/i18n";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Search,
  ArrowUpRight,
  Check,
  Clock3,
  LockKeyhole,
  Circle,
} from "lucide-react";
import { PageSkeleton } from "@/widgets/app-shell";
import { courseQuery, type Course } from "@/entities/course";
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
  ProgressBar,
  CachedDataNotice,
} from "@/shared/ui";
import { errorMessage } from "@/shared/api";
export function CurriculumPage({
  initialCourse,
}: { initialCourse?: Course } = {}) {
  const { text: localize } = useI18n();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const { user } = useAuth();
  const course = useQuery({ ...courseQuery, initialData: initialCourse });
  const progress = useQuery(progressQuery(user?.id));
  const levels =
    course.data?.levels
      .filter(
        (l) =>
          filter !== "available" ||
          l.modules.some((m) => m.topics.some((t) => t.published)),
      )
      .map((l) => ({
        ...l,
        modules: l.modules
          .map((m) => ({
            ...m,
            topics: m.topics.filter((t) =>
              `${t.title} ${localize(t.title)} ${t.tags.join(" ")} ${t.tags.map(localize).join(" ")}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            ),
          }))
          .filter((m) => m.topics.length),
      }))
      .filter((l) => l.modules.length) ?? [];
  return (
    <>
      <CachedDataNotice query={progress} />
      <CachedDataNotice query={course} />
      <PageHeading
        eyebrow={localize("ПРОГРАММА / 01 → 04")}
        title={localize("Твой маршрут в Python.")}
        description={localize(
          "4 раздела, 50 тем. От первого запуска до баз данных, тестов и асинхронности.",
        )}
      />
      <div className="curriculum-banner">
        <div>
          <Tag tone="blue">{localize("PYTHON / ТЕОРИЯ И ПРАКТИКА")}</Tag>
          <h2>
            {localize(" Понимание складывается ")}
            <br />
            {localize(" по одной теме. ")}
          </h2>
          <p>
            {localize(
              " В каждой теме: теория с разобранным кодом, практика с одной открытой проверкой результата и тест с объяснениями. ",
            )}
          </p>
        </div>
        <div>
          <strong>
            {localize(
              course.isPending ? (
                <Skeleton width={64} height={34} />
              ) : (
                (course.data?.question_count ?? "—")
              ),
            )}
          </strong>
          <span>{localize("вопросов для проверки знаний")}</span>
          <strong>
            {localize(
              course.isPending ? (
                <Skeleton width={64} height={34} />
              ) : (
                (course.data?.exercise_count ?? "—")
              ),
            )}
          </strong>
          <span>{localize("практических задач")}</span>
        </div>
      </div>
      <div className="curriculum-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label={localize("Поиск темы")}
            placeholder={localize("Найти тему: функции, циклы, SQL…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="filter-tabs">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            {localize(" Вся программа ")}
          </button>
          <button
            className={filter === "available" ? "active" : ""}
            onClick={() => setFilter("available")}
          >
            {localize(" Доступные уроки ")}
          </button>
        </div>
      </div>
      {user && progress.data && <TopicStatusLegend />}
      {course.isPending || (user && progress.isPending) ? (
        <PageSkeleton variant="curriculum" />
      ) : course.error && !course.data ? (
        <ErrorState
          message={localize(errorMessage(course.error))}
          retry={() => {
            void course.refetch();
          }}
        />
      ) : !levels.length ? (
        <div className="state">
          {localize("Темы не найдены. Попробуйте другой запрос.")}
        </div>
      ) : progress.error && !progress.data ? (
        <ErrorState
          message={localize(errorMessage(progress.error))}
          retry={() => {
            void progress.refetch();
          }}
        />
      ) : (
        <div className="curriculum-levels">
          {levels.map((level) => (
            <section className="curriculum-level" key={level.id} id={level.id}>
              <div className="level-rail">
                <span>
                  {localize(String(level.position + 1).padStart(2, "0"))}
                </span>
                <i />
              </div>
              <div className="level-content">
                <div className="level-heading">
                  <div>
                    <div className="eyebrow">
                      {localize("РАЗДЕЛ ")}
                      {level.position + 1}
                    </div>
                    <h2>{localize(level.title)}</h2>
                    <p>{localize(level.description)}</p>
                  </div>
                  <Tag tone="green">{localize("ДОСТУПНО")}</Tag>
                </div>
                {user && (
                  <ProgressBar
                    value={progress.data?.level_percent[level.id] ?? 0}
                    label={localize(level.title)}
                  />
                )}
                {level.modules.map((module) => (
                  <div className="curriculum-module" key={module.id}>
                    <h3>
                      {localize(module.title)}
                      <span>
                        {module.topics.length}
                        {localize(" тем")}
                      </span>
                    </h3>
                    {module.topics.map((topic) =>
                      topic.published ? (
                        <Link
                          className="topic-row"
                          data-topic-status={getTopicStatus(
                            topic.id,
                            progress.data,
                          )}
                          href={`/learn/${topic.id}`}
                          key={topic.id}
                        >
                          <span className="topic-state-icon" aria-hidden="true">
                            {getTopicStatus(topic.id, progress.data) ===
                            "completed" ? (
                              <Check size={18} />
                            ) : getTopicStatus(topic.id, progress.data) ===
                              "in-progress" ? (
                              <Clock3 size={17} />
                            ) : (
                              <Circle size={15} />
                            )}
                          </span>
                          <div>
                            <strong>{localize(topic.title)}</strong>
                            <small>
                              {topic.tags.slice(0, 4).map(localize).join(" · ")}
                            </small>
                            {user && (
                              <TopicStatusBadge
                                status={getTopicStatus(topic.id, progress.data)}
                              />
                            )}
                          </div>
                          <span className="topic-meta">
                            <Clock3 size={13} />
                            {topic.minutes}
                            {localize(" мин ")}
                          </span>
                          <ArrowUpRight size={16} />
                        </Link>
                      ) : (
                        <div className="topic-row unpublished" key={topic.id}>
                          <LockKeyhole size={15} />
                          <div>
                            <strong>{localize(topic.title)}</strong>
                            <small>
                              {localize("Материалы готовятся к публикации")}
                            </small>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
