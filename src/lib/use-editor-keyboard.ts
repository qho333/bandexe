import { useEffect, useState, type RefObject } from "react";
import { isKeyboardOpen } from "./keyboard";

/** Keep the pre-focus height for browsers that resize both layout and visual viewports. */
export function useEditorKeyboard(editor: RefObject<HTMLTextAreaElement | null>, active: boolean) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport, el = editor.current;
    if (!active || !viewport || !el) { setOpen(false); return; }
    let width = document.documentElement.clientWidth;
    let referenceHeight = Math.max(window.innerHeight, viewport.height);
    const update = () => {
      const nextWidth = document.documentElement.clientWidth;
      // Rotation starts a new baseline; never compare a landscape viewport to portrait height.
      if (nextWidth !== width) {
        width = nextWidth;
        referenceHeight = Math.max(window.innerHeight, viewport.height);
      } else if (Math.abs(viewport.scale - 1) <= 0.05) {
        referenceHeight = Math.max(referenceHeight, window.innerHeight, viewport.height);
      }
      setOpen(isKeyboardOpen({ focused: document.activeElement === el, referenceHeight, viewportHeight: viewport.height, scale: viewport.scale }));
    };
    update();
    viewport.addEventListener("resize", update);
    window.addEventListener("resize", update);
    el.addEventListener("focus", update);
    el.addEventListener("blur", update);
    return () => {
      viewport.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      el.removeEventListener("focus", update);
      el.removeEventListener("blur", update);
    };
  }, [editor, active]);
  return open;
}
