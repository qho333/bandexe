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
    {/* Crawlable links to the English guide pages: the static home fallback is replaced once the app mounts. */}
    <nav aria-label="IELTS guides" lang="en"><a href="/ielts-writing-checker/">IELTS writing checker</a><a href="/ielts-task-2-checker/">Task 2 checker</a><a href="/ielts-task-1-checker/">Task 1 checker</a><a href="/ielts-writing-band-descriptors/">Band descriptors</a><a href="/ielts-speaking-practice/">Speaking practice</a></nav>
  </footer>;
}
