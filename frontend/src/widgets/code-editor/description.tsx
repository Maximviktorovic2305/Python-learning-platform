"use client";
import { useI18n } from "@/shared/i18n";
import { translateExerciseText } from "@/shared/i18n/learning";
export function ExerciseDescription({ text }: { text: string }) {
  const { text: localize } = useI18n();

  const blocks = text.split(/\n\s*\n/);
  const isNote = (block: string) =>
    /^(Исходные данные уже записаны|Проверяется результат программы)/.test(
      block,
    );
  return (
    <div className="exercise-text">
      {blocks
        .filter((block) => !isNote(block))
        .map((block, index) => {
          const verbatim =
            /^(Ожидаемый вывод:|Пример ввода:|Ввод:|Вывод:)/.test(block);
          return (
            <div className="exercise-text-block" key={index}>
              {block.split("\n").map((line, lineIndex) => {
                const label = line.match(
                  /^(Пример(?: \d+)?$|Пример ввода:|Ожидаемый вывод:|Ввод:|Вывод:)(.*)$/,
                );
                return (
                  <div key={lineIndex}>
                    {label ? (
                      <>
                        <strong className="exercise-text-label">
                          {localize(label[1])}
                        </strong>
                        {label[2]}
                      </>
                    ) : (
                      <span
                        dir={verbatim ? "ltr" : undefined}
                        translate={verbatim ? "no" : undefined}
                      >
                        {(verbatim
                          ? line
                          : translateExerciseText(line, localize)) || "\u00a0"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      {blocks.filter(isNote).map((note, index) => (
        <p className="exercise-footnote" role="note" key={`note-${index}`}>
          {translateExerciseText(note, localize)}
        </p>
      ))}
    </div>
  );
}
