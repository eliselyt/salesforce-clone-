import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, CheckSquare, Mail, Phone, StickyNote, Trash2, X } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { fieldDef, getObject, OBJECTS, selectFor, type ObjectDef, type Row } from "@/lib/objects";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { PICKLISTS, picklistLabel, type Option } from "@/lib/picklists";
import { lookupOptions } from "@/lib/queries";
import { deleteNote, removeCampaignMember, removeLineItem } from "@/app/(crm)/actions";
import { ObjectIcon } from "@/components/object-icon";
import { FieldValue } from "@/components/field-value";
import { PathBar } from "@/components/path-bar";
import { DeleteButton } from "@/components/delete-button";
import { ActivityComposer } from "@/components/activity-composer";
import { ActivityCheckbox } from "@/components/activity-checkbox";
import { NoteComposer } from "@/components/note-composer";
import { MiniTable, RelatedCard } from "@/components/related-list";
import { CampaignMemberForm, LineItemForm } from "@/components/inline-add-forms";

type Params = Promise<{ object: string; id: string }>;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(params: Params) {
  const { object, id } = await params;
  const obj = getObject(object);
  if (!obj || !UUID_RE.test(id)) notFound();
  const ctx = await requireUser();
  const { data } = await ctx.supabase.from(obj.table).select(selectFor(obj, { withCreatedBy: true })).eq("id", id).maybeSingle();
  if (!data) notFound();
  return { obj, id, row: data as unknown as Row, ...ctx };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { object, id } = await params;
  const obj = getObject(object);
  if (!obj || !UUID_RE.test(id)) return { title: "Not found" };
  return { title: obj.label };
}

/** Which foreign keys a new activity/note on this record should carry. */
function activityLinks(obj: ObjectDef, row: Row): Record<string, string> {
  const links: Record<string, string> = obj.activityFk ? { [obj.activityFk]: row.id } : {};
  for (const k of ["account_id", "contact_id"]) {
    if (k !== obj.activityFk && typeof row[k] === "string" && obj.key !== "leads") links[k] = row[k] as string;
  }
  return links;
}

const ACTIVITY_ICON = { task: CheckSquare, call: Phone, email: Mail, meeting: CalendarDays } as const;
const ACTIVITY_COLOR = { task: "#3ba755", call: "#48c3cc", email: "#939393", meeting: "#cb65ff" } as const;

export default async function RecordPage({ params, searchParams }: { params: Params; searchParams: Promise<Record<string, string | undefined>> }) {
  const { obj, id, row, supabase, user, profile } = await load(params);
  const sp = await searchParams;
  const tab = sp.tab === "related" ? "related" : "details";
  const returnPath = `/${obj.key}/${id}`;
  const canEdit = !obj.hasOwner || row.owner_id === user.id || row.owner_id === null || ["admin", "manager"].includes(profile?.role ?? "");

  // ---- related data, fetched in parallel ----------------------------------
  const relatedDefs = obj.related ?? [];
  const relatedPromise = Promise.all(
    relatedDefs.map(async (rel) => {
      const child = OBJECTS[rel.object];
      const { data, count } = await supabase
        .from(child.table)
        .select(selectFor(child), { count: "exact" })
        .eq(rel.fk, id)
        .order("created_at", { ascending: false })
        .limit(10);
      return { rel, child, rows: (data ?? []) as unknown as Row[], count: count ?? 0 };
    }),
  );

  const activitiesPromise = obj.activityFk
    ? supabase
        .from("activities")
        .select("id,type,subject,description,status,priority,due_date,start_at,completed_at,created_at,owner:profiles!activities_owner_id_fkey(full_name)")
        .eq(obj.activityFk, id)
        .order("created_at", { ascending: false })
        .limit(50)
    : Promise.resolve({ data: [] });
  const notesPromise = obj.activityFk
    ? supabase
        .from("notes")
        .select("id,title,body,created_at,owner_id,owner:profiles!notes_owner_id_fkey(full_name)")
        .eq(obj.activityFk, id)
        .order("created_at", { ascending: false })
        .limit(50)
    : Promise.resolve({ data: [] });

  const lineItemsPromise =
    obj.key === "opportunities"
      ? Promise.all([
          supabase
            .from("opportunity_line_items")
            .select("id,quantity,unit_price,discount,total_price,product:products!opportunity_line_items_product_id_fkey(id,name,product_code)")
            .eq("opportunity_id", id)
            .order("created_at"),
          supabase.from("products").select("id,name,unit_price").eq("is_active", true).order("name"),
        ])
      : null;

  const membersPromise =
    obj.key === "campaigns"
      ? Promise.all([
          supabase
            .from("campaign_members")
            .select(
              "id,status,created_at,lead:leads!campaign_members_lead_id_fkey(id,first_name,last_name,company),contact:contacts!campaign_members_contact_id_fkey(id,first_name,last_name,title)",
            )
            .eq("campaign_id", id)
            .order("created_at", { ascending: false }),
          lookupOptions(supabase, "leads", 300),
          lookupOptions(supabase, "contacts", 300),
        ])
      : null;

  const [related, activitiesRes, notesRes, lineItems, members] = await Promise.all([
    relatedPromise,
    activitiesPromise,
    notesPromise,
    lineItemsPromise,
    membersPromise,
  ]);
  const activities = (activitiesRes.data ?? []) as unknown as Row[];
  const notes = (notesRes.data ?? []) as unknown as Row[];
  const openActivities = activities.filter((a) => a.status !== "completed");
  const pastActivities = activities.filter((a) => a.status === "completed");

  const sections = [...new Set(obj.fields.map((f) => f.section))].filter(
    (s) => !(s === "Conversion" && row.status !== "converted"),
  );
  const highlightFields = obj.highlights.map((h) => fieldDef(obj, h));
  const name = obj.displayName(row);
  const isConvertedLead = obj.key === "leads" && row.status === "converted";

  return (
    <div className="space-y-3">
      {sp.converted && (
        <div className="card flex items-center gap-2 border-[#3ba755] bg-[#ebf7e6] px-4 py-3 text-success">
          <CheckSquare size={16} /> Lead converted successfully.
        </div>
      )}

      {/* Record header */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ObjectIcon icon={obj.icon} color={obj.color} size={36} />
            <div className="min-w-0">
              <div className="text-xs text-muted">{obj.label}</div>
              <h1 className="truncate text-lg font-bold sm:text-xl">{name}</h1>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {obj.key === "leads" && !isConvertedLead && (
              <Link href={`/leads/${id}/convert`} className="btn">
                Convert
              </Link>
            )}
            {canEdit && !isConvertedLead && (
              <Link href={`/${obj.key}/${id}/edit`} className="btn">
                Edit
              </Link>
            )}
            {canEdit && <DeleteButton objectKey={obj.key} recordId={id} label={obj.label} />}
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line pt-3 sm:grid-cols-3 lg:grid-cols-5">
          {highlightFields.map((f) => (
            <div key={f.name} className="min-w-0">
              <dt className="truncate text-xs text-muted">{f.label}</dt>
              <dd className="truncate">
                <FieldValue field={f} row={row} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {obj.path && (
        <PathBar
          objectKey={obj.key}
          recordId={id}
          field={obj.path.field}
          fieldLabel={fieldDef(obj, obj.path.field).label.replace(/^Lead /, "")}
          steps={obj.path.steps.map((s) => ({ value: s, label: picklistLabel(obj.path!.picklist, s) }))}
          closed={(obj.path.closed ?? []).map((s) => ({ value: s, label: picklistLabel(obj.path!.picklist, s) }))}
          current={String(row[obj.path.field])}
          convertHref={obj.key === "leads" ? `/leads/${id}/convert` : undefined}
        />
      )}

      {isConvertedLead && (
        <div className="card flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
          <span className="font-semibold">Converted {formatDate(row.converted_at)}:</span>
          {(["converted_account_id", "converted_contact_id", "converted_opportunity_id"] as const).map((k) =>
            row[k] ? (
              <span key={k}>
                {fieldDef(obj, k).label.replace("Converted ", "")}: <FieldValue field={fieldDef(obj, k)} row={row} />
              </span>
            ) : null,
          )}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Left: details & related */}
        <div className="space-y-3 lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="flex border-b border-line px-4">
              {(["details", "related"] as const).map((t) => (
                <Link
                  key={t}
                  href={`${returnPath}${t === "related" ? "?tab=related" : ""}`}
                  className={`relative px-3 py-3 text-[13px] capitalize ${tab === t ? "font-semibold" : "text-muted hover:text-ink"}`}
                >
                  {t}
                  {tab === t && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t bg-brand" />}
                </Link>
              ))}
            </div>

            {tab === "details" && (
              <div className="space-y-5 p-4">
                {sections.map((section) => (
                  <section key={section}>
                    <h3 className="mb-2 rounded bg-[#f3f3f3] px-3 py-1.5 text-[15px]">{section}</h3>
                    <dl className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                      {obj.fields
                        .filter((f) => f.section === section)
                        .map((f) => (
                          <div key={f.name} className={`border-b border-line px-1 py-2 ${f.fullWidth ? "md:col-span-2" : ""}`}>
                            <dt className="text-xs text-muted">{f.label}</dt>
                            <dd className="min-h-5 break-words">
                              <FieldValue field={f} row={row} />
                            </dd>
                          </div>
                        ))}
                    </dl>
                  </section>
                ))}
                <section>
                  <h3 className="mb-2 rounded bg-[#f3f3f3] px-3 py-1.5 text-[15px]">System Information</h3>
                  <dl className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                    <div className="border-b border-line px-1 py-2">
                      <dt className="text-xs text-muted">Created By</dt>
                      <dd>
                        {String((row.created_by_user as Row | null)?.full_name ?? "—")}, {formatDateTime(row.created_at)}
                      </dd>
                    </div>
                    <div className="border-b border-line px-1 py-2">
                      <dt className="text-xs text-muted">Last Modified</dt>
                      <dd>{formatDateTime(row.updated_at)}</dd>
                    </div>
                  </dl>
                </section>
              </div>
            )}

            {tab === "related" && (
              <div className="space-y-3 bg-[#f3f3f3] p-3">
                {lineItems && (
                  <RelatedCard icon="package" color={OBJECTS.products.color} title="Products" count={lineItems[0].data?.length ?? 0}>
                    <MiniTable
                      head={["Product", "Quantity", "Sales Price", "Discount", "Total", ""]}
                      rows={((lineItems[0].data ?? []) as unknown as Row[]).map((li) => {
                        const p = li.product as Row | null;
                        return [
                          p ? (
                            <Link key="p" href={`/products/${p.id}`} className="link">
                              {String(p.name)}
                            </Link>
                          ) : (
                            "—"
                          ),
                          Number(li.quantity).toLocaleString(),
                          formatCurrency(li.unit_price, true),
                          `${Number(li.discount)}%`,
                          <strong key="t">{formatCurrency(li.total_price, true)}</strong>,
                          canEdit ? (
                            <form key="d" action={removeLineItem.bind(null, li.id, id)}>
                              <button type="submit" className="text-muted hover:text-danger" aria-label="Remove product">
                                <X size={14} />
                              </button>
                            </form>
                          ) : null,
                        ];
                      })}
                    />
                    {canEdit && (
                      <LineItemForm
                        opportunityId={id}
                        products={((lineItems[1].data ?? []) as { id: string; name: string; unit_price: number }[]).map((p) => ({
                          id: p.id,
                          name: p.name,
                          unit_price: Number(p.unit_price),
                        }))}
                      />
                    )}
                  </RelatedCard>
                )}

                {members && (
                  <RelatedCard icon="megaphone" color={OBJECTS.campaigns.color} title="Campaign Members" count={members[0].data?.length ?? 0}>
                    <MiniTable
                      head={["Name", "Type", "Company / Title", "Status", ""]}
                      rows={((members[0].data ?? []) as unknown as Row[]).map((m) => {
                        const lead = m.lead as Row | null;
                        const contact = m.contact as Row | null;
                        const person = (lead ?? contact) as Row;
                        return [
                          <Link key="n" href={`/${lead ? "leads" : "contacts"}/${person.id}`} className="link">
                            {[person.first_name, person.last_name].filter(Boolean).join(" ")}
                          </Link>,
                          lead ? "Lead" : "Contact",
                          String((lead ? lead.company : contact?.title) ?? ""),
                          picklistLabel("campaign_member_status", m.status),
                          <form key="d" action={removeCampaignMember.bind(null, m.id, id)}>
                            <button type="submit" className="text-muted hover:text-danger" aria-label="Remove member">
                              <X size={14} />
                            </button>
                          </form>,
                        ];
                      })}
                    />
                    <CampaignMemberForm campaignId={id} leads={members[1]} contacts={members[2]} />
                  </RelatedCard>
                )}

                {related.map(({ rel, child, rows, count }) => (
                  <RelatedCard
                    key={`${rel.object}-${rel.fk}`}
                    icon={child.icon}
                    color={child.color}
                    title={rel.title ?? child.plural}
                    count={count}
                    newHref={`/${child.key}/new?${rel.fk}=${id}&return=${encodeURIComponent(`${returnPath}?tab=related`)}`}
                  >
                    <MiniTable
                      head={[child.key === "cases" ? "Case" : "Name", ...rel.columns.map((c) => fieldDef(child, c).label)]}
                      rows={rows.map((r) => [
                        <Link key="n" href={`/${child.key}/${r.id}`} className="link">
                          {child.key === "cases" ? String(r.case_number) : child.displayName(r)}
                        </Link>,
                        ...rel.columns.map((c) => <FieldValue key={c} field={fieldDef(child, c)} row={r} />),
                      ])}
                    />
                  </RelatedCard>
                ))}

                {!lineItems && !members && !related.length && (
                  <p className="card px-4 py-6 text-center text-muted">No related lists for this record.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: activity & notes */}
        {obj.activityFk && (
          <aside className="space-y-3">
            <section className="card p-3">
              <h2 className="mb-3 text-[15px] font-semibold">Activity</h2>
              {!isConvertedLead && <ActivityComposer related={activityLinks(obj, row)} returnPath={returnPath} />}

              <h3 className="mt-5 mb-2 rounded bg-[#f3f3f3] px-2 py-1 text-xs font-semibold text-muted">Upcoming &amp; Overdue</h3>
              {openActivities.length ? (
                <Timeline items={openActivities} returnPath={returnPath} />
              ) : (
                <p className="px-2 py-2 text-xs text-muted">No next steps. To get things moving, add a task or set up a meeting.</p>
              )}
              <h3 className="mt-4 mb-2 rounded bg-[#f3f3f3] px-2 py-1 text-xs font-semibold text-muted">Past Activity</h3>
              {pastActivities.length ? (
                <Timeline items={pastActivities} returnPath={returnPath} />
              ) : (
                <p className="px-2 py-2 text-xs text-muted">No past activity. Past meetings and tasks marked as done show up here.</p>
              )}
            </section>

            <section className="card p-3">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                <ObjectIcon icon="note" color="#e3d076" size={22} /> Notes ({notes.length})
              </h2>
              <NoteComposer related={activityLinks(obj, row)} returnPath={returnPath} />
              <ul className="mt-3 divide-y divide-line">
                {notes.map((n) => (
                  <li key={n.id} className="group py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {Boolean(n.title) && <div className="font-semibold">{String(n.title)}</div>}
                        <p className="whitespace-pre-wrap break-words">{String(n.body)}</p>
                        <div className="mt-1 text-xs text-muted">
                          {String((n.owner as Row | null)?.full_name ?? "")} · {formatDateTime(n.created_at)}
                        </div>
                      </div>
                      {(n.owner_id === user.id || ["admin", "manager"].includes(profile?.role ?? "")) && (
                        <form action={deleteNote.bind(null, n.id, returnPath)}>
                          <button type="submit" className="text-muted opacity-0 group-hover:opacity-100 hover:text-danger" aria-label="Delete note">
                            <Trash2 size={14} />
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
                {!notes.length && (
                  <li className="flex items-center gap-2 py-2 text-xs text-muted">
                    <StickyNote size={14} /> No notes yet.
                  </li>
                )}
              </ul>
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}

function Timeline({ items, returnPath }: { items: Row[]; returnPath: string }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ul className="relative space-y-3 pl-1">
      {items.map((a) => {
        const type = (a.type as keyof typeof ACTIVITY_ICON) ?? "task";
        const Icon = ACTIVITY_ICON[type] ?? CheckSquare;
        const overdue = a.status !== "completed" && typeof a.due_date === "string" && a.due_date < today;
        const when = a.start_at ? formatDateTime(a.start_at) : a.due_date ? formatDate(a.due_date) : formatDate(a.created_at);
        return (
          <li key={a.id} className="flex gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded" style={{ background: ACTIVITY_COLOR[type] }}>
              <Icon size={14} color="#fff" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                {(type === "task" || type === "meeting") && (
                  <ActivityCheckbox id={a.id} completed={a.status === "completed"} returnPath={returnPath} />
                )}
                <Link href={`/activities/${a.id}`} className={`link min-w-0 flex-1 truncate ${a.status === "completed" && type === "task" ? "line-through" : ""}`}>
                  {String(a.subject)}
                </Link>
                <span className={`shrink-0 text-xs ${overdue ? "font-semibold text-danger" : "text-muted"}`}>{when}</span>
              </div>
              <div className="text-xs text-muted">
                {PICKLISTS.activity_type.find((o: Option) => o.value === type)?.label} · {String((a.owner as Row | null)?.full_name ?? "")}
                {a.priority === "high" && <span className="ml-1 text-danger">· High priority</span>}
              </div>
              {Boolean(a.description) && <p className="mt-0.5 line-clamp-2 text-xs text-ink/80">{String(a.description)}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
