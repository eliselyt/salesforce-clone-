import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { fieldDef, OBJECTS, selectFor, type ObjectKey, type Row } from "@/lib/objects";
import { sanitizeSearch } from "@/lib/queries";
import { ObjectIcon } from "@/components/object-icon";
import { FieldValue } from "@/components/field-value";

export const metadata: Metadata = { title: "Search" };

const SEARCHABLE: ObjectKey[] = ["accounts", "contacts", "leads", "opportunities", "cases", "campaigns", "products"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = sanitizeSearch((await searchParams).q);
  const { supabase } = await requireUser();

  const results = q
    ? await Promise.all(
        SEARCHABLE.map(async (key) => {
          const obj = OBJECTS[key];
          const { data } = await supabase
            .from(obj.table)
            .select(selectFor(obj))
            .or(obj.searchColumns.map((c) => `${c}.ilike.%${q}%`).join(","))
            .limit(10);
          return { obj, rows: (data ?? []) as unknown as Row[] };
        }),
      )
    : [];
  const total = results.reduce((n, r) => n + r.rows.length, 0);

  return (
    <div className="space-y-3">
      <div className="card px-5 py-4">
        <h1 className="text-xl font-semibold">Search Results</h1>
        <p className="text-muted">{q ? `${total} result${total === 1 ? "" : "s"} for “${q}”` : "Type in the search box above to search all records."}</p>
      </div>
      {results
        .filter((r) => r.rows.length)
        .map(({ obj, rows }) => {
          const cols = obj.listColumns.slice(0, 4).map((c) => fieldDef(obj, c));
          return (
            <section key={obj.key} className="card overflow-hidden">
              <h2 className="flex items-center gap-2 px-4 py-3 text-[15px] font-semibold">
                <ObjectIcon icon={obj.icon} color={obj.color} size={22} /> {obj.plural} ({rows.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="th">Name</th>
                      {cols.map((c) => (
                        <th key={c.name} className="th">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="td"><Link href={`/${obj.key}/${r.id}`} className="link">{obj.displayName(r)}</Link></td>
                        {cols.map((c) => (
                          <td key={c.name} className="td max-w-[220px] truncate"><FieldValue field={c} row={r} /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
    </div>
  );
}
