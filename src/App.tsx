import { useUILanguage, setUILanguage } from "./lib/i18n";
import { getAuth, loadAuth, SIGNED_OUT_EVENT, SIGNED_OUT_KEY, watchAccount } from "./lib/auth";
import { syncHistory } from "./lib/account-history";
import { configureInteractionSound, installPressFeedback, playInteraction } from "./lib/interaction-sound";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Lenis from "lenis";
import type { Chart, Draft, MarkResult } from "./lib/types";
import { lazy, Suspense } from "react";
import { screenFromHash, startScreen, type AppScreen } from "./lib/routes";
import { isCrawler } from "./lib/boot";
import { applyPrefs, loadPrefs, motionOK, onSystemMotionChange, savePrefs, scanSoundEnabled, systemReduced, type Prefs } from "./lib/prefs";
import { addEntry, clearHistory, loadHistory, personalBest, toEntry, type HistoryEntry } from "./lib/history";
import { isReportAnchor } from "./lib/report";
import type { Checker } from "./lib/checker";
import { ApiError, markEssay } from "./lib/api";
import { assertEvaluation, captureEvaluation, EvaluationCancelled, type EvaluationSelection } from "./lib/evaluation";
import { SAMPLE_QUESTIONS } from "./content";
import Boot from "./components/Boot";
import Login from "./components/Login";
import Write from "./components/Write";
import Mascots from "./components/Mascots";
import Privacy from "./components/Privacy";
import { geminiAccess } from "./lib/gemini";
import Toast from "./components/Toast";
import { recordMarked } from "./lib/collection";
import { toast } from "./lib/toast";
import { useScreenMotion, useTerminalReveals, watchPageVisibility } from "./lib/motion";
import PublicPage from "./components/PublicPage";
import { recordVisit } from "./lib/stats";
import Footer from "./components/Footer";

import { createScanSound, type ScanSound } from "./lib/scan-sound";
import { createScanEvents } from "./lib/scan";
import { captureTesterToken } from "./lib/tester";

import { captureSubmission } from "./lib/submission";
import { DRAFT_KEY, loadDraft, persistDraft } from "./lib/draft";

export interface Job {
  id: number;
  scan?: { sound: ScanSound; events: ReturnType<typeof createScanEvents> };
  status: "pending" | "done" | "error";
  result?: MarkResult;
  error?: string;
  errorCode?: string;
  checker?: Checker;
  selection?: EvaluationSelection;
  draft?: Draft;
  question?: string;
  chartDescription?: string;
  chart?: Chart | null;
  previous?: HistoryEntry[];
  essay: string; // the text that was marked
  minutes: number | null;
  date?: string;
  best?: { prev: number; next: number } | null;
}

const hashScreen = () => { captureTesterToken(); return screenFromHash(location.hash); };

// An old tab can ask for files a newer deploy removed. A background must never take the essay down with it,
// and Collection gets one reload to pick up the new files.
const Empty = { default: (() => null) as never };
const reloadOnce = () => {
  try { if (!sessionStorage.getItem("bandexe-reloaded")) { sessionStorage.setItem("bandexe-reloaded", "1"); location.reload(); } } catch { /* stays empty */ }
  return Empty;
};
const Collection = lazy(() => import("./components/Collection").catch(reloadOnce));
const Results = lazy(() => import("./components/Results").catch(reloadOnce));
const Overview = lazy(() => import("./components/Overview").catch(reloadOnce));
const Backdrop = lazy(() => import("./components/Backdrop").catch(() => Empty));

export default function App() {
  useEffect(() => { void recordVisit(); void loadAuth(); return watchAccount(); }, []);
  const [prefs, setPrefsState] = useState<Prefs>(() => { const p = loadPrefs(); setUILanguage(p.uiLanguage || "en"); return p; });
  const uiLanguage = useUILanguage();
  const [screen, setScreen] = useState<AppScreen>(() => {
    captureTesterToken();
    let storage: Storage | undefined;
    try { storage = localStorage; } catch { /* blocked storage: no first-visit routing */ }
    return startScreen(location.hash, storage);
  });
  const [booting, setBooting] = useState(() => prefs.boot === "on" && motionOK(prefs) && !isCrawler(navigator.userAgent));
  const [replayBoot, setReplayBoot] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const [draft, setDraftState] = useState<Draft>(loadDraft);
  const draftRef = useRef(draft);
  const [chart, setChart] = useState<Chart | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const jobId = useRef(0);
  const evaluationLock = useRef(false);
  const inTime = useRef(false);
  const scanRun = useRef<Job["scan"]>(undefined);
  useEffect(() => () => { scanRun.current?.events.end(); scanRun.current?.sound.stop(); }, []);
  const [fixtureMode, setFixtureMode] = useState(false);
  useEffect(() => { void geminiAccess.load().then(() => setFixtureMode(geminiAccess.getSnapshot().fixture)); }, []);


  const setPrefs = useCallback((p: Prefs) => { configureInteractionSound(p); setUILanguage(p.uiLanguage || "en"); setPrefsState(p); savePrefs(p); }, []);
  useEffect(() => installPressFeedback(), []);
  // CSS keys the one-screen login layout (no page scroll) off the current screen.
  useEffect(() => { document.documentElement.dataset.screen = screen; }, [screen]);
  // The OS reduced-motion setting is an external store: subscribe so mascots, spider and animations react at once.
  const sysReduced = useSyncExternalStore(onSystemMotionChange, systemReduced);
  useEffect(() => { applyPrefs(prefs); configureInteractionSound(prefs); }, [prefs, sysReduced]);
  const motionPrefs = useMemo<Prefs>(() => (sysReduced ? { ...prefs, reduced: "on" } : prefs), [prefs, sysReduced]);
  useEffect(() => watchPageVisibility(), []);
  useScreenMotion(content, screen, motionOK(motionPrefs) && !booting);
  useTerminalReveals(content, motionOK(motionPrefs) && !booting && screen !== "overview", true, screen + uiLanguage);
  const introActive = booting && prefs.boot === "on" && motionOK(motionPrefs);
  useEffect(() => { if (!introActive) setBooting(false); }, [introActive]);
  const finishBoot = useCallback(() => setBooting(false), []);
  const replayIntro = useCallback(() => {
    if (prefs.boot !== "on" || !motionOK(motionPrefs)) return;
    window.scrollTo(0, 0);
    setReplayBoot(true);
    setBooting(true);
  }, [prefs.boot, motionPrefs]);
  useEffect(() => {
    if (introActive) return;
    const target = content.current?.querySelector<HTMLElement>(
      screen === "login" ? ".screen.is-active .login__card" : screen === "write" ? ".screen.is-active #editor" : ".screen.is-active main",
    );
    if (target) {
      if (!target.matches("textarea")) target.tabIndex = -1;
      target.focus({ preventScroll: true });
      // Pages always open at the top, so the question stays in view. The outgoing screen is still in layout here, so the target's position can't be trusted.
      window.scrollTo(0, 0);
    }
    if (location.hash === "#privacy-accuracy") document.getElementById("privacy-accuracy")?.scrollIntoView();
  }, [introActive, screen]);

  const setDraft = useCallback((patch: Partial<Draft>) => {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    setDraftState(next);
    return persistDraft(next);
  }, []);

  const go = useCallback((s: AppScreen) => {
    if (location.hash !== "#" + s) replaceHash(s);
    setScreen(s);
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const on = () => {
      setScreen(hashScreen());
      if (location.hash === "#privacy-accuracy") requestAnimationFrame(() => document.getElementById("privacy-accuracy")?.scrollIntoView());
      else if (!isReportAnchor(location.hash)) window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  // Lenis smooth scrolling only on the reading pages, never in the editor.
  useEffect(() => {
    if (!(screen === "results" || screen === "overview") || !motionOK(motionPrefs)) return;
    const lenis = new Lenis({ autoRaf: true, anchors: true });
    return () => lenis.destroy();
  }, [screen, motionPrefs]);

  const evaluate = useCallback(async (minutes: number | null, selection: EvaluationSelection = captureEvaluation(), preparedSound?: ScanSound, retryInput?: { draft: Draft; chart: Chart | null }, finishedInTime = false) => {
    if (evaluationLock.current) { preparedSound?.stop(); return; }
    try { assertEvaluation(selection); } catch (error) { preparedSound?.stop(); throw error; }
    evaluationLock.current = true;
    if (!retryInput) inTime.current = finishedInTime; // a retry keeps the original attempt's clock
    const account = getAuth();
    const id = ++jobId.current;
    const input = retryInput ?? captureSubmission({ ...draft, feedbackLanguage: prefs.feedbackLanguage || "en" }, chart);
    const submitted = input.draft, submittedChart = input.chart;
    const essay = submitted.essay;
    const context = { draft: submitted, question: submitted.question, chartDescription: submitted.chartDescription, chart: submittedChart, previous: loadHistory() };
    const checker = selection.mode;
    const date = new Date().toISOString();
    scanRun.current?.events.end();
    scanRun.current?.sound.stop();
    const scan = { sound: preparedSound ?? createScanSound({ enabled: scanSoundEnabled(motionPrefs) }), events: createScanEvents() };
    scanRun.current = scan;
    scan.events.start();
    setJob({ ...context, id, scan, status: "pending", essay, minutes, checker, selection, date });
    go("results");
    try {
      const result = await markEssay(submitted, submittedChart, undefined, selection);
      if (jobId.current !== id) return;
      assertEvaluation(selection);
      let best: Job["best"] = null;
      if (!result.fixture) { // fixture data is never saved or celebrated
        const entry = toEntry(result);
        best = result.feedbackOnly ? null : personalBest(loadHistory(), entry);
        setHistory(addEntry(entry));
        if (account.signedIn) void syncHistory(entry, account.revision);
      }
      if (recordMarked(submitted.task, essay, inTime.current ? minutes : null) > 0) toast("+1 coin");
      if (jobId.current === id) setJob({ ...context, id, scan, status: "done", result, essay, minutes, best, checker, selection, date });
    } catch (e) {
      playInteraction("error");
      scan.events.end();
      scan.sound.stop();
      if (jobId.current === id) setJob({ ...context, id, scan, status: "error", error: (e as Error).message, errorCode: e instanceof ApiError || e instanceof EvaluationCancelled ? e.code : undefined, checker, essay, minutes, selection, date });
    } finally { evaluationLock.current = false; }
  }, [draft, chart, go, prefs.sound, prefs.feedbackLanguage, motionPrefs]);

  const retry = () => {
    // Retry retains the original Evaluate authorization; a changed choice needs a new click in the editor.
    if (!job?.selection) { go("write"); return; }
    try { assertEvaluation(job.selection); } catch { go("write"); return; }
    void evaluate(job.minutes, job.selection, undefined, { draft: job.draft ?? { task: "t2", question: job.question || "", essay: job.essay }, chart: job.chart ?? null });
  };

  // Results sees the system setting folded in; never persist that folded value as the user's own choice.
  const setMotionPrefs = useCallback((p: Prefs) => setPrefs(sysReduced ? { ...p, reduced: prefs.reduced } : p), [setPrefs, sysReduced, prefs.reduced]);
  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    const next = { task: draft.task, question: SAMPLE_QUESTIONS[draft.task][0], essay: "" };
    draftRef.current = next; setDraftState(next);
  }, [draft.task]);
  const deleteHistory = useCallback((alsoDraft: boolean) => { clearHistory(); setHistory([]); if (alsoDraft) clearDraft(); }, [clearDraft]);
  // Sign-out (here or in another tab) wipes this browser's essay, results and open report from memory too.
  useEffect(() => {
    const forget = () => { deleteHistory(true); setJob(null); };
    const otherTab = (e: StorageEvent) => { if (e.key === SIGNED_OUT_KEY && e.newValue) forget(); };
    window.addEventListener(SIGNED_OUT_EVENT, forget);
    window.addEventListener("storage", otherTab);
    return () => { window.removeEventListener(SIGNED_OUT_EVENT, forget); window.removeEventListener("storage", otherTab); };
  }, [deleteHistory]);

  return (
    <>
      {prefs.background && !introActive && <Suspense fallback={null}><Backdrop id={prefs.background} /></Suspense>}
      <div id="live" className="sr-only" aria-live="polite" />
      <div ref={content} className={"app-content" + (introActive ? " is-booting" : "")} inert={introActive}>
        <Login active={screen === "login"} prefs={motionPrefs} setPrefs={setMotionPrefs} onGuest={() => go("write")} />
        <Write active={screen === "write"} prefs={prefs} setPrefs={setPrefs} draft={draft} setDraft={setDraft}
          chart={chart} setChart={setChart} onEvaluate={evaluate} pending={job?.status === "pending"} fixtureMode={fixtureMode} onClearDraft={clearDraft}
          onReplayBoot={replayIntro} />
        <Suspense fallback={null}><Results active={screen === "results"} prefs={motionPrefs} setPrefs={setMotionPrefs} job={job} essay={draft.essay}
          setEssay={(essay) => setDraft({ essay })} onRetry={retry} onWrite={() => go("write")}
          onReplayBoot={replayIntro} /></Suspense>
        <Suspense fallback={null}><Overview revealsEnabled={!introActive} active={screen === "overview"} prefs={prefs} setPrefs={setPrefs} history={history} onDelete={deleteHistory} onClearDraft={clearDraft}
          onReplayBoot={replayIntro} /></Suspense>
        <Privacy active={screen === "privacy"} prefs={prefs} setPrefs={setPrefs} onReplayBoot={replayIntro} />
        {(screen === "about" || screen === "stats") && <PublicPage kind={screen} prefs={prefs} setPrefs={setPrefs} onReplayBoot={replayIntro} />}
        {screen === "collection" && <Suspense fallback={null}><Collection prefs={prefs} setPrefs={setPrefs} onReplayBoot={replayIntro} /></Suspense>}
        {screen !== "login" && <Footer />}
        <Toast />
        <Mascots booting={introActive} prefs={motionPrefs} task={draft.task} history={history} question={draft.question} essay={draft.essay} setEssay={(essay) => setDraft({ essay })} />
      </div>
      {introActive && <Boot content={content} replay={replayBoot} onDone={finishBoot} />}
    </>
  );
}

function replaceHash(s: AppScreen) {
  window.history.replaceState(null, "", "#" + s);
}
