import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PrivacyText } from "../src/components/Privacy";
import Privacy from "../src/components/Privacy";
import { pageContent } from "../src/content/pages";
import { DEFAULT_PREFS } from "../src/lib/prefs";
import { getUILanguage, setUILanguage } from "../src/lib/i18n";
import type { UILanguage } from "../src/lib/ui-language";
import { LANGUAGES as ALL_LANGUAGES } from "../shared/language.js";
import { loadLanguage } from "../src/lib/i18n";

await Promise.all(ALL_LANGUAGES.map(([code]) => loadLanguage(code)));

// Exercise the actual button handler without a new DOM test dependency.
const state = vi.hoisted(() => ({ english: false }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState() { return [state.english, (next: boolean) => { state.english = next; }]; },
  useSyncExternalStore(_subscribe: unknown, getSnapshot: () => unknown) { return getSnapshot(); },
}));

interface ElementLike { type: unknown; key?: unknown; props: { children?: unknown; [key: string]: any } }
function nodes(tree: unknown): ElementLike[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object" || !("props" in tree)) return [];
  const node = tree as ElementLike;
  return [node, ...nodes(node.props.children)];
}
const renderText = (language: UILanguage, signInEnabled = false) => PrivacyText({ language, signInEnabled });
const html = (tree: ReturnType<typeof PrivacyText>) => renderToStaticMarkup(tree);
const escape = (text: string) => renderToStaticMarkup(createElement("span", null, text)).slice(6, -7);

beforeEach(() => { state.english = false; });
afterEach(() => setUILanguage("en"));

it("shows English in place and returns to Arabic without changing the Language setting", () => {
  setUILanguage("ar");
  let tree = renderText("ar");
  const button = () => nodes(tree).find((node) => node.type === "button")!;
  expect(button().props["aria-pressed"]).toBe(false);
  expect(button().props.children).toBe(pageContent.ar.privacyPage.showEnglish);
  expect(html(tree)).toContain('id="privacy-content" class="privacy__content" lang="ar" dir="rtl"');
  expect(html(tree)).toContain(escape(pageContent.ar.privacyPage.signInNotice));

  button().props.onClick();
  tree = renderText("ar");
  expect(button().props["aria-pressed"]).toBe(true);
  expect(button().props.children).toBe(pageContent.ar.privacyPage.showTranslation);
  expect(html(tree)).toContain('id="privacy-content" class="privacy__content" lang="en" dir="ltr"');
  expect(html(tree)).toContain('id="privacy-accuracy" lang="en" dir="ltr"');
  expect(html(tree)).toContain("Your writing, your choice.");
  expect(html(tree)).toContain(pageContent.en.privacyPage.signInNotice);
  expect(html(tree)).toContain(escape(pageContent.ar.privacyPage.translationNotice));
  expect(getUILanguage()).toBe("ar");

  button().props.onClick();
  tree = renderText("ar");
  expect(button().props["aria-pressed"]).toBe(false);
  expect(html(tree)).toContain('id="privacy-accuracy" lang="ar" dir="rtl"');
  expect(getUILanguage()).toBe("ar");
});

it("uses a new content key for a new app language so React resets the temporary English view", () => {
  const props = { active: true, prefs: DEFAULT_PREFS, setPrefs() {}, onReplayBoot() {} };
  setUILanguage("vi");
  const initial = nodes(Privacy(props)).find((node) => node.type === PrivacyText)!;
  expect(initial.key).toBe("vi");
  setUILanguage("ja");
  const changed = nodes(Privacy(props)).find((node) => node.type === PrivacyText)!;
  expect(changed.key).toBe("ja");
  expect(changed.props.language).toBe("ja");
});

it("keeps sign-in availability conditional in both language views and offers no toggle in English", () => {
  expect(html(renderText("vi", true))).not.toContain(escape(pageContent.vi.privacyPage.signInNotice));
  state.english = true;
  expect(html(renderText("vi", true))).not.toContain(pageContent.en.privacyPage.signInNotice);
  expect(nodes(renderText("en")).some((node) => node.type === "button")).toBe(false);
});
