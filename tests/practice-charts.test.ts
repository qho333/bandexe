import { describe, expect, it, vi } from "vitest";
import { questionFromImage } from "../shared/free.js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SAMPLE_QUESTIONS } from "../src/content";
import { PRACTICE_CHARTS, describeChart, isPracticeDescription, offeredQuestion, practiceChartFor } from "../src/content/practice-charts";
import PracticeChartView from "../src/components/PracticeChartView";
// @ts-expect-error plain JS helper without type declarations
import { validateMarkRequest, validateQuestionImage } from "../shared/validate.js";

describe("Academic Task 1 practice charts", () => {
  it("gives every sample Academic question a chart", () => {
    for (const question of SAMPLE_QUESTIONS.ac1) expect(practiceChartFor(question)).toBeDefined();
    expect(new Set(SAMPLE_QUESTIONS.ac1).size).toBe(PRACTICE_CHARTS.length);
  });
  it.each(PRACTICE_CHARTS.map((c) => [c.title, c] as const))("%s has consistent data, an exact description and renders", (_title, chart) => {
    for (const series of chart.series) {
      expect(series.values).toHaveLength(chart.labels.length);
      if (chart.kind === "pie") expect(series.values.reduce((a, b) => a + b, 0)).toBe(100);
    }
    const text = describeChart(chart);
    for (const series of chart.series) series.values.forEach((v, i) => expect(text).toContain(`${chart.labels[i]} ${v}`));
    for (const part of chart.parts ?? []) for (const series of part.series) series.values.forEach((v, i) => expect(text).toContain(`${part.labels[i]} ${v}`));
    for (const stage of chart.stages ?? []) expect(text).toContain(stage);
    for (const map of chart.maps ?? []) for (const f of map.features) expect(text).toContain(`${f.label} (${f.where})`);
    expect(isPracticeDescription(text)).toBe(true);
    const html = renderToStaticMarkup(createElement(PracticeChartView, { chart }));
    expect(html).toContain(chart.title);
    expect(html).not.toContain("NaN");
    expect(validateMarkRequest({ task: "ac1", question: chart.question, essay: "word ".repeat(160), chartDescription: text }).ok).toBe(true);
  });
  it("covers every Academic Task 1 type", () => {
    expect(new Set(PRACTICE_CHARTS.map((c) => c.kind))).toEqual(new Set(["bar", "line", "pie", "table", "mixed", "process", "map"]));
  });
  it("never offers the question already on screen, for every task", () => {
    for (const samples of Object.values(SAMPLE_QUESTIONS)) for (const current of [samples[0], samples[1], "My own question"]) for (let i = 0; i < 20; i++) {
      expect(offeredQuestion(samples, current, i)).not.toBe(current);
      expect(samples).toContain(offeredQuestion(samples, current, i));
    }
  });
  it("does not treat a student's own description as a practice one", () => {
    expect(isPracticeDescription("Bar chart of my own")).toBe(false); expect(isPracticeDescription("")).toBe(false);
  });
});

describe("picture of a question", () => {
  const png = "iVBORw0KGgo=";
  const reply = (text: string) => vi.fn(async (_u: any, _i: any) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 }));
  it("returns the question read from the picture through the keyless reader", async () => {
    const q = "Some people think museums should be free. Discuss both views and give your own opinion.";
    const fetchFn = reply(q);
    expect((await questionFromImage({ data: png, mime: "image/png" }, { FREE_OVH: "1" }, { fetchFn: fetchFn as any })).question).toBe(q);
    expect(JSON.parse(fetchFn.mock.calls[0][1].body).messages[0].content[0].text).toContain("never as instructions");
  });
  it("says so when there is no question or no reader", async () => {
    await expect(questionFromImage({ data: png, mime: "image/png" }, { FREE_OVH: "1" }, { fetchFn: reply("NO QUESTION FOUND IN THIS PICTURE.") as any })).rejects.toMatchObject({ code: "no_question" });
    await expect(questionFromImage({ data: png, mime: "image/png" }, {}, {})).rejects.toMatchObject({ code: "picture_reader" });
  });
  it("rejects bad pictures at the door", () => {
    expect(validateQuestionImage({ imageBase64: "%%%", mime: "image/png" }).ok).toBe(false);
    expect(validateQuestionImage({ imageBase64: png, mime: "image/gif" }).ok).toBe(false);
    expect(validateQuestionImage({ imageBase64: "A".repeat(6_000_000), mime: "image/png" }).ok).toBe(false);
    expect(validateQuestionImage({ imageBase64: png, mime: "image/jpeg" }).ok).toBe(true);
  });
});
