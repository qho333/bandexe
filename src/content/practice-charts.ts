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
  { kind: "bar", question: `The chart below shows how people travelled to work in one city in 2005 and 2025. ${ASK}`,
    title: "How people travelled to work", unit: "% of workers", labels: ["Car", "Bus", "Train", "Bicycle", "Walking"],
    series: [{ name: "2005", values: [54, 21, 11, 4, 10] }, { name: "2025", values: [38, 18, 19, 13, 12] }] },
  { kind: "bar", question: `The chart below shows the average number of hours per week spent on four activities by teenagers in one country. ${ASK}`,
    title: "Weekly activities of teenagers", unit: "hours per week", labels: ["Homework", "Sport", "Online videos", "Reading"],
    series: [{ name: "Boys", values: [7, 6, 14, 2] }, { name: "Girls", values: [9, 4, 11, 4] }] },
  { kind: "bar", question: `The chart below shows the amount of waste recycled, burned and sent to landfill in one country in 2000, 2010 and 2020. ${ASK}`,
    title: "What happened to household waste", unit: "million tonnes", labels: ["Recycled", "Burned", "Landfill"],
    series: [{ name: "2000", values: [3, 4, 21] }, { name: "2010", values: [8, 6, 15] }, { name: "2020", values: [13, 9, 7] }] },
  { kind: "bar", question: `The chart below shows the number of overseas students at one university by region of origin in 2015 and 2025. ${ASK}`,
    title: "Overseas students by region", unit: "students", labels: ["Asia", "Europe", "Africa", "Americas"],
    series: [{ name: "2015", values: [1450, 820, 310, 260] }, { name: "2025", values: [2380, 640, 590, 340] }] },
  { kind: "bar", question: `The chart below shows the average monthly cost of four items for a family in three cities. ${ASK}`,
    title: "Average monthly family costs", unit: "dollars", labels: ["Rent", "Food", "Transport", "Childcare"],
    series: [{ name: "City A", values: [1800, 650, 180, 900] }, { name: "City B", values: [950, 520, 120, 400] }, { name: "City C", values: [1300, 700, 220, 650] }] },
  { kind: "line", question: `The graph below shows the average price of a cup of coffee and a loaf of bread in one country between 2000 and 2025. ${ASK}`,
    title: "Price of coffee and bread", unit: "cents", labels: ["2000", "2005", "2010", "2015", "2020", "2025"],
    series: [{ name: "Cup of coffee", values: [150, 190, 240, 290, 360, 440] }, { name: "Loaf of bread", values: [120, 130, 150, 180, 210, 260] }] },
  { kind: "line", question: `The graph below shows the number of cars, motorbikes and bicycles sold in one country between 2000 and 2025. ${ASK}`,
    title: "Vehicle sales", unit: "thousands sold", labels: ["2000", "2005", "2010", "2015", "2020", "2025"],
    series: [{ name: "Cars", values: [420, 510, 560, 540, 470, 450] }, { name: "Motorbikes", values: [260, 310, 380, 330, 290, 240] }, { name: "Bicycles", values: [300, 280, 290, 360, 520, 610] }] },
  { kind: "line", question: `The graph below shows the average daily temperature in two cities over one year. ${ASK}`,
    title: "Average daily temperature", unit: "degrees Celsius", labels: ["Jan", "Mar", "May", "Jul", "Sep", "Nov"],
    series: [{ name: "North City", values: [2, 8, 16, 24, 17, 6] }, { name: "South City", values: [26, 24, 18, 14, 18, 24] }] },
  { kind: "line", question: `The graph below shows the percentage of the population aged 65 and over in three countries from 1980 to 2040 (projected). ${ASK}`,
    title: "People aged 65 and over", unit: "% of population", labels: ["1980", "2000", "2020", "2040"],
    series: [{ name: "Country A", values: [9, 14, 22, 31] }, { name: "Country B", values: [6, 8, 12, 19] }, { name: "Country C", values: [4, 5, 7, 11] }] },
  { kind: "line", question: `The graph below shows the number of books borrowed and e-books downloaded from one public library between 2014 and 2024. ${ASK}`,
    title: "Library borrowing", unit: "thousands", labels: ["2014", "2016", "2018", "2020", "2022", "2024"],
    series: [{ name: "Printed books", values: [180, 165, 150, 95, 120, 115] }, { name: "E-books", values: [12, 28, 47, 110, 104, 126] }] },
  { kind: "pie", question: `The pie charts below show how adults in one country spent their free time in 1995 and 2025. ${ASK}`,
    title: "How adults spent their free time", unit: "% of free time", labels: ["TV", "Internet", "Sport", "Friends", "Other"],
    series: [{ name: "1995", values: [42, 3, 16, 27, 12] }, { name: "2025", values: [18, 39, 12, 19, 12] }] },
  { kind: "bar", question: `The chart below shows the main reasons people gave for moving house in one country in 2000 and 2020. ${ASK}`,
    title: "Reasons for moving house", unit: "% of people who moved", labels: ["New job", "Family", "Cheaper home", "Bigger home", "Other"],
    series: [{ name: "2000", values: [28, 24, 11, 29, 8] }, { name: "2020", values: [22, 21, 33, 15, 9] }] },
  { kind: "pie", question: `The pie chart below shows how water is used in an average home in one country. ${ASK}`,
    title: "Water use in the home", unit: "% of water used", labels: ["Showers and baths", "Toilets", "Washing clothes", "Kitchen", "Garden"],
    series: [{ name: "Average home", values: [34, 27, 15, 14, 10] }] },
  { kind: "pie", question: `The pie charts below show the ages of visitors to a national park in 2010 and 2025. ${ASK}`,
    title: "Ages of national park visitors", unit: "% of visitors", labels: ["Under 18", "18-34", "35-54", "55+"],
    series: [{ name: "2010", values: [22, 31, 30, 17] }, { name: "2025", values: [15, 24, 28, 33] }] },
  { kind: "table", question: `The table below shows the average number of hours worked per week and paid holiday days per year in five countries. ${ASK}`,
    title: "Working hours and holidays", unit: "hours per week / days per year", labels: ["Hours per week", "Holiday days"],
    series: [{ name: "Country A", values: [38, 25] }, { name: "Country B", values: [44, 12] }, { name: "Country C", values: [35, 30] }, { name: "Country D", values: [41, 20] }, { name: "Country E", values: [47, 10] }] },
  { kind: "table", question: `The table below shows the number of passengers using four airports in 2010, 2018 and 2024. ${ASK}`,
    title: "Airport passengers", unit: "millions of passengers", labels: ["2010", "2018", "2024"],
    series: [{ name: "Airport W", values: [42, 58, 61] }, { name: "Airport X", values: [18, 31, 44] }, { name: "Airport Y", values: [25, 27, 19] }, { name: "Airport Z", values: [9, 16, 30] }] },
  { kind: "table", question: `The table below shows the percentage of adults who did regular exercise in four age groups in 2005, 2015 and 2025. ${ASK}`,
    title: "Adults doing regular exercise", unit: "% of adults", labels: ["2005", "2015", "2025"],
    series: [{ name: "18 to 29", values: [48, 52, 61] }, { name: "30 to 44", values: [39, 41, 47] }, { name: "45 to 64", values: [27, 35, 44] }, { name: "65 and over", values: [12, 21, 33] }] },
  { kind: "table", question: `The table below shows the amount of energy produced from four sources in one country in 2000, 2012 and 2024. ${ASK}`,
    title: "Energy produced by source", unit: "terawatt hours", labels: ["2000", "2012", "2024"],
    series: [{ name: "Coal", values: [180, 140, 55] }, { name: "Gas", values: [90, 120, 110] }, { name: "Wind", values: [2, 30, 95] }, { name: "Solar", values: [0, 8, 60] }] },
  { kind: "mixed", question: `The bar chart below shows the number of visitors to a seaside town in each season in 2024, and the pie chart shows where they stayed. ${ASK}`,
    title: "Visitors to a seaside town, 2024", unit: "", labels: [], series: [], parts: [
      { kind: "bar", question: "", title: "Visitors by season", unit: "thousands", labels: ["Spring", "Summer", "Autumn", "Winter"], series: [{ name: "Visitors", values: [85, 240, 70, 25] }] },
      { kind: "pie", question: "", title: "Where visitors stayed", unit: "% of visitors", labels: ["Hotels", "Holiday flats", "Campsites", "Day trip"], series: [{ name: "2024", values: [31, 24, 17, 28] }] },
    ] },
  { kind: "mixed", question: `The line graph below shows the number of people using a city's bike-sharing scheme between 2018 and 2024, and the table shows the reasons users gave for their trips in 2024. ${ASK}`,
    title: "City bike-sharing scheme", unit: "", labels: [], series: [], parts: [
      { kind: "line", question: "", title: "Monthly users", unit: "thousands", labels: ["2018", "2020", "2022", "2024"], series: [{ name: "Users", values: [8, 19, 27, 41] }] },
      { kind: "table", question: "", title: "Reasons for trips, 2024", unit: "% of trips", labels: ["Commuting", "Shopping", "Leisure"], series: [{ name: "Weekdays", values: [64, 18, 18] }, { name: "Weekends", values: [12, 31, 57] }] },
    ] },
  { kind: "process", question: `The diagram below shows how chocolate is made from cocoa beans. ${ASK}`,
    title: "How chocolate is made", unit: "", labels: [], series: [],
    stages: ["Cocoa pods harvested", "Beans removed and fermented", "Beans dried in the sun", "Beans roasted", "Shells removed", "Ground into paste", "Mixed with sugar and milk", "Poured into moulds"] },
  { kind: "process", question: `The diagram below shows how drinking water is treated before it reaches homes. ${ASK}`,
    title: "How drinking water is treated", unit: "", labels: [], series: [],
    stages: ["Water taken from river", "Screened to remove debris", "Chemicals added to bind dirt", "Dirt settles in tanks", "Filtered through sand", "Disinfected", "Stored in reservoir", "Piped to homes"] },
  { kind: "process", cycle: true, question: `The diagram below shows the water cycle. ${ASK}`,
    title: "The water cycle", unit: "", labels: [], series: [],
    stages: ["Sun heats sea water", "Water evaporates", "Vapour rises and cools", "Clouds form", "Rain or snow falls", "Water flows into rivers", "Rivers return water to the sea"] },
  { kind: "process", question: `The diagram below shows how glass bottles are recycled. ${ASK}`,
    title: "How glass bottles are recycled", unit: "", labels: [], series: [],
    stages: ["Bottles left in bank", "Collected by lorry", "Sorted by colour", "Washed and labels removed", "Crushed into small pieces", "Melted in furnace", "Shaped into new bottles", "Filled and sold"] },
  { kind: "process", cycle: true, question: `The diagram below shows the life cycle of a butterfly. ${ASK}`,
    title: "Life cycle of a butterfly", unit: "", labels: [], series: [],
    stages: ["Eggs laid on a leaf", "Caterpillar hatches after 5 days", "Caterpillar eats and grows for 2 weeks", "Forms a chrysalis", "Changes inside for 10 days", "Adult butterfly emerges", "Adult finds a mate"] },
  { kind: "map", question: `The two maps below show a village in 2000 and today. ${ASK}`,
    title: "A village, 2000 and today", unit: "", labels: [], series: [], maps: [
      { name: "2000", features: [
        { label: "Farmland", where: "north-west", x: 6, y: 8, w: 40, h: 34 }, { label: "School", where: "north-east", x: 54, y: 8, w: 40, h: 34 },
        { label: "Woodland", where: "south-west", x: 6, y: 58, w: 40, h: 34 }, { label: "Post office", where: "south-east", x: 54, y: 58, w: 40, h: 34 }] },
      { name: "Today", features: [
        { label: "Housing estate", where: "north-west, replacing the farmland", x: 6, y: 8, w: 40, h: 34 }, { label: "School", where: "north-east, unchanged", x: 54, y: 8, w: 40, h: 34 },
        { label: "Woodland", where: "south-west, unchanged", x: 6, y: 58, w: 40, h: 34 }, { label: "Supermarket", where: "south-east, replacing the post office", x: 54, y: 58, w: 40, h: 34 }] },
    ] },
  { kind: "map", question: `The two maps below show a university campus in 2010 and today. ${ASK}`,
    title: "University campus, 2010 and today", unit: "", labels: [], series: [], maps: [
      { name: "2010", features: [
        { label: "Library", where: "north-west", x: 6, y: 8, w: 40, h: 34 }, { label: "Sports field", where: "north-east", x: 54, y: 8, w: 40, h: 34 },
        { label: "Car park", where: "south-west", x: 6, y: 58, w: 40, h: 34 }, { label: "Lecture halls", where: "south-east", x: 54, y: 58, w: 40, h: 34 }] },
      { name: "Today", features: [
        { label: "Library", where: "north-west, unchanged", x: 6, y: 8, w: 40, h: 34 }, { label: "Student flats", where: "north-east, replacing the sports field", x: 54, y: 8, w: 40, h: 34 },
        { label: "Sports centre", where: "south-west, replacing the car park", x: 6, y: 58, w: 40, h: 34 }, { label: "Lecture halls", where: "south-east, unchanged", x: 54, y: 58, w: 40, h: 34 }] },
    ] },
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
