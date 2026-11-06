import { translateUI, t as ui } from "../lib/i18n";
import { playInteraction } from "../lib/interaction-sound";
import { useEffect, useRef, useState, type RefObject } from "react";
import { applyGrammarSuggestion, checkGrammar, grammarContext, grammarDisabled, remainingGrammar, TIMED_GRAMMAR_NOTE, type GrammarMatch } from "../lib/language-tool";

export default function GrammarCheck({ text, setText, running, locked, editor }: {
  text: string; setText: (text: string) => void; running: boolean; locked: boolean; editor: RefObject<HTMLTextAreaElement | null>;
}) {
  const [checked, setChecked] = useState<string | null>(null);
  const [matches, setMatches] = useState<GrammarMatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const request = useRef<AbortController | null>(null);
  const latest = useRef({ text, running, locked });
  latest.current = { text, running, locked };
  const stale = checked !== null && text !== checked;

  useEffect(() => {
    if (running) { request.current?.abort(); request.current = null; setBusy(false); }
  }, [running]);
  useEffect(() => () => request.current?.abort(), []);

  const check = async () => {
    if (grammarDisabled(latest.current.text, latest.current.running, busy, latest.current.locked) || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setMessage(""); setChecked(null); setMatches([]);
    try {
      const found = await checkGrammar(text, fetch, controller.signal);
      if (controller.signal.aborted || latest.current.running) return;
      setChecked(text); setMatches(found);
    } catch (e) { if (!controller.signal.aborted) { playInteraction("error"); setMessage((e as Error).message); } }
    finally { if (request.current === controller) { request.current = null; setBusy(false); } }
  };
  const select = (match: GrammarMatch) => {
    if (latest.current.running) return;
    if (latest.current.text !== checked) { setMessage("The draft changed. Re-check before using these suggestions."); return; }
    editor.current?.focus();
    editor.current?.setSelectionRange(match.offset, match.offset + match.length);
    editor.current?.scrollIntoView({ block: "center", behavior: "instant" });
  };
  const replace = (match: GrammarMatch, value: string) => {
    if (latest.current.running || latest.current.locked || checked === null) return;
    const next = applyGrammarSuggestion(latest.current.text, checked, match, value);
    if (next === null) { playInteraction("error"); setMessage("The draft changed. Re-check before using these suggestions."); return; }
    playInteraction("accept");
    setText(next); setChecked(next); setMatches((list) => remainingGrammar(list, match, value)); setMessage("");
    requestAnimationFrame(() => { editor.current?.focus(); editor.current?.setSelectionRange(match.offset, match.offset + value.length); });
  };

  return (
    <div className="grammar-check">
      <div className="grammar-toolbar">
        <button className="btn btn--sm btn--quiet" disabled={grammarDisabled(text, running, busy, locked)} aria-describedby="grammarNotice" onClick={() => { void check(); }}>{busy ? ui("Checking spelling & grammar…") : ui("Check spelling & grammar")}</button>
        <p id="grammarNotice" className="hint">{running ? translateUI(TIMED_GRAMMAR_NOTE) : ui("Sends this essay to LanguageTool when you click. Suggestions are practice guidance.")}</p>
      </div>
      <p role="status" className="hint">{translateUI(message) || (!running && stale ? ui("The draft changed. Re-check before using these suggestions.") : !running && checked !== null ? ui("Spelling & grammar items remaining: {count}", { count: matches.length }) : "")}</p>
      {!running && checked !== null && matches.length > 0 && <ul className="grammar-list">
        {matches.map((match) => {
          const context = grammarContext(checked, match);
          return <li key={match.id}>
            <button className="grammar-context" onClick={() => select(match)} aria-label={translateUI(`Select in essay: ${match.original || ui("insertion point")}`)}>{context.before}<u>{context.problem || ui("[insert here]")}</u>{context.after}</button>
            <p>{match.message}</p>
            <div className="grammar-suggestions">
              {match.suggestions.map((value) => <button key={value} className="btn btn--sm" disabled={stale || locked} data-sound="handled" onClick={() => replace(match, value)}>{value || ui("Remove")}</button>)}
              <button className="btn btn--sm btn--quiet" onClick={() => setMatches((list) => list.filter((m) => m.id !== match.id))}>{ui("Ignore")}</button>
            </div>
          </li>;
        })}
      </ul>}
    </div>
  );
}
