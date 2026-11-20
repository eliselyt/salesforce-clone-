"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { saveRecord } from "@/app/(crm)/actions";
import type { FieldDef } from "@/lib/objects";
import type { FormState } from "@/lib/forms";
import type { Option } from "@/lib/picklists";

type Props = {
  objectKey: string;
  recordId: string | null;
  fields: FieldDef[];
  values: Record<string, unknown>;
  options: Record<string, Option[]>;
  cancelHref: string;
  returnPath?: string;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local in the browser's time zone, submitted as an ISO string. */
function DateTimeInput({ name, id, initial }: { name: string; id: string; initial: unknown }) {
  const [local, setLocal] = useState("");
  useEffect(() => {
    if (initial) setLocal(toLocalInput(String(initial)));
  }, [initial]);
  const iso = local ? new Date(local).toISOString() : "";
  return (
    <>
      <input id={id} type="datetime-local" className="input" value={local} onChange={(e) => setLocal(e.target.value)} />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}

function Control({ field, value, options }: { field: FieldDef; value: unknown; options?: Option[] }) {
  const id = `f_${field.name}`;
  const common = { id, name: field.name, required: field.required };
  const str = value === null || value === undefined ? "" : String(value);

  switch (field.type) {
    case "textarea":
      return <textarea {...common} defaultValue={str} rows={4} className="input h-auto py-2" />;
    case "picklist":
    case "lookup":
      return (
        <select {...common} defaultValue={str} className="input">
          <option value="">{field.type === "lookup" ? "— None —" : "--None--"}</option>
          {(options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "boolean":
      return (
        <input
          id={id}
          name={field.name}
          type="checkbox"
          defaultChecked={Boolean(value)}
          className="mt-1.5 h-4 w-4 accent-[#0176d3]"
        />
      );
    case "date":
      return <input {...common} type="date" defaultValue={str.slice(0, 10)} className="input" />;
    case "datetime":
      return <DateTimeInput name={field.name} id={id} initial={value} />;
    case "number":
    case "percent":
      return <input {...common} type="number" step="1" min={0} max={field.type === "percent" ? 100 : undefined} defaultValue={str} className="input" />;
    case "currency":
      return <input {...common} type="number" step="0.01" min={0} defaultValue={str} className="input" />;
    case "email":
      return <input {...common} type="email" defaultValue={str} className="input" />;
    case "phone":
      return <input {...common} type="tel" defaultValue={str} className="input" />;
    default:
      return <input {...common} type="text" defaultValue={str} className="input" />;
  }
}

export function RecordForm({ objectKey, recordId, fields, values, options, cancelHref, returnPath }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveRecord.bind(null, objectKey, recordId),
    null,
  );
  const sections = [...new Set(fields.map((f) => f.section))];

  return (
    <form action={action} className="flex flex-col">
      {returnPath && <input type="hidden" name="__return" value={returnPath} />}
      <div className="space-y-5 p-4 sm:p-6">
        {state?.error && (
          <div className="rounded border border-[#fe5c4c] bg-[#fef1ee] px-4 py-3 text-danger">
            <p className="font-semibold">{state.error}</p>
            {state.fieldErrors && (
              <ul className="mt-1 list-disc pl-5">
                {Object.values(state.fieldErrors).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {sections.map((section) => (
          <fieldset key={section}>
            <legend className="mb-3 w-full rounded bg-[#f3f3f3] px-3 py-1.5 text-[15px] text-ink">{section}</legend>
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 px-1 md:grid-cols-2">
              {fields
                .filter((f) => f.section === section)
                .map((f) => (
                  <div key={f.name} className={f.fullWidth ? "md:col-span-2" : ""}>
                    <label htmlFor={`f_${f.name}`} className="label">
                      {f.required && <abbr title="required" className="mr-0.5 text-danger no-underline">*</abbr>}
                      {f.label}
                    </label>
                    <Control field={f} value={values[f.name]} options={options[f.name]} />
                    {state?.fieldErrors?.[f.name] && <p className="mt-0.5 text-xs text-danger">{state.fieldErrors[f.name]}</p>}
                  </div>
                ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="sticky bottom-0 flex justify-center gap-2 border-t border-line bg-[#f3f3f3] px-4 py-3">
        <Link href={cancelHref} className="btn">
          Cancel
        </Link>
        <button type="submit" className="btn-brand" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
