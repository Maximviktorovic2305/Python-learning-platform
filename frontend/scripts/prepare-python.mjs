import { mkdir, copyFile, stat, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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

// Bundle course dependencies and their transitive closure from Pyodide's exact
// release lock. Browser execution never needs to fetch code from another origin.
const lock = JSON.parse(
  await readFile(resolve(source, "pyodide-lock.json"), "utf8"),
);
const packages = new Set();
function include(name) {
  if (packages.has(name)) return;
  const entry = lock.packages[name];
  if (!entry) throw new Error(`Unknown Python runtime package: ${name}`);
  packages.add(name);
  for (const dependency of entry.depends) include(dependency);
}
include("sqlalchemy");
include("pytest");
await Promise.all(
  [...packages].map(async (name) => {
    const entry = lock.packages[name];
    const output = resolve(destination, entry.file_name);
    const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
    const previous = await readFile(output).catch(() => null);
    if (previous && digest(previous) === entry.sha256) return;
    const response = await fetch(
      `https://cdn.jsdelivr.net/pyodide/v${version}/full/${entry.file_name}`,
      { signal: AbortSignal.timeout(120000) },
    );
    if (!response.ok)
      throw new Error(`Could not bundle ${name}: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (digest(bytes) !== entry.sha256)
      throw new Error(`Runtime package checksum mismatch: ${name}`);
    await writeFile(output, bytes);
  }),
);
