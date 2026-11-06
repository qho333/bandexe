import { announce } from "./announce";
export const TOAST_EVENT = "bandexe:toast";
export function toast(message: string) {
  announce(message);
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
}
