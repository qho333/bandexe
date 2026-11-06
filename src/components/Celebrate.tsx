import { translateUI, t as ui } from "../lib/i18n";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { TASKS, type Task } from "../lib/types";
import { motionOK, type Prefs } from "../lib/prefs";

/** Personal-best burst (GSAP). Only shown when a new valid overall beats the previous best for the same task type. */
export default function Celebrate({ prefs, task, best, onDone }: { prefs: Prefs; task: Task; best: { prev: number; next: number }; onDone: () => void }) {
  const burst = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLParagraphElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const motion = motionOK(prefs);
    const ctx = gsap.context(() => {
      if (!motion || !burst.current) return;
      const chars = ["0", "1", "▓", "✦", "+", "0", "1"];
      for (let i = 0; i < 44; i++) {
        const s = document.createElement("span");
        s.textContent = chars[i % chars.length];
        burst.current.appendChild(s);
        const ang = (i / 44) * Math.PI * 2 + Math.random() * 0.3, r = 120 + Math.random() * 180;
        gsap.fromTo(s, { x: 0, y: 0, opacity: 1 }, { x: Math.cos(ang) * r, y: Math.sin(ang) * r * 0.7, opacity: 0, duration: 1.1 + Math.random() * 0.4, ease: "power3.out" });
      }
      gsap.fromTo(line.current, { opacity: 0.3 }, { opacity: 1, duration: 0.08, repeat: 3, yoyo: true });
    });
    const t = setTimeout(() => done.current(), motion ? 1800 : 2500);
    const key = () => done.current();
    const k = setTimeout(() => document.addEventListener("keydown", key, true), 50);
    return () => { ctx.revert(); clearTimeout(t); clearTimeout(k); document.removeEventListener("keydown", key, true); if (burst.current) burst.current.innerHTML = ""; };
  }, [prefs]);

  return (
    <div className="celebrate" role="status" aria-live="assertive" onClick={() => done.current()}>
      <div className="celebrate__burst" ref={burst} aria-hidden="true" />
      <div className="celebrate__card frame">
        <p className="celebrate__line glowable" ref={line}>{ui(">> NEW PERSONAL BEST +{value0}", { value0: (best.next - best.prev).toFixed(1) })}</p>
        <p className="celebrate__sub">{ui("{value0}: {value1} to {value2}", { value0: translateUI(TASKS[task].chip), value1: best.prev.toFixed(1), value2: best.next.toFixed(1) })}</p>
        <p className="celebrate__sub">{ui("Click or press any key to continue")}</p>
      </div>
    </div>
  );
}
