import { translateUI, t as ui } from "../lib/i18n";
import { toast } from "../lib/toast";
import { playInteraction } from "../lib/interaction-sound";
import { useId, useState, useSyncExternalStore } from "react";
import { testKey } from "../../shared/index.js";
import { getChecker, onCheckerChange, setChecker } from "../lib/checker";
import { GeminiGate } from "./GeminiGate";
import { geminiAccess } from "../lib/gemini";

export function CheckerPicker({ disabled = false }: { disabled?: boolean }) {
  const group = useId();
  const { mode } = useSyncExternalStore(onCheckerChange, getChecker, getChecker);
  return <div className="field checker-picker" role="group" aria-label={ui("Checker")}>
    <span className="field__label">{ui("Checker")}</span>
    <label><input type="radio" name={group} value="free" checked={mode !== "own"} disabled={disabled}
      onChange={() => setChecker({ mode: "free" })} /> {ui("Free checker")}</label>
    <details className="checker-more" open={mode === "own" || undefined}>
      <summary>{ui("More options")}</summary>
      <label><input type="radio" name={group} value="own" checked={mode === "own"} disabled={disabled}
        onChange={() => setChecker({ mode: "own" })} /> {ui("Your own Gemini key (18+)")}</label>
    </details>
  </div>;
}

export function CheckerSetup({ onAdultReady }: { onAdultReady?: () => void } = {}) {
  const { mode, key } = useSyncExternalStore(onCheckerChange, getChecker, getChecker);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);
  if (mode !== "own") return <p className="gen-note">{ui("Free AI practice feedback. Write your answer, then press Evaluate.")}</p>;
  const candidate = value.trim() || key;
  return (
    <GeminiGate onConfirm={onAdultReady}><div className="checker-setup side-stack">
      <p className="gen-note">{ui("Your own quota: no site limit. Checks go directly from this browser to Google. Google's free limits still apply.")}</p>
      <ol className="gen-note checker-steps">
        <li>{ui("Open")} <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a> {ui("and sign in.")}</li>
        <li>{ui("Choose Create API key.")}</li><li>{ui("Paste your key here and save.")}</li>
      </ol>
      <label className="field"><span className="field__label">{ui("Your Gemini API key")}</span>
        <input className="input" type="password" autoComplete="off" spellCheck={false} value={value}
          placeholder={key ? ui("Key saved in this browser") : ui("Paste your free key")} onChange={(e) => { setValue(e.target.value); setMessage(""); }} disabled={testing} />
      </label>
      <div className="row checker-actions">
        <button className="btn btn--sm" disabled={!value.trim() || testing} onClick={() => {
          const saved = setChecker({ key: value.trim(), mode: "own" });
          setValue(""); if (saved) toast("Saved"); setMessage(saved ? "Key saved in this browser." : "Browser storage is blocked. Key kept only for this page session.");
        }}>{ui("Save")}</button>
        <button className="btn btn--sm btn--quiet" disabled={(!key && !value) || testing} onClick={() => {
          const saved = setChecker({ key: "", mode: "free" }); setValue("");
          setMessage(saved ? "Key removed." : "Storage is blocked. Clear this site's browser data to remove any previously saved key.");
        }}>{ui("Remove")}</button>
        <button className="btn btn--sm btn--quiet" disabled={!candidate || testing} onClick={async () => {
          setTesting(true); setMessage("Testing with Google…");
          try { await geminiAccess.require(); setMessage(await testKey(candidate)); } catch (e) { playInteraction("error"); setMessage((e as Error).message); }
          finally { setTesting(false); }
        }}>{testing ? ui("Testing…") : ui("Test key")}</button>
      </div>
      <p className="gen-note" role="status">{translateUI(message) || (key ? ui("A key is saved.") : ui("No key saved yet."))}</p>
      <p className="gen-note">{ui("The key is stored only in this browser. Anyone using this browser profile can use it. Use only the free allowance. Remove it on shared computers.")}</p>
    </div></GeminiGate>
  );
}
