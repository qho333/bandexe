import { afterEach, describe, expect, it, vi } from "vitest";
import raw from "../server/fixtures/sample-report.fixture.json?raw";
import { markFree, helperFree } from "../shared/free.js";
import { foreignScript } from "../shared/language.js";
import { validateMarkRequest } from "../shared/index.js";

const essay = "Working from home has became normal. " + "More people can work from home today. ".repeat(40);
const checked = validateMarkRequest({ task: "t2", question: "Discuss working from home.", essay, feedbackLanguage: "vi" });
if (!checked.ok) throw new Error(checked.error);
const reply = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }));
const env = { MISTRAL_API_KEY: "m" };
afterEach(() => vi.restoreAllMocks());

describe("feedback in the wrong alphabet", () => {
  it("spots letters the chosen language does not use, and allows its own", () => {
    expect(foreignScript("Bài viết tốt ดีมาก", "vi")).toBe(true);
    expect(foreignScript("Bài viết tốt. \"has became\" → \"has become\"", "vi")).toBe(false);
    expect(foreignScript("ดีมาก, \"has became\"", "th")).toBe(false);
    expect(foreignScript("良い文章です", "ja")).toBe(false);
    expect(foreignScript("좋은 글 ดี", "ko")).toBe(true);
  });
  it("asks the marker again when Thai slips into Vietnamese feedback, and keeps the clean report", async () => {
    const mixed = raw.replace(/("summary"\s*:\s*")/, "$1ดีมาก ");
    expect(mixed).not.toBe(raw);
    const fetchFn = vi.fn().mockResolvedValueOnce(reply(mixed)).mockResolvedValueOnce(reply(raw));
    const result = await markFree(checked.value, env, { fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String((fetchFn.mock.calls[1] as [string, RequestInit])[1].body)).messages.at(-1).content).toContain("Tiếng Việt");
    expect(foreignScript(JSON.stringify(result.report), "vi")).toBe(false);
  });
  it("does the same for helper replies, and keeps the first reply if the retry is no better", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(reply("Hãy thêm ví dụ ดี")).mockResolvedValueOnce(reply("Hãy thêm một ví dụ cụ thể."));
    expect((await helperFree({ role: "coach", message: "Gợi ý?", feedbackLanguage: "vi", history: [], task: "t2", taskQuestion: "", paragraph: "" }, env, { fetchFn })).reply).toBe("Hãy thêm một ví dụ cụ thể.");
    const twice = vi.fn(async () => reply("Hãy thêm ví dụ ดี"));
    expect((await helperFree({ role: "coach", message: "Gợi ý?", feedbackLanguage: "vi", history: [], task: "t2", taskQuestion: "", paragraph: "" }, env, { fetchFn: twice })).reply).toBe("Hãy thêm ví dụ ดี");
    expect(twice).toHaveBeenCalledTimes(2);
  });
});
