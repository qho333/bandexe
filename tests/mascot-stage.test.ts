import { afterEach, describe, expect, it, vi } from "vitest";
import gsap from "gsap";
import { PLAYS } from "../src/lib/mascot-play";
import { createMascotStage, type MascotStage } from "../src/lib/mascot-stage";

// Real GSAP timelines over small EventTarget fixtures: no browser or extra DOM package required.
class Node extends EventTarget {
  x = 0; y = 0; scale = 1; scaleX = 1; scaleY = 1; rotation = 0;
  transformOrigin = ""; svgOrigin = ""; clearProps = "";
  offsetWidth = 56; offsetHeight = 58; clientWidth = 56; clientHeight = 58;
  classes = new Set<string>();
  classList = {
    add: (...names: string[]) => names.forEach((n) => this.classes.add(n)),
    remove: (...names: string[]) => names.forEach((n) => this.classes.delete(n)),
    toggle: (name: string, on: boolean) => on ? this.classes.add(name) : this.classes.delete(name),
  };
  one = new Map<string, Node>();
  many = new Map<string, Node[]>();
  capture = new Set<number>();
  querySelector = (s: string) => this.one.get(s) ?? null;
  querySelectorAll = (s: string) => this.many.get(s) ?? [];
  getBoundingClientRect = () => ({ left: 16 + this.x, right: 16 + this.x + this.clientWidth, top: 692, bottom: 800, width: this.clientWidth, height: this.clientHeight });
  getClientRects = () => [this.getBoundingClientRect()];
  setPointerCapture = (id: number) => this.capture.add(id);
  hasPointerCapture = (id: number) => this.capture.has(id);
  releasePointerCapture = (id: number) => { this.capture.delete(id); this.dispatchEvent(new Event("lostpointercapture")); };
}
let stage: MascotStage | undefined;
let now = 0;
const tick = (seconds: number) => {
  now += seconds * 1000;
  gsap.globalTimeline.time(gsap.globalTimeline.time() + seconds);
  gsap.ticker.sleep();
};
const setup = (occupied = () => false, laneWidth = 600, laneHeight = 108) => {
  now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const track = new Node(), lane = new Node(), ball = new Node(), label = new Node();
  lane.clientWidth = laneWidth; lane.clientHeight = laneHeight; track.clientWidth = 800;
  track.one.set(".mascot-ball", ball); track.one.set(".dock__label", label);
  const confetti = Array.from({ length: 12 }, () => new Node());
  track.many.set(".mascot-confetti i", confetti);
  const buttons = Array.from({ length: 3 }, () => new Node());
  for (const b of buttons) {
    for (const key of [".mascot-runner__body", ".mascot-runner__art", ".m-eyes"]) b.one.set(key, new Node());
    for (const key of [".m-hand", ".m-foot", ".mascot-think i"]) b.many.set(key, [new Node(), new Node()]);
  }
  const doc = Object.assign(new Node(), { hidden: false, getElementById: () => null, body: new Node() });
  const win = Object.assign(new EventTarget(), { innerWidth: 800, visualViewport: new EventTarget() });
  let observe = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal("document", doc); vi.stubGlobal("window", win);
  vi.stubGlobal("MutationObserver", class {
    constructor(cb: () => void) { observe = cb; }
    observe = vi.fn(); disconnect = disconnect;
  });
  stage = createMascotStage({
    track: track as unknown as HTMLElement, lane: lane as unknown as HTMLElement,
    buttons: buttons as unknown as HTMLButtonElement[], occupied, typing: () => false, tucked: () => false,
  });
  gsap.ticker.sleep();
  return { track, lane, buttons, ball, confetti, doc, win, observe, disconnect, stage };
};
const pointer = (el: Node, type: string, clientX: number, clientY: number) => el.dispatchEvent(Object.assign(new Event(type), {
  pointerId: 1, isPrimary: true, button: 0, pointerType: "touch", clientX, clientY,
}));

afterEach(() => {
  stage?.destroy(); stage = undefined;
  gsap.globalTimeline.clear(); gsap.ticker.sleep();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe("mascot stage lifecycle", () => {
  it("pauses all work for a hidden tab and keeps independent typing/tucked holds", () => {
    const { stage, doc, track } = setup();
    doc.hidden = true; doc.dispatchEvent(new Event("visibilitychange"));
    tick(30); expect(track.classes.has("is-playing")).toBe(false);
    stage.hold("typing", true);
    doc.hidden = false; doc.dispatchEvent(new Event("visibilitychange"));
    tick(30); expect(track.classes.has("is-playing")).toBe(false);
    stage.hold("tucked", true); stage.hold("typing", false);
    tick(30); expect(track.classes.has("is-playing")).toBe(false);
    stage.hold("tucked", false);
    tick(7); expect(track.classes.has("is-playing")).toBe(true);
  });
  it("sleeps after two minutes and wakes on a student's interaction", () => {
    const { track, doc } = setup();
    tick(120); expect(track.classes.has("is-sleeping")).toBe(true);
    doc.dispatchEvent(new Event("keydown"));
    expect(track.classes.has("is-sleeping")).toBe(false);
    tick(119); expect(track.classes.has("is-sleeping")).toBe(false);
    tick(1); expect(track.classes.has("is-sleeping")).toBe(true);
  });
  it("recognizes a touch drag, keeps the landing within bounds and suppresses its synthesized click", () => {
    const { buttons, stage } = setup();
    pointer(buttons[1], "pointerdown", 140, 750);
    pointer(buttons[1], "pointermove", 800, 600);
    expect(buttons[1].x).toBeLessThanOrEqual(544); expect(buttons[1].y).toBeGreaterThanOrEqual(-43);
    pointer(buttons[1], "pointerup", 800, 600);
    expect(buttons[1].capture.size).toBe(0);
    expect(stage.click(1, false)).toBe(false);
    tick(2); expect(buttons[1].y).toBe(0);
    expect(stage.click(1, false)).toBe(true);
  });
  it("opens on a proper tap, keeps the panel open on double-poke, and can be cancelled during a drag", () => {
    const { buttons, stage } = setup();
    pointer(buttons[1], "pointerdown", 140, 750); pointer(buttons[1], "pointerup", 141, 751);
    expect(stage.click(1, false)).toBe(true);
    tick(0.1); expect(stage.click(1, false)).toBe(false);
    expect(buttons[1].classes.has("is-dizzy")).toBe(true);
    pointer(buttons[1], "pointerdown", 140, 750); pointer(buttons[1], "pointermove", 250, 720);
    buttons[1].dispatchEvent(Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape" }));
    expect(buttons[1].capture.size).toBe(0); expect(buttons[1].y).toBe(0);
    expect(buttons[1].classes.has("is-dizzy")).toBe(false);
  });
  it("uses app events and DOM fallback without two report celebrations", () => {
    const { win, track, doc, observe } = setup();
    win.dispatchEvent(new Event("bandexe:scan-start")); expect(track.classes.has("is-scanning")).toBe(true);
    win.dispatchEvent(new Event("bandexe:scan-end")); expect(track.classes.has("is-scanning")).toBe(false);
    win.dispatchEvent(new Event("bandexe:report-open"));
    const count = gsap.globalTimeline.getChildren().length;
    doc.one.set(".screen.is-active .res-main", new Node()); observe();
    expect(gsap.globalTimeline.getChildren().length).toBe(count);
    expect(track.classes.has("is-scanning")).toBe(false);
  });
  it("returns drags and climbers to the dock when work starts, and releases every listener/timer", () => {
    const { stage, buttons, track, win, disconnect } = setup();
    pointer(buttons[0], "pointerdown", 20, 750); pointer(buttons[0], "pointermove", 200, 710);
    stage.hold("typing", true);
    expect(buttons[0].capture.size).toBe(0); expect(buttons[0].y).toBe(0);
    stage.destroy();
    expect(disconnect).toHaveBeenCalled();
    win.dispatchEvent(new Event("bandexe:scan-start"));
    tick(180);
    expect(track.classes.has("is-scanning")).toBe(false);
    expect(track.classes.has("is-playing")).toBe(false);
    expect(track.classes.has("is-sleeping")).toBe(false);
    expect(gsap.globalTimeline.getChildren().filter((a) => a.duration() || a.delay())).toHaveLength(0);
  });
});


describe("scene safety over real GSAP frames", () => {
  it.each(PLAYS)("keeps %s in the reserved dock when gutters are unavailable, then settles", (kind) => {
    const seed = (PLAYS.indexOf(kind) + 0.1) / PLAYS.length;
    vi.spyOn(Math, "random").mockReturnValue(seed);
    const { buttons, track, ball } = setup();
    tick(3 + seed * 3 + 0.01);
    expect(track.classes.has("is-playing")).toBe(true);
    for (let frame = 0; frame < 65; frame++) {
      tick(0.1);
      for (const button of buttons) {
        const body = button.one.get(".mascot-runner__body")!;
        expect(button.y + body.y).toBeGreaterThanOrEqual(-43.1);
        expect(button.x).toBeGreaterThanOrEqual(-0.01);
        expect(button.x + 56).toBeLessThanOrEqual(track.clientWidth + 0.01);
      }
    }
    expect(track.classes.has("is-playing")).toBe(false);
    expect(ball.scale).toBe(0);
    const xs = buttons.map((b) => b.x).sort((a, b) => a - b);
    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(63.99);
    expect(xs[2] - xs[1]).toBeGreaterThanOrEqual(63.99);
  });
});

describe("compact dock bounds and input continuity", () => {
  it.each([184, 212, 272, 600])("keeps every scene within the %ipx lane beside the label", (laneWidth) => {
    for (const kind of PLAYS) {
      const seed = (PLAYS.indexOf(kind) + 0.1) / PLAYS.length;
      vi.spyOn(Math, "random").mockReturnValue(seed);
      const { buttons, stage: currentStage } = setup(() => false, laneWidth, 102);
      tick(3 + seed * 3 + 0.01);
      let previous = buttons.map((b) => ({ x: b.x, y: b.y }));
      for (let frame = 0; frame < 380; frame++) {
        tick(1 / 60);
        buttons.forEach((b, i) => {
          expect(b.x).toBeGreaterThanOrEqual(-0.01); expect(b.x + 56).toBeLessThanOrEqual(laneWidth + 0.01);
          expect(b.y + b.one.get(".mascot-runner__body")!.y).toBeGreaterThanOrEqual(-37.1);
          expect(Math.abs(b.x - previous[i].x), `${kind} frame ${frame} bot ${i}: ${previous[i].x} -> ${b.x}`).toBeLessThan(18); expect(Math.abs(b.y - previous[i].y)).toBeLessThan(18);
        });
        previous = buttons.map((b) => ({ x: b.x, y: b.y }));
      }
      currentStage.destroy(); gsap.globalTimeline.clear();
    }
  });
  it.each(["mouse", "touch"])("preserves the position under a %s pointer and distinguishes tap from drag", (pointerType) => {
    const { buttons, stage } = setup(); const b = buttons[1];
    // A climber has already reached this position when grabbed.
    gsap.set(b, { x: 180, y: -24 });
    const send = (type: string, clientX: number, clientY: number) => b.dispatchEvent(Object.assign(new Event(type), { pointerId: 1, isPrimary: true, button: 0, pointerType, clientX, clientY }));
    send("pointerdown", 210, 710); expect(b.x).toBe(180); expect(b.y).toBe(-24);
    send("pointermove", 212, 711); expect(b.x).toBe(180); expect(b.y).toBe(-24);
    send("pointermove", 220, 705); expect(b.x).toBe(190); expect(b.y).toBe(-29);
    send("pointerup", 220, 705); expect(stage.click(1, false)).toBe(false);
    tick(2); expect(b.y).toBe(0);
    send("pointerdown", 220, 740); send("pointerup", 222, 741); expect(stage.click(1, false)).toBe(true);
  });
  it("grabs an elevated gutter climber without snapping it into the lane or over the label", () => {
    const { buttons, stage } = setup();
    const b = buttons[2]; gsap.set(b, { x: 650, y: -140 });
    pointer(b, "pointerdown", 680, 600); expect(b.x).toBe(650); expect(b.y).toBe(-140);
    pointer(b, "pointermove", 690, 605); expect(b.x).toBe(660); expect(b.y).toBe(-135);
    pointer(b, "pointerup", 690, 605); expect(stage.click(2, false)).toBe(false); tick(2);
    expect(b.x + 56).toBeLessThanOrEqual(600); expect(b.y).toBe(0);
  });
  it("clamps a completed drag after resize and releases capture on pointer cancellation", () => {
    const { buttons, lane, win } = setup();
    pointer(buttons[2], "pointerdown", 230, 750); pointer(buttons[2], "pointermove", 580, 720);
    pointer(buttons[2], "pointercancel", 580, 720); expect(buttons[2].capture.size).toBe(0); tick(2);
    lane.clientWidth = 184; win.dispatchEvent(new Event("resize"));
    const xs = buttons.map((b) => b.x).sort((a, b) => a - b);
    xs.forEach((x) => { expect(x).toBeGreaterThanOrEqual(0); expect(x + 56).toBeLessThanOrEqual(184); });
    expect(xs[1] - xs[0]).toBeGreaterThanOrEqual(64); expect(xs[2] - xs[1]).toBeGreaterThanOrEqual(64);
  });
});
