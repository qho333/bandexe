import { t as ui, translateUI, getUILanguage } from "../lib/i18n";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getAuth, onAuth } from "../lib/auth";
import { fetchHistory, mergeHistory } from "../lib/account-history";
import { useTerminalReveals } from "../lib/motion";
import { motionOK } from "../lib/prefs";
import Header, { type DisplayProps } from "./Header";
import { CRITS, TASKS, type Crit, type Task } from "../lib/types";
import type { HistoryEntry } from "../lib/history";
import {
  CRIT_SHORT, chooseNextStep, criterionTrends, hasOverall, practiceRhythm, recurringDifficulties, signed, summarize,
  type CritTrend, type Rhythm,
} from "../lib/progress";
import { helperArt } from "../lib/prefs";
import "../overview.css";
import { watchLocalDate } from "../lib/local-date";

interface Props extends DisplayProps { revealsEnabled?: boolean; active: boolean; history: HistoryEntry[]; onDelete: (alsoDraft: boolean) => void; onClearDraft: () => void }

const day = (iso: string) => new Date(iso).toLocaleDateString(getUILanguage(), { day: "numeric", month: "short" });
const longDay = (d: Date) => d.toLocaleDateString(getUILanguage(), { weekday: "long", day: "numeric", month: "long" });
const plural = (n: number, one: string, many = one + "s") => `${n} ${translateUI(n === 1 ? one : many)}`;

const critName = (c: Crit, task: Task): string => ({
  tr: task === "t2" ? "Task Response" : "Task Achievement",
  cc: "Coherence and Cohesion",
  lr: "Lexical Resource",
  gra: "Grammatical Range and Accuracy",
})[c];

export default function Overview(props: Props) {
  const { active, onDelete, onClearDraft, prefs } = props;
  const auth = useSyncExternalStore(onAuth, getAuth, getAuth);
  const [remote, setRemote] = useState<{ revision: number; entries: HistoryEntry[] } | null>(null);
  const [syncError, setSyncError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!active || !auth.signedIn) return;
    let cancelled = false;
    setSyncError("");
    void fetchHistory().then((entries) => { if (!cancelled) setRemote({ revision: auth.revision, entries }); })
      .catch((e: Error) => { if (!cancelled) setSyncError(e.message); });
    return () => { cancelled = true; };
  }, [active, auth.signedIn, auth.revision, reload]);
  const history = useMemo(() => mergeHistory(props.history, auth.signedIn && remote?.revision === auth.revision ? remote.entries : []), [props.history, remote, auth.signedIn, auth.revision]);
  const [task, setTask] = useState<Task>(() => history.at(-1)?.task ?? "t2");
  const list = useMemo(() => history.filter((h) => h.task === task), [history, task]);
  const t = TASKS[task];
  const root = useRef<HTMLElement>(null);

  const summary = useMemo(() => summarize(list), [list]);
  const trends = useMemo(() => criterionTrends(list), [list]);
  const difficulties = useMemo(() => recurringDifficulties(list), [list]);
  const next = useMemo(() => chooseNextStep(list, difficulties, trends), [list, difficulties, trends]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { if (active) return watchLocalDate(setNow); }, [active]);
  const rhythm = useMemo(() => practiceRhythm(history, now), [history, now]);
  const latest = list.at(-1);
  useTerminalReveals(root, motionOK(prefs) && props.revealsEnabled !== false, active, task + history.length);


  return (
    <div className={"screen" + (active ? " is-active" : "")}>
      <Header current="overview" {...props} />
      <main className="wrap ov" aria-labelledby="dashTitle" ref={root}>
        <div className="dash-head">
          <div>
            <h1 id="dashTitle">{ui("Your practice overview")}</h1>
            <p>{ui("Built only from your own reviewed results,")} {auth.signedIn ? ui("merged from this browser and your synced progress") : ui("saved in this browser")}{ui(". Bands are AI practice estimates, not official IELTS scores.")}</p>
            {syncError && auth.signedIn && <p role="status">{translateUI(syncError)} <button className="btn btn--sm btn--quiet" onClick={() => setReload((n) => n + 1)}>{ui("Try sync again")}</button></p>}
          </div>
          {history.length > 0 && (
            <div className="seg" role="group" aria-label={ui("Task type")}>
              {(Object.keys(TASKS) as Task[]).map((k) => (
                <button key={k} aria-pressed={k === task} onClick={() => setTask(k)}>{translateUI(TASKS[k].chip)} ({history.filter((h) => h.task === k).length})</button>
              ))}
            </div>
          )}
        </div>

        {history.length === 0 ? (
          <section className="frame ov-anim" aria-labelledby="emptyTitle">
            <div className="empty">
              <div className="empty__art mascot-zone"><span dangerouslySetInnerHTML={{ __html: helperArt("coach", prefs).replace('class="mascot"', 'class="mascot mascot--lg"') }} /><span className="ex-badge">{ui("Draft mascot")}</span></div>
              <div>
                <h2 id="emptyTitle">{ui("Nothing to show yet")}</h2>
                <p>{ui("This page fills in from your own checked answers: your band estimates over time, the four criteria, problems that keep coming back and how often you practise. You have not checked an answer in this browser yet, so there is no history to show.")}</p>
                <div className="res-actions"><a className="btn btn--primary" href="#write">{ui("Write your first answer")}</a></div>
              </div>
            </div>
          </section>
        ) : list.length === 0 ? (
          <section className="frame ov-anim" aria-labelledby="emptyTitle">
            <div className="frame-body ov-none">
              <h2 id="emptyTitle">{ui("No {value0} checked yet", { value0: translateUI(t.label) })}</h2>
              <p>{ui("Each task type is tracked separately, so your other results are not mixed in here. Check a {value0} answer and it will appear on this tab.", { value0: translateUI(t.chip) })}</p>
              <div><a className="btn btn--primary" href="#write">{ui("Write a {value0} answer", { value0: translateUI(t.chip) })}</a></div>
            </div>
          </section>
        ) : (
          <>
            <SummaryStrip summary={summary} />

            <div className="ov-row">
              <section className="frame ov-anim" aria-labelledby="chartTitle">
                <div className="frame-head"><h2 id="chartTitle">{ui("{value0} estimates over time", { value0: translateUI(t.chip) })}</h2><span>{plural(summary.banded, "estimate")}</span></div>
                <div className="frame-body">
                  <Chart list={list} />
                  <div className="chart-legend">
                    <span className="lg"><i className="lg-line" />{ui("Overall estimate")}</span>
                    {list.some((h) => hasOverall(h) && h.range) && <span className="lg"><i className="lg-band" />{ui("Likely range")}</span>}
                    {summary.checks > summary.banded && <span>{plural(summary.checks - summary.banded, "result")} {ui("without an overall estimate")} {summary.checks - summary.banded === 1 ? ui("is") : ui("are")} {ui("not plotted")}</span>}
                  </div>
                  <details className="table-toggle"><summary>{ui("Show as table")}</summary>
                    <div className="ov-table-wrap">
                      <table className="data-table">
                        <thead><tr><th>{ui("Date")}</th><th>{ui("Estimate")}</th><th>{ui("Range")}</th>{CRITS.map((c) => <th key={c}>{c.toUpperCase()}</th>)}<th>{ui("Words")}</th></tr></thead>
                        <tbody>{list.slice().reverse().map((h) => (
                          <tr key={h.id}><td>{day(h.date)}</td><td>{h.feedbackOnly ? ui("Feedback only") : h.overall?.toFixed(1) ?? ui("Withheld")}</td><td>{h.range ? ui("{from} to {to}", { from: h.range.lo.toFixed(1), to: h.range.hi.toFixed(1) }) : "–"}</td>
                            {CRITS.map((c) => <td key={c}>{h.bands[c] ?? "–"}</td>)}<td>{h.words}</td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </details>
                </div>
              </section>

              <section className="frame ov-anim ov-next" aria-labelledby="nextTitle">
                <div className="frame-head"><h2 id="nextTitle">{ui("Next step")}</h2><span>{translateUI(t.chip)}</span></div>
                <div className="frame-body">
                  {next ? (
                    <>
                      <p className="ov-kicker">{ui("Focus on this in your next answer")}</p>
                      <h3 className="ov-next__focus">{translateUI(next.focus)}</h3>
                      <ul className="ov-why">{next.reasons.map((r) => <li key={r}>{translateUI(r)}</li>)}</ul>
                      <a className="btn btn--primary" href="#write">{ui("Practise this")}</a>
                    </>
                  ) : <p className="muted">{ui("Your saved results have no priorities or criterion bands yet, so there is nothing specific to suggest.")}</p>}
                  {latest && latest.priorities.length > 0 && (
                    <div className="ov-latest">
                      <p className="ov-kicker">{ui("Latest check · {value0}", { value0: day(latest.date) })}</p>
                      <ol className="ov-latest__list">{latest.priorities.map((p, i) => <li key={i}>{p}</li>)}</ol>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="ov-row3">
              <section className="frame ov-anim" aria-labelledby="critTitle">
                <div className="frame-head"><h2 id="critTitle">{ui("Criterion trends")}</h2><span>{ui("AI estimates")}</span></div>
                <div className="frame-body">
                  <ul className="ov-crits">{trends.map((tr) => <CritRow key={tr.crit} trend={tr} task={task} />)}</ul>
                  <p className="ov-note">{ui("Change is against your previous {value0} result. Practice estimates can move by half a band between similar answers.", { value0: translateUI(t.chip) })}</p>
                </div>
              </section>

              <section className="frame ov-anim" aria-labelledby="recurTitle">
                <div className="frame-head"><h2 id="recurTitle">{ui("Keeps coming up")}</h2><span>{ui("last {value0}", { value0: plural(Math.min(list.length, 6), "check") })}</span></div>
                <div className="frame-body">
                  {difficulties.length ? (
                    <ol className="ov-recur">{difficulties.map((d) => (
                      <li key={d.label}>
                        <span className="ov-recur__label">{d.label}</span>
                        <span className="ov-recur__meta">
                          <span>{ui("came up in {value0} of your last {value1} checks", { value0: d.count, value1: d.window })}</span>
                          <span className="ov-hits" aria-hidden="true" title={ui("Oldest to newest check")}>{d.hits.map((hit, i) => <i key={i} className={hit ? "is-on" : ""} />)}</span>
                        </span>
                      </li>
                    ))}</ol>
                  ) : (
                    <p className="muted">{list.length < 2
                      ? ui("This needs at least two checks. After your next one, any priority that repeats will show here.")
                      : ui("No priority has repeated across your recent checks.")}</p>
                  )}
                </div>
              </section>

              <section className="frame ov-anim" aria-labelledby="rhythmTitle">
                <div className="frame-head"><h2 id="rhythmTitle">{ui("Practice rhythm")}</h2><span>{ui("all task types")}</span></div>
                <div className="frame-body"><RhythmGrid rhythm={rhythm} /></div>
              </section>
            </div>
          </>
        )}

        <div className="res-actions dash-foot">
          {history.length > 0 && (
            <>
              <button className="btn btn--sm btn--quiet" onClick={() => {
                if (window.confirm(ui("Delete all saved results from this browser? This cannot be undone."))) onDelete(window.confirm(ui("Also clear the saved draft (question and essay)? OK clears it, Cancel keeps it.")));
              }}>{ui("Delete history")}</button>
              <span className="hint">{ui("Removes every saved result (all task types) from this browser.")}</span>
            </>
          )}
          <button className="btn btn--sm btn--quiet" onClick={() => { if (window.confirm(ui("Clear the saved draft (question and essay) from this browser?"))) onClearDraft(); }}>{ui("Clear draft")}</button>
          <span className="hint">{ui("Removes the question and essay kept in this browser.")}</span>
        </div>
      </main>
    </div>
  );
}

function SummaryStrip({ summary: s }: { summary: ReturnType<typeof summarize> }) {
  const extra = [s.feedbackOnly ? `${s.feedbackOnly} ${ui("Feedback only")}` : "", s.withheld ? `${s.withheld} ${ui("Withheld")}` : ""].filter(Boolean).join(", ");
  return (
    <dl className="ov-stats ov-anim" aria-label={ui("Summary")}>
      <div className="ov-stat">
        <dt>{ui("Latest estimate")}</dt>
        <dd className="ov-stat__v">{s.latest ? s.latest.value.toFixed(1) : "–"}</dd>
        <dd className="ov-stat__s">{s.latest ? day(s.latest.date) : ui("No overall estimate yet")}</dd>
      </div>
      <div className="ov-stat">
        <dt>{ui("Best")}</dt>
        <dd className="ov-stat__v">{s.best ? s.best.value.toFixed(1) : "–"}</dd>
        <dd className="ov-stat__s">{s.best ? day(s.best.date) : ui("No overall estimate yet")}</dd>
      </div>
      <div className="ov-stat">
        <dt>{ui("Change")}</dt>
        <dd className="ov-stat__v">{s.change !== null ? signed(s.change) : "–"}</dd>
        <dd className="ov-stat__s">{s.change !== null && s.first ? ui("Since {value0}", { value0: day(s.first.date) }) : ui("Needs two estimates")}</dd>
      </div>
      <div className="ov-stat">
        <dt>{ui("Checks")}</dt>
        <dd className="ov-stat__v">{s.checks}</dd>
        <dd className="ov-stat__s">{extra || (s.checks === 1 ? ui("1 with a band") : ui("{count} with a band", { count: s.checks }))}</dd>
      </div>
    </dl>
  );
}

function CritRow({ trend, task }: { trend: CritTrend; task: Task }) {
  const { crit, points, latest, delta, direction } = trend;
  const dir = direction === "up" ? `▲ ${signed(delta!)}` : direction === "down" ? `▼ ${signed(delta!)}` : direction === "flat" ? `= ${ui("same as last time")}` : points.length === 1 ? `1 ${ui("result")}` : "";
  const said = direction === "up" ? ui("Up {count} from last time", { count: delta }) : direction === "down" ? ui("Down {count} from last time", { count: Math.abs(delta!) }) : direction === "flat" ? "same as last time" : "";
  return (
    <li className="ov-crit" aria-label={latest === null ? `${translateUI(critName(crit, task))}: ${ui("Withheld")}` : `${translateUI(critName(crit, task))}: ${latest}${said ? ", " + said : ""}`}>
      <span className="ov-crit__name"><b>{translateUI(CRIT_SHORT[crit])}</b><span>{translateUI(critName(crit, task))}</span></span>
      <Spark points={points.map((p) => p.value)} />
      <span className="ov-crit__v">{latest ?? "–"}</span>
      <span className={"ov-crit__d" + (direction ? " is-" + direction : "")}>{translateUI(dir)}</span>
    </li>
  );
}

function Spark({ points }: { points: number[] }) {
  const W = 96, H = 28, P = 3;
  if (!points.length) return <svg className="ov-spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><line className="ov-spark__base" x1={P} y1={H / 2} x2={W - P} y2={H / 2} /></svg>;
  const lo = Math.min(4, ...points), hi = Math.max(8, ...points);
  const x = (i: number) => (points.length === 1 ? W - P : P + i * ((W - 2 * P) / (points.length - 1)));
  const y = (v: number) => P + (1 - (v - lo) / (hi - lo)) * (H - 2 * P);
  return (
    <svg className="ov-spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <line className="ov-spark__base" x1={P} y1={y(6)} x2={W - P} y2={y(6)} />
      {points.length > 1 && <polyline className="ov-spark__line" points={points.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />}
      <circle className="ov-spark__pt" cx={x(points.length - 1)} cy={y(points.at(-1)!)} r="2.5" />
    </svg>
  );
}

function RhythmGrid({ rhythm }: { rhythm: Rhythm }) {
  const heads = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(getUILanguage(), { weekday: "narrow" }).format(new Date(2024, 0, i + 1)));
  return (
    <div className="ov-rhythm">
      <div className="ov-rhythm__nums">
        <div><b>{rhythm.streak}</b><span>{ui("day streak")}</span></div>
        <div><b>{rhythm.activeDays}</b><span>{rhythm.activeDays === 1 ? ui("day") : ui("days")} {ui("practised in 5 weeks")}</span></div>
      </div>
      <div className="ov-days" role="img" aria-label={ui("{checks} checks on {days} days in the last 5 weeks. Current streak: {streak} days.", { checks: rhythm.checks, days: rhythm.activeDays, streak: rhythm.streak })}>
        {heads.map((h, i) => <span key={"h" + i} className="ov-days__h" aria-hidden="true">{h}</span>)}
        {rhythm.weeks.flat().map((d) => (
          <span key={d.key} aria-hidden="true" title={d.future ? undefined : `${longDay(d.date)}: ${plural(d.count, "check")}`}
            className={"ov-day" + (d.count ? " is-on" : "") + (d.count > 1 ? " is-multi" : "") + (d.today ? " is-today" : "") + (d.future ? " is-future" : "")} />
        ))}
      </div>
      <p className="ov-note">{rhythm.streak === 0
        ? (rhythm.activeDays ? ui("No check today or yesterday. One answer today starts a new streak.") : ui("No checks in the last 5 weeks."))
        : rhythm.weeks.flat().some((d) => d.today && d.count)
          ? ui("A filled square is a day with at least one check. Brighter squares had more than one.")
          : ui("Your streak counts up to yesterday. A check today keeps it going.")}</p>
    </div>
  );
}

function Chart({ list }: { list: HistoryEntry[] }) {
  const H = list.filter(hasOverall).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (!H.length) return <p className="muted ov-chart-none">{ui("No overall estimates to plot yet. Feedback-only and withheld results still count in the summary and the lists on this page.")}</p>;
  const W = 640, Ht = 240, L = 40, R = 16, T = 20, B = 32;
  const lo = Math.max(0, Math.min(4, ...H.map((h) => h.range?.lo ?? h.overall!)) );
  const hi = Math.min(9, Math.max(8, ...H.map((h) => h.range?.hi ?? h.overall!)));
  const x = (i: number) => (H.length === 1 ? (L + W - R) / 2 : L + 28 + i * ((W - L - R - 56) / (H.length - 1)));
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (Ht - T - B);
  const ticks: number[] = [];
  for (let v = Math.ceil(lo); v <= hi; v++) ticks.push(v);
  // Range bands only where a range exists: one polygon per run of consecutive ranged points.
  const runs: number[][] = [];
  H.forEach((h, i) => { if (h.range) { const last = runs.at(-1); if (last && last.at(-1) === i - 1) last.push(i); else runs.push([i]); } });
  const labelEvery = Math.ceil(H.length / 5); // dates stay readable when the chart is phone-width
  const showValues = H.length <= 8;
  return (
    <svg className="chart ov-chart" viewBox={`0 0 ${W} ${Ht}`} role="img"
      aria-label={ui("{count} overall estimates, from {from} on {start} to {to} on {end}", { count: H.length, from: H[0].overall!.toFixed(1), start: day(H[0].date), to: H.at(-1)!.overall!.toFixed(1), end: day(H.at(-1)!.date) })}>
      {ticks.map((v) => (
        <g key={v}><line className="grid-l" x1={L} y1={y(v)} x2={W - R} y2={y(v)} /><text className="axis-t" x={L - 10} y={y(v) + 4} textAnchor="end">{v}</text></g>
      ))}
      {runs.map((run) => run.length > 1
        ? <polygon key={run[0]} className="band-area" points={[...run.map((i) => `${x(i)},${y(H[i].range!.hi)}`), ...run.slice().reverse().map((i) => `${x(i)},${y(H[i].range!.lo)}`)].join(" ")} />
        : <rect key={run[0]} className="band-area" x={x(run[0]) - 8} y={y(H[run[0]].range!.hi)} width="16" height={Math.max(2, y(H[run[0]].range!.lo) - y(H[run[0]].range!.hi))} />)}
      {H.length > 1 && <polyline className="line" points={H.map((d, i) => `${x(i)},${y(d.overall!)}`).join(" ")} />}
      {H.map((d, i) => (
        <g key={d.id}>
          <circle className="pt" cx={x(i)} cy={y(d.overall!)} r="4" />
          {showValues && <text className="pt-t" x={x(i)} y={y(d.range ? Math.max(d.range.hi, d.overall!) : d.overall!) - 9} textAnchor="middle">{d.overall!.toFixed(1)}</text>}
          {((i % labelEvery === 0 && H.length - 1 - i >= labelEvery) || i === H.length - 1) && <text className="axis-t" x={x(i)} y={Ht - 10} textAnchor="middle">{day(d.date)}</text>}
        </g>
      ))}
    </svg>
  );
}
