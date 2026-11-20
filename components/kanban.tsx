"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { updatePicklistField } from "@/app/(crm)/actions";
import { PICKLISTS } from "@/lib/picklists";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";

type Opp = {
  id: string;
  name: string;
  stage: string;
  amount: number | null;
  close_date: string | null;
  account: { id: string; name: string } | null;
};

export function Kanban({ opportunities }: { opportunities: Opp[] }) {
  const [items, moveItem] = useOptimistic(opportunities, (state, { id, stage }: { id: string; stage: string }) =>
    state.map((o) => (o.id === id ? { ...o, stage } : o)),
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const drop = (stage: string) => {
    const id = dragId;
    setDragId(null);
    setOver(null);
    if (!id || items.find((o) => o.id === id)?.stage === stage) return;
    startTransition(async () => {
      moveItem({ id, stage });
      const res = await updatePicklistField("opportunities", id, "stage", stage);
      setError(res && "error" in res ? (res.error ?? null) : null);
    });
  };

  return (
    <div className="bg-[#f3f3f3]">
      {error && <p className="border-b border-line bg-[#fef1ee] px-4 py-2 text-danger">{error}</p>}
      <div className="flex gap-2 overflow-x-auto p-3">
        {PICKLISTS.opportunity_stage.map((s) => {
          const col = items.filter((o) => o.stage === s.value);
          const sum = col.reduce((acc, o) => acc + Number(o.amount ?? 0), 0);
          return (
            <section
              key={s.value}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s.value);
              }}
              onDragLeave={() => setOver((cur) => (cur === s.value ? null : cur))}
              onDrop={() => drop(s.value)}
              className={`flex w-64 shrink-0 flex-col rounded-md border bg-white transition-colors ${
                over === s.value ? "border-brand bg-brand-light" : "border-line"
              }`}
            >
              <header className="border-b border-line px-3 py-2">
                <div className="flex items-center justify-between">
                  <h3 className="truncate font-semibold">{s.label}</h3>
                  <span className="text-xs text-muted">{col.length}</span>
                </div>
                <div className="text-xs text-muted">{formatCompactCurrency(sum)}</div>
              </header>
              <div className="flex min-h-40 flex-1 flex-col gap-2 p-2">
                {col.map((o) => (
                  <article
                    key={o.id}
                    draggable
                    onDragStart={() => setDragId(o.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`cursor-grab rounded border border-line bg-white p-2.5 shadow-sm active:cursor-grabbing ${
                      dragId === o.id ? "opacity-40" : ""
                    }`}
                  >
                    <Link href={`/opportunities/${o.id}`} className="link block truncate font-semibold">
                      {o.name}
                    </Link>
                    {o.account && <div className="truncate text-xs text-muted">{o.account.name}</div>}
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold">{formatCurrency(o.amount) || "—"}</span>
                      <span className="text-muted">{formatDate(o.close_date)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <p className="px-4 pb-3 text-xs text-muted">Drag a card to another column to change its stage.</p>
    </div>
  );
}
