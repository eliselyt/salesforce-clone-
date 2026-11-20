import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { formatCompactCurrency } from "@/lib/format";
import { picklistLabel } from "@/lib/picklists";
import { BarList } from "@/components/bar-list";

export const metadata: Metadata = { title: "Reports" };

type Opp = { amount: number | null; stage: string; closed_at: string | null; owner: { full_name: string | null } | null };
type Lead = { lead_source: string | null; status: string };
type Case = { priority: string; status: string };

export default async function ReportsPage() {
  const { supabase } = await requireUser();
  const [{ data: opps }, { data: leads }, { data: cases }] = await Promise.all([
    supabase.from("opportunities").select("amount,stage,closed_at,owner:profiles!opportunities_owner_id_fkey(full_name)").limit(5000),
    supabase.from("leads").select("lead_source,status").limit(5000),
    supabase.from("cases").select("priority,status").limit(5000),
  ]);
  const o = (opps ?? []) as unknown as Opp[];
  const l = (leads ?? []) as Lead[];
  const c = (cases ?? []) as Case[];

  // Open pipeline by owner
  const byOwner = new Map<string, number>();
  for (const x of o.filter((x) => !x.stage.startsWith("closed"))) {
    const k = x.owner?.full_name ?? "Unassigned";
    byOwner.set(k, (byOwner.get(k) ?? 0) + Number(x.amount ?? 0));
  }
  const ownerRows = [...byOwner.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, display: formatCompactCurrency(value) }));

  // Closed-won revenue, last 12 months (oldest first)
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }) });
  }
  const wonByMonth = new Map<string, number>();
  for (const x of o.filter((x) => x.stage === "closed_won" && x.closed_at)) {
    const k = x.closed_at!.slice(0, 7);
    wonByMonth.set(k, (wonByMonth.get(k) ?? 0) + Number(x.amount ?? 0));
  }
  const wonRows = months.map((m) => ({ label: m.label, value: wonByMonth.get(m.key) ?? 0, display: formatCompactCurrency(wonByMonth.get(m.key) ?? 0) }));

  // Lead conversion by source
  const bySource = new Map<string, { total: number; converted: number }>();
  for (const x of l) {
    const k = x.lead_source ?? "unknown";
    const cur = bySource.get(k) ?? { total: 0, converted: 0 };
    cur.total++;
    if (x.status === "converted") cur.converted++;
    bySource.set(k, cur);
  }
  const convRows = [...bySource.entries()]
    .map(([k, v]) => ({
      label: k === "unknown" ? "Unspecified" : picklistLabel("lead_source", k),
      value: v.total ? (100 * v.converted) / v.total : 0,
      display: `${v.total ? Math.round((100 * v.converted) / v.total) : 0}%`,
      hint: `${v.converted} of ${v.total}`,
    }))
    .sort((a, b) => b.value - a.value);

  // Open cases by priority
  const priorities = ["critical", "high", "medium", "low"];
  const caseRows = priorities.map((p) => {
    const n = c.filter((x) => x.priority === p && x.status !== "closed").length;
    return { label: picklistLabel("case_priority", p), value: n, display: String(n) };
  });

  const wonTotal = wonRows.reduce((s, r) => s + r.value, 0);

  return (
    <div className="space-y-3">
      <div className="card px-5 py-4">
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-muted">Standard reports, calculated live from your CRM data.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="text-[15px] font-semibold">Closed Won Revenue — Last 12 Months</h2>
          <p className="mb-3 text-xs text-muted">Total {formatCompactCurrency(wonTotal)}</p>
          <BarList rows={wonRows} color="#2e844a" />
        </section>
        <section className="card p-4">
          <h2 className="mb-3 text-[15px] font-semibold">Open Pipeline by Owner</h2>
          <BarList rows={ownerRows} emptyText="No open opportunities." />
        </section>
        <section className="card p-4">
          <h2 className="mb-3 text-[15px] font-semibold">Lead Conversion Rate by Source</h2>
          <BarList rows={convRows} color="#f88962" emptyText="No leads yet." />
        </section>
        <section className="card p-4">
          <h2 className="mb-3 text-[15px] font-semibold">Open Cases by Priority</h2>
          <BarList rows={caseRows} color="#5867e8" />
        </section>
      </div>
    </div>
  );
}
