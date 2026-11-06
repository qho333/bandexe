import { translateError, t as ui, translateUI } from "../lib/i18n";
import { useSlowReply, STILL_WORKING, BUSY_NOTICE } from "../lib/use-slow-reply";
import { playInteraction } from "../lib/interaction-sound";
import { loadPrefs } from "../lib/prefs";
import { memorySummary } from "../lib/progress";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MascotId } from "../mascot-art";
import { helperArt } from "../lib/prefs";
import { askHelper, synonyms, type HelperTurn, type Syn } from "../lib/helper";
import { TASKS, type Task } from "../lib/types";
import { motionOK, type Prefs } from "../lib/prefs";
import type { HistoryEntry } from "../lib/history";
import { dismissAfterFocusLeaves, dockTucking, restoreHelperFocus } from "../lib/mascot-interactions";
import {
  canNudge, IDEAS_EMPTY_MS, loadNudges, markDismissed, markShown, NUDGE_SHOW_MS, saveNudges, shortText, singleWord,
  type NudgeKind,
} from "../lib/mascots";
import { createMascotStage, type MascotStage } from "../lib/mascot-stage";
import "../mascots.css";
import { getChecker, onCheckerChange } from "../lib/checker";
import { GeminiGate, useGeminiAccess } from "./GeminiGate";

// Reserved bottom playground. Motion and pointer interactions are imperative; helper panels and
// rare nudges stay React-owned. No animation frame updates React state.

const IDS: MascotId[] = ["coach", "synonyms", "ideas"];
const NAMES: Record<MascotId, string> = { coach: "Coach", synonyms: "Synonyms", ideas: "Ideas" };
const ROLES: Record<MascotId, string> = { coach: "ask about IELTS writing", synonyms: "find synonyms for a word", ideas: "get nudges for ideas" };
const TYPING_MS = 1500;
const prefsDirection = () => loadPrefs().feedbackLanguage === "ar" ? "rtl" : "ltr";

const coarse = () => typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
const TEXT_FIELD = "textarea, input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=button]):not([type=submit]):not([type=reset])";
const isField = (el: Element | null): el is HTMLElement => !!el && (el as HTMLElement).matches?.(TEXT_FIELD) && !(el as HTMLInputElement).readOnly;

interface Bubble { kind: NudgeKind; id: MascotId; text: string; left: number; tail: number }

interface Props { booting?: boolean; prefs: Prefs; task: Task; history: HistoryEntry[]; question: string; essay: string; setEssay: (e: string) => void }

export default function Mascots({ booting = false, prefs, task, history, question, essay, setEssay }: Props) {
  const access = useGeminiAccess();
  const settings = useSyncExternalStore(onCheckerChange, getChecker, getChecker);
  const googleHelpers = settings.mode === "site" || settings.mode === "own";
  const track = useRef<HTMLDivElement>(null);
  const lane = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLElement>(null);
  const bubbles = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ id: MascotId; closing: boolean } | null>(null);
  const els = useRef<(HTMLButtonElement | null)[]>([]);
  const ctl = useRef<MascotStage | null>(null);
  const running = motionOK(prefs) && prefs.mascots === "on";
  const nudgesOn = prefs.mascots === "on";
  const typingUntil = useRef(0);
  const [helpTip, setHelpTip] = useState(false);
  const helpSeen = useRef(false);
  const showHelp = () => {
    if (helpSeen.current) return;
    helpSeen.current = true;
    try { if (localStorage.getItem("bandexe-mascot-help")) return; localStorage.setItem("bandexe-mascot-help", "1"); } catch { /* session only */ }
    setHelpTip(true);
  };
  useEffect(() => {
    if (!helpTip) return;
    const dismiss = (e: KeyboardEvent) => { if (e.key === "Escape") setHelpTip(false); };
    const timer = window.setTimeout(() => setHelpTip(false), 6000);
    document.addEventListener("keydown", dismiss);
    return () => { clearTimeout(timer); document.removeEventListener("keydown", dismiss); };
  }, [helpTip]);
  const [open, setOpen] = useState<MascotId | null>(null);
  const [popLeft, setPopLeft] = useState(8);
  const [tucked, setTucked] = useState(false);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [thinking, setThinking] = useState<MascotId | null>(null);
  const [sel, setSel] = useState<{ start: number; end: number; word: string } | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const bubbleRef = useRef(bubble);
  bubbleRef.current = bubble;
  const tuckedRef = useRef(tucked);
  tuckedRef.current = tucked;
  const bootingRef = useRef(booting);
  bootingRef.current = booting;

  // --dock-h: the real height of whatever sits on the bottom edge (track, or the handle when tucked).
  const sizeDock = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-track");
    const size = () => {
      const h = tuckedRef.current ? handle.current?.offsetHeight ?? 0 : track.current?.offsetHeight ?? 0;
      root.style.setProperty("--dock-h", `${h}px`);
    };
    sizeDock.current = size;
    size();
    const ro = new ResizeObserver(size);
    if (track.current) ro.observe(track.current);
    if (handle.current) ro.observe(handle.current);
    return () => { ro.disconnect(); root.classList.remove("has-track"); root.style.removeProperty("--dock-h"); };
  }, []);
  useLayoutEffect(() => {
    sizeDock.current();
    const pending = pendingFocus.current;
    if (pending && (!pending.closing || !open)) {
      restoreHelperFocus(tucked, handle.current, els.current[IDS.indexOf(pending.id)]);
      pendingFocus.current = null;
    }
  }, [tucked, open]);

  // Tuck the dock while a text field is in use: phone keyboard open, or (desktop) typing in a field
  // that reaches under the dock. Selecting text in the editor brings it back so Synonyms is reachable.
  const untuck = useRef(() => {});
  useEffect(() => {
    let blurT = 0, typeT = 0;
    const vv = window.visualViewport;
    const keyboard = () => !!vv && coarse() && vv.height < window.innerHeight * 0.75;
    const tuck = dockTucking(keyboard, () => document.activeElement === handle.current, (t) => { tuckedRef.current = t; setTucked(t); });
    const update = tuck.update;
    untuck.current = tuck.expand;
    const onFocusIn = (e: FocusEvent) => {
      clearTimeout(blurT);
      if (coarse() && isField(e.target as Element)) tuck.focusField();
    };
    const onFocusOut = () => {
      clearTimeout(blurT);
      blurT = window.setTimeout(() => { if (!isField(document.activeElement)) tuck.releaseField(); }, 120);
    };
    const onInput = (e: Event) => {
      const el = e.target as HTMLElement;
      if (!isField(el)) return;
      typingUntil.current = performance.now() + TYPING_MS;
      ctl.current?.hold("typing", true);
      setBubble(null);
      clearTimeout(typeT);
      typeT = window.setTimeout(() => ctl.current?.hold("typing", false), TYPING_MS);
      if (!coarse() && !el.closest(".helper-pop, .mascot-track") && !tuckedRef.current) {
        const dock = track.current?.offsetHeight ?? 0;
        if (el.getBoundingClientRect().bottom > window.innerHeight - dock - 8) tuck.focusField();
      }
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", onInput, true);
    vv?.addEventListener("resize", update);
    return () => {
      clearTimeout(blurT); clearTimeout(typeT);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("input", onInput, true);
      vv?.removeEventListener("resize", update);
    };
  }, []);
  useEffect(() => {
    ctl.current?.hold("tucked", tucked);
    if (tucked) setBubble(null);
  }, [tucked]);

  // One shared stage lets the helpers play together while keeping all movement off React's clock.
  useLayoutEffect(() => {
    const laneEl = lane.current, trackEl = track.current;
    const buttons = els.current.filter(Boolean) as HTMLButtonElement[];
    if (!running || booting || !laneEl || !trackEl || buttons.length !== IDS.length) return;
    const stage = createMascotStage({
      track: trackEl, lane: laneEl, buttons,
      occupied: () => !!openRef.current || !!bubbleRef.current,
      typing: () => performance.now() < typingUntil.current,
      tucked: () => tuckedRef.current,
    });
    ctl.current = stage;
    return () => { ctl.current = null; stage.destroy(); };
    // A new skin replaces the drawings the stage holds on to.
  }, [running, booting, JSON.stringify(prefs.skins)]);

  // Thinking: animate while the open panel waits for an answer (static dots without motion).
  useEffect(() => {
    if (!thinking) return;
    const i = IDS.indexOf(thinking);
    ctl.current?.think(i, true);
    return () => ctl.current?.think(i, false);
  }, [thinking, running, booting]);

  // ---- Nudges: rare, dismissible, never while typing, at most one at a time. ----
  const sessionShown = useRef(new Set<NudgeKind>());
  const nudge = (kind: NudgeKind, id: MascotId, text: string) => {
    if (id !== "synonyms" && googleHelpers && access.allowed !== true) return;
    if (!nudgesOn || bootingRef.current || openRef.current || bubbleRef.current || tuckedRef.current || document.hidden) return;
    if (performance.now() < typingUntil.current) return;
    const now = Date.now();
    const store = loadNudges();
    if (!canNudge(store, kind, now, sessionShown.current)) return;
    const btn = els.current[IDS.indexOf(id)], tr = track.current;
    if (!btn || !tr) return;
    sessionShown.current.add(kind);
    saveNudges(markShown(store, now));
    ctl.current?.stop(IDS.indexOf(id));
    const b = btn.getBoundingClientRect(), t = tr.getBoundingClientRect();
    const width = Math.min(260, t.width - 16);
    const center = b.left - t.left + b.width / 2;
    const left = Math.max(8, Math.min(center - 28, t.width - width - 8));
    setBubble({ kind, id, text, left, tail: Math.max(12, Math.min(center - left - 4, width - 20)) });
  };
  const nudgeRef = useRef(nudge);
  nudgeRef.current = nudge;
  useEffect(() => {
    if (bubble && bubbles.current) return dismissAfterFocusLeaves(bubbles.current, () => setBubble(null), NUDGE_SHOW_MS);
  }, [bubble]);
  useEffect(() => { if (!nudgesOn || open) setBubble(null); }, [nudgesOn, open]);

  const dismissBubble = () => {
    const cur = bubbleRef.current;
    if (!cur) return;
    saveNudges(markDismissed(loadNudges(), cur.kind, Date.now()));
    const inBubble = !!document.activeElement?.closest(".mascot-bubble");
    setBubble(null);
    if (inBubble) els.current[IDS.indexOf(cur.id)]?.focus();
  };

  // Synonyms: the student selected text in the essay.
  useEffect(() => {
    let t = 0;
    const check = (e: Event) => {
      const ed = e.target as HTMLTextAreaElement;
      if (ed?.id !== "editor") return;
      clearTimeout(t);
      t = window.setTimeout(() => {
        const raw = ed.value.slice(ed.selectionStart, ed.selectionEnd);
        if (!raw.trim()) return;
        if (!coarse()) untuck.current();
        window.setTimeout(() => {
          const w = singleWord(raw);
          nudgeRef.current("synonyms-select", "synonyms", w ? `Synonyms for "${w}"? Click me.` : "Select one word in your essay, then click me for synonyms.");
        }, 80);
      }, 450);
    };
    document.addEventListener("mouseup", check);
    document.addEventListener("keyup", check);
    return () => { clearTimeout(t); document.removeEventListener("mouseup", check); document.removeEventListener("keyup", check); };
  }, []);

  // Coach: a new result arrived; point to its first priority (from the saved report, nothing invented).
  const seen = useRef(history.length);
  useEffect(() => {
    const before = seen.current;
    seen.current = history.length;
    const p = history.at(-1)?.priorities[0];
    if (history.length <= before || !p) return;
    const t = window.setTimeout(() => nudgeRef.current("coach-priority", "coach", `Your top priority: ${shortText(p)}`), 2500);
    return () => clearTimeout(t);
  }, [history]);

  // Ideas: the essay has stayed empty on the write screen for a while.
  const empty = essay.trim() === "";
  useEffect(() => {
    if (!empty || booting) return;
    const t = window.setTimeout(() => {
      const ed = document.getElementById("editor");
      if (ed && ed.offsetParent !== null && !(ed as HTMLTextAreaElement).value.trim()) nudgeRef.current("ideas-empty", "ideas", "Stuck? Ask me for a starting point.");
    }, IDEAS_EMPTY_MS);
    return () => clearTimeout(t);
  }, [empty, booting]);

  // ---- Panels ----
  const caret = useRef(0);
  const toggle = (id: MascotId) => {
    if (id !== "synonyms" && googleHelpers && access.allowed !== true) return;
    if (open === id) return close();
    const ed = document.getElementById("editor") as HTMLTextAreaElement | null;
    if (ed) {
      const { selectionStart: a, selectionEnd: b } = ed;
      const w = ed.value.slice(a, b).trim();
      setSel(w && !/\s/.test(w) && w.length <= 40 ? { start: a + ed.value.slice(a, b).indexOf(w), end: a + ed.value.slice(a, b).indexOf(w) + w.length, word: w } : null);
      caret.current = a;
    }
    const i = IDS.indexOf(id);
    ctl.current?.stop(i);
    const r = els.current[i]?.getBoundingClientRect();
    const w = Math.min(380, window.innerWidth - 16);
    setPopLeft(Math.max(8, Math.min((r ? r.left + r.width / 2 : 8) - w / 2, window.innerWidth - w - 8)));
    setBubble(null);
    setThinking(null);
    setOpen(id);
  };
  const close = () => {
    const was = openRef.current;
    const a = document.activeElement;
    const focusBack = !a || a === document.body || !!pop.current?.contains(a);
    if (was && focusBack) pendingFocus.current = { id: was, closing: true };
    setOpen(null);
    setThinking(null);
  };

  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add("has-sheet");
    return () => document.documentElement.classList.remove("has-sheet");
  }, [open]);
  useEffect(() => {
    if (!open && !bubble) return;
    const k = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (openRef.current) close(); else dismissBubble();
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, bubble]); // eslint-disable-line react-hooks/exhaustive-deps

  const latest = history.at(-1);
  const paragraphAtCaret = () => {
    const at = caret.current, start = essay.lastIndexOf("\n", Math.max(0, at - 1)) + 1, end = essay.indexOf("\n", at);
    return essay.slice(start, end < 0 ? undefined : end).trim().slice(0, 1500);
  };
  const busy = (id: MascotId) => (b: boolean) => setThinking((cur) => (b ? id : cur === id ? null : cur));

  return (
    <>
      <div ref={track} id="mascotTrack" className={"mascot-track" + (tucked ? " is-tucked" : "") + (running && !booting ? "" : " is-static")}
        role="toolbar" aria-label={ui("Helpers")} aria-hidden={tucked || undefined} inert={tucked || undefined}>
        <div ref={lane} className="mascot-lane">
          <button type="button" className="mascot-floor" disabled={!running || booting}
            aria-label={ui("Move selected helper here")} aria-describedby="mascotPlayHelp"
            onClick={(e) => ctl.current?.place(e.detail === 0 ? undefined : e.clientX)} />
          {IDS.map((id, i) => (
            <button key={id} type="button" ref={(el) => { els.current[i] = el; }}
              disabled={id !== "synonyms" && googleHelpers && access.allowed !== true} aria-describedby={id !== "synonyms" && googleHelpers && access.allowed !== true ? "helperAvailability mascotPlayHelp" : "mascotPlayHelp"}
              className={"mascot-btn mascot-runner" + (thinking === id ? " is-thinking" : "")}
              aria-label={translateUI(`${translateUI(NAMES[id])}: ${translateUI(ROLES[id])}`)} aria-haspopup="dialog" aria-expanded={open === id} aria-controls={open === id ? "helperPop" : undefined}
              onMouseEnter={(e) => { showHelp(); ctl.current?.hover(i, e.clientX); }} onFocus={(e) => { if (e.target.matches(":focus-visible")) { showHelp(); ctl.current?.hover(i); } }}
              onClick={(e) => {
                setHelpTip(false);
                if (ctl.current?.click(i, e.detail === 0) === false) return;
                if (!ctl.current) playInteraction("mascot");
                toggle(id);
              }}>
              <span className="mascot-runner__body" aria-hidden="true">
                <span className="mascot-runner__art" dangerouslySetInnerHTML={{ __html: helperArt(id, prefs) }} />
                <span className="mascot-think"><i /><i /><i /></span>
                <span className="mascot-sleep">Z<span>z</span></span>
                <span className="mascot-dizzy">+ · +</span>
              </span>
              <span className="mascot-runner__name" aria-hidden="true">{translateUI(NAMES[id])}</span>
            </button>
          ))}
        </div>
        <div className="mascot-dock-meta">
          <span className="dock__label">{ui("Draft art")}</span>
          <span id="mascotPlayHelp" className="sr-only">{ui("Tap to chat. Drag to play. Double-poke for a dizzy reaction. Focus a helper then use Alt and the left or right arrow to move it.")}</span>
          {googleHelpers && access.allowed !== true && <span id="helperAvailability" className="sr-only">{access.reason === "region" ? ui("Coach and Ideas: unavailable in your region.") : access.allowed === null ? ui("Coach and Ideas: checking access.") : ui("Coach and Ideas: unavailable. Reload to retry.")}</span>}
        </div>
        {helpTip && <div className="mascot-help-tip" role="status">{running ? ui("Tap to chat · drag to play") : ui("Tap to chat")}<button className="btn btn--sm btn--quiet" aria-label={ui("Dismiss mascot help")} onClick={() => setHelpTip(false)}>×</button></div>}
        <span className="mascot-ball" aria-hidden="true" />
        <span className="mascot-confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</span>
        <div ref={bubbles} className="mascot-bubbles" aria-live="polite">
          {bubble && (
            <div className="mascot-bubble" style={{ left: bubble.left, ["--tail" as string]: `${bubble.tail}px` }}>
              <button type="button" className="mascot-bubble__text" onClick={() => toggle(bubble.id)}>
                <span className="sr-only">{ui("{value0} says:", { value0: translateUI(NAMES[bubble.id]) })}</span>{translateUI(bubble.text)}
              </button>
              <button type="button" className="mascot-bubble__x" onClick={dismissBubble} aria-label={translateUI(ui("Dismiss {value0} tip (Esc)", { value0: translateUI(NAMES[bubble.id]) }))}>×</button>
            </div>
          )}
        </div>
      </div>
      <button ref={handle} type="button" className={"mascot-handle" + (tucked ? " is-shown" : "")} aria-controls="mascotTrack" aria-expanded={false}
        hidden={!tucked} onMouseDown={(e) => e.preventDefault()} onClick={() => { pendingFocus.current = { id: !googleHelpers || access.allowed === true ? "coach" : "synonyms", closing: false }; untuck.current(); }}>
        <span aria-hidden="true">▴</span> {ui("Helpers")} </button>

      {open && (
        <section ref={pop} id="helperPop" className="frame helper-pop" role="dialog" aria-labelledby="helperTitle" style={{ left: popLeft }}>
          <div className="frame-head"><h2 id="helperTitle">{translateUI(NAMES[open])}</h2><button className="btn btn--sm btn--quiet" onClick={close} aria-label={translateUI(`Close ${translateUI(NAMES[open])}`)}>{ui("Close")}</button></div>
          <div className="frame-body">
            {open === "coach" && <HelperGate google={googleHelpers} close={close}><Coach memory={memorySummary(history, task)} latest={latest} onOverview={() => setOpen(null)} onBusy={busy("coach")} /></HelperGate>}
            {open === "synonyms" && <Synonyms sel={sel} essay={essay} setEssay={setEssay} onUsed={(word, end) => setSel({ start: end - word.length, end, word })} onBusy={busy("synonyms")} />}
            {open === "ideas" && <HelperGate google={googleHelpers} close={close}><Ideas task={task} question={question} paragraph={paragraphAtCaret} onBusy={busy("ideas")} /></HelperGate>}
          </div>
        </section>
      )}
    </>
  );
}

function HelperGate({ google, close, children }: { google: boolean; close: () => void; children: import("react").ReactNode }) {
  return google ? <GeminiGate onDevice={close}>{children}</GeminiGate> : children;
}

function useBusy(busy: boolean, onBusy: (b: boolean) => void) {
  const cb = useRef(onBusy);
  cb.current = onBusy;
  useEffect(() => { cb.current(busy); }, [busy]);
  useEffect(() => () => cb.current(false), []);
}

function Synonyms({ sel, essay, setEssay, onUsed, onBusy }: { sel: { start: number; end: number; word: string } | null; essay: string; setEssay: (e: string) => void; onUsed: (w: string, end: number) => void; onBusy: (b: boolean) => void }) {
  const [word, setWord] = useState(sel?.word ?? "");
  const [list, setList] = useState<Syn[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useBusy(busy, onBusy);
  useEffect(() => { input.current?.focus(); if (sel?.word) lookup(sel.word); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function lookup(w = word) {
    if (!w.trim()) return;
    setBusy(true); setMsg(""); setList(null);
    try {
      const r = await synonyms(w);
      setList(r);
      if (!r.length) setMsg(`No synonyms found for "${w.trim()}". Try the base form of the word.`);
    } catch {
      playInteraction("error");
      setMsg("The dictionary could not be reached. Check your connection and try again.");
    } finally { setBusy(false); }
  }
  const canReplace = !!sel && essay.slice(sel.start, sel.end) === sel.word && sel.word.toLowerCase() === word.trim().toLowerCase();
  const use = async (s: Syn) => {
    if (canReplace && sel) {
      const rep = /^[A-Z]/.test(sel.word) ? s.word[0].toUpperCase() + s.word.slice(1) : s.word;
      setEssay(essay.slice(0, sel.start) + rep + essay.slice(sel.end));
      onUsed(rep, sel.start + rep.length);
      setWord(rep);
      setMsg(`Replaced "${sel.word}" with "${rep}" in your answer.`);
    } else {
      try { await navigator.clipboard.writeText(s.word); playInteraction("confirm"); setMsg(`Copied "${s.word}". Select a word in your answer first to replace it directly.`); }
      catch { setMsg(`"${s.word}" (select a word in your answer first to replace it directly)`); }
    }
  };
  return (
    <>
      <form className="helper-form" onSubmit={(e) => { e.preventDefault(); lookup(); }}>
        <label className="field__label" htmlFor="synWord">{ui("Synonyms for which word?")}</label>
        <div className="helper-row">
          <input id="synWord" ref={input} className="input" value={word} onChange={(e) => setWord(e.target.value)} maxLength={40} autoComplete="off" placeholder={ui("e.g. important")} />
          <button className="btn btn--sm" disabled={busy || !word.trim()}>{busy ? ui("Looking…") : ui("Look up")}</button>
        </div>
      </form>
      {list && list.length > 0 && (
        <ul className="syn-list" aria-label={translateUI(`Synonyms for ${word}`)}>
          {list.map((s) => (
            <li key={s.word}><button className="syn" onClick={() => use(s)} aria-label={translateUI(`${canReplace ? ui("Replace with") : ui("Copy")} ${s.word}${s.rare ? ui(", less common, band 7 plus") : ""}`)}>
              {s.word}{s.rare && <span className="syn__tag">{ui("band 7+")}</span>}</button></li>
          ))}
        </ul>
      )}
      <p className="muted" aria-live="polite">{translateUI(msg) || (canReplace ? ui("Click a word to replace your selection.") : ui("Tip: select a word in your answer before opening Synonyms to replace it with one click."))}</p>
      <p className="mono">{ui("Free dictionary (Datamuse). No AI quota used. Check the meaning fits your sentence.")}</p>
    </>
  );
}

const CHIPS = ["Sentence structure", "Linking words", "Arguments for", "Arguments against", "Examples", "Conclusion"];

function Ideas({ task, question, paragraph, onBusy }: { task: Task; question: string; paragraph: () => string; onBusy: (b: boolean) => void }) {
  const [q, setQ] = useState("");
  const [withPara, setWithPara] = useState(false);
  const [reply, setReply] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const slow = useSlowReply(busy), requestLock = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useBusy(busy, onBusy);
  useEffect(() => { input.current?.focus(); }, []);
  const ask = async (text = q) => {
    if (text.trim().length < 2 || requestLock.current) return;
    requestLock.current = true;
    setBusy(true); setErr(""); setReply("");
    try { setReply(await askHelper({ role: "ideas", message: text.trim(), task, taskQuestion: question.slice(0, 3000), paragraph: withPara ? paragraph() : undefined })); }
    catch (e) { playInteraction("error"); setErr((e as Error).message); }
    finally { requestLock.current = false; setBusy(false); }
  };
  return (
    <>
      <form className="helper-form" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <label className="field__label" htmlFor="ideaQ">{ui("What do you need ideas for?")}</label>
        <div className="helper-row">
          <input id="ideaQ" ref={input} className="input" value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} autoComplete="off" placeholder={ui("e.g. a counter-argument")} />
          <button className="btn btn--sm" disabled={busy || q.trim().length < 2}>{busy ? ui("Thinking…") : ui("Ask")}</button>
        </div>
      </form>
      <div className="chips" role="group" aria-label={ui("Quick topics")}>
        {CHIPS.map((c) => <button key={c} className="chip chip--btn" disabled={busy} onClick={() => { setQ(c); ask(c); }}>{translateUI(c)}</button>)}
      </div>
      <label className="helper-check"><input type="checkbox" checked={withPara} onChange={(e) => setWithPara(e.target.checked)} /> {ui("Include the paragraph my cursor is in")}</label>
      <div aria-live="polite">
        {busy && <p className="processing" role="status">{slow ? `${translateUI(STILL_WORKING)} ${getChecker().mode === "free" ? translateUI(BUSY_NOTICE) : ""}` : ui("Thinking…")}</p>}
        {err && <p className="form-error" role="alert">{translateError(err)}</p>}
        {reply && <p className="helper-reply" dir={prefsDirection()}>{reply}</p>}
      </div>
      <p className="mono">{ui("Nudges and patterns only: Ideas never writes your essay. Uses a small AI model with its own limit.")}</p>
    </>
  );
}

function Coach({ latest, memory, onOverview, onBusy }: { memory: string; latest: HistoryEntry | undefined; onOverview: () => void; onBusy: (b: boolean) => void }) {
  const [chat, setChat] = useState<HelperTurn[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const slow = useSlowReply(busy), requestLock = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  useBusy(busy, onBusy);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [chat, busy]);
  const ask = async () => {
    const text = q.trim();
    if (text.length < 2 || requestLock.current) return;
    requestLock.current = true;
    setBusy(true); setErr(""); setQ("");
    const history = chat.slice(-6).map((t) => ({ role: t.role, text: t.text.slice(0, 800) }));
    setChat((c) => [...c, { role: "user", text }]);
    try { const reply = await askHelper({ role: "coach", message: text, history, memory }); setChat((c) => [...c, { role: "model", text: reply }]); }
    catch (e) { playInteraction("error"); setErr((e as Error).message); }
    finally { requestLock.current = false; setBusy(false); }
  };
  return (
    <>
      {latest ? (
        <div className="coach-sum">
          <p className="mono">{ui("Last result:")} {translateUI(TASKS[latest.task].chip)}, {latest.feedbackOnly ? ui("feedback only") : latest.overall !== null ? latest.overall.toFixed(1) : ui("overall withheld")} · <a href="#overview" onClick={onOverview}>{ui("overview")}</a></p>
          {latest.priorities.length > 0 && <ol className="helper-list">{latest.priorities.map((p, i) => <li key={i}>{p}</li>)}</ol>}
        </div>
      ) : <p className="mono">{ui("No reviewed answers yet. After you press Evaluate, your priorities appear here.")}</p>}
      <div className="coach-log" ref={log} aria-live="polite">
        {chat.map((t, i) => <p key={i} dir={t.role === "model" ? prefsDirection() : "auto"} className={"coach-msg coach-msg--" + t.role}><span className="sr-only">{t.role === "user" ? ui("You:") : ui("Coach:")}</span>{t.text}</p>)}
        {busy && <p className="coach-msg coach-msg--model muted processing" role="status">{slow ? `${translateUI(STILL_WORKING)} ${getChecker().mode === "free" ? translateUI(BUSY_NOTICE) : ""}` : ui("Thinking…")}</p>}
        {err && <p className="form-error" role="alert">{translateError(err)}</p>}
      </div>
      <form className="helper-form" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <label className="field__label" htmlFor="coachQ">{ui("Ask me anything about IELTS writing")}</label>
        <div className="helper-row">
          <input id="coachQ" ref={input} className="input" value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} autoComplete="off" placeholder={ui("e.g. How is Task 1 marked?")} />
          <button className="btn btn--sm" disabled={busy || q.trim().length < 2}>{ui("Send")}</button>
        </div>
      </form>
    </>
  );
}
