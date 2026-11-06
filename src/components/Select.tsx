import { useEffect, useId, useRef, useState } from "react";
import { playInteraction } from "../lib/interaction-sound";

export type SelectOption = { value: string; label: string; lang?: string };

/** Keyboard target for an open list. null means the key does not move the highlight. */
export function nextIndex(key: string, active: number, count: number) {
  if (key === "ArrowDown") return Math.min(active + 1, count - 1);
  if (key === "ArrowUp") return Math.max(active - 1, 0);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

export function typeaheadIndex(labels: string[], typed: string, from: number) {
  const text = typed.toLowerCase();
  for (let step = 1; step <= labels.length; step++) {
    const i = (from + step) % labels.length;
    if (labels[i].toLowerCase().startsWith(text)) return i;
  }
  return -1;
}

const CLOSE_MS = 130;
const motionOn = () => document.documentElement.classList.contains("motion-ok") && matchMedia("(prefers-reduced-motion: no-preference)").matches;

// Same cue and screen flicker the native theme select gave on change.
const powerCue = () => {
  playInteraction("power");
  if (!motionOn()) return;
  const root = document.documentElement;
  root.classList.remove("is-power-cycling"); void root.offsetWidth; root.classList.add("is-power-cycling");
  // A hidden tab never finishes the animation, so its end event alone could leave the class stuck.
  window.setTimeout(() => root.classList.remove("is-power-cycling"), 300);
};

// Native selects cannot animate open. Focus stays on the button (aria-activedescendant), so dialogs' focus rules still hold.
export default function Select({ id, value, options, onChange, sound }: { id?: string; value: string; options: SelectOption[]; onChange: (value: string) => void; sound?: "power" }) {
  const [state, setState] = useState<"closed" | "open" | "closing">("closed");
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState({ top: 0, left: 0, width: 0, maxHeight: 320, up: false });
  const button = useRef<HTMLButtonElement>(null), list = useRef<HTMLUListElement>(null), timer = useRef(0);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();
  const selected = Math.max(0, options.findIndex((o) => o.value === value));
  const shown = state !== "closed";

  const open = () => {
    clearTimeout(timer.current);
    const box = button.current!.getBoundingClientRect(), gap = 4, margin = 8;
    const below = innerHeight - box.bottom - gap - margin, above = box.top - gap - margin;
    const wanted = Math.min(320, options.length * 40 + 2), up = below < wanted && above > below;
    setPlace({ top: up ? 0 : box.bottom + gap, left: box.left, width: box.width, maxHeight: Math.min(wanted, up ? above : below), up });
    setActive(selected);
    setState("open");
  };
  const close = () => {
    if (state !== "open") return;
    if (!motionOn()) { setState("closed"); return; }
    setState("closing");
    timer.current = window.setTimeout(() => setState("closed"), CLOSE_MS);
  };
  const pick = (index: number) => {
    const option = options[index];
    if (option && option.value !== value) { if (sound) powerCue(); onChange(option.value); }
    close();
  };

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const el = list.current;
    if (!shown || !el) return;
    // Top layer: never clipped by a drawer's overflow or moved by a screen transition.
    if (!el.matches(":popover-open")) el.showPopover();
    if (place.up) el.style.top = `${button.current!.getBoundingClientRect().top - 4 - el.offsetHeight}px`;
    return () => { if (el.matches(":popover-open")) el.hidePopover(); };
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (state !== "open") return;
    list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, state]);
  useEffect(() => {
    if (state !== "open") return;
    const outside = (e: Event) => { const t = e.target as Node; if (!button.current?.contains(t) && !list.current?.contains(t)) close(); };
    const moved = (e: Event) => { if (!list.current?.contains(e.target as Node)) close(); };
    document.addEventListener("pointerdown", outside, true);
    addEventListener("scroll", moved, true); addEventListener("resize", moved);
    return () => { document.removeEventListener("pointerdown", outside, true); removeEventListener("scroll", moved, true); removeEventListener("resize", moved); };
  });

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (state !== "open") {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); open(); }
      return;
    }
    const next = nextIndex(e.key, active, options.length);
    if (next !== null) { e.preventDefault(); setActive(next); return; }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(active); return; }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; } // Close the list, not the surrounding drawer.
    if (e.key === "Tab") { close(); return; }
    if (e.key.length === 1) {
      const now = Date.now(), text = (now - typed.current.at < 600 ? typed.current.text : "") + e.key;
      typed.current = { text, at: now };
      const found = typeaheadIndex(options.map((o) => o.label), text, text.length > 1 ? active - 1 : active);
      if (found >= 0) setActive(found);
    }
  };

  return <span className="select-box" data-state={state}>
    <button ref={button} id={id} type="button" className="select select-box__button" role="combobox" aria-haspopup="listbox" aria-expanded={state === "open"}
      aria-controls={shown ? listId : undefined} aria-activedescendant={state === "open" ? `${listId}-${active}` : undefined}
      onClick={() => (state === "open" ? close() : open())} onKeyDown={onKeyDown}>
      <span className="select-box__value" lang={options[selected]?.lang}>{options[selected]?.label}</span>
      <svg className="select-box__chevron" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" /></svg>
    </button>
    {shown && <ul ref={list} id={listId} popover="manual" role="listbox" className={"select-box__list" + (place.up ? " is-up" : "")} data-state={state}
      style={{ top: place.top, left: place.left, width: place.width, maxHeight: place.maxHeight }}>
      {options.map((o, i) => <li key={o.value} id={`${listId}-${i}`} role="option" lang={o.lang} aria-selected={i === selected}
        className={"select-box__option" + (i === active ? " is-active" : "")} style={{ "--i": Math.min(i, 8) } as React.CSSProperties}
        onPointerDown={(e) => e.preventDefault()} onPointerEnter={() => setActive(i)}
        onClick={(e) => { e.preventDefault(); pick(i); }}>{o.label}</li>)}
    </ul>}
  </span>;
}
