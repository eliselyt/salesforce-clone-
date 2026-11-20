"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

export function ViewSelect({ views, current }: { views: { key: string; label: string }[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">List view</span>
      <select
        value={current}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set("view", e.target.value);
          next.delete("page");
          router.push(`${pathname}?${next.toString()}`);
        }}
        className="cursor-pointer appearance-none bg-transparent pr-6 text-lg font-bold text-ink outline-none sm:text-xl"
      >
        {views.map((v) => (
          <option key={v.key} value={v.key}>
            {v.label}
          </option>
        ))}
      </select>
      <ChevronDown size={18} className="pointer-events-none absolute right-0 text-ink" />
    </label>
  );
}
