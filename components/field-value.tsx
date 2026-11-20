import Link from "next/link";
import { Check } from "lucide-react";
import { displayValue } from "@/lib/format";
import { lookupAlias, type FieldDef } from "@/lib/objects";

/** Rich (linked) rendering of a field value for record pages and list views. */
export function FieldValue({ field, row }: { field: FieldDef; row: Record<string, unknown> }) {
  const raw = row[field.name];
  const text = displayValue(field, row);

  if (field.type === "boolean") {
    return raw ? (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-brand text-white">
        <Check size={12} strokeWidth={3} />
      </span>
    ) : (
      <span className="inline-block h-4 w-4 rounded-sm border border-[#c9c9c9]" />
    );
  }
  if (!text) return <span className="text-[#939393]"></span>;

  switch (field.type) {
    case "lookup": {
      const rel = row[lookupAlias(field.name)] as { id?: string } | null;
      if (field.lookup === "users" || !rel?.id) return <span>{text}</span>;
      return (
        <Link href={`/${field.lookup}/${rel.id}`} className="link">
          {text}
        </Link>
      );
    }
    case "email":
      return (
        <a href={`mailto:${text}`} className="link">
          {text}
        </a>
      );
    case "phone":
      return (
        <a href={`tel:${text}`} className="link">
          {text}
        </a>
      );
    case "url":
      return (
        <a href={text} target="_blank" rel="noreferrer noopener" className="link">
          {text.replace(/^https?:\/\//, "")}
        </a>
      );
    case "textarea":
      return <span className="whitespace-pre-wrap">{text}</span>;
    default:
      return <span>{text}</span>;
  }
}
