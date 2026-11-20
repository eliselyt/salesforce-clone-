import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { OBJECTS, type Row } from "@/lib/objects";
import { lookupOptions } from "@/lib/queries";
import { ObjectIcon } from "@/components/object-icon";
import { ConvertForm } from "@/components/convert-form";

export const metadata: Metadata = { title: "Convert Lead" };

export default async function ConvertLeadPage({ params }: { params: Promise<{ object: string; id: string }> }) {
  const { object, id } = await params;
  if (object !== "leads" || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireUser();

  const [{ data }, accounts] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).maybeSingle(),
    lookupOptions(supabase, "accounts"),
  ]);
  if (!data) notFound();
  const lead = data as Row;
  if (lead.status === "converted") redirect(`/leads/${id}`);

  const name = OBJECTS.leads.displayName(lead);
  const company = String(lead.company ?? "");
  const match = accounts.find((a) => a.label.toLowerCase() === company.toLowerCase());

  return (
    <div className="card mx-auto max-w-3xl overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-6 py-4">
        <ObjectIcon icon="star" color={OBJECTS.leads.color} />
        <div>
          <div className="text-xs text-muted">Convert Lead</div>
          <h1 className="text-xl font-semibold">{name}</h1>
        </div>
      </div>
      <ConvertForm
        leadId={id}
        personName={name}
        company={company}
        accounts={accounts}
        suggestedAccountId={match?.value}
      />
    </div>
  );
}
