import { translateUI, t as ui } from "../lib/i18n";
import { useEffect, useState } from "react";
import { formatCount, loadStats } from "../lib/stats";
export default function Footer() {
  const [totals, setTotals] = useState("");
  useEffect(() => {
    let active = true;
    const update = () => { void loadStats().then((stats) => {
      if (active && stats.available) setTotals(`${formatCount(stats.visits)} visits · ${formatCount(stats.essays)} essays marked`);
    }).catch(() => { /* Quiet optional footer; Stats explains an outage. */ }); };
    update(); const timer = setInterval(update, 300000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <footer className="app-footer"><span>{ui("BAND.EXE · Free writing practice")}</span>
    {totals && <a href="#stats">{translateUI(totals)}</a>}
    <nav aria-label={ui("About BAND.EXE")}><a href="#stats">{ui("Stats")}</a><a href="#about">{ui("About & contributors")}</a><a href="#privacy">{ui("Privacy & terms")}</a></nav>
  </footer>;
}
