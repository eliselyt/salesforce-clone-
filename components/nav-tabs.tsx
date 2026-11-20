"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";

export function NavTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav className="flex h-10 items-stretch gap-1 overflow-x-auto px-4 shadow-[0_2px_3px_rgba(0,0,0,0.08)]">
      <span className="mr-3 flex shrink-0 items-center gap-2 pr-3 text-[17px] text-ink">
        <LayoutGrid size={18} className="text-muted" />
        Sales
      </span>
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`relative flex shrink-0 items-center px-3 text-[13px] transition-colors ${
            isActive(t.href) ? "font-semibold text-ink" : "text-ink hover:text-brand"
          }`}
        >
          {t.label}
          {isActive(t.href) && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t bg-brand" />}
        </Link>
      ))}
    </nav>
  );
}
