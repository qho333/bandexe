import { t as ui, translateUI } from "../lib/i18n";
import { playInteraction } from "../lib/interaction-sound";
import { toast } from "../lib/toast";
import { Fragment } from "react";
import { downloadReport, exportReport, reportContent, type ExportInput } from "../lib/report-export";

export function ReportActions({ input }: { input: ExportInput }) {
  return <div className="report-actions" role="group" aria-label={ui("Export report")}>
    {(["md", "txt", "docx"] as const).map((format) => <button key={format} className="btn btn--sm btn--quiet" onClick={() => {
      try { downloadReport(input, format); } catch { playInteraction("error"); toast("Export unavailable. Use Copy report or Print."); }
    }}>{ui("Export .{value0}", { value0: format })}</button>)}
    <button className="btn btn--sm btn--quiet" data-sound="handled" onClick={async () => {
      try { await navigator.clipboard.writeText(exportReport(input, "txt")); playInteraction("confirm"); toast("Copied"); }
      catch { playInteraction("error"); toast("Copy unavailable. Select the report text or use Print."); }
    }}>{ui("Copy report")}</button>
    <button className="btn btn--sm btn--quiet" data-sound="handled" onClick={() => { playInteraction("confirm"); window.print(); }}>{ui("Print / Save as PDF")}</button>
  </div>;
}

export function PrintableReport({ input }: { input: ExportInput }) {
  const { sections, essayParts } = reportContent(input);
  return <article className="print-report" aria-label={ui("Printable writing report")}>
    <h1>{ui("BAND.EXE writing report")}</h1>
    {sections.map((section) => <section key={section.title}>
      <h2>{translateUI(section.title)}</h2>
      {section.title === "Essay with corrections" ? <p>{essayParts.map((part, i) => <Fragment key={i}>{part.fix === undefined ? part.text : <>[<u>{part.text}</u> → {part.fix}]</>}</Fragment>)}</p>
        : section.lines.length ? section.lines.map((line, i) => <p key={i}>{line}</p>) : <p>{ui("None reported.")}</p>}
    </section>)}
  </article>;
}
