import { translateUI, t as ui, useUILanguage } from "../lib/i18n";
import { useEffect, useState } from "react";
import Header, { type DisplayProps } from "./Header";
import PageSections from "./PageSections";
import { formatCount, loadStats, sparkline } from "../lib/stats";
import Impact from "./Impact";
import ModerateReviews from "./ModerateReviews";
import type { Stats } from "../../shared/storage.js";

export default function PublicPage({ kind, ...props }: DisplayProps & { kind: "about" | "stats" }) {
  const language = useUILanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (kind !== "stats") return;
    let active = true;
    void loadStats().then((data) => { if (active) setStats(data); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [kind]);
  return <div className="screen is-active">
    <Header current={kind} {...props} />
    <main className="wrap privacy public-page" aria-labelledby="publicTitle">
      <div className="frame-head"><span>{ui("BAND.EXE /")} {kind === "about" ? ui("About") : ui("Public stats")}</span><span>{ui("Free writing practice")}</span></div>
      <h1 id="publicTitle">{kind === "about" ? ui("Practice with a clearer next step.") : ui("Small steps, counted together.")}</h1>
      {kind === "about" ? <>
        <PageSections kind="about" language={language} />
      </> : <>
        <p>{ui("Public aggregates only. Visits are browser tab sessions; daily visitors are approximated by session counts, not distinct people. No cookies, IPs or personal data are stored in these counters. Totals refresh every five minutes.")}</p>
        {!stats && <p role="status">{failed ? ui("Stats are temporarily unavailable. Your writing workspace is ready.") : ui("Loading totals…")}</p>}
        {stats && !stats.available && <p role="status">{ui("Counting is not configured yet. The checker still works.")}</p>}
        {stats?.available && <>
          <Impact stats={stats} />
          <p className="public-totals">{ui("{value0} visits · {value1} essays marked", { value0: formatCount(stats.visits), value1: formatCount(stats.essays) })}</p>
          <section lang={language}><h2>{ui("Last 30 days")}</h2>
            {(["visits", "essays"] as const).map((metric) => <figure className="stats-chart" key={metric}><figcaption>{metric === "visits" ? ui("Visits / approximate daily visitors") : ui("Essays marked")}</figcaption>
              <svg viewBox="0 0 600 110" role="img" aria-label={translateUI(ui("{metric} in the last 30 UTC days; daily totals in the table below", { metric: metric === "visits" ? ui("Visits / visitors") : ui("Essays") }))}><polyline points={sparkline(stats.days.map((day) => day[metric]))} /></svg>
            </figure>)}
            <div className="stats-table"><table><caption>{ui("Daily totals (UTC)")}</caption><thead><tr><th scope="col">{ui("Day")}</th><th scope="col">{ui("Visits / visitors")}</th><th scope="col">{ui("Essays")}</th></tr></thead><tbody>{stats.days.map((day) => <tr key={day.day}><th scope="row">{day.day}</th><td>{formatCount(day.visits)}</td><td>{formatCount(day.essays)}</td></tr>)}</tbody></table></div>
          </section>
        </>}
        <ModerateReviews />
      </>}
      <a className="btn" href="#write">{ui("Back to the editor")}</a>
    </main>
  </div>;
}
