import { translateError, t as ui } from "../lib/i18n";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getAuth, leaveAccount, onAuth } from "../lib/auth";

export default function AccountChip() {
  const auth = useSyncExternalStore(onAuth, getAuth, getAuth);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape" && !confirm) { setOpen(false); trigger.current?.focus(); }
      } else if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", close); };
  }, [open, confirm]);
  useEffect(() => {
    if (!confirm) return;
    const panel = dialog.current;
    panel?.showModal();
    return () => panel?.close();
  }, [confirm]);
  const leave = async (remove: boolean) => {
    setBusy(true); setError("");
    try { await leaveAccount(remove); setConfirm(false); setOpen(false); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  if (!auth.signedIn) return null;
  return (
    <div className="fx account-chip" ref={root} onBlur={(e) => { if (!confirm && !e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <button className="btn btn--sm btn--quiet" type="button" ref={trigger} aria-expanded={open} onClick={() => setOpen(!open)}>
        {auth.firstName ? ui("Hi, {name}", { name: auth.firstName }) : ui("Hi, student")}
      </button>
      {open && <div className="fx-panel account-panel">
        <p className="hint">{ui("15 free checks a day")}</p>
        <button className="btn btn--sm btn--quiet" disabled={busy} onClick={() => void leave(false)}>{busy ? ui("Working…") : ui("Sign out")}</button>
        <button className="btn btn--sm btn--quiet" disabled={busy} onClick={() => { setError(""); setConfirm(true); }}>{ui("Delete my account")}</button>
        {error && !confirm && <p role="status">{translateError(error)}</p>}
      </div>}
      {confirm && <dialog ref={dialog} className="account-dialog frame" aria-label={ui("Delete my account")} onCancel={(e) => { if (busy) e.preventDefault(); else setConfirm(false); }} onClose={() => setConfirm(false)}>
        <div className="frame-head"><h2>{ui("Delete my account?")}</h2></div>
        <div className="frame-body">
          <p>{ui("This permanently deletes your account, synced scores and practice priorities. You will be signed out on every device. Today’s allowance records remain until routine pruning; a minimal session revocation record remains for 31 days.")}</p>
          <p>{ui("Your browser’s local history and draft stay here. You can clear them in Overview.")}</p>
          {error && <p role="alert">{translateError(error)}</p>}
          <div className="account-dialog__actions">
            <button className="btn" autoFocus disabled={busy} onClick={() => setConfirm(false)}>{ui("Keep my account")}</button>
            <button className="btn btn--primary" disabled={busy} onClick={() => void leave(true)}>{busy ? ui("Deleting…") : ui("Delete my account")}</button>
          </div>
        </div>
      </dialog>}
    </div>
  );
}
