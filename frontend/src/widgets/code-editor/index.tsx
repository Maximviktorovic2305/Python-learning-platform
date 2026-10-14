"use client";
import { useEffect, useRef, useState } from "react";
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
import { errorMessage } from "@/shared/api";
import { PythonLogo } from "@/shared/ui/python-logo";

export function CodeEditor({
  exercise,
  completed,
}: {
  exercise: Exercise;
  completed: boolean;
}) {
  const [code, setCode] = useState(exercise.starter_code);
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [running, setRunning] = useState(false);
  const [hint, setHint] = useState(0);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"passed" | "failed" | "error">(
    "error",
  );
  const [copied, setCopied] = useState(false);
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
    try {
      setOutput(await runPython(code, controller.current.signal));
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
      setMessageKind(result.status === "passed" ? "passed" : "failed");
      setOutput({
        status: result.status === "passed" ? "ok" : "error",
        stdout: result.stdout,
        stderr: result.stderr,
      });
      setMessage(
        result.status === "passed"
          ? `Пройдено ${result.passed}/${result.total} проверок. +${result.xp} XP`
          : `Пройдено ${result.passed}/${result.total} проверок. Попробуйте ещё раз.`,
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ["progress"] }),
        client.invalidateQueries({ queryKey: ["achievements"] }),
        client.invalidateQueries({ queryKey: ["user"] }),
      ]);
    },
    onError: (error) => {
      setMessageKind("error");
      setMessage(errorMessage(error));
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
          CHALLENGE / {exercise.id.split("-e").at(-1)}
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
            {exercise.difficulty}
          </Tag>
          <Tag>{exercise.kind.replaceAll("_", " ")}</Tag>
          {completed && (
            <Tag tone="green">
              <Check size={12} />
              Решено
            </Tag>
          )}
        </div>
        <p className="exercise-text">{exercise.description}</p>
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
      <div className="editor">
        <div className="code-title">
          <span>
            <i />
            solution.py
          </span>
          <div>
            <Tag>PYTHON 3</Tag>
            <button
              aria-label="Сбросить код"
              onClick={() => {
                setCode(exercise.starter_code);
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
              maxLength={20000}
              onChange={(e) => setCode(e.target.value)}
              onScroll={(e) => {
                if (overlay.current) {
                  overlay.current.scrollTop = e.currentTarget.scrollTop;
                  overlay.current.scrollLeft = e.currentTarget.scrollLeft;
                }
                if (numbers.current)
                  numbers.current.scrollTop = e.currentTarget.scrollTop;
              }}
              onKeyDown={(e) => {
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
            <Button onClick={run} disabled={!code.trim()}>
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
            Проверить · +30 XP
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
                    ? "Нажмите «Запустить локально», чтобы увидеть результат."
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
        серверной проверки. Программа получает пустой stdin; для этой задачи
        используйте заданные значения.
      </p>
    </div>
  );
}
