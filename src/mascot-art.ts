// Draft helper mascots (Signal Creatures direction). Flat 2D line art, not final art.
// One drawing system for all three: 64x64 grid, flat fills, one stroke weight (set in CSS with
// non-scaling strokes), pill eyes with a glint, two feet. Colours come only from the theme tokens
// (--m-body, --m-line, --m-eye) via the classes below, so every theme recolours them.
// .m-face marks details drawn on the body; they use the eye colour so they stay visible on the
// Paper theme's solid ink body.
// Animation hooks: .m-eyes (look), .m-foot (steps), .m-ant, .m-hand (wave / high-five / hide eyes).
// Keep `class="mascot"` exact: other screens swap it for "mascot mascot--lg".

export type MascotId = "coach" | "synonyms" | "ideas";

const r = (n: number) => Math.round(n * 100) / 100;

function eyes(cx1: number, cx2: number, cy: number, w = 5, h = 8) {
  const one = (cx: number) =>
    `<rect class="m-eye" x="${r(cx - w / 2)}" y="${r(cy - h / 2)}" width="${w}" height="${h}" rx="${r(w / 2)}"/>` +
    `<circle class="m-cut" cx="${r(cx + w * 0.14)}" cy="${r(cy - h * 0.2)}" r="1.1"/>`;
  return `<g class="m-eyes">${one(cx1)}${one(cx2)}</g>`;
}

function feet(x1: number, x2: number, y = 54) {
  const one = (x: number) => `<rect class="m-body m-foot" x="${x}" y="${y}" width="9" height="6" rx="3"/>`;
  return `<g class="m-feet">${one(x1)}${one(x2)}</g>`;
}

function hands() {
  return '<path class="m-line m-hand" d="M15 39 L8 43 L5 38"/>' +
    '<path class="m-line m-hand" d="M49 39 L56 43 L59 38"/>';
}

const open = (id: MascotId) => `<svg class="mascot" data-mascot="${id}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">`;

export const MASCOT_SVG: Record<MascotId, string> = {
  // Coach: the main companion. Dome body, terminal "screen" face, two signal antennae.
  coach:
    open("coach") +
    feet(20, 35) +
    '<g class="m-ant">' +
    '<path class="m-line" d="M25 19.5 L20.5 9.5"/><circle class="m-tip" cx="19.5" cy="7" r="3"/>' +
    '<path class="m-line" d="M39 19.5 L43.5 9.5"/><path class="m-tip" d="M44.5 2.5 L48 7 L44.5 11.5 L41 7 Z"/>' +
    "</g>" +
    '<path class="m-body" d="M11 43 C11 28 19.5 18.5 32 18.5 C44.5 18.5 53 28 53 43 C53 52 45 57 32 57 C19 57 11 52 11 43 Z"/>' +
    '<rect class="m-line m-face" x="17" y="27.5" width="30" height="20" rx="9"/>' +
    eyes(25.5, 38.5, 36.5) +
    '<path class="m-line m-face" d="M29 43 Q32 45.2 35 43"/>' +
    hands() + "</svg>",
  // Synonyms: boxy body with tab ears, holding a word card (asymmetric silhouette).
  synonyms:
    open("synonyms") +
    feet(18, 33) +
    '<g class="m-ant">' +
    '<rect class="m-body" x="18" y="7" width="7" height="14" rx="2"/><rect class="m-tip" x="18" y="7" width="7" height="4.5" rx="2"/>' +
    '<rect class="m-body" x="35" y="7" width="7" height="14" rx="2"/><rect class="m-tip" x="35" y="7" width="7" height="4.5" rx="2"/>' +
    "</g>" +
    '<rect class="m-body" x="11" y="18" width="38" height="39" rx="11"/>' +
    eyes(23.5, 36.5, 33) +
    '<path class="m-line m-face" d="M26.5 42.5 H33.5"/>' +
    '<g transform="rotate(-8 50 45)"><rect class="m-body" x="40" y="37" width="20" height="15" rx="2"/>' +
    '<path class="m-line m-face" d="M44 42 H56 M44 46.5 H52"/></g>' +
    hands() + "</svg>",
  // Ideas: round body with a spark bolt on top and small spark ticks; curious "o" mouth.
  ideas:
    open("ideas") +
    feet(20, 35) +
    '<g class="m-ant">' +
    '<path class="m-tip" d="M34 22.5 L27.5 13.5 L32.5 13.5 L29 3 L39 15.5 L34 15.5 L37.5 22.5 Z"/>' +
    '<path class="m-line" d="M43 8.5 L46.5 6 M44.5 14 L48.5 13.5 M21 9.5 L18 7"/>' +
    "</g>" +
    '<circle class="m-body" cx="32" cy="39.5" r="17.5"/>' +
    eyes(25.5, 38.5, 37.5) +
    '<circle class="m-line m-face" cx="32" cy="47" r="1.8"/>' +
    hands() + "</svg>",
};
