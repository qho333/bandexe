import { useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { beginBoot, BOOT_TIMELINE, describeAgent, initialBootPhase, stamp } from "../lib/boot";
import { bootSoundEnabled } from "../lib/prefs";
import { createBootSound, type BootSound } from "../lib/boot-sound";
import "../boot.css";
// Build-time text only: these are BAND.EXE's real sources, never fetched by the intro.
import scoreSrc from "../../shared/score.js?raw";
import reviewSrc from "../../shared/review.js?raw";
import validateSrc from "../../shared/validate.js?raw";
import bootSrc from "../lib/boot.ts?raw";
import scanSrc from "../lib/scan.ts?raw";
import historySrc from "../lib/history.ts?raw";
import pkgSrc from "../../package.json?raw";

const WORD = "BAND.EXE";
const VERSION = /"version":\s*"([^"]+)"/.exec(pkgSrc)?.[1] ?? "dev";
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/[]<>_+=*";
const SOURCES = [
  ["shared/score.js", scoreSrc], ["shared/review.js", reviewSrc], ["shared/validate.js", validateSrc],
  ["src/lib/scan.ts", scanSrc], ["src/lib/history.ts", historySrc], ["src/lib/boot.ts", bootSrc],
] as const;
const CODE = SOURCES.flatMap(([file, src]) => [`// ---- ${file}`, ...src.split("\n").filter((line) => line.trim())]);
const HOT = /^(export|function|const|interface|type|\/\/ ----)/;
const CODE_OFFSET = Math.floor(CODE.length / 2);
type Kind = "ok" | "sub" | "sym" | "env";
// Original stage directions, clearly decorative; exported symbols below come from the bundled source.
const STAGES: [string, string[]][] = [
  ["Cue the writing workspace", ["Set a place for your next draft", "Clear the desk of old notes", "Frame the question"]],
  ["Lay out the tasks", ["Task 2 · build an argument", "Academic Task 1 · describe the chart", "General Task 1 · write a letter"]],
  ["Pin the four criteria to the wall", ["Task response · address the question", "Coherence · give ideas a clear path",
    "Cohesion · connect each paragraph", "Lexical resource · choose with care", "Grammar · vary the sentence"]],
  ["Prepare the band descriptor notes", ["Read the public descriptors, not rumours", "Band 6 and band 7 · know the difference"]],
  ["Sketch the essay shape", ["Leave room for an introduction", "State a clear position", "One main idea per body paragraph",
    "Reserve a line for the conclusion"]],
  ["Plan the Task 1 report", ["Keep the overview in sight", "Group the key features", "Compare, don't just list"]],
  ["Plan the letter", ["Match the tone to the reader", "Cover every bullet point"]],
  ["Mark the word-count rail", ["Task 1 · at least 150 words", "Task 2 · at least 250 words"]],
  ["Arrange the review controls", ["Leave the estimate to a real check", "Show the reason beside each note"]],
  ["Seat the helpers", ["Coach · a nudge, then your words", "Synonyms · meaning before variety", "Ideas · a starting point"]],
  ["Sharpen the vocabulary shelf", ["Shelve the linking words", "Retire 'in conclusion' for a day", "Collocations before rare words"]],
  ["Tune the grammar bench", ["Mix simple and complex sentences", "Check the articles", "Watch subject-verb agreement"]],
  ["Clear the stage for your writing", []],
];
const SYMBOLS = SOURCES.flatMap(([file, src]) =>
  Array.from(src.matchAll(/export (?:async )?(?:function|const|class|interface|type) (\w+)/g), (m) => `source: ${m[1]} <- ${file}`));
const KERNEL: [Kind, string][] = STAGES.flatMap(([head, subs], i) => [
  ["ok", head] as [Kind, string],
  ...subs.map((sub) => ["sub", `band: ${sub}`] as [Kind, string]),
  ...SYMBOLS.slice(i * 4, i * 4 + 4).map((sym) => ["sym", sym] as [Kind, string]),
]);

interface Props {
  onDone: () => void;
  content: RefObject<HTMLDivElement | null>;
  replay?: boolean;
}

/** Typing, a flickering logo, then the app. The workspace loads independently underneath. */
export default function Boot({ onDone, content, replay = false }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const complete = useRef<() => void>(() => {});
  const done = useRef(onDone);
  done.current = onDone;

  useLayoutEffect(() => {
    let started = performance.now();
    const el = root.current!;
    const app = content.current!;
    const $ = (sel: string) => el.querySelector<HTMLElement>(sel)!;
    const $$ = (sel: string) => Array.from(el.querySelectorAll<HTMLElement>(sel));
    let context: gsap.Context | undefined;
    let audio: BootSound | undefined;
    let disposed = false;
    let startTimer: ReturnType<typeof setTimeout>;
    let finish = () => {};
    let dispose = () => {};
    const returning = false;
    const phone = innerWidth <= 600;
    const keep = phone ? 64 : 96;
    const time = BOOT_TIMELINE.full;
    const start = () => {
      if (disposed) return;
      started = performance.now();
      el.classList.remove("is-gated");
      skip.current?.focus({ preventScroll: true });
      try {
        const play = (cue: Parameters<BootSound["play"]>[0]) => audio?.play(cue);
        context = gsap.context(() => {
          const tl = gsap.timeline({ onComplete: () => finish() });
          tl.set(el, { attr: { "data-version": returning ? "short" : "full" } });
          // DOM writes only; screenful-sized tails and cached line heights keep the flood cheap.
          const trim = (feed: HTMLElement) => {
            while (feed.childElementCount > keep) feed.firstElementChild!.remove();
          };
          const scroll = (node: HTMLElement, count: number, lineHeight: number) => {
            node.style.transform = `translateY(-${Math.max(0, (count + 1) * lineHeight - innerHeight + 30)}px)`;
          };
          const type = (target: HTMLElement, full: string, at: number, duration: number) => {
            const proxy = { n: 0 };
            let previous = 0;
            tl.to(proxy, { n: full.length, duration, ease: "none", onUpdate: () => {
              const count = Math.floor(proxy.n);
              if (count === previous) return;
              previous = count;
              target.textContent = full.slice(0, count);
              play("key");
            } }, at);
          };
          if (!returning) {
            const { codeAt, floodAt, kernelAt, logoAt } = BOOT_TIMELINE.full;
            const columns = $$(".boot__code-col").filter((column) => getComputedStyle(column).display !== "none");
            const feeds = columns.map((column) => column.querySelector<HTMLElement>(".boot__code-feed")!);
            const codeHeight = parseFloat(getComputedStyle(columns[0]).lineHeight);
            const appendCode = (feed: HTMLElement, src: string) => {
              const line = document.createElement("div");
              line.textContent = src;
              if (HOT.test(src)) line.className = "is-hot";
              feed.append(line);
              return line;
            };
            // Three actual source lines visibly build character by character before the flood.
            const lineSlot = (floodAt - codeAt) / 3;
            CODE.slice(0, 3).forEach((src, i) => {
              const line = document.createElement("div");
              tl.call(() => { feeds[0].append(line); }, [], codeAt + i * lineSlot);
              if (HOT.test(src)) line.className = "is-hot";
              type(line, src, codeAt + i * lineSlot, lineSlot * 0.94);
            });
            if (columns.length > 1) tl.set(columns.slice(1), { autoAlpha: 1 }, floodAt);
            const code = { n: 3 };
            let poured = 3;
            tl.to(code, { n: Math.min(phone ? 200 : 650, CODE.length), duration: kernelAt - floodAt, ease: "power2.in", onUpdate: () => {
              const count = Math.floor(code.n);
              if (count === poured) return;
              feeds.forEach((feed, c) => {
                for (let i = poured; i < count; i++) appendCode(feed, CODE[(i + c * CODE_OFFSET) % CODE.length]);
                trim(feed);
                scroll(columns[c], feed.childElementCount, codeHeight);
              });
              poured = count;
              play("stream");
            } }, floodAt);
  
            const agent = describeAgent(navigator.userAgent);
            let zone = "UNKNOWN";
            try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || zone; } catch { /* optional */ }
            const env: [Kind, string][] = [
              ["env", `BAND.EXE ${VERSION} · decorative sequence`],
              ["env", `browser: ${agent.browser} · OS: ${agent.os}`],
              ["env", `locale: ${navigator.language} · time zone: ${zone}`],
              ["env", `viewport: ${innerWidth}×${innerHeight} · pixel ratio: ${devicePixelRatio}`],
              ["env", `browser reports: ${navigator.onLine ? "ONLINE" : "OFFLINE"}`],
              ["env", `theme: ${document.documentElement.dataset.theme || "mono"}`],
              ["env", `bundled source: ${SOURCES.length} files · ${CODE.length} nonempty lines`],
            ];
            const kernel = [...env, ...KERNEL.filter(([kind]) => !phone || kind !== "sym")];
            const feed = $(".boot__kernel-feed"), scroller = $(".boot__kernel-scroll");
            const rowHeight = parseFloat(getComputedStyle(feed).lineHeight);
            // Seed the environment rows on entry so the stream never pauses on a blank screen.
            const log = { n: env.length };
            let logged = 0;
            tl.set(".boot__code", { autoAlpha: 0 }, kernelAt)
              .set(".boot__kernel", { autoAlpha: 1 }, kernelAt)
              .to(log, { n: kernel.length, duration: logoAt - kernelAt, ease: "power1.in", onUpdate: () => {
                const count = Math.floor(log.n);
                if (count === logged) return;
                for (; logged < count; logged++) {
                  const [kind, message] = kernel[logged];
                  const row = document.createElement("div");
                  row.className = `k k--${kind}`;
                  for (const value of [stamp((performance.now() - started) / 1000), kind === "ok" ? "[ OK ]" : "", message]) {
                    const cell = document.createElement("span");
                    cell.textContent = value;
                    row.append(cell);
                  }
                  feed.append(row);
                  if (kind === "ok") play("ok");
                }
                trim(feed);
                scroll(scroller, feed.childElementCount, rowHeight);
                play("stream");
              } }, kernelAt)
              .set(".boot__kernel", { autoAlpha: 0 }, logoAt);
          } else tl.set(".boot__code", { autoAlpha: 0 }, 0);
  
          const word = $(".boot__title-word"), text = $(".boot__title-text");
          const setWord = (value: string) => { text.textContent = value; word.dataset.text = value; };
          const noise = (locked: number) => WORD.split("").map((letter, i) => i < locked ? letter : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join("");
          const glitch = (on: boolean) => {
            el.classList.toggle("is-glitching", on);
            if (!on) return;
            const top = Math.random() * 70;
            word.style.setProperty("--g-top", `${top}%`);
            word.style.setProperty("--g-bot", `${Math.max(0, 100 - top - 8 - Math.random() * 25)}%`);
            word.style.setProperty("--g-x", `${(Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 7)}px`);
            play("glitch");
          };
          const scramble = { n: 0 };
          let lastFrame = -1;
          tl.set(".boot__title", { autoAlpha: 1 }, time.logoAt)
            .to(scramble, { n: WORD.length + 3, duration: returning ? 0.4 : 0.85, ease: "none", onUpdate: () => {
              const frame = Math.floor(scramble.n * 4);
              if (frame === lastFrame) return;
              lastFrame = frame;
              const locked = Math.max(0, Math.floor(scramble.n) - 2);
              setWord(noise(locked));
              glitch(locked < WORD.length && frame % 2 === 0);
            }, onComplete: () => { setWord(WORD); glitch(false); } }, time.logoAt)
            .fromTo(".boot__title-sweep", { scaleY: 0, yPercent: -100 }, { scaleY: 1, yPercent: 650, duration: returning ? 0.35 : 0.7, ease: "power1.inOut" }, time.logoAt + 0.1)
            .fromTo(".boot__title-line", { scaleX: 0 }, { scaleX: 1, duration: returning ? 0.2 : 0.45, ease: "power2.out" }, time.logoAt + (returning ? 0.2 : 0.7));
          type($(".boot__title-sub"), "IELTS WRITING TERMINAL", time.logoAt + (returning ? 0.3 : 0.9), returning ? 0.25 : 0.55);
          tl.to(".boot__title-ver", { opacity: 1, duration: 0.2 }, time.logoAt + (returning ? 0.55 : 1.5));
          // Extra late burst, while the subtitle remains legible. Explicit frames synchronize each zap.
          const bursts = returning ? [0.7, 0.9, 1.1] : [1.15, 1.5, 1.65, 2.3, 2.47, 2.65];
          bursts.forEach((offset, i) => {
            tl.call(() => { setWord(noise(WORD.length - 2)); glitch(true); }, [], time.logoAt + offset)
              .set(word, { opacity: i % 2 ? 0.5 : 0.75 }, time.logoAt + offset)
              .call(() => { setWord(WORD); glitch(false); }, [], time.logoAt + offset + 0.055)
              .set(word, { opacity: 1 }, time.logoAt + offset + 0.055);
          });
          const handoffDuration = time.end - time.handoffAt;
          tl.call(() => play("handoff"), [], time.handoffAt)
            .to(".boot__title", { autoAlpha: 0, scale: 1.02, duration: handoffDuration, ease: "power1.in" }, time.handoffAt)
            .to(".boot__backdrop, .boot__controls", { autoAlpha: 0, duration: handoffDuration }, time.handoffAt)
            .to(app, { opacity: 1, duration: handoffDuration, ease: "power1.out" }, time.handoffAt);
        }, el);
      } catch { finish(); }
    };
    try {
      audio = createBootSound({ enabled: bootSoundEnabled(returning) });
      if (!replay || initialBootPhase(audio.state()) === "gate") {
        el.classList.add("is-gated");
        el.focus({ preventScroll: true });
      }
      const boot = beginBoot(() => {
        disposed = true;
        clearTimeout(startTimer);
        audio?.stop();
        context?.revert();
        done.current();
      }, replay, { audioState: audio.state(), waitForKey: true, onUnlock: () => { Promise.resolve(audio?.resume()).catch(() => {}); }, onStart: (gesture) => {
        if (!gesture) { queueMicrotask(start); return; }
        let started = false;
        const ready = () => { if (started || disposed) return; started = true; clearTimeout(startTimer); start(); };
        // A failed/pending resume still yields a silent intro; the app never depends on an audio device.
        startTimer = setTimeout(ready, 600);
        Promise.resolve(audio?.resume()).then(ready, ready);
      } });
      finish = boot.finish;
      dispose = boot.dispose;
      complete.current = finish;
    } catch { done.current(); }
    return () => {
      disposed = true;
      clearTimeout(startTimer);
      dispose();
      audio?.stop();
      context?.revert();
      el.classList.remove("is-glitching");
      $$(".boot__code-feed, .boot__kernel-feed").forEach((node) => node.replaceChildren());
    };
  }, [content, replay]);

  return (
    <div className="boot" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="BAND.EXE decorative intro" aria-describedby="bootNote">
      <div className="boot__backdrop" />
      <div className="boot__gate">
        <span>BAND.EXE v{VERSION}</span>
        <p><span className="cursor-block" aria-hidden="true" /> [ PRESS ANY KEY TO BOOT ]</p>
        <span className="boot__touch">or tap / click anywhere</span>
      </div>
      <div className="boot__code" aria-hidden="true">
        {[0, 1].map((i) => <div className="boot__code-col" key={i}><div className="boot__code-feed" /><span className="cursor-block boot__cursor" /></div>)}
      </div>
      <div className="boot__kernel" aria-hidden="true">
        <div className="boot__kernel-scroll"><div className="boot__kernel-feed" /><span className="cursor-block boot__cursor" /></div>
      </div>
      <div className="boot__title" aria-hidden="true">
        <div className="boot__title-word" data-text={WORD}><span className="boot__title-text">{WORD}</span><span className="boot__title-sweep" /></div>
        <span className="boot__title-line" />
        <span className="boot__title-sub" />
        <span className="boot__title-ver">BUILD {VERSION} · FREE PRACTICE</span>
      </div>
      <div className="boot__controls">
        <span className="boot__note" id="bootNote">Decorative intro.</span>
        <div className="boot__actions">
          <button ref={skip} type="button" className="btn btn--quiet boot__skip" onClick={() => complete.current()}>Skip intro <span aria-hidden="true">↵ / Esc</span></button>
        </div>
        <span className="boot__key-hint" aria-hidden="true">PRESS ANY KEY</span>
      </div>
    </div>
  );
}
