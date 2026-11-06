import { t as ui } from "../lib/i18n";
import Select from "./Select";
import { LANGUAGES } from "../../shared/language.js";
import type { Prefs } from "../lib/prefs";
import { languagePreferences, type UILanguage } from "../lib/ui-language";

export default function LanguagePicker({ prefs, setPrefs, onPick }: { prefs: Prefs; setPrefs: (prefs: Prefs) => void; onPick?: () => void }) {
  const language = prefs.uiLanguage || "en";
  return <div className="language-picker">
    <label className="field"><span className="field__label">{ui("Language")}</span>
      <Select value={language} options={LANGUAGES.map(([value, label]) => ({ value, label, lang: value }))} onChange={(value) => {
        setPrefs(languagePreferences(prefs, value as UILanguage)); onPick?.();
      }} />
      <span className="language-picker__marker" aria-hidden="true"><i style={{ transform: `translateX(${(language === "ar" ? -1 : 1) * LANGUAGES.findIndex(([code]) => code === language) * 100}%)` }} /></span>
    </label>
  </div>;
}
