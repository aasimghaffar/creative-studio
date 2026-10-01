import { useEffect, useState } from "react";

/** Typewriter that cycles through prompts: type → pause → delete → next. */
export function usePromptCycle(prompts: string[], typeMs = 38, holdMs = 2200) {
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = prompts[index % prompts.length] ?? "";
    let timer: number;

    if (!deleting && text.length < current.length) {
      timer = window.setTimeout(() => setText(current.slice(0, text.length + 1)), typeMs);
    } else if (!deleting && text.length === current.length) {
      timer = window.setTimeout(() => setDeleting(true), holdMs);
    } else if (deleting && text.length > 0) {
      timer = window.setTimeout(() => setText(current.slice(0, text.length - 1)), 14);
    } else {
      timer = window.setTimeout(() => {
        setDeleting(false);
        setIndex((i) => (i + 1) % prompts.length);
      }, 300);
    }

    return () => window.clearTimeout(timer);
  }, [text, deleting, index, prompts, typeMs, holdMs]);

  return { text, index };
}
