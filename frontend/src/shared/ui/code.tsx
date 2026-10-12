"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
export function Highlight({ code }: { code: string }) {
  const tokens = code.split(/("[^"\n]*"|'[^'\n]*'|#[^\n]*|\b(?:def|return|if|else|elif|for|while|in|import|from|as|True|False|None|and|or|not|class|break|continue|lambda|pass|global|nonlocal)\b|\b\d+(?:\.\d+)?\b)/g);
  return <>{tokens.map((token, i) => <span key={i} className={token.startsWith("#") ? "syntax-comment" : /^["']/.test(token) ? "syntax-string" : /^\d/.test(token) ? "syntax-number" : /^(def|return|if|else|elif|for|while|in|import|from|as|True|False|None|and|or|not|class|break|continue|lambda|pass|global|nonlocal)$/.test(token) ? "syntax-keyword" : ""}>{token}</span>)}</>;
}
export function CodeBlock({ code, title = "example.py" }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false); const [error, setError] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setError(true); } };
  return <div className="code-block"><div className="code-title"><span><i />{title}</span><button type="button" aria-label="Копировать код" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}</button></div><pre><code>{code.split("\n").map((line, i) => <span className="code-line" key={i}><span className="line-number" aria-hidden="true">{i + 1}</span><Highlight code={line} />{"\n"}</span>)}</code></pre>{error && <small role="alert">Не удалось скопировать. Выделите код вручную.</small>}</div>;
}
