import Link from "next/link";
import { ObjectIcon } from "./object-icon";

/** Card shell shared by every related list on a record page. */
export function RelatedCard({
  icon,
  color,
  title,
  count,
  newHref,
  children,
}: {
  icon: string;
  color: string;
  title: string;
  count: number;
  newHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <ObjectIcon icon={icon} color={color} size={22} />
          {title} ({count > 10 ? "10+" : count})
        </h2>
        {newHref && (
          <Link href={newHref} className="btn h-7 px-3">
            New
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

export function MiniTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto border-t border-line">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="th">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((c, j) => (
                <td key={j} className="td max-w-[220px] truncate">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
