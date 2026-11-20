import { picklistLabel } from "./picklists";
import { lookupAlias, lookupMeta, type FieldDef } from "./objects";

const currencyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const currencyFmtCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function formatCurrency(v: unknown, cents = false) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return "";
  return (cents || !Number.isInteger(n) ? currencyFmtCents : currencyFmt).format(n);
}

export function formatCompactCurrency(v: unknown) {
  const n = Number(v ?? 0);
  return `$${compactFmt.format(n)}`;
}

export function formatDate(v: unknown) {
  if (!v) return "";
  const s = String(v);
  // Plain dates (YYYY-MM-DD) are calendar dates — don't shift them across time zones.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : new Date(s);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(s) ? "UTC" : undefined,
  });
}

export function formatDateTime(v: unknown) {
  if (!v) return "";
  return new Date(String(v)).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Plain-text rendering of any field value (lookups use the embedded relation). */
export function displayValue(field: FieldDef, row: Record<string, unknown>): string {
  const v = row[field.name];
  switch (field.type) {
    case "currency":
      return formatCurrency(v);
    case "percent":
      return v === null || v === undefined ? "" : `${v}%`;
    case "number":
      return v === null || v === undefined ? "" : Number(v).toLocaleString("en-US");
    case "date":
      return formatDate(v);
    case "datetime":
      return formatDateTime(v);
    case "boolean":
      return v ? "Yes" : "No";
    case "picklist":
      return field.picklist ? picklistLabel(field.picklist, v) : String(v ?? "");
    case "lookup": {
      const rel = row[lookupAlias(field.name)] as Record<string, unknown> | null | undefined;
      if (!rel || !field.lookup) return "";
      return lookupMeta(field.lookup).displayName(rel);
    }
    default:
      return v === null || v === undefined ? "" : String(v);
  }
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
