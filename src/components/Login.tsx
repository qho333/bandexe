import { translateError, t as ui, useUILanguage } from "../lib/i18n";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getAuth, onAuth, loadGoogle, signIn } from "../lib/auth";
import { loadPrefs, motionOK, type Prefs } from "../lib/prefs";
import { watchGoogleButton } from "../lib/google-button";
import LanguagePicker from "./LanguagePicker";
import { OWNER } from "../content/contributors";

let initialized: string | undefined;
let credentialCallback: (credential: string) => void = () => {};

/** Guest practice remains available throughout loading, animation and authentication. */
export default function Login({ active, onGuest, prefs = loadPrefs(), setPrefs = () => {} }: { active: boolean; onGuest: () => void; prefs?: Prefs; setPrefs?: (prefs: Prefs) => void }) {
  const language = useUILanguage();
  const auth = useSyncExternalStore(onAuth, getAuth, getAuth);
  const button = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [granted, setGranted] = useState(false);
  const busyRef = useRef(false);
  const operation = useRef(0);
  const continueRef = useRef(onGuest);
  const latest = useRef({ active, prefs });
  latest.current = { active, prefs };
  continueRef.current = onGuest;
  const confirmation = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flicker = useRef<Animation | null>(null);
  useEffect(() => {
    if (!active) { clearTimeout(confirmation.current); setBusy(false); setGranted(false); busyRef.current = false; }
    return () => { ++operation.current; clearTimeout(confirmation.current); flicker.current?.cancel(); };
  }, [active]);
  useEffect(() => { if (!motionOK(prefs)) flicker.current?.cancel(); }, [prefs]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) flicker.current?.pause(); else if (flicker.current?.playState === "paused") flicker.current.play(); };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    let mounted = true;
    credentialCallback = (credential) => {
      if (!latest.current.active || busyRef.current) return;
      const attempt = ++operation.current;
      busyRef.current = true; setBusy(true); setError("");
      void signIn(credential).then(() => {
        if (!mounted || !latest.current.active || attempt !== operation.current) return;
        setGranted(true);
        if (!motionOK(latest.current.prefs)) continueRef.current();
        else confirmation.current = setTimeout(() => continueRef.current(), 260);
      }).catch((e: Error) => { if (mounted && latest.current.active && attempt === operation.current) { setError(e.message); setBusy(false); busyRef.current = false; } });
    };
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (!active || !auth.googleClientId || auth.signedIn) return;
    let cancelled = false;
    setLoading(true); setError("");
    const host = button.current;
    if (!host) return;
    let stopWatching: (() => void) | undefined;
    let loaded = false;
    const failure = () => { if (!cancelled) { setLoading(false); setError("Google sign-in could not load. You can continue as a guest."); } };
    // A script that is blocked without an error event must not leave an endless skeleton.
    const timeout = setTimeout(() => { if (!cancelled && !loaded) { setLoading(false); setError("Google sign-in could not load. You can continue as a guest."); } }, 10000);
    void loadGoogle().then((identity) => {
      if (cancelled) return;
      loaded = true;
      const google = identity;
      clearTimeout(timeout); setError("");
      if (initialized !== auth.googleClientId) {
        google.initialize({ client_id: auth.googleClientId!, callback: ({ credential }) => credentialCallback(credential) });
        initialized = auth.googleClientId!;
      }
      stopWatching = watchGoogleButton(host, google, prefs.theme, language, () => setLoading(false), failure);
    }).catch(failure);
    return () => { cancelled = true; clearTimeout(timeout); stopWatching?.(); host.replaceChildren(); };
  }, [active, auth.googleClientId, auth.signedIn, prefs.theme, language]);

  const react = () => {
    if (motionOK(prefs) && prefs.mascots === "on") window.dispatchEvent(new Event("bandexe:login-react"));
  };
  const switchLanguage = () => {
    react();
    flicker.current?.cancel();
    if (motionOK(prefs)) flicker.current = card.current?.animate?.([
      { opacity: 1, transform: "translateX(0)" }, { opacity: 0.72, transform: "translateX(1px)" }, { opacity: 1, transform: "translateX(0)" },
    ], { duration: 180, easing: "steps(3)" }) ?? null;
  };
  return (
    <main className={"screen" + (active ? " is-active" : "")} aria-labelledby="loginTitle">
      <div className="login">
        <section className="login__intro" data-boot-panel="WORKSPACE">
          <h1 id="loginTitle"><span>{ui("Practise IELTS writing.")}</span> <span>{ui("Understand what to improve next.")}</span><i className="login__cursor" aria-hidden="true" /></h1>
          <p>{ui("Write a Task 1 or Task 2 answer under exam timing, get an AI practice estimate with corrections you can check, and track your results for each task type.")}</p>
          <ul className="login__facts">
            <li>{auth.googleClientId ? ui("Free to use. Sign in to sync your progress and get more checks.") : ui("Free to use. An account will only save your history.")}</li>
            <li>{ui("Scores are AI practice estimates, not official IELTS bands.")}</li>
            <li>{ui("Guests can check essays; results stay in this browser.")}</li>
            <li>{ui("The Free checker sends writing to the site’s open-model providers. Your own Gemini key is an optional choice for adults.")}</li>
          </ul>
          <aside className="login__owner" aria-labelledby="ownerTitle">
            <h2 id="ownerTitle">{ui("Meet the owner")}</h2>
            <p>{ui("{name} is the owner of BAND.EXE: a first-year college student at SUA, from Vietnam. He'd love your support on his journey.", { name: OWNER.name })}</p>
            <a className="btn btn--sm login__owner-link" href={OWNER.linkedin} target="_blank" rel="noopener noreferrer">{ui("Support him on LinkedIn")} <span aria-hidden="true">↗</span></a>
          </aside>
        </section>
        <section ref={card} className="frame login__card" data-boot-panel="CHECK" aria-labelledby="authTitle" onPointerEnter={react}>
          <div className="login__language"><LanguagePicker prefs={prefs} setPrefs={setPrefs} onPick={switchLanguage} /></div>
          <div className="frame-head"><h2 id="authTitle">{ui("Sign in")}</h2>{!auth.googleClientId && <span className="ex-badge">{ui("Coming soon")}</span>}</div>
          <div className="frame-body">
            <p className="login__title">{ui("You can practise without an account.")}</p>
            {auth.googleClientId ? <>
              <p>{ui("Sign in to save your progress across devices and get 15 free checks a day (guests get 10). We store your scores and practice priorities — never your essays, name or email.")}</p>
              {auth.signedIn && !busy ? <><p className="auth-status">{auth.firstName ? ui("Hi, {name}.", { name: auth.firstName }) : ui("You’re signed in.")}</p><button className="btn btn--primary btn--block" onClick={onGuest}>{ui("Continue to writing")}</button></>
                : <div className="google-frame" aria-busy={loading || busy}>
                  <div ref={button} className="google-sign-in" aria-label={ui("Sign in with Google")} inert={busy} />
                  {loading && <span className="google-skeleton" role="status">{ui("Loading Google sign-in…")}</span>}
                </div>}
              {(busy || error) && <p className="auth-status" role="status">{granted ? ui("ACCESS GRANTED · Opening writing…") : busy ? ui("Signing in…") : translateError(error)}</p>}
            </> : <p className="auth-status" role="status">{ui("Sign-in is coming soon. Your draft and practice history stay in this browser. Continue as a guest to write and check now.")}</p>}
            <button className="btn btn--primary btn--block" type="button" onClick={onGuest}>{ui("Continue as guest")}</button>
            <a href="#privacy">{ui("Privacy & terms — what happens to my essay?")}</a>
          </div>
        </section>
      </div>
    </main>
  );
}
