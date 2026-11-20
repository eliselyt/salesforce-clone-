import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lookupMeta, type LookupTarget, type ObjectDef, type ListView, type Row } from "./objects";

export const PAGE_SIZE = 25;

export function nameSortColumn(obj: ObjectDef) {
  const cols = obj.nameSelect.split(",");
  return cols.includes("last_name") ? "last_name" : cols[0]!;
}

/** Strip characters that have meaning inside a PostgREST `or=(...)` filter. */
export function sanitizeSearch(q: string | undefined) {
  return (q ?? "").replace(/[%,()*\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

// The PostgREST builder's generic types are deep; a structural type keeps this helper reusable.
type Filterable = {
  eq(column: string, value: unknown): Filterable;
  neq(column: string, value: unknown): Filterable;
  not(column: string, operator: string, value: unknown): Filterable;
};

export function applyListView<Q>(query: Q, view: ListView, userId: string): Q {
  let q = query as unknown as Filterable;
  if (view.mine) q = q.eq("owner_id", userId);
  for (const [k, v] of Object.entries(view.eq ?? {})) q = q.eq(k, v);
  for (const [k, v] of Object.entries(view.neq ?? {})) q = q.neq(k, v);
  for (const [k, v] of Object.entries(view.notIn ?? {})) q = q.not(k, "in", `(${v.join(",")})`);
  return q as unknown as Q;
}

/** Options for a lookup <select>. */
export async function lookupOptions(supabase: SupabaseClient, target: LookupTarget, limit = 500) {
  const meta = lookupMeta(target);
  let q = supabase.from(meta.table).select(`id,${meta.nameSelect}`).limit(limit);
  if (target === "users") q = q.eq("is_active", true).order("full_name");
  else q = q.order(meta.nameSelect.includes("last_name") ? "last_name" : meta.nameSelect.split(",")[0]!);
  const { data } = await q;
  return ((data ?? []) as unknown as Row[]).map((r) => ({ value: r.id, label: meta.displayName(r) }));
}
