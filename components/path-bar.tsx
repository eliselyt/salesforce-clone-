"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { updatePicklistField } from "@/app/(crm)/actions";
import type { ObjectKey } from "@/lib/objects";
import type { Option } from "@/lib/picklists";

type Props = {
  objectKey: ObjectKey;
  recordId: string;
  field: string;
  fieldLabel: string;
  steps: Option[];
  closed: Option[];
  current: string;
  convertHref?: string;
};

const CHEVRON = "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)";
const CHEVRON_FIRST = "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)";

export function PathBar({ objectKey, recordId, field, fieldLabel, steps, closed, current, convertHref }: Props) {
  const [selected, setSelected] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isClosedAlt = closed.some((c) => c.value === current);
  const currentIdx = steps.findIndex((s) => s.value === current);
  const lastStep = steps[steps.length - 1]!;

  const save = (value: string) =>
    start(async () => {
      const res = await updatePicklistField(objectKey, recordId, field, value);
      if (res && "error" in res && res.error) setError(res.error);
      else {
        setError(null);
        setSelected(value);
      }
    });

  const nextStep = currentIdx >= 0 && currentIdx < steps.length - 1 ? steps[currentIdx + 1]! : null;
  const selectedIsConvert = convertHref && selected === "converted";

  return (
    <div className="card p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <ol className="flex flex-1 gap-0.5 overflow-x-auto">
          {steps.map((s, i) => {
            const isLast = i === steps.length - 1;
            const label = isLast && isClosedAlt ? closed.find((c) => c.value === current)!.label : s.label;
            const complete = !isClosedAlt && currentIdx > i;
            const isCurrent = (!isClosedAlt && currentIdx === i) || (isLast && isClosedAlt);
            const isSelected = selected === s.value && !isCurrent;
            let cls = "bg-[#f3f3f3] text-ink hover:bg-[#e5e5e5]";
            if (complete) cls = "bg-[#3ba755] text-white hover:bg-[#2e844a]";
            if (isCurrent) cls = isClosedAlt ? "bg-[#ba0517] text-white" : "bg-[#014486] text-white";
            if (isSelected) cls = "bg-[#0176d3] text-white";
            return (
              <li key={s.value} className="min-w-[96px] flex-1">
                <button
                  type="button"
                  onClick={() => setSelected(s.value)}
                  className={`group relative flex h-8 w-full items-center justify-center px-5 text-[13px] transition-colors ${cls}`}
                  style={{ clipPath: i === 0 ? CHEVRON_FIRST : CHEVRON, borderRadius: i === 0 ? "16px 0 0 16px" : undefined }}
                  title={label}
                >
                  {complete ? (
                    <>
                      <Check size={15} className="group-hover:hidden" />
                      <span className="hidden truncate group-hover:inline">{label}</span>
                    </>
                  ) : (
                    <span className="truncate">{label}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex shrink-0 flex-wrap gap-2">
          {selectedIsConvert ? (
            <Link href={convertHref} className="btn-brand">
              Convert
            </Link>
          ) : selected === current ? (
            nextStep && !isClosedAlt ? (
              nextStep.value === "converted" && convertHref ? (
                <Link href={convertHref} className="btn-brand">
                  Convert
                </Link>
              ) : (
                <button type="button" className="btn-brand" disabled={pending} onClick={() => save(nextStep.value)}>
                  <Check size={14} /> Mark {fieldLabel} as Complete
                </button>
              )
            ) : null
          ) : (
            <button type="button" className="btn-brand" disabled={pending} onClick={() => save(selected)}>
              Mark as Current {fieldLabel}
            </button>
          )}
          {closed
            .filter((c) => c.value !== current && current !== lastStep.value && current !== "converted")
            .map((c) => (
              <button key={c.value} type="button" className="btn" disabled={pending} onClick={() => save(c.value)}>
                Mark {c.label}
              </button>
            ))}
        </div>
      </div>
      {error && <p className="mt-2 text-danger">{error}</p>}
    </div>
  );
}
