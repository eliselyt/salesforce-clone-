"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { addCampaignMember, addLineItem } from "@/app/(crm)/actions";
import type { FormState } from "@/lib/forms";
import { PICKLISTS } from "@/lib/picklists";

function useResetOnSuccess(pending: boolean, state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);
  useEffect(() => {
    if (submitted.current && !pending && !state?.error) ref.current?.reset();
    submitted.current = pending;
  }, [pending, state]);
  return ref;
}

export function LineItemForm({
  opportunityId,
  products,
}: {
  opportunityId: string;
  products: { id: string; name: string; unit_price: number }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(addLineItem.bind(null, opportunityId), null);
  const ref = useResetOnSuccess(pending, state);
  const [price, setPrice] = useState("");

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2 border-t border-line bg-[#fafaf9] px-3 py-3">
      <label className="min-w-48 flex-1">
        <span className="label">Product</span>
        <select
          name="product_id"
          required
          className="input"
          defaultValue=""
          onChange={(e) => setPrice(String(products.find((p) => p.id === e.target.value)?.unit_price ?? ""))}
        >
          <option value="" disabled>
            Select a product…
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="w-20">
        <span className="label">Qty</span>
        <input name="quantity" type="number" min="0.01" step="0.01" defaultValue="1" className="input" />
      </label>
      <label className="w-28">
        <span className="label">Sales Price</span>
        <input name="unit_price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="input" />
      </label>
      <label className="w-24">
        <span className="label">Discount %</span>
        <input name="discount" type="number" min="0" max="100" step="0.01" defaultValue="0" className="input" />
      </label>
      <button type="submit" className="btn" disabled={pending}>
        <Plus size={14} /> Add
      </button>
      {state?.error && <p className="w-full text-xs text-danger">{state.error}</p>}
    </form>
  );
}

export function CampaignMemberForm({
  campaignId,
  leads,
  contacts,
}: {
  campaignId: string;
  leads: { value: string; label: string }[];
  contacts: { value: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(addCampaignMember.bind(null, campaignId), null);
  const ref = useResetOnSuccess(pending, state);

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2 border-t border-line bg-[#fafaf9] px-3 py-3">
      <label className="min-w-56 flex-1">
        <span className="label">Lead or contact</span>
        <select name="member" required className="input" defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          <optgroup label="Contacts">
            {contacts.map((c) => (
              <option key={c.value} value={`contact:${c.value}`}>
                {c.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Leads">
            {leads.map((l) => (
              <option key={l.value} value={`lead:${l.value}`}>
                {l.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label className="w-36">
        <span className="label">Status</span>
        <select name="status" className="input" defaultValue="sent">
          {PICKLISTS.campaign_member_status.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn" disabled={pending}>
        <Plus size={14} /> Add Member
      </button>
      {state?.error && <p className="w-full text-xs text-danger">{state.error}</p>}
    </form>
  );
}
