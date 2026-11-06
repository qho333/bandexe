import { updateAllowance } from "./allowance";
import { DAILY_LIMITS } from "../../shared/limits.js";
import { DRAFT_KEY } from "./draft";
import { browserId } from "./cloud-request";
import { HISTORY_KEY } from "./history";

export const SIGNED_OUT_EVENT = "bandexe:signed-out";
export const SIGNED_OUT_KEY = "bandexe-signed-out"; // other tabs hear sign-out through this storage key
/** Shared computers: signing out leaves no essay draft or local results behind for the next person. */
export function forgetDevice() {
  for (const key of [DRAFT_KEY, HISTORY_KEY]) { try { localStorage.removeItem(key); } catch { /* blocked storage keeps nothing anyway */ } }
  try { localStorage.setItem(SIGNED_OUT_KEY, String(Date.now())); } catch { /* this tab still forgets */ }
  if (typeof window.dispatchEvent === "function") window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
}

const NAME = "bandexe-first-name";
const EVENT = "bandexe-account-event";
interface AuthState { googleClientId: string | null; signedIn: boolean; firstName: string; revision: number }
let state: AuthState = { googleClientId: null, signedIn: false, firstName: "", revision: 0 };
const listeners = new Set<() => void>();
export const getAuth = () => state;
export const onAuth = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const update = (patch: Partial<AuthState>) => { state = { ...state, ...patch }; listeners.forEach((fn) => fn()); };
export async function accountRequest(path: string, method = "GET", body?: unknown): Promise<Response> {
  return fetch(path, { method, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000),
    headers: { ...(browserId() ? { "X-Browser": browserId()! } : {}), ...(method === "GET" ? {} : { "X-Requested-With": "bandexe", "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
const readName = () => { try { return localStorage.getItem(NAME) || ""; } catch { return ""; } };
function saveName(name: string) { try { if (name) localStorage.setItem(NAME, name); else localStorage.removeItem(NAME); } catch { /* Display is optional. */ } }
function notifyTabs() { try { localStorage.setItem(EVENT, crypto.randomUUID()); } catch { /* This tab still updates. */ } }
export async function refreshAccount() {
  const revision = state.revision;
  try {
    const response = await accountRequest("/api/auth/me");
    if (!response.ok) return;
    const data = await response.json();
    if (revision !== state.revision) return;
    const signedIn = data.signedIn === true;
    if (!signedIn) saveName("");
    update({ signedIn, firstName: signedIn ? readName() : "" });
    updateAllowance({ dailyLimit: data.limit, remainingToday: data.remainingToday });
  } catch { /* Guest mode needs no account service. */ }
}
let loading: Promise<void> | undefined;
export const loadAuth = () => loading ??= (async () => {
  try {
    const response = await accountRequest("/api/auth/config");
    if (!response.ok) return;
    const config = await response.json();
    if (typeof config.googleClientId !== "string" || !config.googleClientId) return;
    update({ googleClientId: config.googleClientId });
    await refreshAccount();
  } catch { /* Feature flag off, including the local fixture server. */ }
})();
export function watchAccount() {
  const changed = (event: StorageEvent) => {
    if (event.key !== EVENT && event.key !== null) return;
    update({ signedIn: false, firstName: "", revision: state.revision + 1 });
    void refreshAccount();
  };
  window.addEventListener("storage", changed);
  return () => window.removeEventListener("storage", changed);
}
export async function signIn(credential: string) {
  const response = await accountRequest("/api/auth/google", "POST", { credential });
  if (!response.ok) throw new Error("Google sign-in could not be completed. Try again.");
  const data = await response.json();
  const firstName = typeof data.firstName === "string" ? data.firstName : "";
  saveName(firstName);
  update({ signedIn: true, firstName, revision: state.revision + 1 });
  updateAllowance({ dailyLimit: DAILY_LIMITS.accountChecksPerDay });
  notifyTabs();
  await refreshAccount();
}
export async function leaveAccount(remove = false) {
  const response = await accountRequest(remove ? "/api/account" : "/api/auth/logout", remove ? "DELETE" : "POST", {});
  if (!response.ok) throw new Error(remove ? "Your account could not be deleted. Try again." : "Sign-out could not be completed. Try again.");
  saveName("");
  forgetDevice();
  update({ signedIn: false, firstName: "", revision: state.revision + 1 });
  updateAllowance({ dailyLimit: DAILY_LIMITS.checksPerDay });
  notifyTabs();
  window.google?.accounts.id.disableAutoSelect();
}

export interface GoogleIdentity {
  initialize(options: { client_id: string; callback: (response: { credential: string }) => void }): void;
  renderButton(element: HTMLElement, options: { theme: "filled_black" | "outline"; text: "signin_with"; size: "large"; shape: "rectangular"; width: number; locale: string }): void;
  disableAutoSelect(): void;
}
declare global { interface Window { google?: { accounts: { id: GoogleIdentity } } } }
let script: Promise<GoogleIdentity> | undefined;
export function loadGoogle(): Promise<GoogleIdentity> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id);
  return script ??= new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = "https://accounts.google.com/gsi/client";
    tag.async = true;
    tag.onload = () => window.google?.accounts.id ? resolve(window.google.accounts.id) : reject(new Error("Google sign-in is unavailable."));
    tag.onerror = () => reject(new Error("Google sign-in could not load. You can continue as a guest."));
    document.head.appendChild(tag);
  });
}
