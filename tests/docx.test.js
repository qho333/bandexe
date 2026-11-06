import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import raw from "../server/fixtures/sample-report.fixture.json";
import { reviewReport } from "../shared/review.js";
import { docxParts, exportDocx, xmlEscape } from "../src/lib/docx";
import { crc32, storeZip } from "../src/lib/zip";
import { exportReport } from "../src/lib/report-export";

const essay = 'Working from home has became normal. <tag> & "quoted"\n\nTiếng Việt 中文 العربية';
const input = { essay, date: "2026-10-26", states: {}, result: { task: "t2", words: 50, overall: 6, range: { lo: 5, hi: 7 },
  markingVersion: "test", checker: "free", label: "AI practice estimate (open model, uncalibrated)", report: reviewReport(raw, essay) } };

describe("Office Open XML without packages", () => {
  it("has the standard CRC-32 vector and byte-correct store-only central-directory offsets", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    const bytes = storeZip([{ name: "a.txt", data: "123456789" }, { name: "中文.txt", data: "Tiếng Việt" }]);
    const view = new DataView(bytes.buffer), end = bytes.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50); expect(view.getUint16(end + 10, true)).toBe(2);
    const start = view.getUint32(end + 16, true); let directory = start;
    for (let i = 0; i < 2; i++) {
      expect(view.getUint32(directory, true)).toBe(0x02014b50);
      const local = view.getUint32(directory + 42, true), length = view.getUint16(directory + 28, true);
      expect(view.getUint32(local, true)).toBe(0x04034b50);
      expect(view.getUint16(local + 8, true)).toBe(0); // no compression
      const dataStart = local + 30 + view.getUint16(local + 26, true);
      const size = view.getUint32(directory + 24, true);
      expect(view.getUint32(directory + 16, true)).toBe(crc32(bytes.slice(dataStart, dataStart + size)));
      expect(bytes.slice(directory + 46, directory + 46 + length)).toEqual(bytes.slice(local + 30, dataStart));
      directory += 46 + length;
    }
    expect(directory).toBe(end); expect(view.getUint32(end + 12, true)).toBe(end - start);
  });
  it("opens with the independent Python ZIP/XML readers, with escaped Unicode and matching report content", () => {
    const parts = docxParts(input), bytes = exportDocx(input);
    const verified = JSON.parse(execFileSync("python3", ["-c", `import sys,io,zipfile,json,xml.etree.ElementTree as E
z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))
assert z.testzip() is None
for n in z.namelist(): E.fromstring(z.read(n))
doc=E.fromstring(z.read('word/document.xml'))
print(json.dumps({'names':z.namelist(),'text':[e.text or '' for e in doc.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')]}))`], { input: bytes, encoding: "utf8" }));
    expect(verified.names).toEqual(parts.map((p) => p.name));
    expect(verified.text.join("\n")).toContain('[has became → has become]');
    expect(verified.text.join("\n")).toContain('<tag> & "quoted"');
    expect(verified.text.join("\n")).toContain("Tiếng Việt 中文 العربية");
    expect(exportReport(input, "md")).toContain('[has became → has become]');
    expect(parts.find((p) => p.name === "word/document.xml").data).toContain("&lt;tag&gt; &amp; &quot;quoted&quot;");
  });
  it("omits every assessed band for feedback-only exports and strips invalid XML controls", () => {
    const fb = { ...input, result: { ...input.result, feedbackOnly: true, label: "Feedback only" } };
    const doc = docxParts(fb).find((p) => p.name === "word/document.xml").data;
    expect(doc).not.toMatch(/Band:|Likely range:|band estimate.*6\.0|TR.*: 6/);
    expect(doc).toContain("Feedback only"); expect(xmlEscape("<>&\"'\u0000\u000b")).toBe("&lt;&gt;&amp;&quot;&apos;");
  });
});
