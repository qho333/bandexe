import { createRoot } from "react-dom/client";
import "lenis/dist/lenis.css";
import "./styles.css";
import "./app.css";
import "./motion.css";
import App from "./App";
import { captureTesterToken } from "./lib/tester";
import { loadLanguage } from "./lib/i18n";
import { loadPrefs } from "./lib/prefs";

captureTesterToken();
// Wait for the student's language so the page never flashes English first.
// A slow connection gets the page in English after 2.5 s; the language swaps in when it arrives.
void Promise.race([loadLanguage(loadPrefs().uiLanguage), new Promise((resolve) => setTimeout(resolve, 2500))]).then(() => createRoot(document.getElementById("root")!).render(<App />));
