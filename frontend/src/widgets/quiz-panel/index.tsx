"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  Button,
  Tag,
  ProgressBar,
  Skeleton,
  SkeletonRegion,
  SkeletonLines,
} from "@/shared/ui";
import { CodeBlock } from "@/shared/ui/code";
import { errorMessage } from "@/shared/api";

function QuizSkeleton() {
  return (
    <SkeletonRegion label="Готовим вопросы теста…" className="skeleton-quiz">
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

export function QuizPanel({ topicId }: { topicId: string }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [selections, setSelections] = useState<Record<string, number[]>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState(false);
  const start = async () => {
    setPending(true);
    setError("");
    try {
      setAttempt(await startQuiz(topicId));
      setResult(null);
      setSelections({});
      setCurrent(0);
      setHint(false);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  };
  const submit = async () => {
    if (!attempt) return;
    setPending(true);
    setError("");
    try {
      setResult(await submitQuiz(attempt.id, selections));
      await client.invalidateQueries({ queryKey: ["progress"] });
      await client.invalidateQueries({ queryKey: ["achievements"] });
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  };
  if (!user)
    return (
      <div className="quiz-intro">
        <ClipboardCheck size={35} />
        <h2>Проверим понимание?</h2>
        <p>Войдите, чтобы сохранить попытку и получить разбор.</p>
        <Link className="button" href="/login">
          Войти
        </Link>
      </div>
    );
  if (pending && !attempt) return <QuizSkeleton />;
  if (result)
    return (
      <div className="quiz-results">
        <div className="result-summary">
          <Tag tone={result.score >= 70 ? "green" : "yellow"}>
            {result.score >= 70
              ? "ТЕСТ ПРОЙДЕН"
              : "ЕЩЁ ОДНА ПОПЫТКА — И ПОЛУЧИТСЯ"}
          </Tag>
          <strong>
            {result.score}
            <small>%</small>
          </strong>
          <h2>
            {result.score >= 70
              ? "Хорошо разобрались."
              : "Теперь понятно, что повторить."}
          </h2>
          <div>
            <span>
              {result.correct_count} / {result.total} верно
            </span>
            <span>
              {Math.floor(result.seconds / 60)} мин {result.seconds % 60} сек
            </span>
            <span>+{result.xp} XP</span>
          </div>
          <Button onClick={start} pending={pending} className="secondary">
            <RotateCcw size={15} />
            Новая попытка
          </Button>
        </div>
        <h3>Разбор каждого ответа</h3>
        {result.review.map((review, i) => (
          <article
            className={`review-question ${review.correct ? "correct" : "incorrect"}`}
            key={review.question.id}
          >
            <h4>
              <span>
                {review.correct ? <Check size={18} /> : <X size={18} />}
              </span>
              {i + 1}. {review.question.prompt}
            </h4>
            {review.question.code && <CodeBlock code={review.question.code} />}
            <div>
              <small>ВАШ ОТВЕТ</small>
              <p>
                {review.selected
                  .map((i) => review.question.options[i])
                  .join("; ") || "Ни одного варианта"}
              </p>
              <small>ВЕРНЫЙ ОТВЕТ</small>
              <p>
                {review.correct_answer
                  .map((i) => review.question.options[i])
                  .join("; ") || "Ни одного варианта"}
              </p>
            </div>
            <p className="review-explanation">{review.explanation}</p>
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
          <div className="eyebrow">UNDERSTAND, DON’T MEMORIZE</div>
          <h2>10 вопросов. Новая комбинация.</h2>
          <p>
            4 простых, 4 средних и 2 сложных вопроса из банка этой темы. После
            теста — подробный разбор. Для зачёта нужно 70%.
          </p>
          <div className="quiz-rules">
            <span>Без повторов</span>
            <span>Подсказки доступны</span>
            <span>+50 XP за первый зачёт</span>
          </div>
          <Button pending={pending} onClick={start}>
            Начать тест
            <ArrowRight size={16} />
          </Button>
        </div>
      ) : (
        <section className="quiz-active">
          <div className="quiz-progress">
            <span>
              ВОПРОС {current + 1} / {attempt.questions.length}
            </span>
            <Tag>{question.difficulty}</Tag>
          </div>
          <ProgressBar
            value={((current + 1) / attempt.questions.length) * 100}
            label="Вопросы теста"
          />
          <h2>{question.prompt}</h2>
          {question.code && <CodeBlock code={question.code} />}
          <p className="muted">
            {question.kind === "multiple_select"
              ? "Выберите все верные варианты. Возможен ответ без выбранных вариантов."
              : "Выберите один ответ."}
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
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
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
                Подтвердить выбор (включая пустой)
              </Button>
            )}
          <button className="hint-button" onClick={() => setHint(!hint)}>
            <Lightbulb size={16} />
            Подсказка
          </button>
          {hint && <p className="hint-box">{question.hint}</p>}
          <div className="quiz-navigation">
            <Button
              className="secondary"
              disabled={current === 0}
              onClick={() => {
                setCurrent(current - 1);
                setHint(false);
              }}
            >
              Назад
            </Button>
            <span>
              {Object.keys(selections).length} / {attempt.questions.length}{" "}
              ответов
            </span>
            {current < attempt.questions.length - 1 ? (
              <Button
                disabled={!Object.hasOwn(selections, question.id)}
                onClick={() => {
                  setCurrent(current + 1);
                  setHint(false);
                }}
              >
                Далее <ArrowRight size={16} />
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
                Завершить тест
                <Check size={16} />
              </Button>
            )}
          </div>
        </section>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
