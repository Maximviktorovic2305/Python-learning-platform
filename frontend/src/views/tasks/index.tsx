"use client";
import { useI18n } from "@/shared/i18n";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Search, ArrowRight, ListFilter } from "lucide-react";
import { taskCatalogQuery } from "@/entities/exercise";
import { progressQuery } from "@/entities/progress";
import { useAuth } from "@/features/auth";
import { CodeEditor } from "@/widgets/code-editor";
import { PageSkeleton } from "@/widgets/app-shell";
import {
  PageHeading,
  Tag,
  ErrorState,
  CachedDataNotice,
  Button,
} from "@/shared/ui";
import { errorMessage } from "@/shared/api";

const difficultyLabels = { easy: "Лёгкие", medium: "Средние", hard: "Сложные" };
const taskDifficultyLabels = {
  easy: "Лёгкая",
  medium: "Средняя",
  hard: "Сложная",
};
const difficultyTones = {
  easy: "green",
  medium: "blue",
  hard: "yellow",
} as const;

export function TasksPage() {
  const { text: localize } = useI18n();

  const taskId = usePathname().split("/")[2];
  const { user, loading } = useAuth();
  const catalog = useQuery(taskCatalogQuery);
  const progress = useQuery(progressQuery(user?.id));
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");
  const solved = new Set(progress.data?.trainer_exercise_ids ?? []);
  const items = catalog.data ?? [];
  const selected = taskId ? items.find((item) => item.id === taskId) : items[0];
  const next = selected
    ? items[items.findIndex((item) => item.id === selected.id) + 1]
    : undefined;
  const filtered = items.filter(
    (item) =>
      (difficulty === "all" || item.difficulty === difficulty) &&
      (status === "all" ||
        (status === "solved" ? solved.has(item.id) : !solved.has(item.id))) &&
      `${item.title} ${localize(item.title)} ${item.tags?.join(" ") ?? ""} ${item.tags?.map(localize).join(" ") ?? ""} ${item.id}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const clearFilters = () => {
    setSearch("");
    setDifficulty("all");
    setStatus("all");
  };
  return (
    <>
      <PageHeading
        eyebrow={localize("PYTHON / ТРЕНАЖЁР")}
        title={localize("Задачи для самостоятельной практики.")}
        description={localize(
          "Выберите сложность, разберите условие и напишите решение здесь же. От коротких упражнений до алгоритмов с собеседований.",
        )}
      />
      <CachedDataNotice query={catalog} />
      <CachedDataNotice query={progress} />
      {catalog.isPending ? (
        <PageSkeleton variant="practice" />
      ) : catalog.error && !catalog.data ? (
        <ErrorState
          message={localize(errorMessage(catalog.error))}
          retry={() => {
            void catalog.refetch();
          }}
        />
      ) : (
        <>
          <div className="trainer-summary">
            <span>
              <strong>{items.length}</strong>
              {localize(" самостоятельных задач ")}
            </span>
            <span>
              <strong>{localize(user ? solved.size : "—")}</strong>
              {localize(" решено вами ")}
            </span>
            <span>
              {localize(
                " +30 XP за первое решение · прогресс курса считается отдельно ",
              )}
            </span>
          </div>
          <div className="trainer-layout">
            <section
              className="trainer-catalog"
              id="task-catalog"
              aria-label={localize("Каталог задач")}
            >
              <div className="trainer-filters">
                <label className="search-field">
                  <Search size={17} />
                  <input
                    aria-label={localize("Поиск задачи")}
                    placeholder={localize("Название, тема или номер")}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <div
                  className="trainer-difficulties"
                  role="group"
                  aria-label={localize("Сложность задач")}
                >
                  <button
                    aria-pressed={difficulty === "all"}
                    onClick={() => setDifficulty("all")}
                  >
                    {localize(" Все ")}
                    <span>{items.length}</span>
                  </button>
                  {Object.entries(difficultyLabels).map(([value, label]) => (
                    <button
                      key={value}
                      aria-pressed={difficulty === value}
                      onClick={() => setDifficulty(value)}
                    >
                      {localize(label)}{" "}
                      <span>
                        {
                          items.filter((item) => item.difficulty === value)
                            .length
                        }
                      </span>
                    </button>
                  ))}
                </div>
                <label className="trainer-status">
                  <ListFilter size={16} />
                  <span>{localize("Статус")}</span>
                  <select
                    aria-label={localize("Статус решения")}
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="all">{localize("Все задачи")}</option>
                    <option value="unsolved">{localize("Не решены")}</option>
                    <option value="solved">{localize("Решены")}</option>
                  </select>
                </label>
              </div>
              <p className="trainer-result-count" aria-live="polite">
                {localize(" Найдено: ")}
                {filtered.length}
              </p>
              {filtered.length ? (
                <ul
                  className="trainer-list"
                  aria-label={localize("Задачи тренажёра")}
                >
                  {filtered.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/tasks/${item.id}#task-workspace`}
                        aria-current={
                          selected?.id === item.id ? "page" : undefined
                        }
                        className={solved.has(item.id) ? "solved" : ""}
                      >
                        <span className="trainer-task-number">
                          {localize(item.id.replace("trainer-", ""))}
                        </span>
                        <div>
                          <strong>{localize(item.title)}</strong>
                          <small>{item.tags?.map(localize).join(" · ")}</small>
                          <Tag
                            tone={
                              difficultyTones[
                                item.difficulty as keyof typeof difficultyTones
                              ] ?? ""
                            }
                          >
                            {localize(
                              taskDifficultyLabels[
                                item.difficulty as keyof typeof taskDifficultyLabels
                              ] ?? item.difficulty,
                            )}
                          </Tag>
                        </div>
                        {solved.has(item.id) ? (
                          <Check size={18} aria-label={localize("Решена")} />
                        ) : (
                          <ArrowRight size={16} aria-hidden="true" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="trainer-empty">
                  <p>{localize("Нет задач с такими фильтрами.")}</p>
                  <Button className="secondary" onClick={clearFilters}>
                    {localize(" Сбросить фильтры ")}
                  </Button>
                </div>
              )}
            </section>
            <section
              className="trainer-workspace"
              id="task-workspace"
              aria-label={localize("Решение задачи")}
            >
              {selected ? (
                <>
                  <div className="trainer-workspace-heading">
                    <a href="#task-catalog">{localize("← К списку задач")}</a>
                    {next && (
                      <Link href={`/tasks/${next.id}#task-workspace`}>
                        {localize(" Следующая задача ")}
                        <ArrowRight size={15} />
                      </Link>
                    )}
                  </div>
                  {loading || (user && progress.isPending) ? (
                    <PageSkeleton variant="exercise" />
                  ) : progress.error && !progress.data ? (
                    <ErrorState
                      message={localize(errorMessage(progress.error))}
                      retry={() => {
                        void progress.refetch();
                      }}
                    />
                  ) : (
                    <CodeEditor
                      key={`${selected.id}-${user?.id ?? "guest"}`}
                      exercise={selected}
                      completed={solved.has(selected.id)}
                      draftKey={`python-lab-task-draft:${user?.id ?? "guest"}:${selected.id}`}
                    />
                  )}
                </>
              ) : (
                <div className="trainer-empty">
                  <h2>{localize("Задача не найдена")}</h2>
                  <p>{localize("Выберите задачу в каталоге.")}</p>
                  <Link className="button secondary" href="/tasks">
                    {localize(" Все задачи ")}
                  </Link>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
