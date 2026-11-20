import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { getObject } from "@/lib/objects";
import { buildFormProps, defaultValues, prefillFromQuery } from "@/lib/form-props";
import { RecordForm } from "@/components/record-form";
import { ObjectIcon } from "@/components/object-icon";

export async function generateMetadata({ params }: { params: Promise<{ object: string }> }): Promise<Metadata> {
  const obj = getObject((await params).object);
  return { title: obj ? `New ${obj.label}` : "Not found" };
}

export default async function NewRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ object: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const obj = getObject((await params).object);
  if (!obj) notFound();
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const { fields, options } = await buildFormProps(supabase, obj);
  const values = { ...defaultValues(obj, user.id), ...prefillFromQuery(obj, sp) };
  const back = typeof sp.return === "string" && sp.return.startsWith("/") && !sp.return.startsWith("//") ? sp.return : undefined;

  return (
    <div className="card mx-auto max-w-4xl overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-6 py-4">
        <ObjectIcon icon={obj.icon} color={obj.color} />
        <h1 className="text-xl font-semibold">New {obj.label}</h1>
      </div>
      <RecordForm
        objectKey={obj.key}
        recordId={null}
        fields={fields}
        values={values}
        options={options}
        cancelHref={back ?? `/${obj.key}`}
        returnPath={back}
      />
    </div>
  );
}
