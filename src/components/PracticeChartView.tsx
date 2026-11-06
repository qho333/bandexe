import { describeChart, type PracticeChart } from "../content/practice-charts";

const W = 560, H = 300, PAD = { top: 16, right: 16, bottom: 44, left: 48 };
// Series stay readable in every theme, including Mono and when printed: fill pattern and dash, not colour alone.
const FILL = ["var(--fg)", "url(#pc-hatch)", "none"];
const DASH = [undefined, "7 4", "2 4"];
const SLICE = ["var(--fg)", "url(#pc-hatch)", "var(--fg-dim)", "url(#pc-dots)", "none"];

const Patterns = () => <defs>
  <pattern id="pc-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--bg)" /><line x1="0" y1="0" x2="0" y2="6" stroke="var(--fg)" strokeWidth="2" /></pattern>
  <pattern id="pc-dots" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="var(--bg)" /><circle cx="3" cy="3" r="1.2" fill="var(--fg)" /></pattern>
</defs>;

function niceMax(max: number) {
  const step = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / step * 2) / 2 * step;
}

function Axes({ max, chart, xAt }: { max: number; chart: PracticeChart; xAt: (i: number) => number }) {
  const y = (v: number) => H - PAD.bottom - (v / max) * (H - PAD.top - PAD.bottom);
  return <g className="pc-axis">
    {[0, 0.25, 0.5, 0.75, 1].map((t) => <g key={t}>
      <line x1={PAD.left} x2={W - PAD.right} y1={y(max * t)} y2={y(max * t)} stroke="var(--line)" />
      <text x={PAD.left - 6} y={y(max * t) + 4} textAnchor="end">{Math.round(max * t)}</text>
    </g>)}
    {chart.labels.map((label, i) => <text key={label} x={xAt(i)} y={H - PAD.bottom + 16} textAnchor="middle">{label}</text>)}
  </g>;
}

const Legend = ({ chart }: { chart: PracticeChart }) => <div className="pc-legend" aria-hidden="true">
  {chart.series.map((s, i) => <span key={s.name}>
    <svg width="26" height="12">
      {chart.kind === "line"
        ? <line x1="0" x2="26" y1="6" y2="6" stroke="var(--fg)" strokeWidth="2" strokeDasharray={DASH[i]} />
        : <rect x="1" y="1" width="24" height="10" fill={FILL[i]} stroke="var(--fg)" />}
    </svg>{s.name}
  </span>)}
</div>;

function Pie({ values, labels, cx, cy, r }: { values: number[]; labels: string[]; cx: number; cy: number; r: number }) {
  const total = values.reduce((a, b) => a + b, 0);
  let turn = -0.25;
  return <g>{values.map((v, i) => {
    const from = turn, to = (turn += v / total), mid = (from + to) / 2;
    const at = (t: number, radius = r) => [cx + radius * Math.cos(2 * Math.PI * t), cy + radius * Math.sin(2 * Math.PI * t)];
    const [x1, y1] = at(from), [x2, y2] = at(to), [lx, ly] = at(mid, r + 10);
    return <g key={labels[i]}>
      <path d={`M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 ${v / total > 0.5 ? 1 : 0} 1 ${x2} ${y2}Z`} fill={SLICE[i]} stroke="var(--fg)" />
      <text x={lx} y={ly + 4} textAnchor={lx >= cx ? "start" : "end"}>{labels[i]} {v}%</text>
    </g>;
  })}</g>;
}

const wrap = (text: string, width: number) => {
  const lines: string[] = [""];
  for (const word of text.split(" ")) {
    if (lines[lines.length - 1] && (lines[lines.length - 1] + " " + word).length > width) lines.push(word);
    else lines[lines.length - 1] = (lines[lines.length - 1] + " " + word).trim();
  }
  return lines;
};

function Stages({ chart, label }: { chart: PracticeChart; label: string }) {
  const steps = chart.stages!, perRow = 4, boxW = 116, boxH = 62, gapX = 28, gapY = 34;
  const rows = Math.ceil(steps.length / perRow), height = rows * boxH + (rows - 1) * gapY + 12 + (chart.cycle ? 26 : 0);
  const at = (i: number) => ({ x: 6 + (i % perRow) * (boxW + gapX), y: 6 + Math.floor(i / perRow) * (boxH + gapY) });
  return <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label}>
    <defs><marker id="pc-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="var(--fg)" /></marker></defs>
    {steps.map((step, i) => {
      const { x, y } = at(i), next = i + 1 < steps.length ? at(i + 1) : null;
      return <g key={step}>
        <rect x={x} y={y} width={boxW} height={boxH} fill="var(--bg)" stroke="var(--fg)" />
        <text x={x + 6} y={y + 14} fontWeight="700">{i + 1}</text>
        {wrap(step, 15).map((line, l) => <text key={l} x={x + boxW / 2} y={y + 26 + l * 13} textAnchor="middle">{line}</text>)}
        {next && (next.y === y
          ? <line x1={x + boxW} y1={y + boxH / 2} x2={next.x - 2} y2={y + boxH / 2} stroke="var(--fg)" markerEnd="url(#pc-arrow)" />
          : <polyline points={`${x + boxW / 2},${y + boxH} ${x + boxW / 2},${y + boxH + gapY / 2} ${next.x + boxW / 2},${y + boxH + gapY / 2} ${next.x + boxW / 2},${next.y - 2}`} fill="none" stroke="var(--fg)" markerEnd="url(#pc-arrow)" />)}
      </g>;
    })}
    {chart.cycle && (() => {
      const last = at(steps.length - 1), first = at(0), y = height - 8;
      return <polyline points={`${last.x + boxW / 2},${last.y + boxH} ${last.x + boxW / 2},${y} 3,${y} 3,${first.y + boxH / 2} ${first.x - 1},${first.y + boxH / 2}`} fill="none" stroke="var(--fg)" strokeDasharray="4 3" markerEnd="url(#pc-arrow)" />;
    })()}
  </svg>;
}

function Maps({ chart, label }: { chart: PracticeChart; label: string }) {
  const size = 250;
  return <svg viewBox={`0 0 ${W} ${size + 40}`} role="img" aria-label={label}>
    {chart.maps!.map((map, m) => {
      const ox = m ? W - size - 6 : 6, oy = 6, u = size / 100;
      return <g key={map.name}>
        <rect x={ox} y={oy} width={size} height={size} fill="none" stroke="var(--fg)" />
        <rect x={ox} y={oy + 44 * u} width={size} height={12 * u} fill="var(--line)" />
        <text x={ox + size / 2} y={oy + 50 * u + 4} textAnchor="middle">Main road</text>
        <text x={ox + size - 6} y={oy + 14} textAnchor="end" fontWeight="700">N ↑</text>
        {map.features.map((f) => <g key={f.label}>
          <rect x={ox + f.x * u} y={oy + f.y * u} width={f.w * u} height={f.h * u} fill="var(--bg)" stroke="var(--fg)" />
          {wrap(f.label, 12).map((line, l) => <text key={l} x={ox + (f.x + f.w / 2) * u} y={oy + (f.y + f.h / 2) * u + 4 + l * 13} textAnchor="middle">{line}</text>)}
        </g>)}
        <text x={ox + size / 2} y={oy + size + 22} textAnchor="middle" fontWeight="700">{map.name}</text>
      </g>;
    })}
  </svg>;
}

export default function PracticeChartView({ chart }: { chart: PracticeChart }) {
  const label = describeChart(chart).replace(/\n/g, ". ");
  if (chart.parts) return <div className="practice-chart-group" dir="ltr" lang="en"><p className="field__label">{chart.title}</p>{chart.parts.map((part) => <PracticeChartView key={part.title} chart={part} />)}</div>;
  if (chart.stages) return <figure className="practice-chart" dir="ltr" lang="en"><figcaption>{chart.title}</figcaption><Stages chart={chart} label={label} /></figure>;
  if (chart.maps) return <figure className="practice-chart" dir="ltr" lang="en"><figcaption>{chart.title}</figcaption><Maps chart={chart} label={label} /></figure>;
  if (chart.kind === "table") return <figure className="practice-chart" dir="ltr" lang="en">
    <figcaption>{chart.title} ({chart.unit})</figcaption>
    <table><thead><tr><th scope="col"></th>{chart.labels.map((l) => <th key={l} scope="col">{l}</th>)}</tr></thead>
      <tbody>{chart.series.map((s) => <tr key={s.name}><th scope="row">{s.name}</th>{s.values.map((v, i) => <td key={i}>{v}</td>)}</tr>)}</tbody></table>
  </figure>;
  const max = niceMax(Math.max(...chart.series.flatMap((s) => s.values)));
  const y = (v: number) => H - PAD.bottom - (v / max) * (H - PAD.top - PAD.bottom);
  const band = (W - PAD.left - PAD.right) / chart.labels.length;
  const xAt = (i: number) => PAD.left + band * (i + 0.5);
  return <figure className="practice-chart" dir="ltr" lang="en">
    <figcaption>{chart.title} ({chart.unit})</figcaption>
    {chart.kind === "pie"
      ? <svg viewBox={`0 0 ${W} ${chart.series.length > 1 ? 230 : 240}`} role="img" aria-label={label}><Patterns />
          {chart.series.map((s, i) => {
            const cx = chart.series.length > 1 ? (i ? W * 0.72 : W * 0.28) : W / 2;
            return <g key={s.name}><Pie values={s.values} labels={chart.labels} cx={cx} cy={118} r={chart.series.length > 1 ? 56 : 80} />
              {chart.series.length > 1 && <text x={cx} y={222} textAnchor="middle" fontWeight="700">{s.name}</text>}</g>;
          })}
        </svg>
      : <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}><Patterns />
          <Axes max={max} chart={chart} xAt={xAt} />
          {chart.kind === "bar" && chart.series.map((s, si) => {
            const width = Math.min(34, band * 0.8 / chart.series.length);
            return s.values.map((v, i) => {
              const x = xAt(i) - width * chart.series.length / 2 + width * si;
              return <g key={`${s.name}-${i}`}>
                <rect x={x} y={y(v)} width={width - 2} height={y(0) - y(v)} fill={FILL[si]} stroke="var(--fg)" />
                <text x={x + (width - 2) / 2} y={y(v) - 4} textAnchor="middle" className="pc-value">{v}</text>
              </g>;
            });
          })}
          {chart.kind === "line" && chart.series.map((s, si) => <g key={s.name}>
            <polyline points={s.values.map((v, i) => `${xAt(i)},${y(v)}`).join(" ")} fill="none" stroke="var(--fg)" strokeWidth="2" strokeDasharray={DASH[si]} />
            {s.values.map((v, i) => <circle key={i} cx={xAt(i)} cy={y(v)} r="3" fill="var(--bg)" stroke="var(--fg)" />)}
          </g>)}
        </svg>}
    {chart.kind !== "pie" && <Legend chart={chart} />}
  </figure>;
}
