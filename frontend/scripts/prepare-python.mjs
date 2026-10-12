import { mkdir, copyFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { version } = require("pyodide/package.json");
const source = dirname(require.resolve("pyodide/package.json"));
const destination = resolve("public", "python-runtime", `v${version}`);
await mkdir(destination, { recursive: true });
for (const name of [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
]) {
  const input = resolve(source, name);
  const output = resolve(destination, name);
  const previous = await stat(output).catch(() => null);
  if (!previous || previous.size !== (await stat(input)).size)
    await copyFile(input, output);
}
