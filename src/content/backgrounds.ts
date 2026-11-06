// What the app needs to know before any background art is loaded.
import type { Band } from "./characters";

export interface Background { id: string; band: Band; name: string; tone: "light" | "dark" }
export const BACKGROUNDS: Background[] = [
  { id: "ruled", band: 5, name: "Ruled Paper", tone: "light" },
  { id: "dots", band: 5, name: "Dot Grid", tone: "light" },
  { id: "graph", band: 5, name: "Graph Paper", tone: "light" },
  { id: "margin", band: 5, name: "Notebook Margin", tone: "light" },
  { id: "sticky", band: 5, name: "Sticky Notes", tone: "light" },
  { id: "stripes", band: 5, name: "Soft Stripes", tone: "light" },
  { id: "rain", band: 6, name: "Quiet Rain", tone: "dark" },
  { id: "commas", band: 6, name: "Drifting Commas", tone: "light" },
  { id: "fireflies", band: 6, name: "Fireflies", tone: "dark" },
  { id: "leaves", band: 6, name: "Autumn Leaves", tone: "light" },
  { id: "petals", band: 6, name: "Cherry Petals", tone: "light" },
  { id: "planes", band: 6, name: "Paper Planes", tone: "light" },
  { id: "hearts", band: 7, name: "Big Hearts", tone: "light" },
  { id: "papersky", band: 7, name: "Paper Sky", tone: "light" },
  { id: "cloudday", band: 7, name: "Cloud Day", tone: "light" },
  { id: "balloons", band: 7, name: "Balloons", tone: "light" },
  { id: "ink", band: 8, name: "Ink Clouds", tone: "dark" },
  { id: "tide", band: 8, name: "Slow Tide", tone: "light" },
  { id: "aurora", band: 8, name: "Aurora", tone: "dark" },
  { id: "snow", band: 8, name: "Snow Cabin", tone: "dark" },
  { id: "moon", band: 9, name: "Moonrise", tone: "dark" },
  { id: "constellation", band: 9, name: "Heart Constellation", tone: "dark" },
  { id: "jelly", band: 9, name: "Jellyfish Sea", tone: "dark" },
  { id: "city", band: 9, name: "City Windows", tone: "dark" },
];
