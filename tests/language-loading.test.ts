import { expect, it } from "vitest";
import { pageContent, resolveSections } from "../src/content/pages";
import { catalogues, getLanguageVersion, getUILanguage, loadLanguage, setUILanguage, subscribeLanguage, t } from "../src/lib/i18n";

it("shows English until a language has downloaded, then tells the app to redraw", async () => {
  expect(Object.keys(catalogues)).toEqual(["en"]);
  expect(resolveSections("privacy", "vi")[0].language).toBe("en");
  let redraws = 0;
  const stop = subscribeLanguage(() => { redraws++; });
  setUILanguage("vi");
  const shownInEnglish = getLanguageVersion();
  expect(t("Sample questions")).toBe("Sample questions");
  await loadLanguage("vi");
  await new Promise((resolve) => setTimeout(resolve));
  // React only redraws when this snapshot changes, so it must move once the download lands.
  expect(getLanguageVersion()).toBeGreaterThan(shownInEnglish);
  expect(getUILanguage()).toBe("vi");
  expect(t("Sample questions")).toBe("Các đề mẫu");
  expect(pageContent.vi.privacyPage.title).toBeTruthy();
  expect(redraws).toBe(2);
  stop();
  setUILanguage("en");
});

it("ignores languages the site does not have", async () => {
  await loadLanguage("xx");
  await loadLanguage(undefined);
  expect(catalogues).not.toHaveProperty("xx");
});
