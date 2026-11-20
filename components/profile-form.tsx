"use client";

import { useActionState } from "react";
import { updateMyProfile } from "@/app/(crm)/actions";
import type { FormState } from "@/lib/forms";

export function ProfileForm({ fullName, title, phone }: { fullName: string; title: string; phone: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateMyProfile, null);
  return (
    <form action={action} className="space-y-4 p-6">
      <label className="block">
        <span className="label">Full name</span>
        <input name="full_name" defaultValue={fullName} className="input" />
      </label>
      <label className="block">
        <span className="label">Title</span>
        <input name="title" defaultValue={title} className="input" />
      </label>
      <label className="block">
        <span className="label">Phone</span>
        <input name="phone" type="tel" defaultValue={phone} className="input" />
      </label>
      {state?.error && <p className="text-danger">{state.error}</p>}
      {state && !state.error && !pending && <p className="text-success">Saved.</p>}
      <button type="submit" className="btn-brand" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
