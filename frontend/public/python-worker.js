/* Python runs on the visitor's device, in a disposable worker, never in the API. */
const runtimeRoot = new URL("/python-runtime/v314.0.7/", self.location.href);
const runtimeFetch = self.fetch.bind(self);
// Give rejected requests a clear error; CSP remains the isolation boundary.
self.fetch = (input, options) => {
  const url = new URL(
    input instanceof Request ? input.url : String(input),
    self.location.href,
  );
  if (
    url.origin !== runtimeRoot.origin ||
    !url.pathname.startsWith(runtimeRoot.pathname)
  ) {
    return Promise.reject(
      new TypeError("Сетевые запросы из локального Python запрещены."),
    );
  }
  return runtimeFetch(input, options);
};
self.onmessage = async ({ data }) => {
  let stdout = "";
  let stderr = "";
  const append = (text, target) => {
    if (stdout.length + stderr.length + text.length > 16000)
      throw new Error("Превышен лимит вывода (16 КБ)");
    if (target === "stdout") stdout += text + "\n";
    else stderr += text + "\n";
  };
  try {
    const { loadPyodide } =
      await import("/python-runtime/v314.0.7/pyodide.mjs");
    const python = await loadPyodide({
      indexURL: new URL("/python-runtime/v314.0.7/", self.location.href).href,
      stdout: (text) => append(text, "stdout"),
      stderr: (text) => append(text, "stderr"),
    });
    await python.loadPackagesFromImports(data.code, {
      messageCallback: () => {},
    });
    const lines =
      typeof data.stdin === "string" ? data.stdin.split(/\r?\n/) : [];
    // A trailing newline terminates the last line; it is not another blank line.
    if (lines.length > 1 && lines.at(-1) === "") lines.pop();
    let nextLine = 0;
    python.setStdin({ stdin: () => lines[nextLine++] });
    python.globals.set("__course_source", data.code);
    // WebLoop already exists in Pyodide. Adapt a top-level asyncio.run entry
    // point to top-level await; functions and nested calls retain normal rules.
    const source = python.runPython(`
import ast as __course_ast
import os as __course_os
__course_os.environ['PYTEST_DISABLE_PLUGIN_AUTOLOAD'] = '1'
__course_tree = __course_ast.parse(__course_source)
for __course_node in __course_tree.body:
    if (isinstance(__course_node, __course_ast.Expr)
        and isinstance(__course_node.value, __course_ast.Call)
        and isinstance(__course_node.value.func, __course_ast.Attribute)
        and isinstance(__course_node.value.func.value, __course_ast.Name)
        and __course_node.value.func.value.id == 'asyncio'
        and __course_node.value.func.attr == 'run'
        and len(__course_node.value.args) == 1
        and not __course_node.value.keywords):
        __course_node.value = __course_ast.Await(value=__course_node.value.args[0])
__course_ast.fix_missing_locations(__course_tree)
__course_ast.unparse(__course_tree)
`);
    self.postMessage({ type: "ready" });
    await python.runPythonAsync(source);
    self.postMessage({ type: "result", status: "ok", stdout, stderr });
  } catch (error) {
    self.postMessage({
      type: "result",
      status: "error",
      stdout,
      stderr: stderr + String(error),
    });
  }
};
