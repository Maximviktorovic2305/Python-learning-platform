import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function load(path) {
  const { outputText } = ts.transpileModule(
    await readFile(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    },
  );
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
}
const { serializeJsonLd, breadcrumb } = await load(
  "../src/shared/lib/seo-data.ts",
);
const { publicMetadata } = await load("../src/shared/config/seo.ts");

test("structured data cannot terminate its script element", () => {
  const data = { name: '</script><script>alert("x")</script>' };
  const serialized = serializeJsonLd(data);
  assert.equal(serialized.includes("<"), false);
  assert.deepEqual(JSON.parse(serialized), data);
});
test("breadcrumb and social metadata use the public HTTPS origin", () => {
  const data = breadcrumb([
    { name: "Python Lab", path: "/" },
    { name: "Курс", path: "/curriculum" },
  ]);
  assert.equal(
    data.itemListElement[1].item,
    "https://python-learning.tech/curriculum",
  );
  const metadata = publicMetadata("Тема", "Описание", "/learn/variables");
  assert.equal(
    metadata.alternates.canonical,
    "https://python-learning.tech/learn/variables",
  );
  assert.equal(metadata.openGraph.images[0].width, 1200);
  assert.equal(metadata.twitter.card, "summary_large_image");
});
