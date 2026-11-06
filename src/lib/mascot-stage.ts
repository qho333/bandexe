import { playInteraction } from "./interaction-sound";
import gsap from "gsap";
import {
  areMeeting, canPlay, dragBounds, gutterClimb, idleRemaining, isDoublePoke, isDrag, isSleepTime,
  nextPlay, playGap, reactionTransition, settleDrop, type AppReaction, type PlayKind,
} from "./mascot-play";

export interface MascotStage {
  hover: (i: number, clientX?: number) => void;
  stop: (i: number) => void;
  hold: (reason: string, on: boolean) => void;
  think: (i: number, on: boolean) => void;
  click: (i: number, keyboard: boolean) => boolean;
  move: (direction: -1 | 1) => void;
  place: (clientX?: number) => void;
  destroy: () => void;
}
interface Options {
  track: HTMLElement; lane: HTMLElement; buttons: HTMLButtonElement[];
  occupied: () => boolean; typing: () => boolean; tucked: () => boolean;
}

/** One imperative stage owns every tween, timer and listener. React never renders animation frames. */
export function createMascotStage({ track, lane, buttons: btns, occupied, typing, tucked }: Options): MascotStage {
  const query = <T extends Element>(b: Element, s: string) => b.querySelector<T>(s)!;
  const bodies = btns.map((b) => query<HTMLElement>(b, ".mascot-runner__body"));
  const arts = btns.map((b) => query<HTMLElement>(b, ".mascot-runner__art"));
  const eyes = btns.map((b) => query<SVGElement>(b, ".m-eyes"));
  const hands = btns.map((b) => [...b.querySelectorAll<SVGElement>(".m-hand")]);
  const feet = btns.map((b) => [...b.querySelectorAll<SVGElement>(".m-foot")]);
  const dots = btns.map((b) => [...b.querySelectorAll<HTMLElement>(".mascot-think i")]);
  const ball = query<HTMLElement>(track, ".mascot-ball");
  const confetti = [...track.querySelectorAll<HTMLElement>(".mascot-confetti i")];
  const live = new Set<gsap.core.Animation>();
  const holds = new Set<string>();
  const listeners: (() => void)[] = [];
  let scene: gsap.core.Timeline | null = null;
  let next: gsap.core.Tween | null = null;
  let idleTimer: gsap.core.Tween | null = null;
  let sleepTimer: gsap.core.Tween | null = null;
  let previous: PlayKind | null = null;
  let lastActivity = performance.now();
  let lastLook = 0;
  let sleeping = false;
  let appState = { scanning: false, report: false };
  let pendingCheer = false;
  let lastCheer = -Infinity;
  let selected = 0;
  let suppressClick = -1;
  let suppressUntil = 0;
  const pokes: (number | null)[] = btns.map(() => null);
  const accents = new Map<number, gsap.core.Timeline>();
  const thinking = new Map<number, gsap.core.Timeline>();
  let drag: { i: number; pointer: number; startX: number; startY: number; x: number; y: number; moved: boolean } | null = null;
  const width = () => btns[0].offsetWidth;
  const laneWidth = () => lane.clientWidth;
  const x = (i: number) => Number(gsap.getProperty(btns[i], "x")) || 0;
  const y = (i: number) => Number(gsap.getProperty(btns[i], "y")) || 0;
  const elevated = () => btns.some((_, i) => y(i) < -1 || x(i) < 0 || x(i) > laneWidth() - width());
  const headroom = () => Math.max(0, lane.clientHeight - btns[0].offsetHeight - 7);
  const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
  const on = (el: EventTarget, event: string, callback: EventListener, options?: AddEventListenerOptions) => {
    el.addEventListener(event, callback, options);
    listeners.push(() => el.removeEventListener(event, callback, options));
  };
  const add = <A extends gsap.core.Animation>(a: A): A => {
    live.add(a); if (holds.size) a.pause(); return a;
  };
  const kill = (a: gsap.core.Animation | null | undefined) => { if (a) { a.kill(); live.delete(a); } };
  const timeline = () => {
    const tl = gsap.timeline({ onComplete: () => live.delete(tl) });
    return add(tl);
  };
  const homePositions = () => settleDrop(btns.map((_, i) => x(i)), 0, x(0), width(), laneWidth());
  const normalize = () => {
    const xs = homePositions();
    btns.forEach((b, i) => gsap.set(b, { x: xs[i], y: 0, rotation: 0, scale: 1 }));
    gsap.set(bodies, { y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
    gsap.set(arts, { y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
    gsap.set([...hands.flat(), ...feet.flat()], { x: 0, y: 0, rotation: 0 });
    gsap.set(ball, { scale: 0 });
    gsap.set(confetti, { scale: 0 });
    track.classList.remove("is-playing", "is-climbing");
    btns.forEach((b) => b.classList.remove("is-dizzy"));
  };
  const interrupt = (preserve = false) => {
    const positions = preserve ? btns.map((_, i) => ({ x: x(i), y: y(i) + (Number(gsap.getProperty(bodies[i], "y")) || 0) })) : null;
    kill(scene); scene = null;
    accents.forEach(kill); accents.clear();
    normalize();
    if (positions) btns.forEach((b, i) => gsap.set(b, positions[i]));
  };
  const allowed = () => canPlay({ held: !!holds.size, occupied: occupied(), scanning: appState.scanning, sleeping, dragging: !!drag });
  const face = (i: number, target: number) => gsap.set(arts[i], { scaleX: target < x(i) ? -1 : 1 });
  const hop = (tl: gsap.core.Timeline, i: number, at: number, height = 16, spin = 0) => {
    tl.to(bodies[i], { y: -Math.min(height, headroom()), rotation: spin, duration: 0.22, ease: "power2.out" }, at)
      .to(bodies[i], { y: 0, rotation: 0, duration: 0.24, ease: "power2.in" }, at + 0.22)
      .to(bodies[i], { scaleX: 1.15, scaleY: 0.8, duration: 0.09 }, at + 0.46)
      .to(bodies[i], { scaleX: 1, scaleY: 1, duration: 0.2, ease: "back.out(2)" }, at + 0.55);
  };
  const highFive = (tl: gsap.core.Timeline, a: number, b: number, at: number) => {
    face(a, x(b)); face(b, x(a));
    tl.to(hands[a][1], { rotation: -125, duration: 0.18 }, at)
      .to(hands[b][1], { rotation: -125, duration: 0.18 }, at)
      .to([hands[a][1], hands[b][1]], { rotation: 0, duration: 0.25 }, at + 0.5);
    hop(tl, a, at + 0.08, 10); hop(tl, b, at + 0.08, 10);
  };
  const reactToLanding = (i: number, tl: gsap.core.Timeline) => {
    btns.forEach((_, j) => {
      if (i === j) return;
      face(j, x(i));
      if (areMeeting({ x: x(i), y: 0 }, { x: x(j), y: 0 }, width())) highFive(tl, i, j, 0.36);
      else hop(tl, j, 0.18 + j * 0.1, 7);
    });
  };
  const drop = (i: number, desired: number) => {
    const xs = settleDrop(btns.map((_, j) => x(j)), i, desired, width(), laneWidth());
    const tl = timeline(); scene = tl;
    btns.forEach((b, j) => tl.to(b, { x: xs[j], y: 0, duration: 0.28, ease: "power2.out" }, 0));
    tl.to(bodies[i], { rotation: 0, scaleX: 1.2, scaleY: 0.7, duration: 0.12 }, 0.24)
      .to(bodies[i], { scaleX: 1, scaleY: 1, duration: 0.32, ease: "elastic.out(1, 0.5)" }, 0.36)
      .call(() => reactToLanding(i, tl), [], 0.3);
    tl.eventCallback("onComplete", () => {
      live.delete(tl);
      if (scene === tl) { normalize(); scene = null; }
    });
  };

  const scheduleSleep = () => {
    kill(sleepTimer);
    sleepTimer = add(gsap.delayedCall(idleRemaining(performance.now(), lastActivity) / 1000, () => {
      live.delete(sleepTimer!);
      if (isSleepTime(performance.now(), lastActivity) && !occupied() && !appState.scanning && !drag) {
        interrupt(); sleeping = true; track.classList.add("is-sleeping");
        gsap.set(eyes, { scaleY: 0.15 });
        gsap.set(bodies, { rotation: (i: number) => i % 2 ? 8 : -8, scaleY: 0.9 });
      } else {
        // An open panel or scan must not create a zero-delay polling loop after two minutes.
        lastActivity = performance.now(); scheduleSleep();
      }
    }));
  };
  const wake = () => {
    lastActivity = performance.now();
    if (sleeping) {
      sleeping = false; track.classList.remove("is-sleeping");
      gsap.set(eyes, { scaleY: 1 }); gsap.set(bodies, { rotation: 0, scaleY: 1 });
    }
    scheduleSleep();
  };
  const cancelDrag = (land: boolean) => {
    if (!drag) return;
    const { i, pointer, moved } = drag; drag = null;
    if (moved) { suppressClick = i; suppressUntil = performance.now() + 500; }
    if (btns[i].hasPointerCapture(pointer)) btns[i].releasePointerCapture(pointer);
    btns[i].classList.remove("is-dragging");
    if (land && moved && !holds.size) { playInteraction("hop"); drop(i, x(i)); }
    else if (!land) normalize();
  };
  const cheer = () => {
    // Dispatch and DOM fallback may arrive in adjacent tasks. One burst per report transition.
    if (performance.now() - lastCheer < 800) return;
    if (holds.size) { pendingCheer = true; return; }
    lastCheer = performance.now(); pendingCheer = false; wake(); interrupt();
    const tl = timeline(); scene = tl;
    btns.forEach((_, i) => hop(tl, i, i * 0.12, 23, i % 2 ? -12 : 12));
    const laneRect = lane.getBoundingClientRect(), dockRect = track.getBoundingClientRect();
    confetti.forEach((c, i) => {
      const bot = i % btns.length;
      const cx = laneRect.left - dockRect.left + x(bot) + width() / 2;
      // Confetti is confined to the dock; it never sprays across the essay.
      const destX = Math.max(4, Math.min(track.clientWidth - 8, cx + rand(-35, 35)));
      tl.set(c, { x: cx, y: 0, rotation: 0, scale: 0 }, 0)
        .to(c, { x: destX, y: -rand(12, Math.min(34, headroom() + 8)), rotation: rand(-150, 150), scale: 1, duration: 0.42, ease: "power2.out" }, 0.14 + bot * 0.12)
        .to(c, { y: 8, scale: 0, rotation: "+=90", duration: 0.55, ease: "power2.in" }, 0.56 + bot * 0.12);
    });
  };
  const scanPose = (on: boolean) => {
    cancelDrag(false); interrupt(); wake(); track.classList.toggle("is-scanning", on);
    if (on) pendingCheer = false;
    if (on) {
      // Arms cover the eyes; the nervous pose is still when typing or the tab is hidden.
      gsap.set(hands.flat(), { y: -11, rotation: (i: number) => i % 2 ? -100 : 100 });
      gsap.set(eyes, { scaleY: 0.35 });
    } else gsap.set(eyes, { scaleY: 1 });
  };
  const reaction = (event: AppReaction) => {
    const before = appState;
    const transition = reactionTransition(appState, event);
    appState = { scanning: transition.scanning, report: transition.report };
    if (before.scanning !== appState.scanning) scanPose(appState.scanning);
    if (transition.cheer) cheer();
  };

  const climb = (tl: gsap.core.Timeline, i: number) => {
    track.classList.add("is-climbing");
    const dock = track.getBoundingClientRect(), lr = lane.getBoundingClientRect();
    const obstacles = [...document.querySelectorAll<HTMLElement>(".screen.is-active main, .screen.is-active .app-head, .app-footer, .helper-pop, .mascot-bubble, .write-actions, .screen.is-active .fx-panel, [role=dialog]:not(.boot)")]
      .filter((el) => el.getClientRects().length).map((el) => el.getBoundingClientRect());
    const gutter = gutterClimb(window.innerWidth, dock.top, width(), obstacles);
    const home = x(i);
    if (gutter) {
      const edge = gutter.x - lr.left;
      // Rise before crossing the label, and return into the lane before descending.
      tl.to(btns[i], { y: -(gutter.height + headroom()), duration: 1.4, ease: "power2.inOut" }, 0)
        .to(btns[i], { x: edge, duration: 0.8, ease: "power2.inOut" }, 1.4)
        .to(hands[i], { rotation: (j: number) => j ? -140 : 100, duration: 0.18, repeat: 5, yoyo: true }, 0.5)
        .to(hands[i][1], { rotation: -155, duration: 0.2, repeat: 3, yoyo: true }, 2.4)
        .to(btns[i], { x: home, duration: 0.8, ease: "power2.inOut" }, 3.4)
        .to(btns[i], { y: 0, duration: 0.8, ease: "power2.in" }, 4.2);
    } else {
      // A short climb stays inside the play lane; the label is never a landing target.
      const perch = Math.max(0, Math.min(laneWidth() - width(), home + 24));
      tl.to(btns[i], { y: -headroom(), duration: 0.7, ease: "steps(5)" }, 0)
        .to(btns[i], { x: perch, duration: 0.5, ease: "power2.inOut" }, 0.7)
        .to(hands[i][1], { rotation: -150, duration: 0.22, repeat: 3, yoyo: true }, 1.3)
        .to(bodies[i], { rotation: -8, duration: 0.3, repeat: 1, yoyo: true }, 2.2)
        .to(btns[i], { x: home, duration: 0.7, ease: "power2.inOut" }, 3)
        .to(btns[i], { y: 0, duration: 0.45, ease: "power2.in" }, 3.7);
    }
    hop(tl, i, tl.duration(), 5);
  };

  const play = (kind: PlayKind) => {
    interrupt(); track.classList.add("is-playing");
    const tl = timeline(); scene = tl;
    const order = btns.map((_, i) => i).sort((a, b) => x(a) - x(b));
    const pair = Math.random() < 0.5 ? 0 : 1;
    const a = order[pair], b = order[pair + 1];
    const left = x(a), right = x(b), stride = width() + 8;
    face(a, right); face(b, left);
    if (kind === "climb") climb(tl, order[Math.floor(Math.random() * order.length)]);
    else if (kind === "tag") {
      // Use the available stretch beside this pair; each game leaves them in a new part
      // of the dock, rather than snapping back to three permanent parking spaces.
      const lo = pair === 0 ? 0 : x(order[0]) + stride;
      const hi = pair === 0 ? x(order[2]) - stride : laneWidth() - width();
      const rightward = hi - right >= left - lo;
      const leader = rightward ? b : a, follower = rightward ? a : b;
      const escape = rightward ? Math.min(hi, right + rand(80, 240)) : Math.max(lo, left - rand(80, 240));
      const follow = escape + (rightward ? -stride : stride);
      const duration = Math.max(0.65, Math.abs(escape - x(leader)) / 150);
      face(leader, escape); face(follower, escape);
      tl.to(btns[leader], { x: escape, duration, ease: "power2.inOut" }, 0)
        .to(btns[follower], { x: follow, duration: duration + 0.15, ease: "power2.inOut" }, 0.18);
      [a, b].forEach((i) => tl.to(feet[i], { y: (j: number) => j ? -3 : 2, duration: 0.09, repeat: Math.ceil((duration + 0.4) / 0.09), yoyo: true }, 0));
      tl.call(() => {
        if (areMeeting({ x: x(a), y: y(a) }, { x: x(b), y: y(b) }, width())) highFive(tl, a, b, tl.time());
      }, [], duration + 0.4);
    } else if (kind === "leapfrog") {
      const middle = Math.min(right - stride, left + 34);
      tl.to(btns[a], { x: middle, duration: 0.4 }, 0)
        .to(bodies[b], { scaleY: 0.65, scaleX: 1.1, duration: 0.2 }, 0.2)
        .to(btns[a], { y: -Math.min(headroom(), btns[b].offsetHeight * 0.68), duration: 0.35, ease: "power2.out" }, 0.55)
        .to(btns[a], { x: right, duration: 0.8, ease: "sine.inOut" }, 0.55)
        .to(btns[b], { x: left, duration: 0.5, ease: "sine.inOut" }, 0.95)
        .to(btns[a], { y: 0, duration: 0.3, ease: "power2.in" }, 1.35)
        .to(bodies[b], { scaleY: 1, scaleX: 1, duration: 0.3 }, 1.4);
      hop(tl, a, 1.65, 7);
    } else if (kind === "ball") {
      const meetX = left + stride;
      tl.to(btns[b], { x: meetX, duration: 0.6 }, 0);
      const origin = lane.getBoundingClientRect().left - track.getBoundingClientRect().left;
      const ax = origin + left + width() - 7, bx = origin + meetX + 7;
      tl.set(ball, { x: ax, y: 0, scale: 1, rotation: 0 }, 0.65);
      for (let pass = 0; pass < 4; pass++) {
        const at = 0.7 + pass * 0.65, kicker = pass % 2 ? b : a;
        tl.to(feet[kicker][1], { rotation: -35, x: 3, duration: 0.12 }, at)
          .to(feet[kicker][1], { rotation: 0, x: 0, duration: 0.16 }, at + 0.12)
          .to(ball, { x: pass % 2 ? ax : bx, rotation: "+=180", duration: 0.58, ease: "none" }, at)
          .to(ball, { y: -16, duration: 0.26, ease: "power2.out" }, at)
          .to(ball, { y: 0, duration: 0.32, ease: "bounce.out" }, at + 0.26);
      }
      tl.to(ball, { scale: 0, duration: 0.2 }, 3.4);
    } else if (kind === "high-five") {
      tl.to(btns[b], { x: left + stride, duration: 0.7, ease: "power2.inOut" }, 0)
        .call(() => {
          if (areMeeting({ x: x(a), y: y(a) }, { x: x(b), y: y(b) }, width())) highFive(tl, a, b, tl.time());
        }, [], 0.75);
    } else {
      // One sits and watches while its friend does a very small terminal dance.
      tl.to(bodies[a], { scaleY: 0.7, scaleX: 1.08, y: 3, duration: 0.35 }, 0)
        .to(feet[a], { x: (j: number) => j ? 3 : -3, duration: 0.35 }, 0)
        .to(arts[b], { rotation: -13, duration: 0.22, repeat: 7, yoyo: true, ease: "sine.inOut" }, 0.5)
        .to(hands[b], { rotation: (j: number) => j ? -95 : 95, duration: 0.22, repeat: 7, yoyo: true }, 0.5);
      hop(tl, b, 0.6, 10); hop(tl, b, 1.55, 10);
      tl.to(bodies[a], { scaleY: 1, scaleX: 1, y: 0, duration: 0.3 }, 3);
    }
    tl.call(() => {}, [], "+=0.35");
    tl.eventCallback("onComplete", () => {
      live.delete(tl);
      if (scene === tl) { normalize(); scene = null; }
    });
  };
  const schedule = (first = false) => {
    kill(next);
    next = add(gsap.delayedCall(first ? rand(3, 6) : playGap(Math.random()) / 1000, () => {
      live.delete(next!); next = null;
      if (allowed()) { previous = nextPlay(previous, Math.random()); play(previous); }
      // Start the quiet gap after the scene, rather than while it is playing.
      next = add(gsap.delayedCall(scene?.duration() ?? 0, () => { live.delete(next!); schedule(); }));
    }));
  };
  const poke = (i: number, double: boolean) => {
    if (holds.size || appState.scanning || drag) return;
    interrupt(true);
    if (elevated()) { drop(i, x(i)); if (!double) return; }
    const tl = timeline(); accents.set(i, tl);
    if (double) {
      btns[i].classList.add("is-dizzy");
      tl.to(bodies[i], { rotation: -18, duration: 0.13, repeat: 5, yoyo: true })
        .to(eyes[i], { x: 2, y: -1, duration: 0.12, repeat: 5, yoyo: true }, 0)
        .to(bodies[i], { rotation: 0, duration: 0.3 })
        .set(eyes[i], { x: 0, y: 0 })
        .call(() => btns[i].classList.remove("is-dizzy"));
    } else hop(tl, i, 0, 18, i % 2 ? -14 : 14);
  };
  const hover = (i: number, clientX?: number) => {
    wake(); selected = i;
    if (!holds.size && !occupied() && !appState.scanning) {
      // A climber must remain under the pointer until pointerdown captures it.
      if (elevated()) { kill(scene); scene = null; return; }
      poke(i, false);
      if (clientX !== undefined) face(i, clientX - lane.getBoundingClientRect().left);
    }
  };
  const hold = (reason: string, onHold: boolean) => {
    const had = !!holds.size;
    if (onHold) {
      if (reason === "hidden" && drag) cancelDrag(false);
      if (reason !== "hidden") { cancelDrag(false); interrupt(); }
      holds.add(reason);
    } else holds.delete(reason);
    if (!had && holds.size) live.forEach((a) => a.pause());
    if (had && !holds.size) {
      live.forEach((a) => a.resume());
      if (appState.scanning) scanPose(true);
      if (pendingCheer) cheer();
    }
  };

  const startPositions = [8, width() + 40, 2 * width() + 72];
  const fitted = settleDrop(startPositions, 0, 8, width(), laneWidth());
  btns.forEach((b, i) => gsap.set(b, { x: fitted[i] }));
  gsap.set([...bodies, ...arts], { transformOrigin: "50% 100%" });
  gsap.set(eyes, { transformOrigin: "50% 50%" });
  hands.forEach((pair) => pair.forEach((h, j) => gsap.set(h, { svgOrigin: j ? "49 39" : "15 39" })));
  gsap.set(feet.flat(), { transformOrigin: "50% 10%" });
  gsap.set([ball, ...confetti], { scale: 0 });
  if (document.hidden) holds.add("hidden");
  if (typing()) holds.add("typing");
  if (tucked()) holds.add("tucked");

  btns.forEach((btn, i) => {
    on(btn, "pointerdown", ((e: PointerEvent) => {
      if (e.button !== 0 || !e.isPrimary || holds.size || appState.scanning) return;
      wake(); selected = i; interrupt(true);
      drag = { i, pointer: e.pointerId, startX: e.clientX, startY: e.clientY, x: x(i), y: y(i), moved: false };
      btn.setPointerCapture(e.pointerId);
    }) as EventListener);
    on(btn, "pointermove", ((e: PointerEvent) => {
      if (!drag || drag.i !== i || drag.pointer !== e.pointerId) return;
      const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      if (!drag.moved && !isDrag(dx, dy)) return;
      drag.moved = true; btn.classList.add("is-dragging");
      const lr = lane.getBoundingClientRect();
      const outside = drag.x < 0 || drag.x > laneWidth() - width();
      const left = outside ? -lr.left : 0;
      const span = outside ? window.innerWidth : laneWidth();
      const point = dragBounds(drag.x + dx - left, drag.y + dy, width(), span, Math.max(headroom(), -drag.y));
      point.x += left;
      // Gutter climbers can be grabbed without snapping across the screen. They stay
      // above the label until the pointer brings them back inside the dock lane.
      if (point.x < 0 || point.x > laneWidth() - width()) point.y = Math.min(point.y, -btn.offsetHeight - 8);
      gsap.set(btn, point); gsap.set(bodies[i], { rotation: Math.max(-12, Math.min(12, dx / 8)), scaleY: 1.05 });
    }) as EventListener);
    on(btn, "pointerup", ((e: PointerEvent) => { if (drag?.pointer === e.pointerId) cancelDrag(true); }) as EventListener);
    on(btn, "pointercancel", () => cancelDrag(true));
    on(btn, "lostpointercapture", () => { if (drag?.i === i) cancelDrag(true); });
    on(btn, "keydown", ((e: KeyboardEvent) => {
      if (e.key === "Escape" && drag) { e.preventDefault(); cancelDrag(false); }
      if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && e.altKey) {
        e.preventDefault(); move(e.key === "ArrowLeft" ? -1 : 1);
      }
    }) as EventListener);
  });
  const move = (direction: -1 | 1) => {
    wake(); if (holds.size || appState.scanning) return;
    playInteraction("hop");
    interrupt(); drop(selected, x(selected) + direction * (width() + 12));
  };
  on(document, "visibilitychange", () => hold("hidden", document.hidden));
  on(window, "resize", () => { cancelDrag(false); interrupt(); });
  // Scroll can bring content into a previously empty gutter. Return climbers immediately.
  on(window, "scroll", () => { if (scene || elevated()) interrupt(); }, { passive: true });
  on(window.visualViewport ?? window, "resize", () => { if (scene || elevated()) interrupt(); });
  on(document, "keydown", () => { wake(); if (elevated()) interrupt(); });
  on(document, "pointerdown", ((e: Event) => { wake(); if (!drag && !(e.target as Element)?.closest?.(".mascot-runner") && elevated()) interrupt(); }) as EventListener, { passive: true });
  on(document, "input", () => wake(), { passive: true });
  on(document, "pointermove", ((e: PointerEvent) => {
    const now = performance.now();
    if (now - lastLook < 90 || e.pointerType === "touch") return;
    lastLook = now; wake();
    if (holds.size || sleeping || appState.scanning || scene || drag) return;
    btns.forEach((btn, i) => {
      const r = btn.getBoundingClientRect();
      gsap.set(eyes[i], { x: Math.max(-2, Math.min(2, (e.clientX - r.left - r.width / 2) / 140)), y: Math.max(-1.5, Math.min(1.5, (e.clientY - r.top) / 160)) });
    });
  }) as EventListener, { passive: true });
  on(document, "selectionchange", () => {
    const editor = document.getElementById("editor") as HTMLTextAreaElement | null;
    if (!editor || editor.selectionStart === editor.selectionEnd || holds.size || appState.scanning) return;
    wake(); if (scene) interrupt(); gsap.set(eyes, { x: 0, y: -1.5 });
  });
  // Reuse the stage's managed timelines and interruption/visibility gates; no new art.
  let lastLoginReaction = 0;
  on(window, "bandexe:login-react", () => {
    if (!allowed() || Date.now() - lastLoginReaction < 1000) return;
    lastLoginReaction = Date.now(); interrupt();
    const tl = timeline(); scene = tl;
    tl.to(hands[0][0], { rotation: -28, y: -4, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out" });
  });
  for (const event of ["scan-start", "scan-end", "report-open"] as const) on(window, `bandexe:${event}`, () => reaction(event));
  let scanEl: Element | null = null, reportEl: Element | null = null;
  const observeApp = () => {
    const scan = document.querySelector(".screen.is-active .scan-progress");
    const report = document.querySelector(".screen.is-active .res-main");
    if (scan !== scanEl) {
      scanEl = scan;
      if (scan) reaction("scan-start"); else if (appState.scanning) reaction("scan-end");
    }
    if (report !== reportEl) {
      reportEl = report;
      if (report) reaction("report-open"); else appState.report = false;
    }
  };
  const observer = new MutationObserver((records = []) => {
    // Menus, dialogs and route/layout changes can occupy a previously clear gutter.
    if (elevated() && records.some((record) => record.target !== track && !track.contains(record.target))) interrupt();
    observeApp();
  });
  observer.observe(document.querySelector(".app-content") ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  const idle = () => {
    idleTimer = add(gsap.delayedCall(rand(3.5, 7), () => {
      live.delete(idleTimer!);
      if (allowed() && !scene) {
        const i = Math.floor(Math.random() * btns.length);
        const tl = timeline(); accents.set(i, tl);
        tl.to(eyes[i], { scaleY: 0.12, duration: 0.07, repeat: 1, yoyo: true })
          .to(bodies[i], { y: -1.5, duration: 0.6, repeat: 1, yoyo: true, ease: "sine.inOut" }, 0.3);
      }
      idle();
    }));
  };
  observeApp(); schedule(true); scheduleSleep(); idle();

  return {
    hover,
    stop: (i) => { if (scene || elevated()) { interrupt(true); drop(i, x(i)); } },
    hold,
    click: (i, keyboard) => {
      wake(); selected = i;
      if (suppressClick === i && performance.now() < suppressUntil) { suppressClick = -1; return false; }
      playInteraction("mascot");
      const now = performance.now();
      const double = !keyboard && isDoublePoke(now, pokes[i]);
      pokes[i] = double ? null : now;
      poke(i, double);
      // The second poke keeps the already-open panel open, including double-tap on phones.
      return !double;
    },
    move,
    place: (clientX) => {
      wake(); if (holds.size || appState.scanning) return;
      interrupt();
      const target = clientX === undefined ? (laneWidth() - width()) / 2 : clientX - lane.getBoundingClientRect().left - width() / 2;
      playInteraction("hop");
      drop(selected, target);
    },
    think: (i, active) => {
      kill(thinking.get(i)); thinking.delete(i);
      if (active) {
        if (scene) interrupt();
        const tl = timeline(); thinking.set(i, tl);
        tl.to(dots[i], { y: -3, duration: 0.3, stagger: 0.12, repeat: -1, yoyo: true, ease: "sine.inOut" });
      } else gsap.set(dots[i], { clearProps: "transform" });
    },
    destroy: () => {
      cancelDrag(false); live.forEach((a) => a.kill()); live.clear(); observer.disconnect(); listeners.forEach((off) => off());
      track.classList.remove("is-sleeping", "is-playing", "is-scanning", "is-climbing");
      btns.forEach((b) => b.classList.remove("is-dragging", "is-dizzy"));
      gsap.set([...btns, ...bodies, ...arts, ...eyes, ...hands.flat(), ...feet.flat(), ...dots.flat(), ball, ...confetti], { clearProps: "transform,transformOrigin" });
    },
  };
}
