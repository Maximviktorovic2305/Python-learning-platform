import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const { outputText } = ts.transpileModule(
  await readFile(new URL("../src/shared/lib/csp.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  },
);
const { pageCsp } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
test("production scripts require a nonce and workers remain isolated", () => {
  const policy = pageCsp("test-random-nonce-0123456789");
  const script = policy
    .split("; ")
    .find((item) => item.startsWith("script-src "));
  assert.ok(script.includes("'strict-dynamic'"));
  assert.ok(script.includes("'nonce-test-random-nonce-0123456789'"));
  assert.ok(!script.includes("unsafe-inline"));
  assert.ok(!policy.includes("unsafe-eval"));
  assert.ok(!policy.includes("*"));
  assert.ok(policy.includes("worker-src 'self' blob:"));
});
test("nonce cannot inject CSP directives", () => {
  assert.throws(() => pageCsp("x'; script-src *"));
});
