import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowDown, ArrowUp, Columns3, List, Plus, Search } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { fieldDef, getObject, selectFor, type Row } from "@/lib/objects";
import { applyListView, nameSortColumn, PAGE_SIZE, sanitizeSearch } from "@/lib/queries";
import { ObjectIcon } from "@/components/object-icon";
import { FieldValue } from "@/components/field-value";
import { ViewSelect } from "@/components/view-select";
import { Kanban } from "@/components/kanban";

type SP = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ object: string }> }): Promise<Metadata> {
  const obj = getObject((await params).object);
  return { title: obj?.plural ?? "Not found" };
}

export default async function ListPage({ params, searchParams }: { params: Promise<{ object: string }>; searchParams: SP }) {
  const obj = getObject((await params).object);
  if (!obj) notFound();
  const sp = await searchParams;
  const { supabase, user } = await requireUser();

  const view = obj.listViews.find((v) => v.key === sp.view) ?? obj.listViews[0]!;
  const q = sanitizeSearch(sp.q);
  const isKanban = obj.key === "opportunities" && sp.mode === "kanban";
  const page = Math.max(1, Number(sp.page) || 1);

  const nameCol = nameSortColumn(obj);
  const sortable = new Set([nameCol, "created_at", ...obj.fields.filter((f) => f.type !== "lookup").map((f) => f.name)]);
  const sort = sp.sort && sortable.has(sp.sort) ? sp.sort : obj.defaultSort.column;
  const ascending = sp.sort ? sp.dir !== "desc" : obj.defaultSort.ascending;

  let query = supabase.from(obj.table).select(selectFor(obj), { count: "exact" });
  query = applyListView(query, view, user.id);
  if (q) query = query.or(obj.searchColumns.map((c) => `${c}.ilike.%${q}%`).join(","));
  query = query.order(sort, { ascending, nullsFirst: false }).order("id");
  query = isKanban ? query.limit(300) : query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data, count, error } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    return `/${obj.key}?${next.toString()}`;
  };
  const sortLabel = sort === nameCol ? `${obj.label} Name` : fieldDef(obj, sort).label;
  const columns = obj.listColumns.map((c) => fieldDef(obj, c));

  return (
    <div className="card overflow-hidden">
      {/* List header */}
      <div className="border-b border-line bg-[#f3f3f3] px-4 pt-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ObjectIcon icon={obj.icon} color={obj.color} />
            <div>
              <div className="text-xs text-muted">{obj.plural}</div>
              <ViewSelect views={obj.listViews.map(({ key, label }) => ({ key, label }))} current={view.key} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {obj.key === "opportunities" && (
              <div className="flex overflow-hidden rounded border border-[#c9c9c9] bg-white">
                <Link
                  href={href({ mode: undefined })}
                  title="Table"
                  className={`flex h-8 w-9 items-center justify-center ${!isKanban ? "bg-brand text-white" : "text-muted hover:bg-page"}`}
                >
                  <List size={16} />
                </Link>
                <Link
                  href={href({ mode: "kanban", page: undefined })}
                  title="Kanban"
                  className={`flex h-8 w-9 items-center justify-center border-l border-[#c9c9c9] ${isKanban ? "bg-brand text-white" : "text-muted hover:bg-page"}`}
                >
                  <Columns3 size={16} />
                </Link>
              </div>
            )}
            <Link href={`/${obj.key}/new`} className="btn">
              <Plus size={14} /> New
            </Link>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">
            {total} {total === 1 ? "item" : "items"} · Sorted by {sortLabel}
            {q && <> · Filtered by “{q}”</>}
          </p>
          <form className="relative w-full sm:w-72">
            {Object.entries(sp)
              .filter(([k, v]) => v && !["q", "page"].includes(k))
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#747474]" />
            <input name="q" defaultValue={sp.q} placeholder="Search this list…" className="input pl-8" />
          </form>
        </div>
      </div>

      {error && <p className="px-4 py-3 text-danger">{error.message}</p>}

      {isKanban ? (
        <Kanban
          opportunities={rows.map((r) => ({
            id: r.id,
            name: String(r.name),
            stage: String(r.stage),
            amount: (r.amount as number | null) ?? null,
            close_date: (r.close_date as string | null) ?? null,
            account: (r.account as { id: string; name: string } | null) ?? null,
          }))}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th w-10 text-center font-normal"></th>
                  {[{ name: nameCol, label: `${obj.label === "Task" ? "Subject" : `${obj.label} Name`}`, sortable: true }, ...columns.map((c) => ({ name: c.name, label: c.label, sortable: sortable.has(c.name) }))].map(
                    (c) => (
                      <th key={c.name} className="th">
                        {c.sortable ? (
                          <Link
                            href={href({ sort: c.name, dir: sort === c.name && ascending ? "desc" : "asc", page: undefined })}
                            className="inline-flex items-center gap-1 hover:text-ink"
                          >
                            {c.label}
                            {sort === c.name && (ascending ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </Link>
                        ) : (
                          c.label
                        )}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-[#f3f3f3]/60">
                    <td className="td text-center text-xs text-muted">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="td max-w-[280px] truncate">
                      <Link href={`/${obj.key}/${r.id}`} className="link">
                        {obj.displayName(r) || "(untitled)"}
                      </Link>
                    </td>
                    {columns.map((c) => (
                      <td key={c.name} className="td max-w-[240px] truncate">
                        <FieldValue field={c} row={r} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-muted">
                <ObjectIcon icon={obj.icon} color={obj.color} size={48} />
                <p>{q ? "No records match your search." : `No ${obj.plural.toLowerCase()} to show in this view yet.`}</p>
                <Link href={`/${obj.key}/new`} className="btn-brand">
                  New {obj.label}
                </Link>
              </div>
            )}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-muted">
              <span>
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={href({ page: String(page - 1) })} className="btn h-7">
                    Previous
                  </Link>
                )}
                {page < pages && (
                  <Link href={href({ page: String(page + 1) })} className="btn h-7">
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
