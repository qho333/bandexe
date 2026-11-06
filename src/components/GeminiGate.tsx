import { t as ui, translateUI } from "../lib/i18n";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { AGE_MESSAGE, geminiAccess, geminiAccessMessage } from "../lib/gemini";
import { getChecker, setChecker } from "../lib/checker";

export function useGeminiAccess() {
  const access = useSyncExternalStore(geminiAccess.subscribe, geminiAccess.getSnapshot, geminiAccess.getSnapshot);
  useEffect(() => {
    void geminiAccess.load().then(() => {
      if (!geminiAccess.getSnapshot().allowed && ["site", "own"].includes(getChecker().mode)) setChecker({ mode: "free" });
    });
  }, []);
  return access;
}

export function AgeConfirmation({ onConfirm, onDevice }: { onConfirm: () => void; onDevice: () => void }) {
  return <div className="device-card side-stack" role="group" data-gemini-confirmation aria-label={ui("Gemini age confirmation")}>
    <p className="gen-note">{translateUI(AGE_MESSAGE)}</p>
    <button className="btn btn--block" onClick={onConfirm}>{ui("I'm 18 or older")}</button>
    <button className="btn btn--quiet btn--block" onClick={onDevice}>{ui("Use Free checker")}</button>
  </div>;
}

export function GeminiGate({ children, onDevice, onConfirm }: { children: ReactNode; onDevice?: () => void; onConfirm?: () => void }) {
  const access = useGeminiAccess();
  const card = useRef<HTMLDivElement>(null);
  const waiting = access.allowed !== true || !access.confirmed;
  const wasWaiting = useRef(waiting);
  useEffect(() => {
    if ((access.allowed === true && waiting) || (wasWaiting.current && !waiting)) card.current?.querySelector<HTMLElement>("input, button")?.focus();
    wasWaiting.current = waiting;
  }, [access.allowed, waiting]);
  return <div ref={card}>
    {access.allowed !== true ? <p className="gen-note" role="status">{translateUI(geminiAccessMessage(access))}</p>
      : !access.confirmed ? <AgeConfirmation onConfirm={() => { geminiAccess.confirmAge(); onConfirm?.(); }} onDevice={() => {
        setChecker({ mode: "free" });
        if (onDevice) onDevice();
        else requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.checker-picker input[value="free"]')?.focus());
      }} /> : children}
  </div>;
}
