import { expect, it } from "vitest";
import { pageContent, resolveSections } from "../src/content/pages";
import { catalogues, getUILanguage, loadLanguage, setUILanguage, subscribeLanguage, t } from "../src/lib/i18n";

it("shows English until a language has downloaded, then tells the app to redraw", async () => {
  expect(Object.keys(catalogues)).toEqual(["en"]);
  expect(resolveSections("privacy", "vi")[0].language).toBe("en");
  let redraws = 0;
  const stop = subscribeLanguage(() => { redraws++; });
  setUILanguage("vi");
  expect(t("Sample questions")).toBe("Sample questions");
  await loadLanguage("vi");
  await new Promise((resolve) => setTimeout(resolve));
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
