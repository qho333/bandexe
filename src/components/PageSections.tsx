import { Fragment } from "react";
import { contributors } from "../content/contributors";
import { resolveSections } from "../content/pages";
import type { Block } from "../content/pages/schema";
import { languageDirection, type UILanguage } from "../lib/ui-language";

export function PageRuns({ runs }: { runs: Block }) {
  return <>{runs.map((run, i) => typeof run === "string" ? <Fragment key={i}>{run}</Fragment>
    : run.href ? <a key={i} href={run.href} {...(run.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{run.text}</a>
      : <Fragment key={i}>{run.text}</Fragment>)}</>;
}

export default function PageSections({ kind, language }: { kind: "privacy" | "about"; language: UILanguage }) {
  return <>{resolveSections(kind, language).map(({ section, language: code, contributorRole }) => <section key={section.id} id={section.id} lang={code} dir={languageDirection(code)}>
    <h2>{section.heading}</h2>
    {section.id === "privacy-essay" ? <dl>{section.paragraphs.map((block, i) => <Fragment key={i}>
      <dt><PageRuns runs={block.slice(0, 1)} /></dt><dd><PageRuns runs={block.slice(1)} /></dd>
    </Fragment>)}</dl> : section.paragraphs.map((block, i) => <p key={i}><PageRuns runs={block} /></p>)}
    {section.id === "about-contributors" && <ul>{contributors.map((person) => <li key={person.name}>
      {person.name} — {person.role === "creator: idea, design and testing" ? contributorRole : person.role}
      {person.link && <> · <a href={person.link} target="_blank" rel="noopener noreferrer">LinkedIn</a></>}
    </li>)}</ul>}
  </section>)}</>;
}
