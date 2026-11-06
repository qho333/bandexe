import { translateError, t as ui } from "../lib/i18n";
import { useEffect, useState } from "react";
import type { PendingReview } from "../../shared/storage.js";
import { loadPendingReviews, moderateReview } from "../lib/reviews";
import { getTesterMode, onTesterMode } from "../lib/tester";

export default function ModerateReviews() {
  const [tester, setTester] = useState(getTesterMode);
  useEffect(() => onTesterMode(() => setTester(getTesterMode())), []);
  // Unmount the list when the pass is removed, clearing any private comments.
  return tester ? <PendingList /> : null;
}
function PendingList() {
  const [reviews, setReviews] = useState<PendingReview[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    void loadPendingReviews().then((value) => { if (active) { setReviews(value); setError(""); } })
      .catch(() => { if (active) setError("Pending reviews are temporarily unavailable."); });
    return () => { active = false; };
  }, [refresh]);
  async function moderate(id: number, status: "approved" | "hidden") {
    if (busy) return;
    setBusy(true); setError("");
    try { await moderateReview(id, status); setReviews((items) => items?.filter((item) => item.id !== id) || []); }
    catch { setError("That review could not be updated. Please try again."); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="moderateTitle">
    <h2 id="moderateTitle">{ui("Moderate reviews")}</h2>
    <p>{ui("Check for names and personal details before approval. Only comments with public permission can be approved.")}</p>
    <button className="btn btn--sm" disabled={busy} onClick={() => setRefresh((n) => n + 1)}>{ui("Refresh pending reviews")}</button>
    {error && <p className="form-error" role="alert">{translateError(error)}</p>}
    {!reviews && !error && <p role="status">{ui("Loading pending reviews…")}</p>}
    {reviews?.length === 0 && <p role="status">{ui("No pending comments.")}</p>}
    {reviews?.map((review) => <article className="frame moderation-review" key={review.id}>
      <div className="frame-head">{review.rating}/5 · {review.day} · {review.task || ui("No task")} · {review.public === 1 ? ui("Public permission") : ui("Private")}</div>
      <div className="frame-body side-stack">
        <p dir="auto">{review.text}</p>
        <div className="res-actions"><button className="btn btn--sm" disabled={busy || review.public !== 1} onClick={() => { void moderate(review.id, "approved"); }}>{ui("Approve")}</button>
          <button className="btn btn--sm btn--quiet" disabled={busy} onClick={() => { void moderate(review.id, "hidden"); }}>{ui("Hide")}</button></div>
      </div>
    </article>)}
  </section>;
}
