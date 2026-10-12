import ts from "typescript";
import { readdir, readFile } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
const root = resolve("src");
const ranks = {
  shared: 0,
  entities: 1,
  features: 2,
  widgets: 3,
  views: 4,
  app: 5,
};
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\.(ts|tsx)$/.test(path)) files.push(path);
  }
}
await walk(root);
const errors = [];
const graph = new Map();
for (const file of files) {
  const parts = relative(root, file).replaceAll("\\", "/").split("/");
  const [layer, slice] = parts;
  if (!(layer in ranks)) {
    errors.push(`Unknown layer: ${file}`);
    continue;
  }
  const source = ts.createSourceFile(
    file,
    await readFile(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.push(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      ts.isStringLiteral(node.arguments[0])
    )
      imports.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const imported of imports) {
    if (!imported.startsWith("@/") && !imported.startsWith(".")) continue;
    const path = imported.startsWith("@/")
      ? resolve(root, imported.slice(2))
      : resolve(dirname(file), imported);
    const target = relative(root, path).replaceAll("\\", "/").split("/");
    const [targetLayer, targetSlice] = target;
    if (!(targetLayer in ranks)) {
      errors.push(`Import outside FSD: ${file} -> ${imported}`);
      continue;
    }
    if (
      ranks[targetLayer] > ranks[layer] ||
      (layer === targetLayer &&
        slice !== targetSlice &&
        !["app", "shared"].includes(layer))
    )
      errors.push(`Layer violation: ${file} -> ${imported}`);
    if (
      layer !== targetLayer &&
      !["app", "shared"].includes(targetLayer) &&
      target.length > 2
    )
      errors.push(`Public API bypass: ${file} -> ${imported}`);
    const match = files.find((f) =>
      [
        path + ".ts",
        path + ".tsx",
        resolve(path, "index.ts"),
        resolve(path, "index.tsx"),
      ].includes(f),
    );
    if (match) {
      const edges = graph.get(file) ?? [];
      edges.push(match);
      graph.set(file, edges);
    }
  }
}
const done = new Set();
const visiting = new Set();
function checkCycle(file) {
  if (visiting.has(file)) {
    errors.push(`Circular dependency: ${file}`);
    return;
  }
  if (done.has(file)) return;
  visiting.add(file);
  for (const target of graph.get(file) ?? []) checkCycle(target);
  visiting.delete(file);
  done.add(file);
}
for (const file of files) checkCycle(file);
if (errors.length) {
  process.stderr.write(errors.join("\n") + "\n");
  process.exitCode = 1;
} else
  process.stdout.write(
    `FSD boundaries and dependency cycles checked in ${files.length} source files.\n`,
  );
