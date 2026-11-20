import Link from "next/link";
import { Search } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { NavTabs } from "@/components/nav-tabs";
import { UserMenu } from "@/components/user-menu";
import { NAV_OBJECTS, OBJECTS } from "@/lib/objects";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireUser();
  const tabs = [
    { href: "/", label: "Home" },
    ...NAV_OBJECTS.map((k) => ({ href: `/${k}`, label: OBJECTS[k].plural })),
    { href: "/reports", label: "Reports" },
  ];

  return (
    <div className="app-backdrop min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="flex h-12 items-center gap-4 px-4">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>
          <form action="/search" className="mx-auto flex w-full max-w-xl items-center">
            <label className="relative w-full">
              <span className="sr-only">Search</span>
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#747474]" />
              <input name="q" placeholder="Search accounts, contacts, leads, opportunities…" className="input h-8 rounded-md pl-9" />
            </label>
          </form>
          <UserMenu
            name={profile?.full_name ?? user.email ?? ""}
            email={user.email ?? ""}
            role={profile?.role ?? "sales_rep"}
          />
        </div>
        <NavTabs tabs={tabs} />
      </header>
      <main className="mx-auto max-w-[1440px] p-3 sm:p-4">{children}</main>
    </div>
  );
}
