// Prototype only: mounts the live site's own <Boot> over the speaking mockup, so the intro is identical.
import { createRoot } from "react-dom/client";
import { useRef, useState, useLayoutEffect } from "react";
import Boot from "../../src/components/Boot";
import { consumeSkipBoot, skipNextBoot } from "../../src/lib/boot";
import { CHARACTERS } from "../../src/content/characters";
import { loadPrefs } from "../../src/lib/prefs";
import "../../src/mascot-moves.css";

// The coach skin applied in Collection is also Echo's look (app.js gives it a talking mouth).
declare global { interface Window { wearSkin?: (svg: string) => boolean } }
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reducedMotion) document.documentElement.classList.add("motion-ok");   // lets Band 8-9 skins play their special move
const coachSkin = CHARACTERS.find((c) => c.helper === "coach" && c.id === loadPrefs().skins?.coach);
if (coachSkin) window.wearSkin?.(coachSkin.svg);

// Move the page's existing content into one element Boot can fade in, like the app's workspace.
const app = document.createElement("div");
app.id = "speaking-app";
while (document.body.firstChild) app.appendChild(document.body.firstChild);
document.body.appendChild(app);
const host = document.createElement("div");
document.body.appendChild(host);

function Intro() {
  const content = useRef<HTMLDivElement | null>(app as HTMLDivElement);
  const [on, setOn] = useState(() => !consumeSkipBoot() && !matchMedia("(prefers-reduced-motion: reduce)").matches);
  useLayoutEffect(() => { if (!on) app.style.opacity = "1"; }, [on]);
  return on ? <Boot content={content} onDone={() => setOn(false)} /> : null;
}
// Links back to Writing skip its intro too.
document.querySelectorAll<HTMLAnchorElement>('a[href="/"]').forEach((a) => a.addEventListener("click", skipNextBoot));
createRoot(host).render(<Intro />);
