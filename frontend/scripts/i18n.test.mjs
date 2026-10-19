import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { extractSources } from "./extract-translations.mjs";

async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
}
const { createTranslator } = await loadModule(
  "../src/shared/i18n/translate.ts",
);
const { translateOption, translateExerciseText, translateExerciseHint } =
  await loadModule("../src/shared/i18n/learning.ts");
const { languages, isLocale, direction } = await loadModule(
  "../src/shared/i18n/config.ts",
);
const json = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const sources = await json("../src/shared/i18n/sources.json");
const fragments = (text) => {
  const blocks = (text.match(/```[\s\S]*?```/g) ?? []).sort();
  const prose = text.replace(/```[\s\S]*?```/g, "");
  // Grammar may repeat an inline symbol; executable examples and parameters are exact.
  return {
    blocks,
    symbols: [...new Set(prose.match(/`[^`\n]+`/g) ?? [])].sort(),
    parameters: (prose.match(/\{\d+\}/g) ?? []).sort(),
  };
};

test("the translation inventory agrees with current interface source", async () => {
  const actual = await extractSources();
  const missing = actual.filter((source) => !sources.includes(source));
  const obsolete = sources.filter((source) => !actual.includes(source));
  assert.equal(
    missing.length + obsolete.length,
    0,
    `Inventory is stale: ${missing.length} added, ${obsolete.length} removed. Run npm run i18n:extract.`,
  );
});

test("ten supported languages agree with the API and include RTL", async () => {
  assert.equal(languages.length, 10);
  const api = await json("../../backend/openapi.json");
  assert.deepEqual(
    api.components.schemas.LocaleUpdate.properties.locale.enum,
    languages.map(({ code }) => code),
  );
  assert.equal(isLocale("zh-CN"), true);
  assert.equal(isLocale("zh"), false);
  assert.equal(isLocale(null), false);
  assert.equal(direction("ar"), "rtl");
  assert.equal(direction("en"), "ltr");
});

test("templates translate dynamic labels, preserve values and whitespace", () => {
  const t = createTranslator({
    "Привет, {0}.": "Hello, {0}.",
    "Поле {0}: {1}": "{1} for {0}",
    Пароль: "Password",
  });
  assert.equal(t(" Привет, Alice. "), " Hello, Alice. ");
  assert.equal(t("Поле Пароль: 12"), "12 for Password");
  assert.equal(t("ПАРОЛЬ"), "PASSWORD");
  assert.equal(t("unknown"), "unknown");
  assert.equal(createTranslator({})("Профиль"), "Профиль");
});

test("program output options stay byte-for-byte identical", () => {
  const t = createTranslator({
    Верно: "True",
    "Возникнет исключение до вывода": "An exception occurs before output",
  });
  assert.equal(translateOption("output_prediction", "Верно", t), "Верно");
  assert.equal(translateOption("true_false", "Верно", t), "True");
  assert.equal(
    translateOption("output_prediction", "Возникнет исключение до вывода", t),
    "An exception occurs before output",
  );
});

test("exercise prose translates while exact output literals remain unchanged", () => {
  const t = createTranslator({
    "Выведите {0}, иначе {1}.": "Print {0}, otherwise {1}.",
    гость: "guest",
  });
  assert.equal(
    translateExerciseText("Выведите «гость», иначе 'пройден'.", t),
    "Print «гость», otherwise 'пройден'.",
  );
  assert.equal(
    translateExerciseText(
      "Выведите «гость», иначе 'пройден'.",
      createTranslator({}),
    ),
    "Выведите «гость», иначе 'пройден'.",
  );
  assert.equal(
    translateExerciseText(
      "Верните ''.",
      createTranslator({ "Верните {0}.": "Return {0}." }),
    ),
    "Return ''.",
  );
});

test("hints preserve exercise data and translate ordinary quoted prose", () => {
  const t = createTranslator({
    "Выведите {0}.": "Print {0}.",
    "Фраза «не работает» не объясняет проблему.":
      "The phrase “it does not work” does not explain the problem.",
  });
  assert.equal(
    translateExerciseHint("Выведите «гость».", "Выведите «гость».", t),
    "Print «гость».",
  );
  assert.equal(
    translateExerciseHint(
      "Фраза «не работает» не объясняет проблему.",
      "Сложите числа.",
      t,
    ),
    "The phrase “it does not work” does not explain the problem.",
  );
});

test("the English catalog instructs printing the exact required value", async () => {
  const t = createTranslator(await json("../src/shared/i18n/messages/en.json"));
  assert.equal(translateExerciseText("Выведите «гость».", t), "Print «гость».");
});

for (const { code } of languages.filter(({ code }) => code !== "ru")) {
  test(`${code}: complete catalog with intact code and interpolation`, async () => {
    const dictionary = await json(`../src/shared/i18n/messages/${code}.json`);
    const missing = sources.filter((source) => !dictionary[source]);
    assert.equal(
      missing.length,
      0,
      `Missing ${missing.length} translations; first: ${missing[0]?.slice(0, 80)}`,
    );
    for (const source of sources) {
      const target = dictionary[source];
      assert.equal(typeof target, "string");
      assert.equal(
        JSON.stringify(fragments(target)),
        JSON.stringify(fragments(source)),
        `Protected text changed: ${source.slice(0, 80)}`,
      );
      assert.equal(
        /ZX(?:ITEM|CODE|Q\d)/.test(target),
        false,
        "Unresolved preparation placeholder",
      );
      assert.equal(
        target.includes("⁇"),
        false,
        `Unknown tokenizer glyph: ${source.slice(0, 80)}`,
      );
    }
    const t = createTranslator(dictionary);
    assert.notEqual(t("Язык сайта"), "Язык сайта");
    assert.notEqual(t("Сохранить изменения"), "Сохранить изменения");
  });
}
