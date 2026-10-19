export type Dictionary = Readonly<Record<string, string>>;

const escapePattern = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Source strings are keys so content IDs, answer indices and API caches stay canonical. */
export function createTranslator(dictionary: Dictionary) {
  const folded = new Map(
    Object.entries(dictionary).map(([source, target]) => [
      source.toLowerCase(),
      target,
    ]),
  );
  const resolved = new Map<string, string>();
  const templates = Object.entries(dictionary)
    .filter(([source]) => /\{\d+\}/.test(source))
    .map(([source, target]) => ({
      pattern: new RegExp(
        "^" +
          source
            .split(/\{\d+\}/)
            .map(escapePattern)
            .join("([\\s\\S]*?)") +
          "$",
      ),
      target,
    }));

  return function translate(text: string, depth = 0): string {
    if (!text || !/[А-Яа-яЁё]/.test(text)) return text;
    const source = text.trim();
    let translated = resolved.get(source) ?? dictionary[source];
    if (translated === undefined && depth < 3) {
      for (const { pattern, target } of templates) {
        const match = pattern.exec(source);
        if (match) {
          translated = target.replace(/\{(\d+)\}/g, (_, index: string) =>
            translate(match[Number(index) + 1] ?? "", depth + 1),
          );
          break;
        }
      }
    }
    if (translated === undefined) {
      const candidate = folded.get(source.toLowerCase());
      if (candidate !== undefined)
        translated =
          source === source.toUpperCase()
            ? candidate.toUpperCase()
            : candidate.toLowerCase();
    }
    if (translated === undefined) return text;
    if (resolved.size < 5000) resolved.set(source, translated);
    return (
      text.slice(0, text.length - text.trimStart().length) +
      translated +
      text.slice(text.trimEnd().length)
    );
  };
}
