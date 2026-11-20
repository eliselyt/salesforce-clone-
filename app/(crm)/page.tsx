import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { OBJECTS, type Row } from "@/lib/objects";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import { picklistLabel } from "@/lib/picklists";
import { BarList } from "@/components/bar-list";
import { ActivityCheckbox } from "@/components/activity-checkbox";
import { ObjectIcon } from "@/components/object-icon";

export const metadata: Metadata = { title: "Home" };

type Stats = {
  open_pipeline: number;
  weighted_pipeline: number;
  won_this_quarter: number;
  win_rate: number;
  open_leads: number;
  open_cases: number;
  by_stage: { stage: string; count: number; amount: number }[];
  leads_by_source: { source: string; count: number }[];
};

export default async function HomePage() {
  const { supabase, user, profile } = await requireUser();
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  const [{ data: statsData }, { data: tasks }, { data: closing }, { data: leads }] = await Promise.all([
    supabase.rpc("dashboard_stats"),
    supabase
      .from("activities")
      .select("id,subject,type,status,due_date,priority")
      .eq("owner_id", user.id)
      .neq("status", "completed")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from("opportunities")
      .select("id,name,amount,close_date,stage,account:accounts!opportunities_account_id_fkey(id,name)")
      .not("stage", "in", "(closed_won,closed_lost)")
      .lte("close_date", in30)
      .order("close_date")
      .limit(8),
    supabase
      .from("leads")
      .select("id,first_name,last_name,company,status,created_at")
      .not("status", "in", "(converted,unqualified)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const stats = (statsData ?? {}) as Partial<Stats>;
  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";
  const kpis = [
    { label: "Open Pipeline", value: formatCompactCurrency(stats.open_pipeline), href: "/opportunities" },
    { label: "Weighted Pipeline", value: formatCompactCurrency(stats.weighted_pipeline), href: "/opportunities" },
    { label: "Won This Quarter", value: formatCompactCurrency(stats.won_this_quarter), href: "/opportunities?view=won" },
    { label: "Win Rate", value: `${stats.win_rate ?? 0}%`, href: "/reports" },
    { label: "Open Leads", value: String(stats.open_leads ?? 0), href: "/leads" },
    { label: "Open Cases", value: String(stats.open_cases ?? 0), href: "/cases" },
  ];
  const stageRows = (stats.by_stage ?? [])
    .filter((s) => !["closed_won", "closed_lost"].includes(s.stage))
    .map((s) => ({
      label: picklistLabel("opportunity_stage", s.stage),
      value: Number(s.amount),
      display: formatCompactCurrency(s.amount),
      hint: `${s.count} ${s.count === 1 ? "deal" : "deals"}`,
    }));
  const sourceRows = (stats.leads_by_source ?? []).map((s) => ({
    label: s.source === "unknown" ? "Unspecified" : picklistLabel("lead_source", s.source),
    value: Number(s.count),
    display: String(s.count),
  }));

  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h1 className="text-xl font-semibold">Good to see you, {firstName}</h1>
          <p className="text-muted">Here’s what’s happening across your pipeline today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/leads/new" className="btn">New Lead</Link>
          <Link href="/opportunities/new" className="btn">New Opportunity</Link>
          <Link href="/cases/new" className="btn">New Case</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="card px-4 py-3 transition-shadow hover:shadow-md">
            <div className="text-xs text-muted">{k.label}</div>
            <div className="mt-1 text-2xl font-light tracking-tight text-ink">{k.value}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Open Pipeline by Stage</h2>
            <Link href="/opportunities?mode=kanban" className="link text-xs">View Kanban</Link>
          </div>
          <BarList rows={stageRows} emptyText="No open opportunities yet." />
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">My Open Tasks</h2>
            <Link href="/activities" className="link text-xs">View All</Link>
          </div>
          <ul className="space-y-2.5">
            {((tasks ?? []) as Row[]).map((t) => {
              const overdue = typeof t.due_date === "string" && t.due_date < today;
              return (
                <li key={t.id} className="flex items-start gap-2">
                  <ActivityCheckbox id={t.id} completed={false} returnPath="/" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/activities/${t.id}`} className="link block truncate">{String(t.subject)}</Link>
                    <div className={`text-xs ${overdue ? "font-semibold text-danger" : "text-muted"}`}>
                      {t.due_date ? `${overdue ? "Overdue · " : ""}${formatDate(t.due_date)}` : "No due date"}
                      {t.priority === "high" && " · High"}
                    </div>
                  </div>
                </li>
              );
            })}
            {!tasks?.length && <li className="py-6 text-center text-xs text-muted">Nothing due. Nice work.</li>}
          </ul>
        </section>

        <section className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-[15px] font-semibold">Closing in the Next 30 Days</h2>
            <Link href="/opportunities" className="link text-xs">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">Opportunity</th>
                  <th className="th">Account</th>
                  <th className="th">Stage</th>
                  <th className="th text-right">Amount</th>
                  <th className="th">Close Date</th>
                </tr>
              </thead>
              <tbody>
                {((closing ?? []) as unknown as Row[]).map((o) => {
                  const acct = o.account as Row | null;
                  const late = typeof o.close_date === "string" && o.close_date < today;
                  return (
                    <tr key={o.id}>
                      <td className="td max-w-[220px] truncate"><Link href={`/opportunities/${o.id}`} className="link">{String(o.name)}</Link></td>
                      <td className="td max-w-[180px] truncate">{acct ? <Link href={`/accounts/${acct.id}`} className="link">{String(acct.name)}</Link> : ""}</td>
                      <td className="td">{picklistLabel("opportunity_stage", o.stage)}</td>
                      <td className="td text-right">{formatCurrency(o.amount)}</td>
                      <td className={`td ${late ? "font-semibold text-danger" : ""}`}>{formatDate(o.close_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!closing?.length && <p className="py-8 text-center text-xs text-muted">No deals closing in the next 30 days.</p>}
          </div>
        </section>

        <div className="space-y-3">
          <section className="card p-4">
            <h2 className="mb-3 text-[15px] font-semibold">Leads by Source</h2>
            <BarList rows={sourceRows} color="#f88962" emptyText="No leads yet." />
          </section>
          <section className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Newest Leads</h2>
              <Link href="/leads" className="link text-xs">View All</Link>
            </div>
            <ul className="divide-y divide-line">
              {((leads ?? []) as Row[]).map((l) => (
                <li key={l.id} className="flex items-center gap-2 py-2">
                  <ObjectIcon icon="star" color={OBJECTS.leads.color} size={22} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/leads/${l.id}`} className="link block truncate">{OBJECTS.leads.displayName(l)}</Link>
                    <div className="truncate text-xs text-muted">{String(l.company)} · {picklistLabel("lead_status", l.status)}</div>
                  </div>
                </li>
              ))}
              {!leads?.length && <li className="py-4 text-center text-xs text-muted">No open leads.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
