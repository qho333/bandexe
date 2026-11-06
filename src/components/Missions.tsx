import { t as ui } from "../lib/i18n";
import { DAILY_COINS, MISSIONS, REVIEWS_NEEDED, useCollection, type Mission } from "../lib/collection";

const TEXT: Record<Mission, [string, string]> = {
  mark: ["Mark one essay", "Meet the word minimum, then press Evaluate."],
  timed: ["Write under exam time", "Start the timer and finish before it ends."],
  learn: ["Learn from your feedback", "Review 3 corrections in your report."],
};

export function Coin() {
  return <svg className="coin" viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="14" cy="14" r="12" /><path d="M14 8v12M10 11l4-3" /></svg>;
}

export default function Missions() {
  const s = useCollection();
  const paid = Math.min(s.done.length, DAILY_COINS);
  return (
    <div className="missions">
      <div className="missions__head"><strong>{ui("Today's missions")}</strong><span className="missions__count"><Coin />{ui("{value0} / {value1} coins", { value0: paid, value1: DAILY_COINS })}</span></div>
      <ul className="missions__list">
        {MISSIONS.map((m) => {
          const done = s.done.includes(m), order = s.done.indexOf(m);
          return (
            <li key={m} className="mission" data-done={done || undefined}>
              <span className="mission__box" aria-hidden="true">{done ? "✓" : ""}</span>
              <div>
                <div className="mission__name">{ui(TEXT[m][0] as "Mark one essay")}<span className="sr-only"> {done ? ui("Done.") : ""}</span></div>
                <div className="mission__hint">{done ? (order < DAILY_COINS ? ui("Done. +1 coin.") : ui("Done.")) : ui(TEXT[m][1] as "Meet the word minimum, then press Evaluate.")}{!done && m === "learn" && s.reviewed > 0 ? ` (${s.reviewed}/${REVIEWS_NEEDED})` : ""}</div>
              </div>
            </li>
          );
        })}
      </ul>
      {paid >= DAILY_COINS && <p className="mission__hint missions__limit">{ui("That's today's 2 coins. New missions at midnight UTC.")}</p>}
      {s.coins > 0
        ? <a className="btn btn--block missions__roll" href="#collection">{s.coins === 1 ? ui("Roll (1 coin)") : ui("Roll ({value0} coins saved)", { value0: s.coins })}</a>
        : <button type="button" className="btn btn--block missions__roll" disabled>{ui("Earn a coin to roll")}</button>}
    </div>
  );
}
