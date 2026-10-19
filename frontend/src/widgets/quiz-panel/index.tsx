"use client";
import { useI18n } from "@/shared/i18n";
import { translateOption } from "@/shared/i18n/learning";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  X,
  ArrowRight,
  RotateCcw,
  Lightbulb,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { startQuiz, submitQuiz } from "@/features/submit-quiz";
import { useAuth } from "@/features/auth";
import type { Attempt, QuizResult } from "@/entities/quiz";
import { progressQuery } from "@/entities/progress";
import {
  Button,
  Tag,
  ProgressBar,
  Skeleton,
  SkeletonRegion,
  SkeletonLines,
} from "@/shared/ui";
import { CodeBlock } from "@/shared/ui/code";
import { errorMessage, refreshLearningData } from "@/shared/api";

function QuizSkeleton() {
  const { text: localize } = useI18n();

  return (
    <SkeletonRegion
      label={localize("Готовим вопросы теста…")}
      className="skeleton-quiz"
    >
      <div className="skeleton-stack">
        <div className="skeleton-row">
          <Skeleton width={130} height={12} />
          <Skeleton width={60} height={23} />
        </div>
        <Skeleton height={5} />
        <Skeleton width="85%" height={28} />
        <SkeletonLines count={2} />
        {Array.from({ length: 4 }, (_, index) => (
          <div className="skeleton-quiz-option" key={index}>
            <Skeleton width={22} height={22} circle />
            <Skeleton width={`${70 - index * 7}%`} height={14} />
          </div>
        ))}
        <div className="skeleton-row">
          <Skeleton width={90} height={44} />
          <Skeleton width={120} height={44} />
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function QuizPanel({
  topicId,
  onNavigationChange,
}: {
  topicId: string;
  onNavigationChange?: (visible: boolean) => void;
}) {
  const { text: localize } = useI18n();

  const { user, loading } = useAuth();
  const client = useQueryClient();
  const progress = useQuery(progressQuery(user?.id));
  const [passed, setPassed] = useState(false);
  const completed =
    passed || (progress.data?.quiz_ids.includes(`${topicId}-quiz`) ?? false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [selections, setSelections] = useState<Record<string, number[]>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [hint, setHint] = useState(false);
  const showLessonNavigation =
    !attempt || !!result || current === attempt.questions.length - 1;
  useEffect(() => {
    onNavigationChange?.(showLessonNavigation);
  }, [onNavigationChange, showLessonNavigation]);
  const startMutation = useMutation({
    mutationKey: ["start-quiz", topicId],
    mutationFn: () => startQuiz(topicId),
    onSuccess: (data) => {
      setAttempt(data);
      setResult(null);
      setSelections({});
      setCurrent(0);
      setHint(false);
    },
  });
  const submitMutation = useMutation({
    mutationKey: ["submit-quiz", topicId],
    mutationFn: ({
      id,
      answers,
    }: {
      id: string;
      answers: Record<string, number[]>;
    }) => submitQuiz(id, answers),
    onSuccess: async (data) => {
      if (data.score >= 70) setPassed(true);
      setResult(data);
      if (user) await refreshLearningData(client, user.id);
    },
    onError: () => {
      if (user) return refreshLearningData(client, user.id);
    },
  });
  const pending = startMutation.isPending || submitMutation.isPending;
  const error = startMutation.error || submitMutation.error;
  const start = () => {
    submitMutation.reset();
    startMutation.mutate();
  };
  const submit = () => {
    if (attempt) submitMutation.mutate({ id: attempt.id, answers: selections });
  };
  if (loading || (user && progress.isPending)) return <QuizSkeleton />;
  if (!user)
    return (
      <div className="quiz-intro">
        <ClipboardCheck size={35} />
        <h2>{localize("Проверим понимание?")}</h2>
        <p>{localize("Войдите, чтобы сохранить попытку и получить разбор.")}</p>
        <Link className="button" href="/login">
          {localize(" Войти ")}
        </Link>
      </div>
    );
  if (pending && !attempt) return <QuizSkeleton />;
  if (result)
    return (
      <div className="quiz-results">
        <div className="result-summary">
          <Tag tone={result.score >= 70 ? "green" : "yellow"}>
            {localize(
              result.score >= 70
                ? "ТЕСТ ПРОЙДЕН"
                : "ЕЩЁ ОДНА ПОПЫТКА — И ПОЛУЧИТСЯ",
            )}
          </Tag>
          <strong>
            {result.score}
            <small>%</small>
          </strong>
          <h2>
            {localize(
              result.score >= 70
                ? "Хорошо разобрались."
                : "Теперь понятно, что повторить.",
            )}
          </h2>
          <div>
            <span>
              {result.correct_count} / {result.total}
              {localize(" верно ")}
            </span>
            <span>
              {Math.floor(result.seconds / 60)}
              {localize(" мин ")}
              {result.seconds % 60}
              {localize(" сек ")}
            </span>
            <span>
              {localize(
                result.xp > 0
                  ? `+${result.xp} XP за первый зачёт · однократно`
                  : result.score >= 70 || completed
                    ? "Баллы за тест уже получены"
                    : "XP не начислены",
              )}
            </span>
          </div>
          <Button onClick={start} pending={pending} className="secondary">
            <RotateCcw size={15} />
            {localize(" Новая попытка ")}
          </Button>
          {error && (
            <p className="form-error" role="alert">
              {localize(errorMessage(error))}
            </p>
          )}
        </div>
        <h3>{localize("Разбор каждого ответа")}</h3>
        {result.review.map((review, i) => (
          <article
            className={`review-question ${review.correct ? "correct" : "incorrect"}`}
            key={review.question.id}
          >
            <h4>
              <span>
                {review.correct ? <Check size={18} /> : <X size={18} />}
              </span>
              {i + 1}. {localize(review.question.prompt)}
            </h4>
            {review.question.code && <CodeBlock code={review.question.code} />}
            <div>
              <small>{localize("ВАШ ОТВЕТ")}</small>
              <p>
                {review.selected
                  .map((i) =>
                    translateOption(
                      review.question.kind,
                      review.question.options[i] ?? "",
                      localize,
                    ),
                  )
                  .join("; ") || localize("Ни одного варианта")}
              </p>
              <small>{localize("ВЕРНЫЙ ОТВЕТ")}</small>
              <p>
                {review.correct_answer
                  .map((i) =>
                    translateOption(
                      review.question.kind,
                      review.question.options[i] ?? "",
                      localize,
                    ),
                  )
                  .join("; ") || localize("Ни одного варианта")}
              </p>
            </div>
            <p className="review-explanation">{localize(review.explanation)}</p>
          </article>
        ))}
      </div>
    );
  const question = attempt?.questions[current];
  return (
    <div>
      {!attempt || !question ? (
        <div className="quiz-intro">
          <ClipboardCheck size={40} />
          <div className="eyebrow">
            {localize("Понимание вместо зубрёжки.")}
          </div>
          <h2>{localize("10 вопросов. Новая комбинация.")}</h2>
          <p>
            {localize(
              " 4 простых, 4 средних и 2 сложных вопроса из банка этой темы. После теста — подробный разбор. Для зачёта нужно 70%. ",
            )}
          </p>
          <div className="quiz-rules">
            <span>{localize("Без повторов в попытке")}</span>
            <span>{localize("Подсказки доступны")}</span>
            <span>
              {localize(
                completed
                  ? "Тест уже зачтён · повторение без XP"
                  : "+50 XP за первый зачёт",
              )}
            </span>
          </div>
          <Button pending={pending} onClick={start}>
            {localize(" Начать тест ")}
            <ArrowRight size={16} />
          </Button>
        </div>
      ) : (
        <section className="quiz-active">
          <div className="quiz-progress">
            <span>
              {localize(" ВОПРОС ")}
              {current + 1} / {attempt.questions.length}
            </span>
            <Tag>
              {localize(
                (
                  {
                    easy: "Лёгкая",
                    medium: "Средняя",
                    hard: "Сложная",
                  } as Record<string, string>
                )[question.difficulty] ?? question.difficulty,
              )}
            </Tag>
          </div>
          <ProgressBar
            value={((current + 1) / attempt.questions.length) * 100}
            label={localize("Вопросы теста")}
          />
          <h2>{localize(question.prompt)}</h2>
          {question.code && <CodeBlock code={question.code} />}
          <p className="muted">
            {localize(
              question.kind === "multiple_select"
                ? "Выберите все верные варианты. Возможен ответ без выбранных вариантов."
                : "Выберите один ответ.",
            )}
          </p>
          <div className="quiz-options">
            {question.options.map((option, i) => (
              <label
                key={i}
                className={selections[question.id]?.includes(i) ? "chosen" : ""}
              >
                <input
                  type={
                    question.kind === "multiple_select" ? "checkbox" : "radio"
                  }
                  name={question.id}
                  disabled={pending}
                  checked={selections[question.id]?.includes(i) ?? false}
                  onChange={() =>
                    setSelections((previous) => {
                      const selected = previous[question.id] ?? [];
                      return {
                        ...previous,
                        [question.id]:
                          question.kind === "multiple_select"
                            ? selected.includes(i)
                              ? selected.filter((n) => n !== i)
                              : [...selected, i]
                            : [i],
                      };
                    })
                  }
                />
                <span className="option-letter">
                  {localize(String.fromCharCode(65 + i))}
                </span>
                <span>{translateOption(question.kind, option, localize)}</span>
              </label>
            ))}
          </div>
          {question.kind === "multiple_select" &&
            !Object.hasOwn(selections, question.id) && (
              <Button
                className="secondary"
                onClick={() =>
                  setSelections((prev) => ({ ...prev, [question.id]: [] }))
                }
              >
                {localize(" Подтвердить выбор (включая пустой) ")}
              </Button>
            )}
          <button className="hint-button" onClick={() => setHint(!hint)}>
            <Lightbulb size={16} />
            {localize(" Подсказка ")}
          </button>
          {hint && <p className="hint-box">{localize(question.hint)}</p>}
          <div className="quiz-navigation">
            <Button
              className="secondary"
              disabled={current === 0 || pending}
              onClick={() => {
                setCurrent(current - 1);
                setHint(false);
              }}
            >
              {localize(" Назад ")}
            </Button>
            <span>
              {Object.keys(selections).length} / {attempt.questions.length}{" "}
              {localize(" ответов ")}
            </span>
            {current < attempt.questions.length - 1 ? (
              <Button
                disabled={pending || !Object.hasOwn(selections, question.id)}
                onClick={() => {
                  setCurrent(current + 1);
                  setHint(false);
                }}
              >
                {localize(" Далее ")}
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                disabled={
                  Object.keys(selections).length !== attempt.questions.length ||
                  pending
                }
                onClick={submit}
                pending={pending}
              >
                {localize(" Завершить тест ")}
                <Check size={16} />
              </Button>
            )}
          </div>
        </section>
      )}
      {error && (
        <p className="form-error" role="alert">
          {localize(errorMessage(error))}
        </p>
      )}
    </div>
  );
}
