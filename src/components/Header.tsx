import { t as ui, translateUI } from "../lib/i18n";
import Select from "./Select";
import LanguagePicker from "./LanguagePicker";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getTesterMode, leaveTesterMode, onTesterMode } from "../lib/tester";
import type { Screen } from "../lib/types";
import type { AppScreen } from "../lib/routes";
import { PANEL_LOOKS, THEMES, appliedTheme, motionOK, systemReduced, type PanelLook, type Prefs, type Theme } from "../lib/prefs";

import { CheckerPicker } from "./Checker";
import AccountChip from "./AccountChip";
import { getAuth, onAuth } from "../lib/auth";
import { useCollection } from "../lib/collection";
import { Coin } from "./Missions";

export interface DisplayProps { prefs: Prefs; setPrefs: (p: Prefs) => void; onReplayBoot: () => void }

const FX: [keyof Prefs, string][] = [
  ["scanlines", "Scanlines"], ["glow", "Glow"], ["boot", "Boot intro"], ["sound", "Sound"], ["typingSounds", "Typing sounds"], ["mascots", "Running mascots"], ["reduced", "Reduced motion"]
];

export function DisplayMenu({ prefs, setPrefs, onReplayBoot }: DisplayProps) {
  const auth = useSyncExternalStore(onAuth, getAuth, getAuth);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if ((e.target as Element)?.closest?.("dialog[open]")) return;
        if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); }
      } else if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", close); };
  }, [open]);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);
  return (
    <div className="fx" ref={ref} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <button ref={trigger} className="btn btn--sm btn--quiet" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="head-display-label">{ui("Display")}</span><span className="head-menu-label">{ui("Menu")}</span>
      </button>
      {open && (
        <div className="fx-panel">
          <div className="head-menu-actions">
            {auth.signedIn ? <AccountChip /> : <a href="#login" className="btn btn--quiet head-menu-sign-in" onClick={() => setOpen(false)}>{ui("Sign in")}</a>}
            <TesterChip />
          </div>
          <label className="field"><span className="field__label">{ui("Theme")}</span>
            <Select sound="power" value={prefs.theme} options={THEMES.map(([value, label]) => ({ value, label: translateUI(label) }))} onChange={(value) => setPrefs({ ...prefs, theme: value as Theme })} />
            {appliedTheme(prefs) !== prefs.theme && <span className="hint">{ui("This background sets the page colours so text stays easy to read.")}</span>}
          </label>
          <label className="field"><span className="field__label">{ui("Panels")}</span>
            <Select value={prefs.panelLook ?? "blur"} options={PANEL_LOOKS.map(([value, label]) => ({ value, label: translateUI(label) }))} onChange={(value) => setPrefs({ ...prefs, panelLook: value as PanelLook })} />
          </label>
          <a className="btn btn--sm btn--quiet" href="#collection" onClick={() => setOpen(false)}>{ui("Characters and backgrounds")}</a>
          <LanguagePicker prefs={prefs} setPrefs={setPrefs} />
          <CheckerPicker />
          <a className="btn btn--sm btn--quiet" href="#write" onClick={() => setOpen(false)}>{ui("Checker setup")}</a>
          {FX.map(([k, label]) => {
            const forced = k === "reduced" && systemReduced();
            return (
              <label key={k} title={forced ? ui("Your system asks for reduced motion") : undefined}>
                <input type="checkbox" checked={forced || prefs[k] === "on"} disabled={forced}
                  onChange={(e) => setPrefs({ ...prefs, [k]: e.target.checked ? "on" : "off" })} /> {translateUI(label)}
              </label>
            );
          })}
          <button className="btn btn--sm btn--quiet" disabled={prefs.boot !== "on" || !motionOK(prefs)} onClick={() => { setOpen(false); onReplayBoot(); }}>{ui("Replay intro")}</button>
        </div>
      )}
    </div>
  );
}

export function TesterChip() {
  const active = useSyncExternalStore(onTesterMode, getTesterMode, getTesterMode);
  return active ? <span className="tester-chip">{ui("Tester mode")} <button type="button" className="btn btn--sm btn--quiet" onClick={leaveTesterMode}>{ui("Leave")}</button></span> : null;
}

function CoinCount() {
  const { coins } = useCollection();
  return <a className="head-coins" href="#collection" aria-label={coins === 1 ? ui("1 coin") : ui("{value0} coins", { value0: coins })}><Coin /><span>{coins}</span></a>;
}

export default function Header({ current, ...display }: DisplayProps & { current: AppScreen }) {
  const auth = useSyncExternalStore(onAuth, getAuth, getAuth);
  const nav: [Screen | "collection", string][] = [["write", "Write"], ["results", "Results"], ["overview", "Overview"], ["collection", "Collection"]];
  return (
    <header className="app-head">
      <span className="brand">BAND<span>.EXE</span></span>
      <TesterChip />
      <nav className="app-nav" aria-label={ui("Main")} data-current={current}>
        {nav.map(([s, l]) => <a key={s} href={"#" + s} aria-current={s === current ? "page" : undefined}>{translateUI(l)}</a>)}
      </nav>
      <div className="app-head__end">
        <CoinCount />
        {!auth.signedIn && <span className="hide-sm" title={ui("Guest: your draft and results are saved in this browser")}>{ui("Guest")}</span>}
        <DisplayMenu {...display} />
        {auth.signedIn ? <div className="head-account"><AccountChip /></div> : <a href="#login" className="btn btn--sm btn--quiet head-sign-in">{ui("Sign in")}</a>}
      </div>
    </header>
  );
}
