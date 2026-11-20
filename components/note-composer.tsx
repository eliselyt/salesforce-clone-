"use client";

import { useActionState, useEffect, useRef } from "react";
import { createNote } from "@/app/(crm)/actions";
import type { FormState } from "@/lib/forms";

export function NoteComposer({ related, returnPath }: { related: Record<string, string>; returnPath: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createNote, null);
  const ref = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current && !pending && !state?.error) ref.current?.reset();
    submitted.current = pending;
  }, [pending, state]);

  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="__return" value={returnPath} />
      {Object.entries(related).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input name="title" className="input" placeholder="Title (optional)" />
      <textarea name="body" rows={3} required className="input h-auto py-1.5" placeholder="Write a note…" />
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
      <div className="flex justify-end">
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Saving…" : "Add Note"}
        </button>
      </div>
    </form>
  );
}
