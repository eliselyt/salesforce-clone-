import type { ObjectDef } from "./objects";
import type { Option } from "./picklists";
import { PICKLISTS } from "./picklists";

export type FormState = { error?: string; fieldErrors?: Record<string, string> } | null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Turns submitted form data into a row for `obj`, whitelisting only the fields
 * declared in the object metadata and coercing each value to its column type.
 */
export function parseRecordForm(obj: ObjectDef, formData: FormData) {
  const values: Record<string, unknown> = {};
  const fieldErrors: Record<string, string> = {};

  for (const f of obj.fields) {
    if (f.readOnly) continue;

    if (f.type === "boolean") {
      values[f.name] = formData.get(f.name) === "on";
      continue;
    }

    const raw = formData.get(f.name);
    const s = typeof raw === "string" ? raw.trim() : "";

    if (!s) {
      if (f.required) fieldErrors[f.name] = `${f.label} is required`;
      values[f.name] = null;
      continue;
    }

    switch (f.type) {
      case "number":
      case "currency":
      case "percent": {
        const n = Number(s.replace(/[$,\s%]/g, ""));
        if (Number.isNaN(n)) fieldErrors[f.name] = `${f.label} must be a number`;
        else if (f.type === "percent" && (n < 0 || n > 100)) fieldErrors[f.name] = `${f.label} must be 0–100`;
        else values[f.name] = f.type === "number" || f.type === "percent" ? Math.round(n) : n;
        break;
      }
      case "lookup":
        if (!UUID_RE.test(s)) fieldErrors[f.name] = `${f.label} is invalid`;
        else values[f.name] = s;
        break;
      case "picklist": {
        const options = f.picklist ? (PICKLISTS[f.picklist] as Option[]) : [];
        if (!options.some((o) => o.value === s)) fieldErrors[f.name] = `${f.label} has an invalid value`;
        else values[f.name] = s;
        break;
      }
      case "date":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) fieldErrors[f.name] = `${f.label} must be a date`;
        else values[f.name] = s;
        break;
      case "datetime": {
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) fieldErrors[f.name] = `${f.label} must be a date/time`;
        else values[f.name] = d.toISOString();
        break;
      }
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) fieldErrors[f.name] = `${f.label} must be a valid email`;
        else values[f.name] = s;
        break;
      case "url":
        values[f.name] = /^https?:\/\//i.test(s) ? s : `https://${s}`;
        break;
      default:
        values[f.name] = s;
    }
  }

  return { values, fieldErrors };
}

export function friendlyDbError(message: string) {
  if (/row-level security/i.test(message)) return "You don't have permission to do that. Only the record owner or a manager can make this change.";
  if (/violates foreign key/i.test(message)) return "This record is referenced by other records and can't be removed.";
  if (/duplicate key/i.test(message)) return "A record with this value already exists.";
  return message;
}
