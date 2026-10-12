import { api, unwrap } from "@/shared/api";
export type RunOutput = {
  status: "ok" | "error" | "timeout";
  stdout: string;
  stderr: string;
};
export function runPython(
  code: string,
  signal: AbortSignal,
): Promise<RunOutput> {
  return new Promise((resolve) => {
    const worker = new Worker("/python-worker.js", { type: "module" });
    let timer: ReturnType<typeof setTimeout>;
    let finished = false;
    let ready = false;
    const finish = (result: RunOutput) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      worker.terminate();
      signal.removeEventListener("abort", abort);
      resolve(result);
    };
    const abort = () =>
      finish({
        status: "error",
        stdout: "",
        stderr: "Выполнение остановлено.",
      });
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort);
    timer = setTimeout(
      () =>
        finish({
          status: "timeout",
          stdout: "",
          stderr:
            "Не удалось загрузить Python за 45 секунд. Проверьте соединение.",
        }),
      45000,
    );
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (typeof data !== "object" || data === null || !("type" in data))
        return;
      if (data.type === "ready" && !ready) {
        ready = true;
        clearTimeout(timer);
        timer = setTimeout(
          () =>
            finish({
              status: "timeout",
              stdout: "",
              stderr:
                "Превышен лимит 5 секунд. Проверьте условие завершения цикла.",
            }),
          5000,
        );
      } else if (
        data.type === "result" &&
        "status" in data &&
        (data.status === "ok" || data.status === "error") &&
        "stdout" in data &&
        typeof data.stdout === "string" &&
        "stderr" in data &&
        typeof data.stderr === "string"
      )
        finish({
          status: data.status,
          stdout: data.stdout.slice(0, 16000),
          stderr: data.stderr.slice(0, 16000),
        });
    };
    worker.onerror = () =>
      finish({
        status: "error",
        stdout: "",
        stderr:
          "Python не загрузился. Проверьте соединение и повторите запуск.",
      });
    worker.postMessage({ code });
  });
}
export async function verifyExercise(id: string, code: string) {
  return unwrap(
    await api.POST("/api/exercises/{exercise_id}/submit", {
      params: { path: { exercise_id: id } },
      body: { code },
    }),
  );
}
