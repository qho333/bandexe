export type Task = "t2" | "gt1" | "ac1";
export type Crit = "tr" | "cc" | "lr" | "gra";
export type Screen = "login" | "write" | "results" | "overview";

export const CRITS: Crit[] = ["tr", "cc", "lr", "gra"];

export const TASKS: Record<Task, { chip: string; label: string; minutes: number; words: number }> = {
  t2: { chip: "Task 2", label: "Task 2 essay", minutes: 40, words: 250 },
  gt1: { chip: "Task 1 General", label: "Task 1 General (letter)", minutes: 20, words: 150 },
  ac1: { chip: "Task 1 Academic", label: "Task 1 Academic (chart)", minutes: 20, words: 150 },
};

export interface Fix {
  original: string;
  corrected?: string;
  better?: string;
  reason: string;
  criterion: Crit;
}

export interface Report {
  criteria: Record<Crit, { band: number | null; summary: string; subskills: { key: string; score: number }[] }>;
  grammar: Fix[];
  upgrades: Fix[];
  paragraphs: { label: string; quote: string; comments: Record<Crit, string>; rewrite: string }[];
  structureAdvice: string;
  strengths: string[];
  priorities: string[];
  dropped: { grammar: number; upgrades: number };
}

export interface MarkResult {
  chartNotice?: string;
  chartDescription?: string;
  reportMode?: "compact" | "full";
  outputTokens?: number; // actual provider-reported output usage, including a repair when present
  feedbackLanguage?: import("../../shared/language.js").FeedbackLanguage;
  task: Task;
  words: number;
  overall: number | null;
  range: { lo: number; hi: number } | null;
  label: string;
  withheld: Crit[];
  note?: string;
  markingVersion: string;
  provider?: string;
  model?: string;
  cached?: boolean;
  calls?: number;
  checker?: import("./checker").Checker;
  engine?: import("./engines").Engine; // on-device results only
  feedbackOnly?: boolean; // no band anywhere: number, range, criterion bands, celebration, chart
  notice?: string; // e.g. automatic fallback from Gemini to this device
  fixture?: boolean;
  report: Report;
}

export interface Draft {
  feedbackLanguage?: import("../../shared/language.js").FeedbackLanguage;
  task: Task;
  question: string;
  essay: string;
  chartDescription?: string;
}

export interface Chart {
  base64: string;
  mime: "image/png" | "image/jpeg";
  name: string;
  url: string; // object URL for the preview
}
