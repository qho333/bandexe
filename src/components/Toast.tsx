import { translateUI, t as ui } from "../lib/i18n";
import { useEffect, useState } from "react";
import { TOAST_EVENT } from "../lib/toast";

export default function Toast() {
  const [notice, setNotice] = useState<{ message: string; id: number } | null>(null);
  useEffect(() => {
    let sequence = 0;
    const show = (event: Event) => {
      const message = (event as CustomEvent<unknown>).detail;
      if (typeof message === "string") setNotice({ message, id: ++sequence });
    };
    window.addEventListener(TOAST_EVENT, show);
    return () => window.removeEventListener(TOAST_EVENT, show);
  }, []);
  useEffect(() => {
    if (!notice) return;
    let timer = 0;
    const visibility = () => {
      clearTimeout(timer);
      if (!document.hidden) timer = window.setTimeout(() => setNotice(null), 3200);
    };
    visibility(); document.addEventListener("visibilitychange", visibility);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [notice]);
  // The shared polite live region announces once. This visual copy is decorative.
  return notice && <div key={notice.id} className="terminal-toast" aria-hidden="true"><span>{ui("> {value0}", { value0: translateUI(notice.message) })}</span></div>;
}
