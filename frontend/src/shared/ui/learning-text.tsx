"use client";
import { useI18n } from "@/shared/i18n";
import { Fragment } from "react";
import { CodeBlock } from "./code";

function InlineText({ text }: { text: string }) {
  return text.split(/(`[^`\n]+`)/).map((part, index) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={index} dir="ltr">
        {part.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export function LearningText({ text }: { text: string }) {
  const { text: localize } = useI18n();

  return (
    <div className="learning-text">
      {localize(text)
        .split(/(```(?:python|text)?\n[\s\S]*?\n```)/)
        .map((block, index) =>
          block.startsWith("```text\n") ? (
            <figure className="learning-output" key={index}>
              <figcaption>{localize("Результат")}</figcaption>
              <pre dir="ltr">{block.replace(/^```text\n|\n```$/g, "")}</pre>
            </figure>
          ) : block.startsWith("```") ? (
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
