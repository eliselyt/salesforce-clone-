"use client";

import { useOptimistic, useTransition } from "react";
import { setActivityCompleted } from "@/app/(crm)/actions";

export function ActivityCheckbox({ id, completed, returnPath }: { id: string; completed: boolean; returnPath: string }) {
  const [checked, setChecked] = useOptimistic(completed);
  const [, start] = useTransition();
  return (
    <input
      type="checkbox"
      aria-label={checked ? "Mark incomplete" : "Mark complete"}
      checked={checked}
      onChange={(e) => {
        const next = e.target.checked;
        start(async () => {
          setChecked(next);
          await setActivityCompleted(id, next, returnPath);
        });
      }}
      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#3ba755]"
    />
  );
}
