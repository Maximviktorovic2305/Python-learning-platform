"use client";
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
      `${item.title} ${item.tags?.join(" ") ?? ""} ${item.id}`
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
        eyebrow="PYTHON / ТРЕНАЖЁР"
        title="Задачи для самостоятельной практики."
        description="Выберите сложность, разберите условие и напишите решение здесь же. От коротких упражнений до алгоритмов с собеседований."
      />
      <CachedDataNotice query={catalog} />
      <CachedDataNotice query={progress} />
      {catalog.isPending ? (
        <PageSkeleton variant="practice" />
      ) : catalog.error && !catalog.data ? (
        <ErrorState
          message={errorMessage(catalog.error)}
          retry={() => {
            void catalog.refetch();
          }}
        />
      ) : (
        <>
          <div className="trainer-summary">
            <span>
              <strong>{items.length}</strong> самостоятельных задач
            </span>
            <span>
              <strong>{user ? solved.size : "—"}</strong> решено вами
            </span>
            <span>
              +30 XP за первое решение · прогресс курса считается отдельно
            </span>
          </div>
          <div className="trainer-layout">
            <section
              className="trainer-catalog"
              id="task-catalog"
              aria-label="Каталог задач"
            >
              <div className="trainer-filters">
                <label className="search-field">
                  <Search size={17} />
                  <input
                    aria-label="Поиск задачи"
                    placeholder="Название, тема или номер"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <div
                  className="trainer-difficulties"
                  role="group"
                  aria-label="Сложность задач"
                >
                  <button
                    aria-pressed={difficulty === "all"}
                    onClick={() => setDifficulty("all")}
                  >
                    Все <span>{items.length}</span>
                  </button>
                  {Object.entries(difficultyLabels).map(([value, label]) => (
                    <button
                      key={value}
                      aria-pressed={difficulty === value}
                      onClick={() => setDifficulty(value)}
                    >
                      {label}{" "}
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
                  <span>Статус</span>
                  <select
                    aria-label="Статус решения"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="all">Все задачи</option>
                    <option value="unsolved">Не решены</option>
                    <option value="solved">Решены</option>
                  </select>
                </label>
              </div>
              <p className="trainer-result-count" aria-live="polite">
                Найдено: {filtered.length}
              </p>
              {filtered.length ? (
                <ul className="trainer-list" aria-label="Задачи тренажёра">
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
                          {item.id.replace("trainer-", "")}
                        </span>
                        <div>
                          <strong>{item.title}</strong>
                          <small>{item.tags?.join(" · ")}</small>
                          <Tag
                            tone={
                              difficultyTones[
                                item.difficulty as keyof typeof difficultyTones
                              ] ?? ""
                            }
                          >
                            {taskDifficultyLabels[
                              item.difficulty as keyof typeof taskDifficultyLabels
                            ] ?? item.difficulty}
                          </Tag>
                        </div>
                        {solved.has(item.id) ? (
                          <Check size={18} aria-label="Решена" />
                        ) : (
                          <ArrowRight size={16} aria-hidden="true" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="trainer-empty">
                  <p>Нет задач с такими фильтрами.</p>
                  <Button className="secondary" onClick={clearFilters}>
                    Сбросить фильтры
                  </Button>
                </div>
              )}
            </section>
            <section
              className="trainer-workspace"
              id="task-workspace"
              aria-label="Решение задачи"
            >
              {selected ? (
                <>
                  <div className="trainer-workspace-heading">
                    <a href="#task-catalog">← К списку задач</a>
                    {next && (
                      <Link href={`/tasks/${next.id}#task-workspace`}>
                        Следующая задача <ArrowRight size={15} />
                      </Link>
                    )}
                  </div>
                  {loading || (user && progress.isPending) ? (
                    <PageSkeleton variant="exercise" />
                  ) : progress.error && !progress.data ? (
                    <ErrorState
                      message={errorMessage(progress.error)}
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
                  <h2>Задача не найдена</h2>
                  <p>Выберите задачу в каталоге.</p>
                  <Link className="button secondary" href="/tasks">
                    Все задачи
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
