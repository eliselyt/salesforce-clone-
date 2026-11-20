"use client";

import { useState, useTransition } from "react";
import { deleteRecord } from "@/app/(crm)/actions";

export function DeleteButton({ objectKey, recordId, label }: { objectKey: string; recordId: string; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        className="btn"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Delete this ${label.toLowerCase()}? This can't be undone.`)) return;
          start(async () => {
            const res = await deleteRecord(objectKey, recordId);
            if (res?.error) setError(res.error);
          });
        }}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="w-full text-right text-xs text-danger">{error}</p>}
    </>
  );
}
