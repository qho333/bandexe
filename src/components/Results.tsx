import { translateError, t as ui, translateUI } from "../lib/i18n";
import { useSlowReply, STILL_WORKING, BUSY_NOTICE } from "../lib/use-slow-reply";
import { expandReport, getReportDetail } from "../lib/report-detail";
import { playInteraction } from "../lib/interaction-sound";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Header, { type DisplayProps } from "./Header";
import Celebrate from "./Celebrate";
import type { Job } from "../App";
import { CRITS, TASKS, type Crit, type Fix, type MarkResult } from "../lib/types";
import { motionOK } from "../lib/prefs";
import { paragraphs } from "../lib/fixes";
import { addBoxes, canOpenReport, matchIssues, scanDeadlines, scanProgress, segments, type Issue } from "../lib/scan";
import { Spider, type Resume, type SpiderPhase } from "../lib/spider";
import { MarkLayer, MarkLegend, gutters, useIssueGeo } from "./Marks";
import { placePopover } from "../lib/report";
import { reviewCorrections } from "../lib/corrections";
import { toast } from "../lib/toast";
import { announce } from "../lib/announce";
import { checkerLabel } from "../lib/checker";
import { helperArt, type Prefs } from "../lib/prefs";
import { recordReviewed } from "../lib/collection";
import StudyTools from "./StudyTools";
import ReviewForm from "./ReviewForm";
import { recordStudent } from "../lib/stats";
import { memorySummary, sinceLastTime } from "../lib/progress";
import { PrintableReport, ReportActions } from "./ReportExport";

interface Props extends DisplayProps {
  active: boolean;
  job: Job | null;
  essay: string;
  setEssay: (e: string) => void;
  onRetry: () => void;
  onWrite: () => void;
}

const CODE: Record<Crit, string> = { tr: "TR", cc: "CC", lr: "LR", gra: "GRA" };
const critName = (c: Crit, t2: boolean) =>
  ({ tr: t2 ? "Task response" : "Task achievement", cc: "Coherence and cohesion", lr: "Lexical resource", gra: "Grammatical range and accuracy" })[c];
const human = (k: string) => k.replace(/_/g, " ").replace(/^./, (m) => m.toUpperCase());
const b1 = (n: number) => n.toFixed(1);

/** Only corrections that were open and got an answer count toward the mission, so re-clicking earns nothing. */
const reviewedCount = (before: Record<string, string>, after: Record<string, string>, ids: string[]) =>
  ids.filter((id) => (before[id] || "open") === "open" && (after[id] === "accepted" || after[id] === "rejected")).length;

export default function Results(props: Props) {
  const { active, job, prefs, onWrite, onRetry } = props;
  const [shownId, setShownId] = useState(-1);
  const motion = motionOK(prefs);
  // The evaluation owns the audio through Scan → Report, so the chord survives that handoff.
  useEffect(() => {
    const audio = job?.scan?.sound;
    if (!audio) return;
    if (!motion || prefs.sound !== "on" || job?.status === "error") { audio.stop(); return; }
    const visibility = () => audio.setActive(active && !document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [active, motion, prefs.sound, job?.status, job?.scan]);
  const revealed = job?.status === "done" && shownId === job.id;

  return (
    <div className={"screen" + (active ? " is-active" : "")}>
      <Header current="results" {...props} />
      <main className="wrap" aria-labelledby="resTitle">
        {!job && (
          <section className="frame"><div className="empty">
            <div className="empty__art mascot-zone"><span dangerouslySetInnerHTML={{ __html: helperArt("coach", prefs).replace('class="mascot"', 'class="mascot mascot--lg"') }} /></div>
            <div><h1 id="resTitle" className="empty-title">{ui("No report yet")}</h1><p>{ui("Write or paste an answer, then press Evaluate. Your report appears here.")}</p>
              <div className="res-actions"><a className="btn btn--primary" href="#write">{ui("Go to the editor")}</a></div></div>
          </div></section>
        )}

        {job && !revealed && <Scan key={job.id} prefs={prefs} job={job} active={active} motion={motion} onWrite={onWrite} onRetry={onRetry} onOpen={() => setShownId(job.id)} />}

        {revealed && job.result && <Report key={job.id} {...props} job={job} result={job.result} />}
      </main>
    </div>
  );
}

/** Width of the scan text column, so the report's marked essay breaks lines in the same places. */
let scanTextWidth = 0;

/**
 * "Checking your answer": the spider reads the essay top to bottom while the marker runs in parallel,
 * boxes each reviewed issue as it reaches it, and the report opens only after it reaches the bottom AND
 * the result is ready. Reduced motion: no spider; all boxes at once, then the report.
 * Once the result exists the crawl is capped (scanDeadlines), and a hidden tab finishes at once (no rAF there).
 */
function Scan({ prefs, job, active, motion, onWrite, onRetry, onOpen }: { prefs: Prefs; job: Job; active: boolean; motion: boolean; onWrite: () => void; onRetry: () => void; onOpen: () => void }) {
  const doc = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const spider = useRef<Spider | null>(null);
  const [phase, setPhase] = useState<SpiderPhase>("reading");
  const [boxed, setBoxed] = useState<number[]>([]);
  const [instant, setInstant] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [ready, setReady] = useState(false);
  const [reached, setReached] = useState(0);
  const resume = useRef<Resume | undefined>(undefined); // where the spider was when the screen was left
  const boxedRef = useRef<number[]>([]);
  boxedRef.current = boxed;
  const doneAt = useRef(0);

  const slow = useSlowReply(job.status === "pending");
  const done = job.status === "done" && !!job.result;
  const paras = useMemo(() => paragraphs(job.essay), [job.essay]);
  const issues: Issue[] = useMemo(() => (done ? matchIssues(paras, job.result!.report.grammar, job.result!.report.upgrades) : []), [done, paras, job.result]);
  if (done && !doneAt.current) doneAt.current = Date.now();
  const useSpider = motion && active && job.status !== "error" && !skipped && !scanDone;
  const audio = job.scan?.sound;
  const scanEvents = job.scan?.events;
  useEffect(() => {
    if (scanDone || skipped || job.status === "error") {
      scanEvents?.end();
      if (job.status === "error") audio?.stop(); else audio?.finish();
    }
  }, [scanDone, skipped, job.status, scanEvents, audio]);

  // Spider lifecycle (one per job; destroyed on skip, error, reduced motion or leaving the screen,
  // and resumed from the same spot when the student comes back).
  useEffect(() => {
    if (!useSpider || !doc.current || !canvas.current || !text.current) return;
    const s = new Spider(doc.current, canvas.current, text.current, {
      onProgress: (paragraph) => setReached((p) => Math.max(p, paragraph)),
      onBox: (id) => { audio?.issue(); setBoxed((b) => addBoxes(b, [id])); },
      onFoot: (x, width) => audio?.foot(x, width),
      onWalk: (walking) => audio?.walking(walking),
      onDash: () => audio?.dash(),
      onPhase: (p) => { setPhase(p); if (p === "done") { audio?.finish(); scanEvents?.end(); setScanDone(true); } },
    }, resume.current);
    spider.current = s;
    return () => { resume.current = s.snapshot(); s.destroy(); spider.current = null; };
  }, [useSpider, audio, scanEvents]);

  // Re-measure on return to the screen too: geometry measured while it was hidden (display: none) is all zero.
  const geo = useIssueGeo(doc, text, [issues, active]);
  useLayoutEffect(() => {
    const el = text.current;
    return () => { if (el) scanTextWidth = el.clientWidth; };
  }, []);

  // Hand the reviewed issues to the spider once the result is back (with any it boxed before a resume).
  useEffect(() => {
    if (!done || !spider.current) return;
    spider.current.setIssues(issues.map((i) => i.id), boxedRef.current);
  }, [done, issues, useSpider]);

  // Cap the crawl once the result exists: wrap-up at the budget, forced finish shortly after. A hidden tab (or any
  // paused requestAnimationFrame: background pane, frozen frame) finishes straight away; timers still run there.
  const finish = useCallback(() => { audio?.finish(); scanEvents?.end(); spider.current?.wrapUp(); setBoxed((b) => addBoxes(b, issues.map((i) => i.id))); setScanDone(true); }, [issues, audio, scanEvents]);
  useEffect(() => {
    if (!done || !useSpider || scanDone) return;
    const { wrapIn, stopIn } = scanDeadlines(doneAt.current, Date.now(), issues.length);
    if (!stopIn || document.hidden) { finish(); return; }
    const wrap = window.setTimeout(() => spider.current?.wrapUp(), wrapIn);
    const stop = window.setTimeout(finish, stopIn);
    const vis = () => { if (document.hidden || spider.current?.stalled(2500)) finish(); };
    const watch = window.setInterval(vis, 1000);
    document.addEventListener("visibilitychange", vis);
    return () => { clearTimeout(wrap); clearTimeout(stop); clearInterval(watch); document.removeEventListener("visibilitychange", vis); };
  }, [done, useSpider, scanDone, issues, finish]);

  // Reduced motion / effects off: every box at once, then the report promptly.
  useEffect(() => {
    if (motion || !done || skipped) return;
    setInstant(true);
    setBoxed((b) => addBoxes(b, issues.map((i) => i.id)));
    const t = window.setTimeout(() => setScanDone(true), 0);
    return () => clearTimeout(t);
  }, [motion, done, issues, skipped]);

  const skip = useCallback(() => {
    audio?.finish();
    scanEvents?.end();
    setSkipped(true);
    setInstant(true);
    setBoxed((b) => addBoxes(b, issues.map((i) => i.id)));
    setScanDone(true);
  }, [issues, audio, scanEvents]);
  useEffect(() => {
    if (!active || ready || job.status === "error") return;
    const key = (e: KeyboardEvent) => {
      // An open Display menu or helper sheet owns Escape; only a free Escape skips the scan.
      if (e.key !== "Escape" || document.querySelector(".fx-panel") || document.documentElement.classList.contains("has-sheet")) return;
      e.preventDefault();
      skip();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [active, ready, job.status, skip]);
  useEffect(() => { if (skipped && done) setBoxed((b) => addBoxes(b, issues.map((i) => i.id))); }, [skipped, done, issues]);

  // Gate: report only after the scan finished AND the result is ready, with a short "Report ready" beat.
  const canOpen = canOpenReport({ status: job.status, scanDone, skipped });
  useEffect(() => {
    if (!canOpen || !active) return;
    setReady(true);
    const r = job.result!;
    announce(r.feedbackOnly ? "Report ready. Feedback only, no band." : r.overall !== null ? `Report ready. ${r.label} ${b1(r.overall)}.` : "Report ready. The overall estimate is withheld.");
    const t = window.setTimeout(onOpen, !motion ? 0 : skipped ? 150 : 260);
    return () => clearTimeout(t);
  }, [canOpen, active]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = scanProgress(reached, paras.length, !skipped && (scanDone || phase === "waiting"));
  const stage = job.status === "pending" ? 1 : job.status === "done" ? 3 : 1;
  const stages = ["Sent to the marker", "Marking against the four criteria", "Review checks on every correction"];
  const r = job.result;
  const status = job.status === "error" ? "" : ready ? "Report ready. Opening it now."
    : !done ? (useSpider && phase === "waiting" ? "Finished reading. Waiting for the marker to send its result." : "The AI marker is reading your answer. This usually takes under a minute. Findings appear only after the review checks.")
    : !r!.report.grammar.length && !r!.report.upgrades.length ? "No corrections or word-choice upgrades passed review. Finishing the read-through."
    : ui("{corrections} corrections and {upgrades} word-choice upgrades passed review.", { corrections: r!.report.grammar.length, upgrades: r!.report.upgrades.length });

  return (
    <section className="frame" aria-labelledby="scanTitle" aria-busy={job.status === "pending"}>
      <div className="frame-head"><h2 id="scanTitle">{job.status === "error" ? ui("No score produced") : ready ? ui("Report ready") : ui("Checking your answer")}</h2>{r?.fixture && <span>{ui("Fixture data")}</span>}</div>
      {job.status !== "error" && <div className="scan-progress">
        <span aria-live="polite">{skipped ? (done ? ui("Scan skipped. Report ready.") : ui("Scan skipped. Waiting for the marker.")) : !motion && !scanDone ? ui("Reviewing your answer") : translateUI(progress.text)}</span>
        <progress aria-label={ui("Essay scanning progress")} value={progress.value} max={progress.max} />
      </div>}
      <div className="scan">
        <div className={"scan__doc reading-surface" + (useSpider ? " has-spider" : "")} ref={doc}>
          <div className="scan__text" ref={text} aria-hidden="true">
            {paras.map((p, i) => (
              <p key={i}>{segments(p, i, issues).map((seg, k) => (seg.issue ? <span key={k} data-issue={seg.issue.id}>{seg.text}</span> : <Fragment key={k}>{seg.text}</Fragment>))}</p>
            ))}
          </div>
          <MarkLayer issues={issues} geo={geo} ids={boxed} instant={instant} width={doc.current?.clientWidth || 9999} gutter={gutters(doc.current, text.current)} />
          <canvas className="scan__canvas" ref={canvas} aria-hidden="true" />
        </div>
        <div className="scan__side">
          <ol className="stages" aria-label={ui("Progress")}>
            {stages.map((label, i) => {
              const s = job.status === "error" && i >= 1 ? "waiting" : i < stage ? "done" : i === stage ? "active" : "waiting";
              return <li key={i} className="stage" data-s={s}><span className="stage__dot" /><span>{translateUI(label)}</span><span className="stage__state">{s === "done" ? ui("done") : s === "active" ? ui("in progress") : ui("waiting")}</span></li>;
            })}
          </ol>
          <div className="scan__static mascot-zone"><span dangerouslySetInnerHTML={{ __html: helperArt("coach", prefs) }} /><span className="muted" style={{ fontSize: "var(--t-12)" }}>{ui("Stage text only (reduced motion)")}</span></div>
          {slow && <p className="scan__explain" role="status">{translateUI(STILL_WORKING)} {job.checker === "free" && translateUI(BUSY_NOTICE)}</p>}
          {status && <p className={"scan__explain" + (ready ? " is-ready" : "")}>{translateUI(status)}</p>}
          {job.status === "error" && (
            <>
              <p className="scan__explain form-error" role="alert">{translateError(job.error || "")}</p>
              <button className="btn btn--block" onClick={onWrite}>{ui("Back to the editor")}</button>
              {job.errorCode !== "daily_limit" && <button className="btn btn--quiet btn--block" onClick={onRetry}>{ui("Try again")}</button>}
            </>
          )}
          {!ready && !skipped && job.status !== "error" && <button className="scan__skip" onClick={skip}>{done ? ui("Show report now") : ui("Skip scan animation")}</button>}
        </div>
      </div>
    </section>
  );
}

export function Report({ active, job, result: originalResult, essay, setEssay, prefs, onWrite }: Props & { job: Job; result: MarkResult }) {
  const [expanded, setExpanded] = useState<MarkResult | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailLock = useRef(false);
  const result = expanded || originalResult;
  const r = result.report;
  const t2 = result.task === "t2";
  const fb = result.feedbackOnly === true; // feedback only: no band number, range, criterion bands or celebration
  const motion = motionOK(prefs);
  const previous = job.previous || [];
  const since = sinceLastTime(previous, result);
  const memory = memorySummary(previous, result.task);
  const feedbackDir = result.feedbackLanguage === "ar" ? "rtl" : "ltr";
  const [states, setStates] = useState<Record<string, string>>({});
  const [celebrate, setCelebrate] = useState(Boolean(job.best) && !fb);
  const reportEl = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState("r-score");
  const [reportDate] = useState(() => job.date || new Date().toISOString());
  const exportInput = { result, essay: job.essay, date: reportDate, checker: job.checker, states };

  useEffect(() => {
    if (active && job.status === "done" && Number.isFinite(originalResult.overall) && !originalResult.fixture) void recordStudent();
  }, [active, job.status, originalResult.overall, originalResult.fixture]);

  useLayoutEffect(() => {
    if (!active) return;
    job.scan?.events.report();
    if (motion && prefs.sound === "on") job.scan?.sound.complete(); else job.scan?.sound.stop();
  }, [active, job.scan, motion, prefs.sound]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("resTitle")?.focus({ preventScroll: true });
  }, []);


  useEffect(() => {
    if (!active) return;
    const sections = Array.from(reportEl.current?.querySelectorAll<HTMLElement>(".res-main > section") || []);
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const current = sections.filter((el) => el.getBoundingClientRect().top <= 112).at(-1);
        setSection(current?.id || "r-score");
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [active]);

  const act = (id: string, _f: Fix, _to: string, accept: boolean) => {
    const next = reviewCorrections(job.essay, essay, r.grammar, r.upgrades, states, [id], accept);
    if (!next.failed) setEssay(next.text);
    setStates(next.states);
    if (!next.failed && recordReviewed(reviewedCount(states, next.states, [id]))) toast("+1 coin");
    playInteraction(next.failed ? "error" : accept ? "accept" : "reject");
    toast(next.failed ? "The draft changed or this suggestion overlaps another. Check your draft before applying it." : accept ? "Correction accepted" : "Correction rejected");
  };

  const fixList = (list: Fix[], prefix: string) => (
    <ul className="fixes">
      {list.map((f, i) => {
        const id = prefix + i, to = (f.corrected ?? f.better)!, st = states[id] || "open";
        return (
          <li key={id} className="fix" data-crit={CODE[f.criterion]} data-state={st}>
            <div>
              <div className="fix__pair" dir="ltr"><del>{f.original}</del>
                <svg className="fix__arrow" viewBox="0 0 20 10" aria-hidden="true"><path d="M0 5 H18 M14 1 L18 5 L14 9" strokeWidth="1.5" /></svg>
                <span className="sr-only">{ui("changed to")}</span><ins>{to}</ins></div>
              {f.reason && <p className="fix__why" dir={feedbackDir}>{f.reason}</p>}
              <div className="fix__meta"><span className="crit-code"><span className="swatch" aria-hidden="true" />{CODE[f.criterion]}</span></div>
            </div>
            <div className="fix__act">
              <button data-sound="handled" className="btn btn--sm" aria-label={translateUI(`Accept: ${to}`)} onClick={() => act(id, f, to, true)}>{ui("Accept")}</button>
              <button data-sound="handled" className="btn btn--sm btn--quiet" aria-label={translateUI(`Reject: ${to}`)} onClick={() => act(id, f, to, false)}>{ui("Reject")}</button>
              <span className="fix__state" aria-live="polite">{st === "accepted" ? ui("Accepted") : st === "rejected" ? ui("Rejected") : st === "missing" ? ui("Text changed") : ui("Open")}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
  const bulk = (list: Fix[], prefix: string, accept: boolean) => {
    const next = reviewCorrections(job.essay, essay, r.grammar, r.upgrades, states, list.map((_, i) => prefix + i), accept);
    setEssay(next.text); setStates(next.states);
    if (recordReviewed(reviewedCount(states, next.states, list.map((_, i) => prefix + i)))) toast("+1 coin");
    playInteraction(next.failed ? "error" : "bulk");
    toast(next.failed ? "Some suggestions could not be applied. Check your draft." : accept ? "Corrections accepted" : "Corrections rejected");
  };
  const fixSection = (id: string, title: string, intro: string, list: Fix[], prefix: string, dropped: number, empty: string) => (
    <section id={id} aria-labelledby={id + "T"}>
      <div className="sec-head">
        <h2 id={id + "T"}>{translateUI(title)}</h2>
        {list.length > 0 && <div className="sec-tools"><button className="btn btn--sm btn--quiet" data-sound="handled" onClick={() => bulk(list, prefix, true)}>{ui("Accept all")}</button><button className="btn btn--sm btn--quiet" data-sound="handled" onClick={() => bulk(list, prefix, false)}>{ui("Reject all")}</button></div>}
        <p>{translateUI(intro)}</p>
      </div>
      <div className="frame">{list.length ? fixList(list, prefix) : <p className="frame-body muted">{translateUI(empty)}</p>}</div>
      {dropped > 0 && <p className="hint review-note">{ui("{count} suggestions removed: they did not match your text exactly or changed nothing.", { count: dropped })}</p>}
    </section>
  );

  return (
    <div className="res-grid" ref={reportEl}>
      <nav className="res-nav" aria-label={ui("Report sections")}>
        {[["r-score", fb ? "Summary" : "Score"], ["r-essay", "Essay"], ["r-criteria", "Criteria"], ["r-grammar", "Corrections"], ["r-words", "Upgrades"], ["r-paras", "Paragraphs"], ["r-next", "Priorities"], ["r-model", "Model answer"], ["r-chat", "Ask about feedback"]].filter(([id]) => !fb || id !== "r-criteria").map(([id, label]) => (
          <a key={id} href={"#" + id} aria-current={section === id ? "location" : undefined}>{translateUI(label)}</a>
        ))}
      </nav>
      <div className="res-main">
        <section id="r-score" aria-labelledby="resTitle">
          <div className="score-head">
            <div>
              <h1 id="resTitle" className="score-label" tabIndex={-1}>{translateUI(result.label)} {result.fixture && <span className="ex-badge fixture-badge">{ui("Fixture data, not a real marking")}</span>}</h1>
              <p className={"gen-note" + (result.checker === "device" ? " device-report-label" : "")} data-device-empty={result.checker === "device" ? [!r.paragraphs.length && !r.structureAdvice && "paras", !r.grammar.length && !r.dropped.grammar && "grammar", !r.upgrades.length && !r.dropped.upgrades && "words", !r.strengths.length && "strengths", !r.priorities.length && "priorities"].filter(Boolean).join(" ") : undefined}>{result.fixture ? ui("Checked with site fixture data") : result.checker === "device" ? ui("Chrome built-in AI · feedback only") : translateUI(checkerLabel(result.checker))}{fb && <span className="device-report-note">{ui("Corrections and upgrades shown here passed the exact-quote review. Practice guidance only, not an IELTS score. {value0}, {value1} words.", { value0: translateUI(TASKS[result.task].label), value1: result.words })}</span>}{result.checker === "device" && !fb && <span className="device-report-note">{result.withheld.length ? ui("Some criterion bands are withheld, so no overall is shown. ") : ui("The overall is the mean of four criterion bands, rounded down to the half band. ")}{ui("These are uncalibrated practice bands, with a wide ±1 band range; Gemini calibration does not apply. This is not an official IELTS score.")} {translateUI(TASKS[result.task].label)}, {result.words} {ui("words.")}</span>}</p>
              {result.notice && <p className="fallback-notice" role="note">{translateUI(result.notice)}</p>}
              {!fb && <div className="score-num glowable" aria-label={result.overall === null ? ui("Withheld") : b1(result.overall)}>{result.overall === null ? "–" : b1(result.overall)}</div>}
            </div>
            {!fb && <div>
              <Ruler overall={result.overall} range={result.range} />
              <p className="score-range">{result.range ? ui("Likely range {value0} to {value1}", { value0: b1(result.range.lo), value1: b1(result.range.hi) }) : result.overall === null ? ui("Overall withheld") : ui("Range unavailable")}</p>
            </div>}
          </div>
          {!fb && <><nav className="score-criteria" aria-label={ui("Criterion bands")}>
            {CRITS.map((c) => <a key={c} href={"#r-crit-" + c} aria-label={translateUI(`${translateUI(critName(c, t2))}: ${r.criteria[c].band ?? ui("withheld")}`)}>
              <span>{CODE[c]} <b>{r.criteria[c].band === null ? "–" : b1(r.criteria[c].band!)}</b></span>
              <span>{translateUI(({ tr: t2 ? ui("Task response") : ui("Task achievement"), cc: "Coherence", lr: "Vocabulary", gra: "Grammar" })[c])}</span>
            </a>)}
          </nav>
          <p className="score-note">
            {result.note && <b>{translateUI(result.note)} </b>}
            {result.overall === null
              ? ui("The marker did not return a reliable band for {value0}, so no overall estimate is shown. ", { value0: result.withheld.map((c) => CODE[c]).join(", ") })
              : ui("The overall is the mean of the four criterion bands, rounded down to the half band. ")}{ui("This is practice guidance from an AI marker, checked by automatic review rules. It is not an official IELTS band,")} {/uncalibrated/i.test(result.label || "") ? ui("and this model has not been calibrated on official scripts yet.") : ui("and the likely range is ±0.5 band; on the small set of official examiner-scored scripts used for calibration, the estimate was within ±1 band about 9 times in 10.")} {translateUI(TASKS[result.task].label)}, {result.words} {ui("words")}{job.minutes ? ui(", written in {count} minutes", { count: job.minutes }) : ""}.
          </p></>}
          <div className="res-actions" style={{ marginTop: "var(--s-4)" }}><button className="btn btn--sm btn--quiet" onClick={onWrite}>{ui("Back to the editor")}</button></div>
          {originalResult.reportMode === "compact" && <div className="side-stack" style={{ marginTop: "var(--s-4)" }}>
            <p className="gen-note">{expanded ? ui("Full explanations loaded. Your original bands and correction decisions stay the same.") : ui("Compact report · the key feedback first. Full detail uses one helper call and is cached.")}</p>
            <button className="btn btn--sm" disabled={detailBusy || !!expanded} onClick={async () => {
              if (detailLock.current) return;
              detailLock.current = true; setDetailBusy(true); setDetailError("");
              try {
                const detail = await getReportDetail({ task: result.task, question: job.question || "", essay: job.essay, words: result.words,
                  feedbackLanguage: result.feedbackLanguage, chartDescription: result.chartDescription || job.chartDescription, image: job.chart ? { data: job.chart.base64, mime: job.chart.mime } : null });
                setExpanded(expandReport(originalResult, detail));
              } catch (e) { playInteraction("error"); setDetailError((e as Error).message); }
              finally { detailLock.current = false; setDetailBusy(false); }
            }}>{detailBusy ? ui("Loading full detail…") : expanded ? ui("Full detail ready") : ui("Full detail")}</button>
            {detailBusy && <p className="processing" role="status">{ui("Loading more explanations. Your compact report is ready below.")}</p>}
            {detailError && <p className="form-error" role="alert">{translateError(detailError)}</p>}
          </div>}
          {result.chartNotice && <div className="side-stack">
            <p className="score-note" role="note">{translateUI(result.chartNotice)}</p>
            <details><summary>{ui("Chart reference used")}</summary><p className="para__comment">{result.chartDescription}</p></details>
          </div>}
          <ReportActions input={exportInput} />
        </section>

        {since.checks > 0 && <section className="frame" aria-labelledby="sinceTitle">
          <div className="frame-head"><h2 id="sinceTitle">{ui("Since last time")}</h2></div>
          <div className="frame-body side-stack">
            {since.fixed.map((d) => <p key={d.label}>{ui("Fixed since last time: {value0} (came up {value1} of your last {value2} checks, not flagged this time).", { value0: d.label, value1: d.count, value2: d.window })}</p>)}
            {since.still.map((d) => <p key={d.label}>{ui("Still coming up: {value0} ({value1} of your last {value2} checks).", { value0: d.label, value1: d.count, value2: d.window })}</p>)}
            {!since.fixed.length && !since.still.length && <p>{ui("No recurring themes to compare yet.")}</p>}
            <p className="gen-note">{ui("From your saved checks of this task type. A missing flag does not prove a skill is mastered. This comparison never changes your estimate.")}</p>
          </div>
        </section>}

        <section id="r-next" className="two-col" aria-label={ui("Priorities and strengths")}>
          <div className="frame">
            <div className="frame-head"><h2>{ui("Top 3 priorities")}</h2></div>
            <div className="frame-body"><ol className="prio">{r.priorities.slice(0, 3).map((p, i) => <li key={i}><div><span className="prio__text" dir={feedbackDir}>{p}</span></div></li>)}</ol></div>
          </div>
          <div className="frame">
            <div className="frame-head"><h2>{ui("Strengths")}</h2></div>
            <div className="frame-body"><ul className="strengths">{r.strengths.map((s, i) => <li key={i}><span className="prio__text" dir={feedbackDir}>{s}</span></li>)}</ul></div>
          </div>
        </section>

        <MarkedEssay active={active} job={job} result={result} states={states} act={act} />

        {!fb && <section id="r-criteria" aria-labelledby="critTitle">
          <div className="sec-head"><h2 id="critTitle">{ui("Criteria")}</h2><p>{ui("Each criterion has its own code and pattern, so they stay distinct in every theme.")}</p></div>
          <div className="crit-grid">
            {CRITS.map((c) => {
              const cr = r.criteria[c];
              return (
                <section key={c} id={"r-crit-" + c} tabIndex={-1} className="frame crit" data-crit={CODE[c]} aria-label={translateUI(`${translateUI(critName(c, t2))} ${cr.band ?? ui("withheld")}`)}>
                  <div className="frame-head"><span className="crit-code"><span className="swatch" aria-hidden="true" />{CODE[c]}</span>{cr.band === null && <span>{ui("Withheld")}</span>}</div>
                  <div className="frame-body">
                    <div className="crit__band">{cr.band ?? "–"}</div>
                    <div className="crit__name">{translateUI(critName(c, t2))}</div>
                    {cr.summary && <p className="crit__summary" dir={feedbackDir}>{cr.summary}</p>}
                    <div className="crit__subs">
                      {cr.subskills.map((s) => (
                        <div className="sub" key={s.key}>
                          <div className="sub__row"><span>{translateUI(human(s.key))}</span><b>{s.score}</b></div>
                          <div className="sub__bar" role="img" aria-label={ui("{skill}: {score} of 9", { skill: translateUI(human(s.key)), score: s.score })}><div className="sub__fill" style={{ width: (s.score / 9) * 100 + "%" }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </section>}

        {fixSection("r-grammar", "Grammar corrections", fb ? "Errors that affect accuracy. Accepting a correction updates your draft in the editor." : "Accepting a correction updates your draft in the editor; your estimate does not change.", r.grammar, "g", r.dropped.grammar, "No required corrections passed review.")}
        {fixSection("r-words", "Word-choice upgrades", "Optional. Your original wording is not wrong; these are more precise alternatives.", r.upgrades, "u", r.dropped.upgrades, "No word-choice upgrades passed review.")}

        <section id="r-paras" aria-labelledby="paraTitle">
          <div className="sec-head"><h2 id="paraTitle">{ui("Paragraph comments")}</h2></div>
          <div className="paras">
            {r.paragraphs.map((p, i) => (
              <section key={i} className="frame para">
                <div className="frame-head"><h3>{ui("Paragraph {value0}", { value0: i + 1 })}</h3><span>{translateUI(p.label)}</span></div>
                <div className="frame-body">
                  {p.quote && <p className="para__quote">{p.quote}…</p>}
                  <dl className="para__comments">
                    {CRITS.filter((c) => p.comments[c]).map((c) => (
                      <Fragment key={c}><dt data-crit={CODE[c]}><span className="crit-code"><span className="swatch" aria-hidden="true" />{CODE[c]}</span></dt><dd dir={feedbackDir}>{p.comments[c]}</dd></Fragment>
                    ))}
                  </dl>
                  {p.rewrite && <details className="rewrite"><summary>{ui("How to rewrite")}</summary><p>{p.rewrite}</p></details>}
                </div>
              </section>
            ))}
            {r.structureAdvice && <section className="frame"><div className="frame-head"><h3>{ui("Overall structure")}</h3></div><p className="frame-body para__comment" dir={feedbackDir}>{r.structureAdvice}</p></section>}
          </div>
        </section>

        {job.status === "done" && <ReviewForm task={result.task} />}
        <StudyTools result={result} essay={job.essay} question={job.question || ""} chart={job.chart} chartDescription={job.chartDescription} memory={memory} />
      </div>
      <PrintableReport input={exportInput} />
      {celebrate && !fb && job.best && <Celebrate prefs={prefs} task={result.task} best={job.best} onDone={() => setCelebrate(false)} />}
    </div>
  );
}

/**
 * The whole essay with every reviewed issue marked in place (same marks as the spider scan, same line width).
 * Each mark is a keyboard-focusable control; hover, tap or focus shows the problem, the fix and the reason,
 * and Accept applies the fix to the essay.
 */
function MarkedEssay({ active, job, result, states, act }: { active: boolean; job: Job; result: MarkResult; states: Record<string, string>; act: (id: string, f: Fix, to: string, accept: boolean) => void }) {
  const r = result.report;
  const paras = useMemo(() => paragraphs(job.essay), [job.essay]);
  const issues = useMemo(() => matchIssues(paras, r.grammar, r.upgrades), [paras, r]);
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const closeT = useRef(0);
  const ptr = useRef(false);
  const suppressFocus = useRef(false);
  const pop = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<ReturnType<typeof placePopover> | null>(null);
  const keyOf = (i: Issue) => (i.kind === "grammar" ? "g" : "u") + i.index;
  const fixOf = (i: Issue) => (i.kind === "grammar" ? r.grammar[i.index] : r.upgrades[i.index]);
  const toOf = (f: Fix) => (f.corrected ?? f.better)!;
  const stateOf = (i: Issue) => states[keyOf(i)] || "open";
  const geo = useIssueGeo(box, text, [issues, states]);

  useEffect(() => { if (!active) setOpen(null); }, [active]);

  const show = (id: number) => { clearTimeout(closeT.current); setOpen(id); };
  const hideSoon = () => { clearTimeout(closeT.current); closeT.current = window.setTimeout(() => { if (!pop.current?.contains(document.activeElement)) setOpen(null); }, 180); };
  useEffect(() => {
    if (open === null) return;
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node) && !pop.current?.contains(e.target as Node)) setOpen(null); };
    document.addEventListener("pointerdown", out);
    return () => document.removeEventListener("pointerdown", out);
  }, [open]);
  useEffect(() => () => clearTimeout(closeT.current), []);

  const focusMark = (id: number) => {
    suppressFocus.current = true;
    text.current?.querySelector<HTMLElement>(`[data-issue="${id}"]`)?.focus({ preventScroll: true });
    suppressFocus.current = false;
  };
  const cur = open !== null ? issues[open] : null;
  useEffect(() => {
    if (open === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); clearTimeout(closeT.current); setOpen(null); focusMark(open); }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  useLayoutEffect(() => {
    if (open === null || !pop.current) { setPosition(null); return; }
    let adjusted = false;
    const place = () => {
      const mark = text.current?.querySelector<HTMLElement>(`[data-issue="${open}"]`), panel = pop.current;
      if (!mark || !panel) return;
      const v = window.visualViewport;
      const left = v?.offsetLeft || 0, top = v?.offsetTop || 0;
      // The visual viewport can be narrower than 100vw while zoomed on a phone.
      panel.style.maxWidth = Math.max(0, (v?.width || window.innerWidth) - 16) + "px";
      const bottom = Math.min(top + (v?.height || window.innerHeight), document.querySelector(".mascot-track:not(.is-hidden)")?.getBoundingClientRect().top ?? Infinity);
      const rect = mark.getBoundingClientRect();
      const next = placePopover(rect, { width: panel.offsetWidth, height: panel.scrollHeight + 2 }, { left, top, right: left + (v?.width || window.innerWidth), bottom });
      if (next.maxHeight < 100 && !adjusted) {
        adjusted = true;
        window.scrollBy({ top: rect.bottom - (top + (bottom - top) / 2), behavior: "instant" });
        place();
        return;
      }
      setPosition(next);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(pop.current);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return () => {
      ro.disconnect(); window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("resize", place); window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [open, geo, states]);

  return (
    <section id="r-essay" aria-labelledby="essayTitleR">
      <div className="sec-head">
        <h2 id="essayTitleR">{ui("Your essay, marked")}</h2>
        <p>{ui("Reviewed corrections and upgrades, in place. Select a mark to see the problem, the fix and the reason.")}</p>
      </div>
      <div className="frame marked">
        <div className="frame-head"><MarkLegend /></div>
        <div className="marked__doc reading-surface" ref={box}>
          <div className="scan__text marked__text" dir="ltr" ref={text} style={{ maxWidth: scanTextWidth || undefined }}>
            {paras.map((p, pi) => (
              <p key={pi}>{segments(p, pi, issues).map((seg, k) => {
                const is = seg.issue;
                if (!is) return <Fragment key={k}>{seg.text}</Fragment>;
                const f = fixOf(is), st = stateOf(is);
                return (
                  <span key={k} data-issue={is.id} className="mk" data-kind={is.kind} data-state={st} role="button" tabIndex={0}
                    aria-expanded={open === is.id} aria-controls={open === is.id ? "mk-pop" : undefined}
                    aria-label={`${is.kind === "grammar" ? ui("Grammar correction") : ui("Word-choice upgrade")}, ${CODE[is.crit]}: ${seg.text}. ${st === "accepted" ? ui("Accepted.") : ui("Suggested: {text}.", { text: toOf(f) })}`}
                    onPointerDown={() => { ptr.current = true; requestAnimationFrame(() => { ptr.current = false; }); }}
                    onFocus={() => { if (!ptr.current && !suppressFocus.current) show(is.id); ptr.current = false; }}
                    onBlur={(e) => { if (!pop.current?.contains(e.relatedTarget)) hideSoon(); }}
                    onClick={() => (open === is.id ? setOpen(null) : show(is.id))}
                    onMouseEnter={() => show(is.id)} onMouseLeave={hideSoon}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(is.id); requestAnimationFrame(() => pop.current?.querySelector<HTMLButtonElement>("button")?.focus()); }
                    }}>
                    {st !== "accepted" && <span className="mk-inline-tag" aria-hidden="true">{CODE[is.crit]}</span>}
                    {st === "accepted" ? toOf(f) : seg.text}
                  </span>
                );
              })}</p>
            ))}
          </div>
          <MarkLayer issues={issues} geo={geo} ids={issues.map((i) => i.id)} instant tagsOnly state={stateOf} width={box.current?.clientWidth || 9999} gutter={gutters(box.current, text.current)} reveal={open} />
          {active && cur && (() => {
            const f = fixOf(cur), to = toOf(f), id = keyOf(cur), st = stateOf(cur);
            return createPortal(
              <div ref={pop} id="mk-pop" className="mk-pop" role="dialog" aria-label={cur.kind === "grammar" ? ui("Grammar correction") : ui("Word-choice upgrade")}
                style={{ left: position?.left ?? 8, top: position?.top ?? 8, maxHeight: position?.maxHeight, visibility: position ? "visible" : "hidden" }} data-kind={cur.kind}
                onMouseEnter={() => clearTimeout(closeT.current)} onMouseLeave={hideSoon}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget) && !text.current?.contains(e.relatedTarget)) setOpen(null); }}>
                <button className="mk-pop__close btn btn--sm btn--quiet" onClick={() => { setOpen(null); focusMark(cur.id); }}>{ui("Close")}</button>
                <div className="mk-pop__head"><b>{CODE[cur.crit]}</b> · {cur.kind === "grammar" ? ui("Grammar correction") : ui("Word-choice upgrade (optional)")}</div>
                <div className="fix__pair" dir="ltr"><del>{f.original}</del><span aria-hidden="true">→</span><span className="sr-only">{ui("changed to")}</span><ins>{to}</ins></div>
                {f.reason && <p className="mk-pop__why" dir={result.feedbackLanguage === "ar" ? "rtl" : "ltr"}>{f.reason}</p>}
                <div className="mk-pop__act">
                  <button className="btn btn--sm" data-sound="handled" onClick={() => act(id, f, to, true)} disabled={st === "accepted"}>{ui("Accept")}</button>
                  <button className="btn btn--sm btn--quiet" data-sound="handled" onClick={() => act(id, f, to, false)} disabled={st === "rejected"}>{ui("Reject")}</button>
                  <span className="fix__state" aria-live="polite">{st === "accepted" ? ui("Accepted: your draft is updated") : st === "rejected" ? ui("Rejected") : st === "missing" ? ui("Text changed") : ui("Open")}</span>
                </div>
              </div>, document.body
            );
          })()}
        </div>
      </div>
    </section>
  );
}

function Ruler({ overall, range }: { overall: number | null; range: { lo: number; hi: number } | null }) {
  const ref = useRef<SVGSVGElement>(null);
  const [W, setW] = useState(600);
  useLayoutEffect(() => {
    const m = () => setW(Math.max(1, Math.round(ref.current?.getBoundingClientRect().width || 600)));
    m();
    window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);
  const x = (b: number) => 8 + (b / 9) * (W - 16);
  const rangeLabel = range ? ui("likely range {value0} to {value1}.", { value0: b1(range.lo), value1: b1(range.hi) }) : ui("Range unavailable.");
  const label = overall === null ? ui("Band scale from 0 to 9. Overall withheld.") : ui("Band scale from 0 to 9. Estimate {value0}, {value1}", { value0: b1(overall), value1: rangeLabel });
  return (
    <svg ref={ref} className="ruler" viewBox={`0 0 ${W} 64`} role="img" aria-label={translateUI(label)}>
      {range && <rect className="r-range" x={x(range.lo)} y="10" width={x(range.hi) - x(range.lo)} height="22" />}
      <line x1={x(0)} y1="32" x2={x(9)} y2="32" />
      {Array.from({ length: 19 }, (_, b) => {
        const v = b / 2, major = b % 2 === 0;
        return <Fragment key={b}><line className={major ? "r-major" : ""} x1={x(v)} y1="32" x2={x(v)} y2={major ? 40 : 36} />{major && <text x={x(v)} y="54" textAnchor="middle">{v}</text>}</Fragment>;
      })}
      {overall !== null && <line className="r-mark" x1={x(overall)} y1="4" x2={x(overall)} y2="40" />}
    </svg>
  );
}
