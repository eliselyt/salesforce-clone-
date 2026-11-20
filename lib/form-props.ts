import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ObjectDef } from "./objects";
import { PICKLISTS, type Option } from "./picklists";
import { lookupOptions } from "./queries";

export async function buildFormProps(supabase: SupabaseClient, obj: ObjectDef, excludeId?: string) {
  const fields = obj.fields.filter((f) => !f.readOnly);
  const options: Record<string, Option[]> = {};

  await Promise.all(
    fields.map(async (f) => {
      if (f.type === "picklist" && f.picklist) {
        options[f.name] = (PICKLISTS[f.picklist] as Option[]).filter((o) => !f.excludeOptions?.includes(o.value));
      } else if (f.type === "lookup" && f.lookup) {
        const opts = await lookupOptions(supabase, f.lookup);
        options[f.name] = excludeId && f.lookup === obj.key ? opts.filter((o) => o.value !== excludeId) : opts;
      }
    }),
  );
  return { fields, options };
}

const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export function defaultValues(obj: ObjectDef, userId: string): Record<string, unknown> {
  const base: Record<string, unknown> = obj.hasOwner ? { owner_id: userId } : {};
  switch (obj.key) {
    case "leads":
      return { ...base, status: "new" };
    case "opportunities":
      return { ...base, stage: "prospecting", close_date: plusDays(30) };
    case "cases":
      return { ...base, status: "new", priority: "medium", origin: "web" };
    case "campaigns":
      return { ...base, status: "planned", is_active: true };
    case "products":
      return { ...base, is_active: true };
    case "activities":
      return { ...base, type: "task", status: "not_started", priority: "normal", due_date: plusDays(1) };
    case "accounts":
      return { ...base, type: "prospect" };
    default:
      return base;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Allow `?account_id=<uuid>` style prefills (used by related-list "New" buttons). */
export function prefillFromQuery(obj: ObjectDef, sp: Record<string, string | undefined>) {
  const out: Record<string, unknown> = {};
  for (const f of obj.fields) {
    const v = sp[f.name];
    if (!v || f.readOnly) continue;
    if (f.type === "lookup" && UUID_RE.test(v)) out[f.name] = v;
    else if (f.type === "picklist" && f.picklist && (PICKLISTS[f.picklist] as Option[]).some((o) => o.value === v)) out[f.name] = v;
  }
  return out;
}
