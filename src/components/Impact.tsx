import { t as ui, getUILanguage } from "../lib/i18n";
import type { Stats } from "../../shared/storage.js";
import { countryName, formatCount } from "../lib/stats";

export default function Impact({ stats }: { stats: Stats }) {
  // Cached responses from an older deployment may still contain only session totals.
  const ratings = stats.ratings || { count: 0, average: 0, fourPlus: 0 };
  return <section aria-labelledby="impactTitle">
    <h2 id="impactTitle">{ui("Impact")}</h2>
    <p>{stats.since ? ui("Since {value0}", { value0: stats.since }) : ui("No counts recorded yet.")}</p>
    <div className="impact-grid">
      <p><strong className="impact-count">{formatCount(stats.browsers || 0)}</strong> {ui("people visited (unique browsers)")}</p>
      <p><strong className="impact-count">{formatCount(stats.students || 0)}</strong> {ui("students got feedback")}</p>
      <p><strong className="impact-count">{formatCount(stats.essays)}</strong> {ui("essays marked")}</p>
      <p><strong className="impact-count">{formatCount(stats.countries || 0)}</strong> {ui("countries")}</p>
      <p><strong className="impact-count">★ {ratings.count ? ratings.average.toFixed(1) : "—"}</strong> {ratings.count ? ui("Average from {count} ratings ({percent}% rated 4–5)", { count: formatCount(ratings.count), percent: ratings.fourPlus }) : ui("No ratings yet. Rate a report to be the first.")}</p>
    </div>
    <p className="gen-note">{ui("Counted without cookies or accounts: a browser is counted once (cleared storage or a new device counts again); countries come from Cloudflare's connection data; reviews are shown only after approval.")}</p>
    <p className="gen-note">{ui("Students are browsers that opened a scored report. Unique counts started with impact tracking; earlier sessions cannot be deduplicated. These are browser counts, not verified individual people.")}</p>
    {!!stats.topCountries?.length && <p>{ui("Top countries: {value0}", { value0: stats.topCountries.map(({ code, n }) => `${countryName(code, getUILanguage())} (${formatCount(n)})`).join(" · ") })}</p>}
    {!!stats.reviews?.length && <div className="review-quotes" aria-label={ui("Approved student reviews")}>
      {stats.reviews.map((review, i) => <figure className="frame" key={`${review.day}-${i}`}>
        <blockquote className="frame-body"><p dir="auto">“{review.text}”</p></blockquote>
        <figcaption className="frame-head">{review.rating}/5 · {review.day}{review.task ? ` · ${review.task.toUpperCase()}` : ""}</figcaption>
      </figure>)}
    </div>}
  </section>;
}
