"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { convertLead } from "@/app/(crm)/actions";
import type { FormState } from "@/lib/forms";
import type { Option } from "@/lib/picklists";
import { ObjectIcon } from "./object-icon";

export function ConvertForm({
  leadId,
  personName,
  company,
  accounts,
  suggestedAccountId,
}: {
  leadId: string;
  personName: string;
  company: string;
  accounts: Option[];
  suggestedAccountId?: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(convertLead.bind(null, leadId), null);
  const [mode, setMode] = useState<"new" | "existing">(suggestedAccountId ? "existing" : "new");
  const [skipOpp, setSkipOpp] = useState(false);

  return (
    <form action={action}>
      <div className="space-y-4 p-6">
        {suggestedAccountId && (
          <p className="rounded bg-brand-light px-3 py-2 text-brand">
            An account named “{company}” already exists — we selected it for you.
          </p>
        )}

        <section className="rounded border border-line">
          <h2 className="flex items-center gap-2 border-b border-line bg-[#f3f3f3] px-4 py-2 font-semibold">
            <ObjectIcon icon="building" color="#5867e8" size={20} /> Account
          </h2>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <label className="flex items-start gap-2">
              <input type="radio" name="account_mode" value="new" checked={mode === "new"} onChange={() => setMode("new")} className="mt-1 accent-[#0176d3]" />
              <span>
                <span className="block font-semibold">Create New</span>
                <span className="text-muted">Account name: {company}</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="account_mode" value="existing" checked={mode === "existing"} onChange={() => setMode("existing")} className="mt-1 accent-[#0176d3]" />
              <span className="flex-1">
                <span className="block font-semibold">Choose Existing</span>
                <select name="existing_account_id" defaultValue={suggestedAccountId ?? ""} disabled={mode !== "existing"} className="input mt-1">
                  <option value="">Search accounts…</option>
                  {accounts.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </div>
        </section>

        <section className="rounded border border-line">
          <h2 className="flex items-center gap-2 border-b border-line bg-[#f3f3f3] px-4 py-2 font-semibold">
            <ObjectIcon icon="user" color="#a094ed" size={20} /> Contact
          </h2>
          <p className="p-4">
            A new contact <strong>{personName}</strong> will be created with this lead’s details, and its activities and notes will move to it.
          </p>
        </section>

        <section className="rounded border border-line">
          <h2 className="flex items-center gap-2 border-b border-line bg-[#f3f3f3] px-4 py-2 font-semibold">
            <ObjectIcon icon="crown" color="#fcb95b" size={20} /> Opportunity
          </h2>
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="label">Opportunity Name</span>
              <input name="opportunity_name" defaultValue={`${company} - New Business`} disabled={skipOpp} className="input" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="skip_opportunity" checked={skipOpp} onChange={(e) => setSkipOpp(e.target.checked)} className="accent-[#0176d3]" />
              Don’t create an opportunity upon conversion
            </label>
          </div>
        </section>

        {state?.error && <p className="rounded bg-[#fef1ee] px-3 py-2 text-danger">{state.error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-line bg-[#f3f3f3] px-6 py-3">
        <Link href={`/leads/${leadId}`} className="btn">
          Cancel
        </Link>
        <button type="submit" className="btn-brand" disabled={pending}>
          {pending ? "Converting…" : "Convert"}
        </button>
      </div>
    </form>
  );
}
