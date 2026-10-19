"use client";
import { useI18n } from "@/shared/i18n";
import Link from "next/link";
import {
  ArrowUpRight,
  Flame,
  Zap,
  BookOpen,
  Target,
  Clock3,
  ArrowRight,
  Sparkles,
  Check,
} from "lucide-react";
import {
  getTopicStatus,
  TopicStatusBadge,
  type Progress,
} from "@/entities/progress";
import type { Course } from "@/entities/course";
import { allTopics } from "@/entities/course";
import { ActionLink, PageHeading, ProgressBar, Tag } from "@/shared/ui";
import { PythonLogo } from "@/shared/ui/python-logo";

export function DashboardOverview({
  progress,
  course,
}: {
  progress: Progress;
  course: Course;
}) {
  const { text: localize, locale } = useI18n();

  const topics = allTopics(course);
  const next = topics.find((t) => t.id === progress.continue_topic);
  const weekDays = ["Д−6", "Д−5", "Д−4", "Д−3", "Д−2", "Вчера", "Сегодня"];
  const metrics = [
    {
      icon: Zap,
      value: progress.user.total_xp.toLocaleString(locale),
      title: "Всего XP",
      color: "yellow",
    },
    {
      icon: Flame,
      value: progress.user.streak,
      title: "Дней подряд",
      color: "orange",
    },
    {
      icon: BookOpen,
      value: progress.lesson_ids.length,
      title: "Теория изучена",
      color: "blue",
    },
    {
      icon: Target,
      value: `${progress.daily_xp}/${progress.user.daily_goal}`,
      title: "Сегодня · XP",
      color: "green",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow={localize("ТВОЙ ПРОГРЕСС / ОБЗОР")}
        title={localize(`Привет, ${progress.user.username}.`)}
        description={localize(
          "Ещё один день, чтобы стать немного лучше в Python.",
        )}
        action={
          <Tag tone="green">
            <span className="status-dot" />
            {localize(" Готов к новым открытиям ")}
          </Tag>
        }
      />
      <div className="dashboard-metrics">
        {metrics.map(({ icon: Icon, value, title, color }) => (
          <div key={title}>
            <Icon size={20} className={`${color}-text`} />
            <strong>{localize(value)}</strong>
            <span>{localize(title)}</span>
          </div>
        ))}
      </div>
      <div className="dashboard-main-grid">
        <section className="continue-panel">
          <div className="eyebrow">{localize("Продолжить обучение")}</div>
          <div className="continue-content">
            <div>
              <Tag tone={next ? "blue" : "green"}>
                {localize(next ? "СЛЕДУЮЩИЙ ШАГ" : "ОТЛИЧНАЯ РАБОТА")}
              </Tag>
              <h2>
                {localize(next?.title ?? "Все опубликованные темы пройдены")}
              </h2>
              <p>
                {localize(
                  next?.summary ??
                    "Повторите сложные темы или приступите к самостоятельному проекту.",
                )}
              </p>
              <div className="meta-row">
                {next && (
                  <TopicStatusBadge
                    status={getTopicStatus(next.id, progress)}
                  />
                )}
                {next && (
                  <span>
                    <Clock3 size={14} />
                    {next.minutes}
                    {localize(" мин ")}
                  </span>
                )}
                {next && (
                  <span>
                    <PythonLogo size={14} />
                    {localize("8 заданий ")}
                  </span>
                )}
                <span>
                  <Sparkles size={14} />
                  {localize(" Новые знания ")}
                </span>
              </div>
            </div>
            <div className="continue-glyph">
              <PythonLogo size={68} />
              <span>PY</span>
            </div>
          </div>
          <div className="continue-footer">
            <span>
              {progress.completed_topics.length}
              {localize(" из ")}
              {course.published_topics} {localize(" тем закреплено ")}
            </span>
            <ActionLink href={next ? `/learn/${next.id}` : "/practice"}>
              {localize(
                !next
                  ? "Повторить пройденное"
                  : progress.lesson_ids.length
                    ? "Продолжить обучение"
                    : "Начать первый урок",
              )}
            </ActionLink>
          </div>
          <ProgressBar
            value={progress.course_percent}
            label={localize("Прогресс курса")}
          />
        </section>
        <section className="panel daily-panel">
          <div className="panel-heading">
            <h3>{localize("Цель на сегодня")}</h3>
            <Target size={18} />
          </div>
          <div
            className="goal-ring"
            style={{
              background: `conic-gradient(var(--python-yellow) ${Math.min(100, (progress.daily_xp / progress.user.daily_goal) * 100)}%, var(--border) 0)`,
            }}
          >
            <div>
              <strong>
                {Math.round(
                  (progress.daily_xp / progress.user.daily_goal) * 100,
                )}
                <small>%</small>
              </strong>
              <span>
                {progress.daily_xp} / {progress.user.daily_goal} XP
              </span>
            </div>
          </div>
          <p>
            {localize(
              progress.daily_xp >= progress.user.daily_goal
                ? "Цель достигнута. Отличный день для Python."
                : "Один урок и несколько задач — уже заметный шаг.",
            )}
          </p>
          <Link href="/profile">
            {localize(" Изменить цель ")}
            <ArrowRight size={14} />
          </Link>
        </section>
      </div>
      <div className="dashboard-lower-grid">
        <section className="panel weekly-panel">
          <div className="panel-heading">
            <h3>{localize("Ритм обучения")}</h3>
            <Tag>{localize("7 ДНЕЙ")}</Tag>
          </div>
          <div className="week-chart">
            {progress.week_xp.map((xp, i) => (
              <div key={i}>
                <span className="week-value">{xp}</span>
                <div className="week-bar-wrap">
                  <span
                    className={i === 6 ? "today" : ""}
                    style={{
                      height: `${xp ? Math.max(8, (xp / Math.max(...progress.week_xp, 100)) * 100) : 3}%`,
                    }}
                  />
                </div>
                <small>{localize(weekDays[i])}</small>
              </div>
            ))}
          </div>
          <p className="muted">
            {localize(
              " Регулярность важнее скорости. Ваши XP за последние семь дней. ",
            )}
          </p>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h3>{localize("Стоит повторить")}</h3>
            <Link href="/practice" aria-label={localize("Открыть практику")}>
              <ArrowUpRight size={18} />
            </Link>
          </div>
          {progress.weak_topics.length ? (
            progress.weak_topics.map((t) => (
              <Link
                href={`/learn/${t.id}?tab=quiz`}
                className="weak-row"
                key={t.id}
              >
                <div>
                  <strong>{localize(t.title)}</strong>
                  <span>{t.accuracy}%</span>
                </div>
                <ProgressBar
                  value={t.accuracy}
                  label={localize(`Точность ${t.title}`)}
                />
              </Link>
            ))
          ) : (
            <div className="empty-note">
              <Check size={28} />
              <strong>
                {localize(
                  progress.quiz_ids.length
                    ? "Нет тем с точностью ниже 80%"
                    : "Пока нет результатов тестов",
                )}
              </strong>
              <p>
                {localize(
                  " После тестов здесь появятся темы, в которых можно стать увереннее. ",
                )}
              </p>
            </div>
          )}
        </section>
      </div>
      <div className="dashboard-lower-grid">
        <section className="panel">
          <div className="panel-heading">
            <h3>{localize("Ваш маршрут")}</h3>
            <Link href="/curriculum">
              {localize(" Вся программа ")}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          {course.levels.slice(0, 3).map((level) => (
            <Link
              href={`/curriculum#${level.id}`}
              className="route-progress"
              key={level.id}
            >
              <span className="route-number">
                {localize(String(level.position).padStart(2, "0"))}
              </span>
              <div>
                <strong>{localize(level.title)}</strong>
                <ProgressBar
                  value={progress.level_percent[level.id] ?? 0}
                  label={localize(level.title)}
                />
              </div>
              <small>{progress.level_percent[level.id] ?? 0}%</small>
            </Link>
          ))}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h3>{localize("Последние шаги")}</h3>
            <Tag>{localize("Активность")}</Tag>
          </div>
          {progress.activity.length ? (
            progress.activity.slice(0, 4).map((activity, i) => (
              <div
                className="activity-row"
                key={`${activity.resource_id}-${i}`}
              >
                <span className="activity-icon">
                  <Check size={15} />
                </span>
                <div>
                  <strong>
                    {localize(
                      topics.find((t) => t.id === activity.topic_id)?.title ??
                        (activity.kind === "trainer"
                          ? "Задача тренажёра"
                          : "Самостоятельный проект"),
                    )}
                  </strong>
                  <small>
                    {localize(
                      activity.kind === "lesson"
                        ? "Теория изучена"
                        : activity.kind === "quiz"
                          ? "Тест пройден"
                          : activity.kind === "project"
                            ? "Проект принят"
                            : "Задание решено",
                    )}
                  </small>
                </div>
                <b>+{activity.xp} XP</b>
              </div>
            ))
          ) : (
            <div className="empty-note">
              <BookOpen size={28} />
              <p>
                {localize(" Первый завершённый урок появится здесь. ")}
                <br />
                {localize(" Ваш путь только начинается. ")}
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
