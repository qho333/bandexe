import { readQuestionPicture } from "../lib/api";
import { translateError, t as ui, translateUI } from "../lib/i18n";
import Select from "./Select";
import { playInteraction } from "../lib/interaction-sound";
import { createScanSound, type ScanSound } from "../lib/scan-sound";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import Header, { type DisplayProps } from "./Header";
import { TASKS, type Chart, type Draft, type Task } from "../lib/types";
import Missions from "./Missions";
import { PANEL_LOOKS, scanSoundEnabled, type Prefs } from "../lib/prefs";
import { countWords } from "../lib/fixes";
import { SAMPLE_ESSAYS, SAMPLE_QUESTIONS } from "../content";
import { describeChart, isPracticeDescription, offeredQuestion, practiceChartFor } from "../content/practice-charts";
import PracticeChartView from "./PracticeChartView";
import { CheckerPicker, CheckerSetup } from "./Checker";
import { getChecker, onCheckerChange } from "../lib/checker";
import { evaluateDraft, evaluationReason, type EvaluationSelection } from "../lib/evaluation";
import { useGeminiAccess } from "./GeminiGate";
import { geminiAccess } from "../lib/gemini";
import { announce } from "../lib/announce";
import GrammarCheck from "./GrammarCheck";
import { useEditorKeyboard } from "../lib/use-editor-keyboard";
import { getAllowance, onAllowance } from "../lib/allowance";
import { createDebounce } from "../lib/debounce";
import { createExamClock, timerExpired } from "../lib/exam-clock";
import { observeElementHeight } from "../lib/element-height";

const MAX_IMAGE = 4 * 1024 * 1024;
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const isSample = (q: string) => Object.values(SAMPLE_QUESTIONS).some((l) => l.includes(q));

interface Props extends DisplayProps {
  active: boolean;
  draft: Draft;
  setDraft: (p: Partial<Draft>) => boolean | void;
  chart: Chart | null;
  setChart: (c: Chart | null) => void;
  onEvaluate: (minutes: number | null, selection: EvaluationSelection, preparedSound?: ScanSound, retryInput?: undefined, finishedInTime?: boolean) => Promise<void>;
  pending: boolean;
  fixtureMode?: boolean;
  onClearDraft?: () => void;
}

function useTimer(initialMin: number) {
  const [total, setTotal] = useState(initialMin * 60);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [dir, setDir] = useState<"down" | "up">("down");
  const clock = useRef(createExamClock());
  const left = Math.max(0, total - elapsed);
  useEffect(() => {
    if (!running) return;
    clock.current.start();
    const update = () => setElapsed(clock.current.seconds());
    const id = setInterval(update, 250);
    document.addEventListener("visibilitychange", update);
    return () => { clock.current.pause(); clearInterval(id); document.removeEventListener("visibilitychange", update); };
  }, [running]);
  useEffect(() => {
    if (running && timerExpired(dir, left)) setRunning(false);
    if (running && dir === "down" && left === 300) announce("5 minutes left");
  }, [left, running, dir]);
  const preset = (min: number) => { clock.current.reset(); setTotal(min * 60); setElapsed(0); setRunning(false); };
  return { total, elapsed, left, running, dir, setDir, setRunning, preset, reset: () => preset(total / 60) };
}

export default function Write(props: Props) {
  const { active, draft, setDraft, chart, setChart, onEvaluate, pending, prefs, setPrefs, fixtureMode, onClearDraft } = props;
  const task = TASKS[draft.task];
  const access = useGeminiAccess();
  const checker = useSyncExternalStore(onCheckerChange, getChecker, getChecker);
  const { mode } = useSyncExternalStore(onCheckerChange, getChecker, getChecker);
  const allowance = useSyncExternalStore(onAllowance, getAllowance, getAllowance);
  const timer = useTimer(task.minutes);
  const [lock, setLock] = useState(false);
  const [error, setError] = useState("");
  const [chartMsg, setChartMsg] = useState("");
  const [pictureMsg, setPictureMsg] = useState("");
  const [pictureBusy, setPictureBusy] = useState(false);
  // A random start and a random step each time, so students rarely see the same order.
  const [genIdx, setGenIdx] = useState(() => Math.floor(Math.random() * 1e6));
  const [saved, setSaved] = useState("Saved in this browser");
  const editor = useRef<HTMLTextAreaElement>(null);
  const keyboardOpen = useEditorKeyboard(editor, active);
  const [peek, setPeek] = useState(false);
  const actions = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (actions.current) return observeElementHeight(actions.current, "--action-h", active && !keyboardOpen);
  }, [active, keyboardOpen]);
  const saveStatus = useRef(createDebounce(() => setSaved("Saved in this browser"), 600));
  const evaluationLock = useRef(false);
  const preflightSound = useRef<ScanSound | null>(null);
  useEffect(() => () => { preflightSound.current?.stop(); }, []);
  const words = countWords(draft.essay);
  const offered = offeredQuestion(SAMPLE_QUESTIONS[draft.task], draft.question, genIdx);
  // One tap swaps the question, so anything the student typed stays one tap away.
  const [swap, setSwap] = useState<{ from: string; to: string } | null>(null);
  const newQuestion = () => { setSwap({ from: draft.question, to: offered }); setDraft({ question: offered }); setGenIdx(Math.floor(Math.random() * 1e6)); };
  const practice = draft.task === "ac1" ? practiceChartFor(draft.question) : undefined;
  // A practice question brings its exact figures; leaving it removes them. A student's own description is never touched.
  useEffect(() => {
    if (practice ? draft.chartDescription !== describeChart(practice) : isPracticeDescription(draft.chartDescription))
      setDraft({ chartDescription: practice ? describeChart(practice) : "" });
  }, [practice, draft.chartDescription]); // eslint-disable-line react-hooks/exhaustive-deps
  const reason = evaluationReason(draft, chart, pending, checker);
  const expired = timerExpired(timer.dir, timer.left);
  useEffect(() => () => saveStatus.current.cancel(), []);

  // Auto-grow the editor so the page (not the textarea) scrolls and the caret stays visible.
  useLayoutEffect(() => {
    const el = editor.current;
    if (!el || !active) return;
    const fit = () => {
    // Measure the text alone: the box also stretches to fill the column, which must not count as growth.
    el.style.flex = "none";
    el.style.height = "auto";
    el.style.height = el.scrollHeight + 2 + "px";
    el.style.flex = "";
    };
    fit();
    // Rewrapped text changes the height, so a turned phone or resized window measures again.
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [draft.essay, active, prefs.edSize]);

  const setTask = (t: Task) => {
    const patch: Partial<Draft> = { task: t };
    if (!draft.question.trim() || isSample(draft.question)) patch.question = SAMPLE_QUESTIONS[t][0];
    setDraft(patch);
    timer.preset(TASKS[t].minutes);
    setError("");
  };

  const onEssay = (essay: string) => {
    const persisted = setDraft({ essay });
    saveStatus.current.cancel();
    if (persisted === false) setSaved("Not saved — browser storage is blocked or full. Keep this page open.");
    else { setSaved("Saving…"); saveStatus.current.schedule(); }
  };

  const onQuestionPicture = (f: File | undefined) => {
    setPictureMsg("");
    if (!f) return;
    if (!["image/png", "image/jpeg"].includes(f.type)) { playInteraction("error"); setPictureMsg("Choose a PNG or JPG image."); return; }
    if (f.size > MAX_IMAGE) { playInteraction("error"); setPictureMsg("The image must be 4 MB or smaller."); return; }
    const reader = new FileReader();
    reader.onerror = () => { playInteraction("error"); setPictureMsg("That image could not be read."); };
    reader.onload = async () => {
      const url = String(reader.result), base64 = url.slice(url.indexOf(",") + 1);
      setPictureBusy(true);
      try {
        setDraft({ question: await readQuestionPicture(base64, f.type) });
        setPictureMsg("Question added from your picture. Check it matches, and fix anything that is wrong.");
        // A photo of an Academic Task 1 question usually shows the chart too; the marker's chart reader can use it.
        if (draft.task === "ac1" && !chart) setChart({ base64, mime: f.type as Chart["mime"], name: f.name, url: URL.createObjectURL(f) });
      } catch (e) { playInteraction("error"); setPictureMsg((e as Error).message); }
      setPictureBusy(false);
    };
    reader.readAsDataURL(f);
  };

  const onFile = (f: File | undefined) => {
    setChartMsg("");
    if (!f) return;
    if (!["image/png", "image/jpeg"].includes(f.type)) { playInteraction("error"); setChartMsg("Choose a PNG or JPG image."); return; }
    if (f.size > MAX_IMAGE) { playInteraction("error"); setChartMsg("The image must be 4 MB or smaller."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      if (chart) URL.revokeObjectURL(chart.url);
      setChart({ base64: url.slice(url.indexOf(",") + 1), mime: f.type as Chart["mime"], name: f.name, url: URL.createObjectURL(f) });
    };
    reader.onerror = () => { playInteraction("error"); setChartMsg("That image could not be read."); };
    reader.readAsDataURL(f);
  };

  const evaluate = async () => {
    if (evaluationLock.current || pending) return;
    if (!reason && mode === "own" && !geminiAccess.getSnapshot().confirmed && access.allowed === true) {
      setError("Confirm that you are 18 or older in Check to use your own Gemini key.");
      document.querySelector<HTMLButtonElement>('[data-gemini-confirmation] button')?.focus();
      return;
    }
    // Resume synchronously in the click, before device preflight can await. No voices yet.
    const sound = createScanSound({ enabled: scanSoundEnabled(prefs) });
    preflightSound.current = sound;
    let transferred = false;
    try {
      await evaluateDraft(evaluationLock, pending, { ...draft, feedbackLanguage: prefs.feedbackLanguage || "en" }, chart, async (selection) => {
        setError("");
        preflightSound.current = null;
        transferred = true;
        await onEvaluate(timer.elapsed ? Math.max(1, Math.round(timer.elapsed / 60)) : null, selection, sound, undefined, timer.elapsed > 0 && !expired);
      });
    } catch (e) {
      playInteraction("error");
      setError((e as Error).message);

    } finally {
      if (!transferred) sound.stop();
      if (preflightSound.current === sound) preflightSound.current = null;
    }
  };

  const shown = timer.dir === "down" ? timer.left : timer.elapsed;
  const warn = timer.running && timer.dir === "down" && timer.left <= 300 && timer.left > 0;
  const timerState = expired ? "Time is up. You can still finish your sentence."
    : warn ? "5 minutes left: start your conclusion."
    : timer.running ? "Running" : timer.elapsed ? "Paused" : "Not started";
  const max = Math.max(task.words * 1.4, words);
  const sample = SAMPLE_ESSAYS[draft.task];

  return (
    <div className={"screen write-screen" + (active ? " is-active" : "")}>
      <Header current="write" {...props} />
      <main className="wrap" aria-labelledby="writeTitle">
        <h1 id="writeTitle" className="sr-only">{ui("Writing workspace")}</h1>
        <div className={`ws ws--${draft.task}`}>
          <div className="ws__main">
            <section className="frame question" aria-labelledby="qTitle">
              <div className="frame-head"><h2 id="qTitle">{ui("Question")}</h2><span>{isSample(draft.question) ? ui("Sample question") : ui("Your question")}</span></div>
              <div className="frame-body">
                <div className="field question__task">
                  <label className="field__label" htmlFor="taskType">{ui("Task type")}</label>
                  <Select id="taskType" value={draft.task} options={(Object.keys(TASKS) as Task[]).map((value) => ({ value, label: translateUI(TASKS[value].label) }))} onChange={(value) => setTask(value as Task)} />
                  {draft.task !== "ac1" && <p className="hint">{ui("Choose Task 1 Academic to upload a chart image or get a practice chart.")}</p>}
                </div>
                <label className="sr-only" htmlFor="questionText">{ui("Question text")}</label>
                <textarea id="questionText" className="question__input" rows={draft.task === "gt1" ? 6 : 3} value={draft.question}
                  dir="ltr" onChange={(e) => setDraft({ question: e.target.value })} placeholder={ui("Paste or type the question you are answering.")} />
                <div className="chart-up__row question__picture">
                  {offered && <button type="button" className="btn btn--sm" onClick={newQuestion}>{ui("New question")}</button>}
                  {swap?.to === draft.question && <button type="button" className="btn btn--sm btn--quiet" onClick={() => setDraft({ question: swap.from })}>{ui("Back to previous question")}</button>}
                  {draft.task !== "t2" && <>
                    <label className={"btn btn--sm" + (pictureBusy ? " is-disabled" : "")}>
                      {pictureBusy ? ui("Reading your picture…") : ui("Upload a picture of your question")}
                      <input type="file" accept="image/png,image/jpeg" className="sr-only" disabled={pictureBusy} onChange={(e) => { onQuestionPicture(e.target.files?.[0]); e.target.value = ""; }} />
                    </label>
                    {pictureMsg && <span className="hint" role="status">{translateUI(pictureMsg)}</span>}
                  </>}
                </div>
                <div className="question__meta">
                  <span className="chip">{translateUI(task.chip)}</span>
                  <span className="chip">{ui("{value0} minutes", { value0: task.minutes })}</span>
                  <span className="chip">{ui("At least {value0} words", { value0: task.words })}</span>
                </div>
                {draft.task === "ac1" && (
                  <div className="chart-up">
                    {practice && !chart && <>
                      <PracticeChartView chart={practice} />
                      <p className="hint">{ui("Practice chart: the marker checks your figures against it, so you don't need to upload anything. Figures are made up for practice.")}</p>
                    </>}
                    <div className="chart-up__row">
                      <label className="btn btn--sm">
                        {chart ? ui("Replace chart image") : ui("Upload chart image")}
                        <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
                      </label>
                      {chart && <button className="btn btn--sm btn--quiet" onClick={() => { URL.revokeObjectURL(chart.url); setChart(null); }}>{ui("Remove")}</button>}
                      <span className="hint">{ui("PNG or JPG, up to 4 MB. The chart reader extracts figures for the marker. Check the reference in your report.")}</span>
                    </div>
                    {!practice && <><label className="field" htmlFor="chartDescription"><span className="field__label">{ui("Or describe the chart")}</span>
                      <textarea id="chartDescription" className="question__input" rows={4} maxLength={6000} value={draft.chartDescription || ""}
                        onChange={(e) => setDraft({ chartDescription: e.target.value })}
                        placeholder={ui("Title, axes or labels, units, key figures and trends. Include comparisons the marker should check.")} />
                    </label>
                    <p className="hint">{ui("No image? A factual typed description works too. An uploaded image is read automatically first.")}</p></>}
                    {chartMsg && <p className="form-error" role="alert">{translateUI(chartMsg)}</p>}
                    {chart && <img className="chart-up__img" src={chart.url} alt={translateUI(`Chart for this task: ${chart.name}`)} />}
                  </div>
                )}
              </div>
            </section>

            <section className="frame editor-wrap reading-surface" data-boot-panel="WORKSPACE" aria-labelledby="essayTitle">
              <div className="frame-head"><h2 id="essayTitle">{draft.task === "gt1" ? ui("Your letter") : draft.task === "ac1" ? ui("Your report") : ui("Your essay")}</h2><button type="button" className="btn btn--sm btn--quiet peek-btn" aria-expanded={peek} onPointerDown={(e) => e.preventDefault()} onClick={() => setPeek(!peek)}>{peek ? ui("Hide question") : ui("Show question")}</button><span>{saved === "Saved in this browser" ? ui("Draft kept in this browser") : saved}</span></div>
              {peek && <div className="peek">
                <p dir="ltr">{draft.question}</p>
                {draft.task === "ac1" && (chart ? <img src={chart.url} alt={translateUI(`Chart for this task: ${chart.name}`)} /> : practice ? <PracticeChartView chart={practice} /> : draft.chartDescription && <p dir="ltr">{draft.chartDescription}</p>)}
              </div>}
              <textarea ref={editor} id="editor" className="editor" data-size={prefs.edSize} value={draft.essay} spellCheck={false}
                readOnly={lock && expired} aria-labelledby="essayTitle"
                placeholder={draft.task === "gt1" ? ui("Dear …") : ui("Start writing here.")} onChange={(e) => onEssay(e.target.value)} />
              <div className="editor-foot">
                <span className="grow">{lock && expired ? ui("Editor locked: time is up") : ui("Separate paragraphs with a blank line")}</span>
                {prefs.background
                  ? <span className="seg panel-quick" role="group" aria-label={ui("Panels")}>
                      {PANEL_LOOKS.map(([value, label]) => <button key={value} type="button" aria-pressed={(prefs.panelLook ?? "blur") === value} onClick={() => setPrefs({ ...prefs, panelLook: value })}>{translateUI(label)}</button>)}
                    </span>
                  : <a className="btn btn--sm btn--quiet" href="#collection">{ui("Choose your background")}</a>}
                <label className="editor-size"><span>{ui("Essay text size")}</span>
                  <Select value={prefs.edSize} options={(["16", "17", "18"] as const).map((value) => ({ value, label: ui(`${value} px`) }))} onChange={(value) => setPrefs({ ...prefs, edSize: value as Prefs["edSize"] })} />
                </label>
                <button className="btn btn--sm btn--quiet" title={ui("Clears your essay and restores a sample question")} onClick={() => { onEssay(""); onClearDraft?.(); editor.current?.focus(); }}>{ui("Clear draft")}</button>
                {fixtureMode ? (
                  <button className="btn btn--sm btn--quiet" title={ui("Fixture mode only: loads the Task 2 essay the fixture corrections were written for")}
                    onClick={() => { setTask("t2"); setDraft({ task: "t2", question: SAMPLE_QUESTIONS.t2[0] }); onEssay(SAMPLE_ESSAYS.t2!); }}>{ui("Load sample answer (fixture test)")}</button>
                ) : sample && <button className="btn btn--sm btn--quiet" onClick={() => onEssay(sample)}>{ui("Load sample answer")}</button>}
                <GrammarCheck text={draft.essay} setText={onEssay} running={timer.running} locked={lock && expired} editor={editor} />
              </div>
            </section>
          </div>

          <aside className="ws__side" aria-label={ui("Session")}>
            <section className="frame" data-boot-panel="TIMER" aria-labelledby="timerTitle">
              <div className="frame-head"><h2 id="timerTitle">{ui("Exam timer")}</h2><span>{timer.dir === "down" ? ui("Count down") : ui("Count up")}</span></div>
              <div className="frame-body">
                <div className={"timer" + (warn ? " is-warning" : "")} role="timer"><small>{timer.dir === "down" ? ui("T-minus") : ui("T-plus")}</small><span aria-label={fmt(shown)}>{fmt(shown).split("").map((digit, i) => <span className="timer-digit" key={`${i}-${digit}`} aria-hidden="true">{digit}</span>)}</span></div>
                <div className="timer-ctl">
                  <button className="btn btn--sm" aria-pressed={timer.running} disabled={expired} onClick={() => timer.setRunning(!timer.running)}>
                    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true"><path d={timer.running ? "M5 3 V13 M11 3 V13" : "M5 3 L12 8 L5 13 Z"} /></svg>
                    <span>{timer.running ? ui("Pause") : timer.elapsed ? ui("Resume") : ui("Start")}</span>
                  </button>
                  <button className="btn btn--sm btn--quiet" onClick={timer.reset}>{ui("Reset")}</button>
                </div>
                <p className="timer-state">{translateUI(timerState)}</p>
                <div className="timer-opts">
                  <div className="seg" role="group" aria-label={ui("Preset")}>
                    {[40, 20].map((m) => <button key={m} aria-pressed={timer.total === m * 60} onClick={() => timer.preset(m)}>{m === 40 ? ui("Task 2, 40 min") : ui("Task 1, 20 min")}</button>)}
                  </div>
                  <div className="seg" role="group" aria-label={ui("Direction")}>
                    <button aria-pressed={timer.dir === "down"} onClick={() => timer.setDir("down")}>{ui("Count down")}</button>
                    <button aria-pressed={timer.dir === "up"} onClick={() => timer.setDir("up")}>{ui("Count up")}</button>
                  </div>
                  <label className="switch"><span className="switch__text">{ui("Lock the editor when time is up")}</span><input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} /><span className="switch__track" aria-hidden="true" /></label>
                </div>
              </div>
            </section>

            <section className="frame" data-boot-panel="WORD COUNT" aria-labelledby="wcTitle">
              <div className="frame-head"><h2 id="wcTitle">{ui("Word count")}</h2><span>{ui("Target {value0}", { value0: task.words })}</span></div>
              <div className="frame-body">
                <div className="wc__num" aria-live="polite">{words} <small>{ui("words")}</small></div>
                <div className="wc__bar" aria-hidden="true">
                  <div className={"wc__fill" + (words >= task.words ? " is-met" : "")} style={{ transform: `scaleX(${Math.min(1, words / max)})` }} />
                  <div className="wc__marker" style={{ left: (task.words / max) * 100 + "%" }}><span>{task.words}</span></div>
                </div>
                {words >= task.words && <span className="minimum-chip" role="status">{ui("✓ minimum reached")}</span>}
                <p className="wc__msg">{words === 0 ? ui("Start writing. The minimum for this task is {count} words.", { count: task.words })
                  : words < task.words ? ui("{count} more words to reach the minimum.", { count: task.words - words }) : ui("Minimum reached. Aim to finish, not to add length.")}</p>
              </div>
            </section>

            <section className="frame" data-boot-panel="CHECK" aria-labelledby="optTitle">
              <div className="frame-head"><h2 id="optTitle">{ui("Check")}</h2></div>
              <div className="frame-body side-stack">
                <CheckerPicker disabled={pending} />
                <CheckerSetup onAdultReady={() => { if (!reason) void evaluate(); }} />
                <a className="gen-note" href="#privacy">{ui("What happens to my essay?")}</a>
                {mode === "own" && <p className="gen-note">{ui("Checks send your text to Google with your key. On the free tier Google may use it to improve its models.")}</p>}
                {error && <p className="form-error" role="alert">{translateError(error)}</p>}
                {mode === "free" && allowance.remaining !== null && <p className="gen-note" role="status">{ui("{value0} of {value1} free checks left today", { value0: allowance.remaining, value1: allowance.limit })}</p>}
                {reason && <p className="gen-note" id="evaluateReason">{translateUI(reason)}</p>}
                <button aria-describedby={reason ? "evaluateReason" : undefined} className="btn btn--primary btn--block evaluate glowable" data-sound="engage" onClick={() => { void evaluate(); }} disabled={pending}><span className="evaluate__label">{pending ? ui("CHECKING…") : ui("EVALUATE")}</span></button>
                <Missions />
              </div>
            </section>
          </aside>
        </div>
      </main>

      <div ref={actions} className="write-actions" role="group" aria-label={ui("Writing actions")} hidden={!active || keyboardOpen}>
        <button className="btn write-actions__timer" aria-pressed={timer.running} disabled={expired}
          aria-label={ui("{action} exam timer, {time}{warning}", { action: timer.running ? ui("Pause") : timer.elapsed ? ui("Resume") : ui("Start"), time: fmt(shown), warning: warn ? ui(", 5 minutes or less left") : "" })}
          onClick={() => timer.setRunning(!timer.running)}>
          <span aria-hidden="true"><svg className="icon" viewBox="0 0 16 16"><path d={timer.running ? "M5 3 V13 M11 3 V13" : "M5 3 L12 8 L5 13 Z"} /></svg>{fmt(shown)}</span>
          <small>{expired ? ui("Time is up") : timer.running ? ui("Pause") : timer.elapsed ? ui("Resume") : ui("Start")}</small>
        </button>
        <div className="write-actions__words" role="group" aria-label={ui("{count} words, target {target}", { count: words, target: task.words })}>
          <b>{words}<span> / {task.words}</span></b><small>{ui("words")}</small>
        </div>
        <button className="btn btn--primary evaluate-press" data-sound="engage" onClick={() => { void evaluate(); }} disabled={pending}><span className="evaluate__label">{pending ? ui("CHECKING…") : ui("EVALUATE")}</span></button>
        {reason && <p className="write-actions__reason">{translateUI(reason)}</p>}
        {error && <a className="write-actions__error" href="#optTitle" onClick={(e) => {
          e.preventDefault();
          document.getElementById("optTitle")?.scrollIntoView({ block: "center" });
        }}>{ui("Check needs attention · View details")}</a>}
      </div>
    </div>
  );
}
