import { useEffect, useRef, useState } from "react";
import { t as ui, translateUI, useUILanguage } from "../lib/i18n";
import { playInteraction } from "../lib/interaction-sound";
import { appliedTheme, motionOK, PANEL_LOOKS, type PanelLook, type Prefs } from "../lib/prefs";
import Select from "./Select";
import { toast } from "../lib/toast";
import { addTestCoins, duplicates, forceNextBand, ODDS, ownsItem, resetCollection, roll, setUnlockAll, TRADE_COST, tradeIn, useCollection, type Machine, type RollResult } from "../lib/collection";
import { BACKGROUNDS, type Background } from "../content/backgrounds";
import { CHARACTERS, type Band, type Character } from "../content/characters";
import { MASCOT_SVG, type MascotId } from "../mascot-art";
import Backdrop from "./Backdrop";
import Header, { type DisplayProps } from "./Header";
import { Coin } from "./Missions";
import "../collection.css";

const HELPERS: [MascotId, string][] = [["coach", "Coach"], ["synonyms", "Synonyms"], ["ideas", "Ideas"]];
const RARITY: Record<Band, string> = { 5: "Common", 6: "Uncommon", 7: "Rare", 8: "Epic", 9: "Legendary" };
const STOP_MS = [700, 1200, 1700], REVEAL_MS = 1950;
// A rare prize makes the last reel hang, then hands over to the cutscene.
const RARE_STOP_MS = [700, 1200, 2700], RARE_REVEAL_MS = 2950;
const CUTSCENE_MS: Record<number, number> = { 8: 3000, 9: 4800 };
const REEL = ["?", 5, 6, 7, 8, 9, "?"];
// Rare backgrounds stay a surprise. Rare characters stay blurred in the gallery, but their preview shows their special move.
const PREVIEW_UP_TO: Band = 7;
const isLocal = () => ["localhost", "127.0.0.1"].includes(location.hostname);

function CharacterFace({ c }: { c: Character }) {
  return <>
    {c.band === 9 && <><span className="rays" /><span className="orbit"><i /><i /><i /><i /></span></>}
    <span className="ccard__art" dangerouslySetInnerHTML={{ __html: c.svg }} />
    <span className="ccard__name">{c.name}</span>
    <span className="ccard__line">{translateUI(c.line)}</span>
  </>;
}

const Lock = () => <svg className="lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" /><path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;

/** A live look at a locked item: the character moving, or the background behind a sample essay box. */
function Preview({ item, prefs, onClose }: { item: Character | Background; prefs: Prefs; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const name = translateUI(item.name);
  return (
    <dialog ref={dialog} className="preview" aria-label={ui("Preview: {value0}", { value0: name })} onClose={onClose}
      onClick={(e) => { if (e.target === dialog.current) dialog.current.close(); }}>
      <div className="frame-head"><h2>{ui("Preview: {value0}", { value0: name })}</h2><span>{ui("Band {value0}", { value0: item.band })} · {translateUI(RARITY[item.band])}</span></div>
      {"svg" in item
        ? <div className="preview__stage preview__stage--character"><div className={`ccard fx${item.band}`}><CharacterFace c={item} /></div></div>
        : <div className="preview__stage" data-theme={appliedTheme({ ...prefs, background: item.id })} data-panels={prefs.panelLook ?? "blur"}>
            <Backdrop id={item.id} preview />
            <div className="preview__panel" lang="en" dir="ltr"><strong>{ui("Your essay")}</strong><p>Museums hold a shared record of human history, so many people believe they should be open to everyone. However, running a museum is expensive.</p></div>
          </div>}
      <div className="preview__foot">
        <span className="mission__hint">{"svg" in item ? ui("Roll ROLL.EXE to get this character.") : ui("Roll SKIN.EXE to get this background.")}</span>
        <button type="button" className="btn btn--sm" onClick={() => dialog.current?.close()}>{ui("Close")}</button>
      </div>
    </dialog>
  );
}

function Prize({ result, prefs, setPrefs }: { result: RollResult; prefs: Prefs; setPrefs: (p: Prefs) => void }) {
  const c = CHARACTERS.find((x) => x.id === result.id), b = BACKGROUNDS.find((x) => x.id === result.id);
  const inUse = c ? prefs.skins?.[c.helper] === c.id : prefs.background === result.id;
  const use = () => setPrefs(c ? { ...prefs, skins: { ...prefs.skins, [c.helper]: c.id } } : { ...prefs, background: result.id });
  return (
    <div className="prize">
      {c && <div className={`ccard fx${c.band}`}><CharacterFace c={c} /></div>}
      {b && <div className={`btile fxb${b.band}`}><span className="btile__view"><Backdrop id={b.id} thumb /></span><span className="btile__name">{translateUI(b.name)}</span></div>}
      <p className="prize__tag"><strong>{ui("Band {value0}", { value0: result.band })} · {translateUI(RARITY[result.band])}</strong> · {result.duplicate ? ui("Duplicate") : ui("New!")}</p>
      <button type="button" className="btn btn--sm" disabled={inUse} onClick={use}>{inUse ? ui("In use") : ui("Use it")}</button>
    </div>
  );
}

/** Full-screen build-up for Band 8 and 9, ending on the prize. Skippable, and never shown with reduced motion. */
function Cutscene({ result, prefs, setPrefs, onClose }: { result: RollResult; prefs: Prefs; setPrefs: (p: Prefs) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [revealed, setRevealed] = useState(false);
  const c = CHARACTERS.find((x) => x.id === result.id);
  useEffect(() => {
    dialog.current?.showModal();
    playInteraction("power");
    const timer = window.setTimeout(() => setRevealed(true), CUTSCENE_MS[result.band]);
    return () => clearTimeout(timer);
  }, [result.band]);
  useEffect(() => { if (revealed) playInteraction("confirm"); }, [revealed]);
  const rarity = `${ui("Band {value0}", { value0: result.band })} · ${translateUI(RARITY[result.band])}`;
  return (
    <dialog ref={dialog} className={`cutscene cutscene--${result.band}`} aria-label={rarity} onClose={onClose}>
      {!revealed
        ? <div className="cutscene__build">
            <p className="cutscene__line">&gt; {ui("Rare signal detected")}</p>
            <p className="cutscene__line cutscene__line--2">&gt; {rarity}</p>
            <div className="cutscene__core" aria-hidden="true">
              <i /><i /><i />
              {c ? <span className="cutscene__shadow" dangerouslySetInnerHTML={{ __html: c.svg }} /> : <span className="cutscene__shadow cutscene__shadow--scene" />}
            </div>
            <button type="button" className="btn btn--sm cutscene__skip" onClick={() => setRevealed(true)}>{ui("Skip")}</button>
          </div>
        : <div className="cutscene__reveal">
            {!c && <Backdrop id={result.id} preview />}
            {c && <span className="cutscene__rays" aria-hidden="true" />}
            <div className="cutscene__prize"><Prize result={result} prefs={prefs} setPrefs={setPrefs} /></div>
            <button type="button" className="btn btn--sm cutscene__close" autoFocus onClick={() => dialog.current?.close()}>{ui("Close")}</button>
          </div>}
    </dialog>
  );
}

function RollMachine({ machine, prefs, setPrefs }: { machine: Machine; prefs: Prefs; setPrefs: (p: Prefs) => void }) {
  const s = useCollection();
  const [reels, setReels] = useState<Band[] | null>(null);
  const [stopped, setStopped] = useState(3);
  const [result, setResult] = useState<RollResult | null>(null);
  const [cutscene, setCutscene] = useState<RollResult | null>(null);
  const [tension, setTension] = useState(false);
  const timers = useRef<number[]>([]);
  const unseen = useRef<RollResult | null>(null);
  // Leaving mid-roll cancels the show, not the prize: say what was won.
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    const got = unseen.current;
    if (got) toast(`${translateUI([...CHARACTERS, ...BACKGROUNDS].find((x) => x.id === got.id)!.name)} · ${ui("Band {value0}", { value0: got.band })}`);
  }, []);
  const spinning = stopped < 3 || (reels !== null && result === null);
  const name = machine === "roll" ? "ROLL.EXE" : "SKIN.EXE";
  const go = () => {
    const got = roll(machine);
    if (!got) return;
    // The first two reels tease with a band no higher than the prize, so the rarest frame lands last.
    const tease = () => ODDS.map(([band]) => band).filter((band) => band <= got.band)[Math.floor(Math.random() * (got.band - 4))];
    setReels([tease(), tease(), got.band]);
    setResult(null);
    const motion = motionOK(prefs), rare = motion && got.band >= 8;
    unseen.current = got;
    const reveal = () => { unseen.current = null; setResult(got); if (rare) setCutscene(got); else playInteraction(got.duplicate ? "confirm" : "accept"); };
    if (!motion) { setStopped(3); reveal(); return; }
    setStopped(0);
    setTension(rare);
    playInteraction("engage");
    timers.current = [
      ...(rare ? RARE_STOP_MS : STOP_MS).map((ms, i) => window.setTimeout(() => { setStopped(i + 1); playInteraction("switch"); }, ms)),
      window.setTimeout(() => { setTension(false); reveal(); }, rare ? RARE_REVEAL_MS : REVEAL_MS),
    ];
  };
  return (
    <section className={"frame machine" + (spinning ? " is-rolling" : "") + (tension ? " is-tense" : "")} aria-labelledby={`m-${machine}`}>
      <div className="frame-head"><h3 id={`m-${machine}`}>{name}</h3><span>{machine === "roll" ? ui("Gives a character") : ui("Gives a background")}</span></div>
      <div className="frame-body machine__body">
        <div className="machine__cabinet" aria-hidden="true">
        <span className="machine__coin"><Coin /></span>
        <span className="machine__lever"><i /></span>
        <div className="machine__screen">
          {[0, 1, 2].map((i) => {
            const shown = reels && (stopped > i) ? reels[i] : null;
            return <div key={i} className={"reel" + (shown ? ` rf${shown}` : "")}>
              {!shown && spinning ? <span className="reel__strip">{REEL.map((v, n) => <b key={n}>{v}</b>)}</span> : <span className={shown ? "reel__land" : ""}>{shown ?? "?"}</span>}
            </div>;
          })}
        </div>
        </div>
        <button type="button" className="btn btn--primary btn--block machine__go" data-sound="engage" disabled={spinning || s.coins < 1} onClick={go}>
          {spinning ? ui("Rolling…") : s.coins < 1 ? ui("Earn a coin to roll") : ui("Roll (1 coin)")}
        </button>
        <div className="machine__tray" role="status">
          {result ? <Prize result={result} prefs={prefs} setPrefs={setPrefs} /> : <span className="mission__hint">{spinning ? "" : ui("Your prize lands here.")}</span>}
        </div>
      </div>
      {cutscene && <Cutscene result={cutscene} prefs={prefs} setPrefs={setPrefs} onClose={() => setCutscene(null)} />}
    </section>
  );
}

export default function Collection({ prefs, setPrefs, ...display }: DisplayProps) {
  useUILanguage();
  const s = useCollection();
  const spare = duplicates(s);
  const look = prefs.panelLook ?? "blur";
  const [previewing, setPreviewing] = useState<Character | Background | null>(null);
  const reset = () => { resetCollection(); setPrefs({ ...prefs, background: undefined, skins: undefined }); };
  return (
    <div className="screen is-active">
      <Header current="collection" prefs={prefs} setPrefs={setPrefs} {...display} />
      <main className="wrap collection" aria-labelledby="collectionTitle">
        <div className="frame-head"><span>{ui("BAND.EXE /")} {ui("Collection")}</span><span>{ui("Looks only. Nothing here changes your marks.")}</span></div>
        <div className="collection__top">
          <h1 id="collectionTitle">{ui("Your collection")}</h1>
          <p className="coinbar"><Coin /><strong>{s.coins === 1 ? ui("1 coin") : ui("{value0} coins", { value0: s.coins })}</strong> <a href="#write">{ui("Earn coins from today's missions")}</a></p>
        </div>

        <div className="machines">
          <RollMachine machine="roll" prefs={prefs} setPrefs={setPrefs} />
          <RollMachine machine="skin" prefs={prefs} setPrefs={setPrefs} />
        </div>
        <ul className="odds" aria-label={ui("Odds")}>
          {ODDS.map(([band, weight]) => <li key={band} className={`rf${band}`}><strong>{ui("Band {value0}", { value0: band })}</strong><span>{translateUI(RARITY[band])} · {weight}%</span></li>)}
        </ul>
        <p className="mission__hint">{ui("Every 10th roll on a machine is at least Band 7. Coins can't be bought.")}</p>
        <div className="trade">
          <span>{ui("Spare copies: {value0}. Trade {value1} for 1 coin.", { value0: spare, value1: TRADE_COST })}</span>
          <button type="button" className="btn btn--sm" disabled={spare < TRADE_COST} onClick={() => { if (tradeIn()) toast(ui("+1 coin")); }}>{ui("Trade in")}</button>
        </div>

        <section aria-labelledby="pickHelpers" className="picker">
          <h2 id="pickHelpers">{ui("Choose your helpers")}</h2>
          <p className="mission__hint">{ui("Tap any locked character to preview it. Rare ones show their special move. Epic and Legendary backgrounds stay hidden until you roll them.")}</p>
          {HELPERS.map(([helper, label]) => {
            const picked = prefs.skins?.[helper];
            const pick = (id?: string) => setPrefs({ ...prefs, skins: { ...prefs.skins, [helper]: id } });
            return (
              <div key={helper} className="picker__group">
                <h3>{translateUI(label)}</h3>
                <div className="grid-cards">
                  <button type="button" className="ccard ccard--classic" aria-pressed={!picked} onClick={() => pick(undefined)}>
                    <span className="ccard__art" dangerouslySetInnerHTML={{ __html: MASCOT_SVG[helper] }} />
                    <span className="ccard__name">{ui("Classic")}</span>
                    <span className="ccard__line">{ui("The original helper.")}</span>
                  </button>
                  {CHARACTERS.filter((c) => c.helper === helper).map((c) => {
                    const owned = ownsItem(s, c.id);
                    return owned
                      ? <button key={c.id} type="button" className={`ccard fx${c.band}`} aria-pressed={picked === c.id} onClick={() => pick(c.id)}><CharacterFace c={c} /></button>
                      : c.band <= PREVIEW_UP_TO
                        ? <button key={c.id} type="button" className={`ccard ccard--locked rf${c.band}`} aria-label={ui("Preview: {value0}", { value0: c.name })} onClick={() => setPreviewing(c)}>
                            <span className="ccard__art" dangerouslySetInnerHTML={{ __html: c.svg }} />
                            <span className="ccard__name"><Lock /> {c.name}</span>
                            <span className="ccard__line">{ui("Band {value0}", { value0: c.band })} · {ui("Preview")}</span>
                          </button>
                        : <button key={c.id} type="button" className={`ccard ccard--locked ccard--sealed rf${c.band}`} aria-label={ui("Preview a hidden Band {value0} character.", { value0: c.band })} onClick={() => setPreviewing(c)}>
                            <span className="ccard__art" dangerouslySetInnerHTML={{ __html: c.svg }} />
                            <span className="seal"><Lock /></span>
                            <span className="ccard__name">???</span>
                            <span className="ccard__line">{ui("Band {value0}", { value0: c.band })} · {ui("Preview")}</span>
                          </button>;
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <section aria-labelledby="pickBackground" className="picker">
          <h2 id="pickBackground">{ui("Choose your background")}</h2>
          <div className="field panel-look">
            <label className="field__label" htmlFor="panelLook">{ui("Panels")}</label>
            <Select id="panelLook" value={look} options={PANEL_LOOKS.map(([value, label]) => ({ value, label: translateUI(label) }))} onChange={(value) => setPrefs({ ...prefs, panelLook: value as PanelLook })} />
          </div>
          <p className="mission__hint">{!prefs.background ? ui("Pick a background first to see this.")
            : look === "blur" ? ui("Your essay box and the other panels are frosted, so the background shows softly through them.")
            : look === "clear" ? ui("Panels are fully clear, so you can see the whole background. Text gets a soft outline to stay readable.")
            : ui("Panels are solid. Choose Blur or See-through to see the background through your essay box.")}</p>
          {appliedTheme(prefs) !== prefs.theme && <p className="mission__hint">{ui("This background sets the page colours so text stays easy to read.")}</p>}
          <div className="grid-tiles">
            <button type="button" className="btile btile--none" aria-pressed={!prefs.background} onClick={() => setPrefs({ ...prefs, background: undefined })}>
              <span className="btile__view" /><span className="btile__name">{ui("No background")}</span>
            </button>
            {BACKGROUNDS.map((b) => {
              if (!ownsItem(s, b.id)) {
                const canPreview = b.band <= PREVIEW_UP_TO;
                return <button key={b.id} type="button" className={`btile rf${b.band} btile--locked` + (canPreview ? "" : " btile--sealed")} disabled={!canPreview}
                  aria-label={canPreview ? ui("Preview: {value0}", { value0: translateUI(b.name) }) : ui("Hidden design, Band {value0}. Roll to reveal it.", { value0: b.band })}
                  onClick={() => setPreviewing(b)}>
                  <span className="btile__view"><Backdrop id={b.id} thumb />{!canPreview && <span className="seal"><Lock /></span>}</span>
                  <span className="btile__name">{canPreview ? <><Lock /> {translateUI(b.name)}</> : "???"}</span>
                  <span className="btile__band">{ui("Band {value0}", { value0: b.band })}{canPreview ? ` · ${ui("Preview")}` : ""}</span>
                </button>;
              }
              return <button key={b.id} type="button" className={`btile rf${b.band}`} aria-pressed={prefs.background === b.id} onClick={() => setPrefs({ ...prefs, background: b.id })}>
                <span className="btile__view"><Backdrop id={b.id} thumb /></span>
                <span className="btile__name">{translateUI(b.name)}</span>
                <span className="btile__band">{ui("Band {value0}", { value0: b.band })}</span>
              </button>;
            })}
          </div>
        </section>

        {isLocal() && (
          <section className="frame test-panel" aria-labelledby="testTitle">
            <div className="frame-head"><h3 id="testTitle">Test controls (only on this computer)</h3></div>
            <div className="frame-body test-panel__row">
              <button type="button" className="btn btn--sm" onClick={() => setUnlockAll(!s.unlockAll)}>{s.unlockAll ? "Lock again" : "Unlock everything"}</button>
              <button type="button" className="btn btn--sm" onClick={() => addTestCoins(5)}>Add 5 coins</button>
              <button type="button" className="btn btn--sm" onClick={() => forceNextBand(8)}>Next roll: Band 8</button>
              <button type="button" className="btn btn--sm" onClick={() => forceNextBand(9)}>Next roll: Band 9</button>
              <button type="button" className="btn btn--sm btn--quiet" onClick={reset}>Reset all</button>
            </div>
          </section>
        )}
      </main>
      {previewing && <Preview key={previewing.id} item={previewing} prefs={prefs} onClose={() => setPreviewing(null)} />}
    </div>
  );
}
