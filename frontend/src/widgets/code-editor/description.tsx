export function ExerciseDescription({ text }: { text: string }) {
  return (
    <div className="exercise-text">
      {text.split(/\n\s*\n/).map((block, index) => (
        <div className="exercise-text-block" key={index}>
          {block.split("\n").map((line, lineIndex) => {
            const label = line.match(
              /^(Пример(?: \d+)?$|Пример ввода:|Ожидаемый вывод:|Ввод:|Вывод:)(.*)$/,
            );
            return (
              <div key={lineIndex}>
                {label ? (
                  <>
                    <strong className="exercise-text-label">{label[1]}</strong>
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
    </div>
  );
}
