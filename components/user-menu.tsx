"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, UserCircle, Users } from "lucide-react";
import { initials } from "@/lib/format";
import { picklistLabel } from "@/lib/picklists";

export function UserMenu({ name, email, role }: { name: string; email: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7f8de1] text-xs font-semibold text-white"
        aria-label="User menu"
        aria-expanded={open}
      >
        {initials(name)}
      </button>
      {open && (
        <div className="card absolute right-0 mt-2 w-64 overflow-hidden py-1 shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <div className="font-semibold">{name}</div>
            <div className="truncate text-xs text-muted">{email}</div>
            <div className="mt-1 text-xs text-muted">{picklistLabel("user_role", role)}</div>
          </div>
          <Link href="/settings/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-page">
            <UserCircle size={15} /> My Profile
          </Link>
          {role === "admin" && (
            <Link href="/settings/users" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-page">
              <Users size={15} /> Users
            </Link>
          )}
          <form action="/auth/signout" method="post" className="border-t border-line">
            <button type="submit" className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-page">
              <LogOut size={15} /> Log Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
