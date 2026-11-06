// Original practice charts for Academic Task 1. Figures are invented for practice. The marker gets `describe(chart)`,
// so it checks the student's figures against exact numbers without any chart-reading AI.
export type PracticeSeries = { name: string; values: number[] };
export type MapFeature = { label: string; where: string; x: number; y: number; w: number; h: number };
export type PracticeChart = { kind: "bar" | "line" | "pie" | "table" | "mixed" | "process" | "map"; question: string; title: string; unit: string; labels: string[]; series: PracticeSeries[];
  parts?: PracticeChart[]; stages?: string[]; cycle?: boolean; maps?: { name: string; features: MapFeature[] }[] };

const ASK = "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.";

export const PRACTICE_CHARTS: PracticeChart[] = [
  { kind: "bar", question: `The chart below shows information about household spending in one country in 2000 and 2020. ${ASK}`,
    title: "Household spending by category", unit: "% of spending", labels: ["Housing", "Food", "Transport", "Leisure"],
    series: [{ name: "2000", values: [31, 24, 14, 9] }, { name: "2020", values: [36, 17, 18, 13] }] },
  { kind: "line", question: `The graph below shows the number of visitors to three museums in a city between 2010 and 2020. ${ASK}`,
    title: "Museum visitors, 2010 to 2020", unit: "thousands of visitors", labels: ["2010", "2012", "2014", "2016", "2018", "2020"],
    series: [{ name: "Art", values: [120, 135, 150, 160, 190, 210] }, { name: "History", values: [200, 195, 185, 170, 160, 150] }, { name: "Science", values: [80, 95, 130, 170, 220, 260] }] },
  { kind: "pie", question: `The pie charts below show the sources of electricity in one country in 1990 and 2020. ${ASK}`,
    title: "Sources of electricity", unit: "% of electricity", labels: ["Coal", "Gas", "Nuclear", "Renewables"],
    series: [{ name: "1990", values: [52, 21, 15, 12] }, { name: "2020", values: [24, 30, 12, 34] }] },
  { kind: "table", question: `The table below shows the percentage of households with internet access in four countries in 2000, 2010 and 2020. ${ASK}`,
    title: "Households with internet access", unit: "% of households", labels: ["2000", "2010", "2020"],
    series: [{ name: "Country A", values: [12, 48, 91] }, { name: "Country B", values: [30, 66, 94] }, { name: "Country C", values: [5, 22, 63] }, { name: "Country D", values: [41, 75, 88] }] },
  { kind: "bar", question: `The chart below shows the number of men and women studying four subjects at one university. ${ASK}`,
    title: "University students by subject", unit: "students", labels: ["Engineering", "Medicine", "Law", "Arts"],
    series: [{ name: "Men", values: [820, 540, 390, 280] }, { name: "Women", values: [310, 760, 450, 690] }] },
  { kind: "line", question: `The graph below shows the average monthly rainfall in two cities over one year. ${ASK}`,
    title: "Average monthly rainfall", unit: "millimetres", labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    series: [{ name: "City X", values: [30, 35, 60, 110, 180, 240, 260, 250, 190, 120, 60, 35] }, { name: "City Y", values: [90, 80, 70, 50, 30, 15, 10, 12, 25, 55, 75, 95] }] },
  { kind: "pie", question: `The pie chart below shows how one school spent its budget last year. ${ASK}`,
    title: "School budget", unit: "% of budget", labels: ["Teacher salaries", "Buildings", "Technology", "Books", "Other"],
    series: [{ name: "Last year", values: [58, 17, 11, 9, 5] }] },
  { kind: "bar", question: `The chart below shows how many cinema tickets were bought by three age groups in 2005, 2015 and 2025. ${ASK}`,
    title: "Cinema tickets by age group", unit: "millions of tickets", labels: ["Under 25", "25 to 49", "50 and over"],
    series: [{ name: "2005", values: [48, 35, 12] }, { name: "2015", values: [41, 37, 18] }, { name: "2025", values: [26, 33, 29] }] },
  { kind: "mixed", question: `The line graph below shows the number of people cycling to work in one city between 2000 and 2020, and the table shows how they rated its cycle lanes in 2020. ${ASK}`,
    title: "Cycling to work in one city", unit: "", labels: [], series: [], parts: [
      { kind: "line", question: "", title: "People cycling to work", unit: "thousands", labels: ["2000", "2005", "2010", "2015", "2020"], series: [{ name: "Cyclists", values: [14, 16, 23, 37, 52] }] },
      { kind: "table", question: "", title: "Rating of cycle lanes, 2020", unit: "% of cyclists", labels: ["Good", "Average", "Poor"], series: [{ name: "City centre", values: [62, 28, 10] }, { name: "Suburbs", values: [34, 41, 25] }] },
    ] },
  { kind: "process", question: `The diagram below shows how paper is recycled. ${ASK}`,
    title: "How paper is recycled", unit: "", labels: [], series: [],
    stages: ["Waste paper collected", "Sorted by grade", "Mixed with water to make pulp", "Screened to remove staples", "De-inked and cleaned", "Pulp rolled into sheets", "Sheets dried and cut", "Delivered to shops"] },
  { kind: "process", cycle: true, question: `The diagram below shows the life cycle of a frog. ${ASK}`,
    title: "Life cycle of a frog", unit: "", labels: [], series: [],
    stages: ["Eggs laid in water", "Eggs hatch after 3 weeks", "Tadpole with gills", "Back legs grow at 8 weeks", "Front legs grow at 12 weeks", "Tail shrinks, lungs form", "Adult frog returns to water"] },
  { kind: "map", question: `The two maps below show a town centre in 1990 and today. ${ASK}`,
    title: "Town centre, 1990 and today", unit: "", labels: [], series: [], maps: [
      { name: "1990", features: [
        { label: "Park", where: "north-west", x: 6, y: 8, w: 40, h: 34 }, { label: "Market", where: "north-east", x: 54, y: 8, w: 40, h: 34 },
        { label: "Car park", where: "south-west", x: 6, y: 58, w: 40, h: 34 }, { label: "Houses", where: "south-east", x: 54, y: 58, w: 40, h: 34 }] },
      { name: "Today", features: [
        { label: "Park", where: "north-west, unchanged", x: 6, y: 8, w: 40, h: 34 }, { label: "Shopping centre", where: "north-east, replacing the market", x: 54, y: 8, w: 40, h: 34 },
        { label: "Library", where: "south-west, replacing the car park", x: 6, y: 58, w: 40, h: 34 }, { label: "Flats", where: "south-east, replacing the houses", x: 54, y: 58, w: 40, h: 34 }] },
    ] },
  { kind: "line", question: `The graph below shows the percentage of people using smartphones in three age groups between 2012 and 2024. ${ASK}`,
    title: "Smartphone use by age group", unit: "% of people", labels: ["2012", "2016", "2020", "2024"],
    series: [{ name: "16 to 29", values: [58, 84, 95, 98] }, { name: "30 to 54", values: [33, 67, 87, 93] }, { name: "55 and over", values: [8, 26, 54, 72] }] },
];

/** The exact chart reference sent to the marker. */
export function describeChart(chart: PracticeChart): string {
  if (chart.parts) return `${chart.title}.\n${chart.parts.map(describeChart).join("\n")}`;
  if (chart.stages) return `${chart.cycle ? "Cycle diagram" : "Process diagram"}: ${chart.title}. Stages in order: ${chart.stages.map((step, i) => `${i + 1}. ${step}`).join("; ")}.${chart.cycle ? " The last stage leads back to the first." : ""}`;
  if (chart.maps) return `Two maps: ${chart.title}.\n${chart.maps.map((m) => `${m.name}: ${m.features.map((f) => `${f.label} (${f.where})`).join("; ")}`).join("\n")}`;
  const rows = chart.series.map((s) => `${s.name}: ${s.values.map((v, i) => `${chart.labels[i]} ${v}`).join(", ")}`);
  return `${chart.kind === "table" ? "Table" : chart.kind === "line" ? "Line graph" : chart.kind === "pie" ? "Pie chart" : "Bar chart"}: ${chart.title}. Unit: ${chart.unit}.\n${rows.join("\n")}`;
}
export const practiceChartFor = (question: string) => PRACTICE_CHARTS.find((c) => c.question === question);
export const isPracticeDescription = (text?: string) => !!text && PRACTICE_CHARTS.some((c) => describeChart(c) === text);
/** The sample question to offer next: never the one already on screen, or "Use this question" would appear to do nothing. */
export function offeredQuestion(samples: string[], current: string, index: number) {
  const others = samples.filter((question) => question !== current);
  return others[index % others.length];
}
