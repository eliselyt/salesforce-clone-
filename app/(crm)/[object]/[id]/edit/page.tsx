import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { getObject, type Row } from "@/lib/objects";
import { buildFormProps } from "@/lib/form-props";
import { RecordForm } from "@/components/record-form";
import { ObjectIcon } from "@/components/object-icon";

export const metadata: Metadata = { title: "Edit" };

export default async function EditRecordPage({ params }: { params: Promise<{ object: string; id: string }> }) {
  const { object, id } = await params;
  const obj = getObject(object);
  if (!obj || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireUser();

  const [{ data }, { fields, options }] = await Promise.all([
    supabase.from(obj.table).select("*").eq("id", id).maybeSingle(),
    buildFormProps(supabase, obj, id),
  ]);
  if (!data) notFound();
  const row = data as Row;

  return (
    <div className="card mx-auto max-w-4xl overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-6 py-4">
        <ObjectIcon icon={obj.icon} color={obj.color} />
        <div>
          <div className="text-xs text-muted">Edit {obj.label}</div>
          <h1 className="text-xl font-semibold">{obj.displayName(row)}</h1>
        </div>
      </div>
      <RecordForm
        objectKey={obj.key}
        recordId={id}
        fields={fields}
        values={row}
        options={options}
        cancelHref={`/${obj.key}/${id}`}
      />
    </div>
  );
}
