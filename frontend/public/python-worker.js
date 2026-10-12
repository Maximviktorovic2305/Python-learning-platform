/* Python runs on the visitor's device, in a disposable worker, never in the API. */
import { loadPyodide } from "/python-runtime/v314.0.7/pyodide.mjs";
self.onmessage = async ({ data }) => {
  let stdout = "";
  let stderr = "";
  const append = (text, target) => {
    if (stdout.length + stderr.length + text.length > 16000) throw new Error("Превышен лимит вывода (16 КБ)");
    if (target === "stdout") stdout += text + "\n"; else stderr += text + "\n";
  };
  try {
    const python = await loadPyodide({ indexURL: new URL("/python-runtime/v314.0.7/", self.location.href).href, stdout: text => append(text, "stdout"), stderr: text => append(text, "stderr") });
    self.postMessage({ type: "ready" });
    python.setStdin({ stdin: () => undefined });
    await python.runPythonAsync(data.code);
    self.postMessage({ type: "result", status: "ok", stdout, stderr });
  } catch (error) {
    self.postMessage({ type: "result", status: "error", stdout, stderr: stderr + String(error) });
  }
};
