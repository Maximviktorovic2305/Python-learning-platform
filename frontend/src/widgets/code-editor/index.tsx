"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Square,
  RotateCcw,
  Copy,
  Check,
  Lightbulb,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { Exercise } from "@/entities/exercise";
import {
  runPython,
  verifyExercise,
  type RunOutput,
} from "@/features/execute-code";
import { useAuth } from "@/features/auth";
import { Button, Tag, SkeletonRegion, SkeletonCode } from "@/shared/ui";
import { Highlight } from "@/shared/ui/code";
import { errorMessage, refreshLearningData } from "@/shared/api";
import { PythonLogo } from "@/shared/ui/python-logo";
import { ExerciseDescription } from "./description";

function readDraft(key?: string): { code: string; stdin: string } | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      typeof value === "object" &&
      value !== null &&
      "code" in value &&
      "stdin" in value &&
      typeof value.code === "string" &&
      value.code.length <= 20000 &&
      typeof value.stdin === "string" &&
      value.stdin.length <= 4000
    )
      return { code: value.code, stdin: value.stdin };
  } catch {
    /* Storage is optional; editing still works. */
  }
  return null;
}

export function CodeEditor({
  exercise,
  completed,
  draftKey,
}: {
  exercise: Exercise;
  completed: boolean;
  draftKey?: string;
}) {
  const [draft] = useState(() => readDraft(draftKey));
  const [code, setCode] = useState(draft?.code ?? exercise.starter_code);
  const [stdin, setStdin] = useState(
    draft?.stdin ?? exercise.sample_stdin ?? "",
  );
  const [draftStatus, setDraftStatus] = useState(draft ? "restored" : "new");
  const saveDraft = (nextCode: string, nextStdin: string) => {
    if (!draftKey) return;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ code: nextCode, stdin: nextStdin }),
      );
      setDraftStatus("saved");
    } catch {
      setDraftStatus("unavailable");
    }
  };
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [running, setRunning] = useState(false);
  const [hint, setHint] = useState(0);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"passed" | "failed" | "error">(
    "error",
  );
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);
  const solved = completed || verified;
  const needsInput =
    exercise.requires_stdin === true || /\binput\s*\(/.test(code);
  const controller = useRef<AbortController | null>(null);
  const overlay = useRef<HTMLPreElement | null>(null);
  const numbers = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  const { user } = useAuth();
  const client = useQueryClient();
  useEffect(() => () => controller.current?.abort(), []);
  const run = async () => {
    controller.current = new AbortController();
    setRunning(true);
    setMessage("");
    setMessageKind("error");
    try {
      setOutput(await runPython(code, controller.current.signal, stdin));
    } catch (error) {
      setMessageKind("error");
      setMessage(errorMessage(error));
    } finally {
      setRunning(false);
    }
  };
  const verification = useMutation({
    mutationKey: ["verify-exercise", exercise.id],
    mutationFn: (source: string) => verifyExercise(exercise.id, source),
    onMutate: () => {
      setMessage("");
    },
    onSuccess: async (result) => {
      if (result.status === "passed") setVerified(true);
      setMessageKind(
        result.status === "passed"
          ? "passed"
          : result.status === "failed"
            ? "failed"
            : "error",
      );
      setOutput({
        status:
          result.status === "passed"
            ? "ok"
            : result.status === "timeout"
              ? "timeout"
              : "error",
        stdout: result.stdout,
        stderr: result.stderr,
      });
      setMessage(
        result.status === "passed"
          ? `Вывод совпал с ожидаемым. ${result.xp > 0 ? `+${result.xp} XP` : "Баллы за это задание уже получены. Повторная проверка без XP."}`
          : result.status === "failed"
            ? "Вывод отличается от ожидаемого. Используйте данные из заготовки и проверьте текст, пробелы и переносы строк."
            : result.status === "timeout"
              ? "Проверка остановлена по лимиту времени. XP не начислен. Проверьте циклы и повторите запуск."
              : "Не удалось выполнить Python-код. XP не начислен. Подробности — в выводе программы.",
      );
      if (user) await refreshLearningData(client, user.id);
    },
    onError: (error) => {
      setMessageKind("error");
      setMessage(errorMessage(error));
    },
    onSettled: (_result, error) => {
      if (error && user) return refreshLearningData(client, user.id);
    },
  });
  const verifying = verification.isPending;
  const verify = () => {
    verification.mutate(code);
  };
  return (
    <div className="exercise-workspace">
      <div className="exercise-description">
        <div className="eyebrow">
          {exercise.catalog === "trainer"
            ? `ЗАДАЧА / ${exercise.id.replace("trainer-", "")}`
            : `CHALLENGE / ${exercise.id.split("-e").at(-1)}`}
        </div>
        <h2>{exercise.title}</h2>
        <div className="meta-row">
          <Tag
            tone={
              exercise.difficulty === "easy"
                ? "green"
                : exercise.difficulty === "medium"
                  ? "blue"
                  : "yellow"
            }
          >
            {(
              { easy: "Лёгкая", medium: "Средняя", hard: "Сложная" } as Record<
                string,
                string
              >
            )[exercise.difficulty] ?? exercise.difficulty}
          </Tag>
          <Tag>Самостоятельная практика</Tag>
          {solved && (
            <Tag tone="green">
              <Check size={12} />
              Решено
            </Tag>
          )}
        </div>
        <ExerciseDescription text={exercise.description} />
        <button
          className="hint-button"
          onClick={() => setHint(Math.min(hint + 1, exercise.hints.length))}
        >
          <Lightbulb size={16} />
          {hint ? "Следующая подсказка" : "Нужна подсказка?"}
        </button>
        {exercise.hints.slice(0, hint).map((h) => (
          <p className="hint-box" key={h}>
            {h}
          </p>
        ))}
      </div>
      <div className="editor ym-hide-content">
        <div className="code-title">
          <span>
            <i />
            solution.py
          </span>
          <div>
            <Tag>PYTHON 3</Tag>
            <button
              aria-label="Сбросить код"
              disabled={running || verifying}
              onClick={() => {
                setCode(exercise.starter_code);
                setStdin(exercise.sample_stdin ?? "");
                saveDraft(exercise.starter_code, exercise.sample_stdin ?? "");
                setOutput(null);
                setMessage("");
              }}
            >
              <RotateCcw size={14} />
            </button>
            <button
              aria-label="Копировать решение"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  setMessageKind("error");
                  setMessage("Выделите код и скопируйте вручную.");
                }
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
        <div className="editor-code" onClick={() => input.current?.focus()}>
          <div className="editor-numbers" ref={numbers} aria-hidden="true">
            {code.split("\n").map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <div className="editor-input">
            <pre ref={overlay} aria-hidden="true">
              <Highlight code={code + "\n"} />
            </pre>
            <textarea
              ref={input}
              aria-label="Редактор Python"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              value={code}
              readOnly={running || verifying}
              maxLength={20000}
              onChange={(e) => {
                setCode(e.target.value);
                saveDraft(e.target.value, stdin);
                setMessage("");
                setOutput(null);
              }}
              onScroll={(e) => {
                if (overlay.current) {
                  overlay.current.scrollTop = e.currentTarget.scrollTop;
                  overlay.current.scrollLeft = e.currentTarget.scrollLeft;
                }
                if (numbers.current)
                  numbers.current.scrollTop = e.currentTarget.scrollTop;
              }}
              onKeyDown={(e) => {
                if (e.currentTarget.readOnly) return;
                if (
                  e.key === "Tab" &&
                  !e.shiftKey &&
                  !e.ctrlKey &&
                  !e.metaKey
                ) {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  setCode(code.slice(0, start) + "    " + code.slice(end));
                  saveDraft(
                    code.slice(0, start) + "    " + code.slice(end),
                    stdin,
                  );
                  setMessage("");
                  setOutput(null);
                  const element = e.currentTarget;
                  requestAnimationFrame(() => {
                    element.selectionStart = element.selectionEnd = start + 4;
                  });
                }
              }}
            />
          </div>
        </div>
        <small className="editor-keyboard-note">
          Tab — отступ · Shift+Tab — выход из редактора
        </small>
        {needsInput && (
          <label className="editor-stdin">
            <span>Входные данные для input()</span>
            <textarea
              value={stdin}
              maxLength={4000}
              rows={3}
              spellCheck={false}
              autoCapitalize="off"
              readOnly={running || verifying}
              onChange={(event) => {
                setStdin(event.target.value);
                saveDraft(code, event.target.value);
              }}
            />
            <small>
              Это поле используется кнопкой «Запустить локально». Кнопка
              «Проверить» использует исходные данные задания.
            </small>
          </label>
        )}
        {exercise.local_supported === false && (
          <p className="hint-box">
            Для потоков и процессов используйте кнопку «Проверить» после входа:
            браузерный Python не поддерживает системные потоки и процессы.
          </p>
        )}
        <div className="editor-controls">
          {running ? (
            <Button
              onClick={() => controller.current?.abort()}
              className="secondary"
            >
              <Square size={14} />
              Остановить
            </Button>
          ) : (
            <Button
              onClick={run}
              disabled={
                exercise.local_supported === false || verifying || !code.trim()
              }
            >
              <Play size={15} />
              Запустить локально
            </Button>
          )}
          <Button
            className="secondary"
            disabled={!user || running || verifying || !code.trim()}
            onClick={verify}
            pending={verifying}
          >
            <ShieldCheck size={15} />
            {solved ? "Проверить повторно" : "Проверить"}
          </Button>
        </div>
        <div
          className="editor-output"
          aria-live="polite"
          aria-busy={running || verifying}
        >
          <div className="output-heading">
            <span>
              <PythonLogo size={16} />
              OUTPUT
            </span>
            <Tag
              tone={output?.status === "ok" ? "green" : output ? "yellow" : ""}
            >
              {running
                ? "RUNNING"
                : verifying
                  ? "CHECKING"
                  : output?.status === "error" && messageKind === "failed"
                    ? "ВЫВОД НЕ СОВПАЛ"
                    : (output?.status.toUpperCase() ?? "READY")}
            </Tag>
          </div>
          {running || verifying ? (
            <SkeletonRegion
              label={running ? "Выполняем Python-код…" : "Проверяем решение…"}
              className="skeleton-output"
            >
              <SkeletonCode count={3} />
            </SkeletonRegion>
          ) : (
            <>
              <pre>
                {output?.stdout ||
                  (!output
                    ? exercise.local_supported === false
                      ? "Для этого задания используйте серверную проверку."
                      : "Нажмите «Запустить локально», чтобы увидеть результат."
                    : "Программа завершилась без вывода.")}
              </pre>
              {output?.stderr && (
                <pre className="execution-error">{output.stderr}</pre>
              )}
            </>
          )}
        </div>
      </div>
      {message && (
        <div
          className={`execution-message ${messageKind === "passed" ? "success" : "error"}`}
          role="status"
        >
          {messageKind === "passed" ? (
            <CheckCircle2 size={22} aria-hidden="true" />
          ) : (
            <AlertCircle size={22} aria-hidden="true" />
          )}
          <div>
            <strong>
              {messageKind === "passed"
                ? "Задание выполнено"
                : messageKind === "failed"
                  ? "Проверка не пройдена"
                  : "Не удалось выполнить действие"}
            </strong>
            <p>{message}</p>
          </div>
        </div>
      )}
      <p className="muted small-text">
        Локальный запуск выполняется на вашем устройстве. XP выдаётся после
        серверной проверки.{" "}
        {needsInput
          ? "input() читает строки из поля «Входные данные»."
          : "Исходные данные находятся в начале solution.py."}{" "}
        Сетевые запросы из локального Python недоступны.
        {solved &&
          " Баллы за это задание уже получены. Можно практиковаться без повторного начисления XP."}
      </p>
      {draftKey && (
        <p className="muted small-text" role="status">
          {draftStatus === "saved"
            ? "Черновик сохранён в этом браузере."
            : draftStatus === "restored"
              ? "Черновик восстановлен из этого браузера."
              : draftStatus === "unavailable"
                ? "Браузер не разрешает сохранить черновик. Скопируйте код перед уходом со страницы."
                : "Во время работы черновик сохраняется в этом браузере."}
        </p>
      )}
      {!user && (
        <p className="muted small-text">
          <Link href="/login">Войдите в аккаунт</Link>, чтобы отправить решение
          на серверную проверку и сохранить прогресс.
        </p>
      )}
    </div>
  );
}
