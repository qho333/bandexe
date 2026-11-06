import { t as ui, useUILanguage } from "../lib/i18n";
import Header, { type DisplayProps } from "./Header";
import { useState, useSyncExternalStore } from "react";
import { getAuth, onAuth } from "../lib/auth";
import { pageContent } from "../content/pages";
import { languageDirection, type UILanguage } from "../lib/ui-language";
import PageSections from "./PageSections";

/** Keyed by the app language so changing Language resets the temporary English view. */
export function PrivacyText({ language, signInEnabled }: { language: UILanguage; signInEnabled: boolean }) {
  const [showEnglish, setShowEnglish] = useState(false);
  const labels = (pageContent[language] ?? pageContent.en).privacyPage;
  const code = showEnglish ? "en" : language;
  const text = (pageContent[code] ?? pageContent.en).privacyPage;
  return <>
    {language !== "en" && <div className="gen-note page-translation-note" lang={language} dir={languageDirection(language)}>
      <p>{labels.translationNotice}</p>
      <button type="button" className="btn btn--sm" aria-pressed={showEnglish} aria-controls="privacy-content" onClick={() => setShowEnglish(!showEnglish)}>
        {showEnglish ? labels.showTranslation : labels.showEnglish}
      </button>
    </div>}
    <div id="privacy-content" className="privacy__content" lang={code} dir={languageDirection(code)}>
      <div className="frame-head"><span>BAND.EXE / {showEnglish ? "Privacy & terms" : ui("Privacy & terms")}</span><span>{text.updated}</span></div>
      <h1 id="privacyTitle">{text.title}</h1>
      {!signInEnabled && <p>{text.signInNotice}</p>}
      <PageSections kind="privacy" language={code} />
    </div>
    <a className="btn" href="#write">{ui("Back to the editor")}</a>
  </>;
}

export default function Privacy(props: DisplayProps & { active: boolean }) {
  const language = useUILanguage();
  const auth = useSyncExternalStore(onAuth, getAuth, getAuth);
  return <div className={"screen" + (props.active ? " is-active" : "")}>
    <Header current="privacy" {...props} />
    <main className="wrap privacy" aria-labelledby="privacyTitle">
      <PrivacyText key={language} language={language} signInEnabled={!!auth.googleClientId} />
    </main>
  </div>;
}
