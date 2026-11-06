import { BACKGROUND_ART } from "../content/background-art";
import "../backgrounds.css";

/** Renders one background scene. `thumb` is the still gallery version; `preview` moves but stays inside its box. */
export default function Backdrop({ id, thumb, preview }: { id: string; thumb?: boolean; preview?: boolean }) {
  const art = BACKGROUND_ART[id];
  if (!art) return null;
  return <div className={"bgx" + (thumb ? " bgx--thumb" : preview ? " bgx--preview" : "")} aria-hidden="true" style={{ background: art.base }} dangerouslySetInnerHTML={{ __html: art.html }} />;
}
