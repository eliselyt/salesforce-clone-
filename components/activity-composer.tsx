"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarDays, CheckSquare, Mail, Phone } from "lucide-react";
import { createActivity } from "@/app/(crm)/actions";
import type { FormState } from "@/lib/forms";

const TABS = [
  { type: "task", label: "New Task", icon: CheckSquare, color: "#3ba755" },
  { type: "call", label: "Log a Call", icon: Phone, color: "#48c3cc" },
  { type: "meeting", label: "New Event", icon: CalendarDays, color: "#cb65ff" },
  { type: "email", label: "Email", icon: Mail, color: "#939393" },
] as const;

export function ActivityComposer({ related, returnPath }: { related: Record<string, string>; returnPath: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["type"]>("task");
  const [state, action, pending] = useActionState<FormState, FormData>(createActivity, null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current && !pending && !state?.error) formRef.current?.reset();
    submitted.current = pending;
  }, [pending, state]);

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  return (
    <div>
      <div className="grid grid-cols-4 gap-1">
        {TABS.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => setTab(t.type)}
            className={`flex flex-col items-center gap-1 rounded border px-1 py-1.5 text-[11px] ${
              tab === t.type ? "border-brand bg-brand-light text-brand" : "border-line text-muted hover:bg-page"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded" style={{ background: t.color }}>
              <t.icon size={14} color="#fff" />
            </span>
            {t.label}
          </button>
        ))}
      </div>
      <form ref={formRef} action={action} className="mt-3 space-y-2">
        <input type="hidden" name="type" value={tab} />
        <input type="hidden" name="__return" value={returnPath} />
        {Object.entries(related).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input
          name="subject"
          required
          className="input"
          placeholder={tab === "call" ? "Call summary" : tab === "email" ? "Email subject" : tab === "meeting" ? "Meeting title" : "Task subject"}
        />
        {tab === "task" && (
          <div className="flex gap-2">
            <input name="due_date" type="date" defaultValue={tomorrow} className="input" aria-label="Due date" />
            <select name="priority" className="input w-32" aria-label="Priority" defaultValue="normal">
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
        )}
        {tab === "meeting" && <EventTimes />}
        <textarea name="description" rows={2} className="input h-auto py-1.5" placeholder={tab === "email" ? "Message" : "Comments"} />
        {state?.error && <p className="text-xs text-danger">{state.error}</p>}
        <div className="flex justify-end">
          <button type="submit" className="btn-brand" disabled={pending}>
            {pending ? "Saving…" : tab === "call" || tab === "email" ? "Log" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EventTimes() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  return (
    <div className="grid grid-cols-2 gap-2">
      <label>
        <span className="label">Start</span>
        <input type="datetime-local" className="input" value={start} onChange={(e) => setStart(e.target.value)} required />
        <input type="hidden" name="start_at" value={start ? new Date(start).toISOString() : ""} />
      </label>
      <label>
        <span className="label">End</span>
        <input type="datetime-local" className="input" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        <input type="hidden" name="end_at" value={end ? new Date(end).toISOString() : ""} />
      </label>
    </div>
  );
}
