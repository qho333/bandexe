import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Exercise event handlers and effect cleanup without adding a DOM test dependency.
const hooks = vi.hoisted(() => ({ current: null }));
vi.mock("react", async (original) => ({
  ...await original(),
  useState(initial) { return hooks.current.state(initial); },
  useRef(initial) { return hooks.current.ref(initial); },
  useId() { return hooks.current.ref("impact-form").current; },
  useEffect(effect, deps) { hooks.current.effect(effect, deps); },
  useLayoutEffect() {},
}));
import ReviewForm from "../src/components/ReviewForm";
import ModerateReviews from "../src/components/ModerateReviews";
import Results, { Report } from "../src/components/Results";
import { DEFAULT_PREFS } from "../src/lib/prefs";
import { FIRST_REPORT_KEY } from "../src/lib/stats";
import { leaveTesterMode } from "../src/lib/tester";
import { reviewReport } from "../shared/review.js";
import raw from "../server/fixtures/sample-report.fixture.json";

function mount(component, props) {
  const slots = [], effects = [];
  let i = 0, tree;
  const api = {
    state(initial) {
      const index = i++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    ref(initial) { const index = i++; return slots[index] ??= { current: initial }; },
    effect(run, deps) {
      const index = i++, prev = slots[index];
      if (!prev || deps?.some((value, j) => value !== prev.deps[j])) {
        effects.push(() => { prev?.cleanup?.(); slots[index] = { deps, cleanup: run() }; });
      }
    },
    render(next = props) {
      props = next; i = 0; hooks.current = api;
      try { tree = component(props); } finally { hooks.current = null; }
      for (const run of effects.splice(0)) run();
      return tree;
    },
    find(predicate) { return nodes(tree).find(predicate); },
    all(predicate) { return nodes(tree).filter(predicate); },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
  api.render();
  return api;
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
const byText = (text) => (node) => node.props?.children === text;
const submit = (form) => form.find((n) => n.type === "form").props.onSubmit({ preventDefault() {} });
let storage, network;
beforeEach(() => {
  const values = new Map();
  storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  vi.stubGlobal("localStorage", storage); vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("cancelAnimationFrame", vi.fn()); vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  network = vi.fn(async () => new Response("{}")); vi.stubGlobal("fetch", network);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("report feedback interaction", () => {
  it("selects labelled stars, updates the counter, submits consent once and thanks the student", async () => {
    const form = mount(ReviewForm, { task: "ac1" });
    expect(form.find((n) => n.type === "button" && n.props.type === "submit").props.disabled).toBe(true);
    form.find((n) => n.props?.["aria-label"] === "5 stars").props.onClick();
    form.find((n) => n.type === "textarea").props.onChange({ target: { value: "Clear next steps." } });
    form.find((n) => n.type === "input").props.onChange({ target: { checked: true } });
    form.render();
    expect(form.find((n) => n.props?.["aria-label"] === "5 stars").props["aria-pressed"]).toBe(true);
    expect(form.find((n) => n.type === "textarea").props.value).toBe("Clear next steps.");
    expect(form.find((n) => n.props?.["aria-live"] === "polite").props.children).toEqual([17, "/280 characters"]);
    const first = submit(form), duplicate = submit(form);
    form.render(); expect(form.find(byText("Sending…")).props.disabled).toBe(true);
    await first; await duplicate; await submit(form); form.render();
    expect(network).toHaveBeenCalledOnce();
    expect(JSON.parse(network.mock.calls[0][1].body)).toEqual({ rating: 5, text: "Clear next steps.", public: true, task: "ac1" });
    expect(form.find(byText("Thanks — your rating was counted.")).props.role).toBe("status");
    expect(form.find((n) => n.type === "form")).toBeUndefined();
    const newReport = mount(ReviewForm, { task: "t2" }); expect(newReport.find((n) => n.type === "form")).toBeDefined();
  });
  it("keeps feedback after failure, provides inline errors and allows a successful retry", async () => {
    const form = mount(ReviewForm, { task: "t2" });
    form.find((n) => n.props?.["aria-label"] === "2 stars").props.onClick();
    form.find((n) => n.type === "textarea").props.onChange({ target: { value: "Please add more examples." } }); form.render();
    network.mockResolvedValueOnce(new Response(JSON.stringify({ message: "Please remove contact details." }), { status: 400 }));
    await submit(form); form.render();
    expect(form.find((n) => n.props?.role === "alert").props.children).toBe("Please remove contact details.");
    expect(form.find((n) => n.type === "textarea").props.value).toBe("Please add more examples.");
    expect(form.find((n) => n.props?.["aria-label"] === "2 stars").props["aria-pressed"]).toBe(true);
    await submit(form); form.render(); expect(form.find(byText("Thanks — your rating was counted."))).toBeDefined();
  });
  it("does not submit without a rating and explains the client daily cap", async () => {
    const form = mount(ReviewForm, { task: "t2" }); await submit(form); expect(network).not.toHaveBeenCalled();
    storage.setItem("bandexe-ratings", JSON.stringify({ day: new Date().toISOString().slice(0, 10), n: 5 }));
    form.find((n) => n.props?.["aria-label"] === "4 stars").props.onClick(); form.render();
    await submit(form); form.render(); expect(form.find((n) => n.props?.role === "alert").props.children).toContain("five ratings");
    expect(network).not.toHaveBeenCalled();
  });
});

describe("moderation interaction", () => {
  const reviews = [
    { id: 2, day: "2026-10-30", rating: 5, text: "Public comment.", task: "t2", public: 1 },
    { id: 1, day: "2026-10-30", rating: 3, text: "Private comment.", task: null, public: 0 },
  ];
  async function loadList() {
    storage.setItem("bandexe-tester", "synthetic-pass");
    network.mockResolvedValueOnce(new Response(JSON.stringify({ reviews })));
    const panel = mount(ModerateReviews, {}), element = panel.render();
    const list = mount(element.type, {});
    await vi.waitFor(() => { list.render(); expect(list.all((n) => n.type === "article")).toHaveLength(2); });
    return { panel, list };
  }
  it("hides moderation when the pass is removed and disables approval for private text", async () => {
    const { panel, list } = await loadList();
    expect(list.all(byText("Approve")).map((n) => n.props.disabled)).toEqual([false, true]);
    await list.all(byText("Approve"))[0].props.onClick();
    await vi.waitFor(() => { list.render(); expect(list.all((n) => n.type === "article")).toHaveLength(1); });
    expect(JSON.parse(network.mock.calls[1][1].body)).toEqual({ id: 2, status: "approved" });
    await list.find(byText("Hide")).props.onClick();
    await vi.waitFor(() => { list.render(); expect(list.find(byText("No pending comments."))).toBeDefined(); });
    leaveTesterMode(); expect(panel.render()).toBeNull(); panel.unmount(); list.unmount();
  });
  it("keeps a failed moderation item available to retry and supports refresh", async () => {
    const { panel, list } = await loadList();
    network.mockRejectedValueOnce(new Error("offline")); list.all(byText("Hide"))[0].props.onClick();
    await vi.waitFor(() => { list.render(); expect(list.find((n) => n.props?.role === "alert")).toBeDefined(); });
    expect(list.all((n) => n.type === "article")).toHaveLength(2);
    network.mockResolvedValueOnce(new Response(JSON.stringify({ reviews: [] })));
    list.find(byText("Refresh pending reviews")).props.onClick(); list.render();
    await vi.waitFor(() => { list.render(); expect(list.find(byText("No pending comments."))).toBeDefined(); });
    panel.unmount(); list.unmount();
  });
});

describe("completed report counting", () => {
  const essay = "Working from home has became normal.";
  const result = { task: "t2", report: reviewReport(raw, essay), overall: 6, range: { lo: 5, hi: 7 }, withheld: [], words: 7, checker: "free" };
  const props = (status = "done", active = true, changes = {}) => ({ active, job: { id: 1, status, essay, minutes: null }, result: { ...result, ...changes },
    essay, setEssay() {}, onWrite() {}, onRetry() {}, prefs: { ...DEFAULT_PREFS, reduced: "on" }, setPrefs() {}, onReplayBoot() {} });
  it("counts only visible scored reports and shows feedback only on a completed report", async () => {
    for (const args of [["done", false], ["pending", true], ["error", true], ["done", true, { overall: null, feedbackOnly: true }], ["done", true, { fixture: true }]]) {
      const report = mount(Report, props(...args)); report.unmount();
    }
    expect(network).not.toHaveBeenCalled();
    const report = mount(Report, props());
    await vi.waitFor(() => expect(storage.getItem(FIRST_REPORT_KEY)).toBe("1"));
    expect(JSON.parse(network.mock.calls[0][1].body)).toEqual({ student: true });
    expect(report.find((n) => n.type === ReviewForm)).toBeDefined();
    report.render(props("done", false)); report.render(props()); expect(network).toHaveBeenCalledOnce(); report.unmount();
    const error = mount(Report, props("error")); expect(error.find((n) => n.type === ReviewForm)).toBeUndefined(); error.unmount();
    const results = mount(Results, props("error")); expect(results.find((n) => n.type === Report)).toBeUndefined(); results.unmount();
  });
});
