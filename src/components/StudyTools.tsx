import { translateError, t as ui, translateUI } from "../lib/i18n";
import { useSlowReply, STILL_WORKING, BUSY_NOTICE } from "../lib/use-slow-reply";
import { playInteraction } from "../lib/interaction-sound";
import { useRef, useState } from "react";
import type { Chart, MarkResult } from "../lib/types";
import type { HelperTurn } from "../lib/helper";
import { askFeedback, getModelAnswer, recentChat, reviewedSummary, type StudyAnswer } from "../lib/study";
import { feedbackText } from "../lib/feedback";
import { countWords } from "../lib/fixes";

export default function StudyTools({ result, essay, question, chart, chartDescription, memory }: {
  result: MarkResult; essay: string; question: string; chart?: Chart | null; chartDescription?: string; memory: string;
}) {
  const [model, setModel] = useState<StudyAnswer | null>(null);
  const [modelBusy, setModelBusy] = useState(false);
  const [modelError, setModelError] = useState("");
  const [chat, setChat] = useState<(HelperTurn & { engine?: string })[]>([]);
  const [q, setQ] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const modelLock = useRef(false), chatLock = useRef(false), chatGeneration = useRef(0);
  const modelSlow = useSlowReply(modelBusy), chatSlow = useSlowReply(chatBusy);
  const busyNotice = result.checker === "own" ? "" : BUSY_NOTICE;
  const language = result.feedbackLanguage || "en";
  const ask = async () => {
    const message = q.trim();
    if (message.length < 2 || chatLock.current) return;
    chatLock.current = true; setChatBusy(true); setChatError(""); setQ("");
    const generation = chatGeneration.current;
    const history = recentChat(chat);
    setChat((old) => [...old, { role: "user", text: message }].slice(-10) as typeof old);
    try {
      const answer = await askFeedback({ role: "feedback", message, task: result.task, taskQuestion: question, paragraph: "", history,
        essay, reportSummary: reviewedSummary(result), memory, feedbackLanguage: language });
      const text = result.feedbackOnly ? feedbackText(answer.text) || "Ask about a specific correction or paragraph. This report has feedback only." : answer.text;
      if (generation === chatGeneration.current) setChat((old) => [...old, { role: "model", text, engine: answer.engine }].slice(-10) as typeof old);
    } catch (e) { if (generation === chatGeneration.current) { playInteraction("error"); setChatError((e as Error).message); } }
    finally { chatLock.current = false; setChatBusy(false); }
  };
  return <>
    <section id="r-model" className="frame study-tools" aria-labelledby="modelTitle">
      <div className="frame-head"><h2 id="modelTitle">{ui("Model answer")}</h2></div>
      <div className="frame-body side-stack">
        <p>{ui("Model answer for study. It is not your score and not your writing.")}</p>
        <button className="btn" disabled={modelBusy || !!model} onClick={async () => {
          if (modelLock.current) return;
          modelLock.current = true; setModelBusy(true); setModelError("");
          try { setModel(await getModelAnswer({ task: result.task, question, chartDescription: result.chartDescription || chartDescription, essay, words: countWords(essay),
            image: chart ? { data: chart.base64, mime: chart.mime } : null })); }
          catch (e) { playInteraction("error"); setModelError((e as Error).message); }
          finally { modelLock.current = false; setModelBusy(false); }
        }}>{modelBusy ? ui("Preparing study model…") : model ? ui("Study model ready") : ui("Show a band-9 version")}</button>
        <p className="gen-note">{ui("An AI study example aiming at the highest descriptor level, not a guaranteed result. Your report stays the same.")}</p>
        {modelBusy && <p className="processing" role="status">{modelSlow ? `${translateUI(STILL_WORKING)} ${translateUI(busyNotice)}` : ui("Preparing study model…")}</p>}
        {modelError && <p role="alert" className="form-error">{translateError(modelError)}</p>}
        {model && <><p className="gen-note">{ui("Generated with {value0}", { value0: model.engine })}</p><div className="model-compare" dir="ltr">
          <div><h3>{ui("Your submitted answer")}</h3><p>{essay}</p></div><div><h3>{ui("Study model")}</h3><p>{model.text}</p></div>
        </div></>}
      </div>
    </section>
    <section id="r-chat" className="frame study-tools" aria-labelledby="chatTitle">
      <div className="frame-head"><h2 id="chatTitle">{ui("Ask about this feedback")}</h2><button className="btn btn--sm btn--quiet" onClick={() => {
        ++chatGeneration.current; setChat([]); setChatError("");
      }}>{ui("Clear chat")}</button></div>
      <div className="frame-body side-stack">
        <p className="gen-note">{ui("Questions about this essay and its reviewed feedback. The last 10 messages stay in page memory only.")}</p>
        <div className="feedback-chat" role="log" aria-live="polite">
          {chat.map((turn, i) => <div key={i} className={"coach-msg coach-msg--" + turn.role}>
            <p dir={turn.role === "model" && language === "ar" ? "rtl" : "auto"}>{turn.text}</p>
            <small className="gen-note">{turn.role === "user" ? ui("You") : turn.engine}</small>
          </div>)}
          {chatBusy && <p className="processing" role="status">{chatSlow ? `${translateUI(STILL_WORKING)} ${translateUI(busyNotice)}` : ui("Thinking…")}</p>}
        </div>
        <form className="helper-form" onSubmit={(e) => { e.preventDefault(); void ask(); }}>
          <label className="field__label" htmlFor="feedbackQuestion">{ui("Question about your report")}</label>
          <div className="helper-row"><input className="input" id="feedbackQuestion" maxLength={500} value={q} onChange={(e) => setQ(e.target.value)} placeholder={ui("Why is ‘has became’ wrong?")} />
            <button className="btn" disabled={chatBusy || q.trim().length < 2}>{ui("Ask")}</button></div>
        </form>
        {chatError && <p role="alert" className="form-error">{translateError(chatError)}</p>}
      </div>
    </section>
  </>;
}
