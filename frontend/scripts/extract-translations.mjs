import ts from "typescript";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sources = new Set(
  JSON.parse(await readFile("src/shared/i18n/content-sources.json", "utf8")),
);
const collect = (text) => {
  if (/[А-Яа-яЁё]/.test(text)) sources.add(text.trim());
};
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "messages") await walk(path);
    } else if (/\.tsx?$/.test(path) && !path.endsWith("schema.ts")) {
      const file = ts.createSourceFile(
        path,
        await readFile(path, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      const bindings = new Map();
      function bind(node) {
        if (
          ts.isVariableDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          node.initializer
        )
          bindings.set(node.name.text, node.initializer);
        ts.forEachChild(node, bind);
      }
      bind(file);
      function values(node, depth = 0) {
        if (depth > 8) return [];
        if (
          ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node)
        )
          return [node.text];
        if (ts.isIdentifier(node) && bindings.has(node.text))
          return values(bindings.get(node.text), depth + 1);
        if (ts.isConditionalExpression(node))
          return [
            ...values(node.whenTrue, depth + 1),
            ...values(node.whenFalse, depth + 1),
          ];
        if (
          ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.PlusToken
        )
          return values(node.left, depth + 1).flatMap((left) =>
            values(node.right, depth + 1).map((right) => left + right),
          );
        return [];
      }
      function visit(node) {
        if (
          ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node)
        )
          collect(node.text);
        if (ts.isJsxText(node)) collect(node.text.replace(/\s+/g, " "));
        if (
          ts.isBinaryExpression(node) &&
          node.operatorToken.kind === ts.SyntaxKind.PlusToken
        )
          values(node).forEach(collect);
        if (ts.isTemplateExpression(node)) {
          collect(
            node.head.text +
              node.templateSpans
                .map((span, index) => `{${index}}${span.literal.text}`)
                .join(""),
          );
        }
        ts.forEachChild(node, visit);
      }
      visit(file);
    }
  }
}
export async function extractSources() {
  await walk("src");
  return [...sources].filter(Boolean).sort();
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const inventory = await extractSources();
  await writeFile(
    "src/shared/i18n/sources.json",
    JSON.stringify(inventory, null, 2) + "\n",
  );
  console.log(`Extracted ${inventory.length} display strings`);
}
