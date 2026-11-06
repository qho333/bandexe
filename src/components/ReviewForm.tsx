import { translateError, t as ui, translateUI } from "../lib/i18n";
import { useId, useRef, useState } from "react";
import type { Review } from "../../shared/storage.js";
import { sendReview } from "../lib/reviews";

export default function ReviewForm({ task }: { task: Review["task"] }) {
  const id = useId();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  return <section className="frame review-form" aria-labelledby={`${id}-title`}>
    <div className="frame-head"><h2 id={`${id}-title`}>{ui("Was this report helpful?")}</h2></div>
    <div className="frame-body">
      {sent ? <p role="status">{ui("Thanks — your rating was counted.")}</p> : <form className="side-stack" onSubmit={async (event) => {
        event.preventDefault();
        if (lock.current || !rating) return;
        lock.current = true; setBusy(true); setError("");
        try { await sendReview({ rating, text, public: visible, task }); setSent(true); }
        catch (e) { lock.current = false; setError(e instanceof Error ? e.message : "Feedback is temporarily unavailable. Your report is ready."); }
        finally { setBusy(false); } // Keep the lock after success, even before React replaces the form.
      }}>
        <div className="rating-stars" role="group" aria-label={ui("Report rating")}>
          {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className="btn" aria-label={translateUI(`${n} ${n === 1 ? ui("star") : ui("stars")}`)}
            aria-pressed={rating === n} disabled={busy} onClick={() => setRating(n)}><span aria-hidden="true">{n <= rating ? "★" : "☆"}</span></button>)}
        </div>
        <label htmlFor={`${id}-text`}>{ui("Optional comment")}</label>
        <textarea id={`${id}-text`} maxLength={280} rows={3} value={text} disabled={busy} onChange={(e) => setText(e.target.value)} aria-describedby={`${id}-note ${id}-count`} />
        <p id={`${id}-count`} className="gen-note" aria-live="polite">{text.length}{ui("{value0}/280 characters", { value0: "" })}</p>
        <label className="review-consent"><input type="checkbox" checked={visible} disabled={busy} onChange={(e) => setVisible(e.target.checked)} /> {ui("OK to show my comment publicly (no name is shown)")}</label>
        <p id={`${id}-note`} className="gen-note">{ui("Don't include your name or any personal details.")}</p>
        <div><button type="submit" className="btn" disabled={!rating || busy}>{busy ? ui("Sending…") : ui("Send")}</button></div>
        {error && <p className="form-error" role="alert">{translateError(error)}</p>}
      </form>}
    </div>
  </section>;
}
