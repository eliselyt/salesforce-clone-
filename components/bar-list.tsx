/**
 * Single-series horizontal bar chart in plain HTML: one hue, values labelled at
 * the bar end, rows readable without color, native tooltip on hover.
 */
export function BarList({
  rows,
  color = "#0176d3",
  emptyText = "No data yet.",
}: {
  rows: { label: string; value: number; display: string; hint?: string; href?: string }[];
  color?: string;
  emptyText?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-6 text-center text-xs text-muted">{emptyText}</p>;

  return (
    <ul className="space-y-[2px]" role="list">
      {rows.map((r) => {
        const pct = Math.max(r.value > 0 ? 2 : 0, (r.value / max) * 100);
        const body = (
          <div className="group grid grid-cols-[minmax(90px,140px)_1fr] items-center gap-3 rounded px-1 py-1.5 hover:bg-[#f3f3f3]" title={`${r.label}: ${r.display}${r.hint ? ` (${r.hint})` : ""}`}>
            <span className="truncate text-xs text-muted">{r.label}</span>
            <span className="flex items-center gap-2">
              <span className="h-3.5 rounded-r-[4px] transition-opacity group-hover:opacity-80" style={{ width: `${pct}%`, background: color }} />
              <span className="shrink-0 text-xs font-semibold text-ink">{r.display}</span>
              {r.hint && <span className="shrink-0 text-xs text-muted">{r.hint}</span>}
            </span>
          </div>
        );
        return <li key={r.label}>{r.href ? <a href={r.href}>{body}</a> : body}</li>;
      })}
    </ul>
  );
}
