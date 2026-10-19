/** Expected program output is part of the assessment contract, not display prose. */
export function translateOption(
  kind: string,
  option: string,
  t: (text: string) => string,
) {
  return kind !== "output_prediction" ||
    ["Возникнет исключение до вывода", "(пустой вывод)"].includes(option)
    ? t(option)
    : option;
}

/** Quoted values in exercise instructions are program data, including Russian output. */
export function exerciseMessage(source: string) {
  const literals: string[] = [];
  const template = source.replace(
    /«[^»\n]*»|'[^'\n]*'|"[^"\n]*"/g,
    (literal) => {
      literals.push(literal);
      return `{${literals.length - 1}}`;
    },
  );
  return { template, literals };
}

export function translateExerciseText(
  source: string,
  t: (text: string) => string,
) {
  const { template, literals } = exerciseMessage(source);
  return t(template).replace(
    /\{(\d+)\}/g,
    (placeholder, index: string) => literals[Number(index)] ?? placeholder,
  );
}

export function translateExerciseHint(
  hint: string,
  description: string,
  t: (text: string) => string,
) {
  const quoted = exerciseMessage(hint).literals;
  const data = exerciseMessage(description).literals;
  return quoted.length > 0 && quoted.every((literal) => data.includes(literal))
    ? translateExerciseText(hint, t)
    : t(hint);
}
