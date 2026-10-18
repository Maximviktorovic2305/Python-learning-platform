export function ExerciseDescription({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/);
  const isNote = (block: string) =>
    /^(Исходные данные уже записаны|Проверяется результат программы)/.test(
      block,
    );
  return (
    <div className="exercise-text">
      {blocks
        .filter((block) => !isNote(block))
        .map((block, index) => (
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
                        {label[1]}
                      </strong>
                      {label[2]}
                    </>
                  ) : (
                    <span>{line || "\u00a0"}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      {blocks.filter(isNote).map((note, index) => (
        <p className="exercise-footnote" role="note" key={`note-${index}`}>
          {note}
        </p>
      ))}
    </div>
  );
}
