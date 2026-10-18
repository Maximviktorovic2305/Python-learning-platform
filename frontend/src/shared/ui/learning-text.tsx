import { Fragment } from "react";
import { CodeBlock } from "./code";

function InlineText({ text }: { text: string }) {
  return text
    .split(/(`[^`\n]+`)/)
    .map((part, index) =>
      part.startsWith("`") && part.endsWith("`") ? (
        <code key={index}>{part.slice(1, -1)}</code>
      ) : (
        <Fragment key={index}>{part}</Fragment>
      ),
    );
}

export function LearningText({ text }: { text: string }) {
  return (
    <div className="learning-text">
      {text.split(/(```(?:python)?\n[\s\S]*?\n```)/).map((block, index) =>
        block.startsWith("```") ? (
          <CodeBlock
            key={index}
            code={block.replace(/^```(?:python)?\n|\n```$/g, "")}
          />
        ) : (
          block
            .split(/\n\s*\n/)
            .filter(Boolean)
            .map((paragraph, part) => (
              <p key={`${index}-${part}`}>
                <InlineText text={paragraph} />
              </p>
            ))
        ),
      )}
    </div>
  );
}
