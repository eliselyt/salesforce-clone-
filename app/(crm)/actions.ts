"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getObject, OBJECTS, type ObjectKey } from "@/lib/objects";
import { friendlyDbError, parseRecordForm, type FormState } from "@/lib/forms";
import { PICKLISTS, type Option } from "@/lib/picklists";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVITY_FKS = ["lead_id", "contact_id", "account_id", "opportunity_id", "case_id"] as const;

function assertUuid(id: unknown): string {
  if (typeof id !== "string" || !UUID_RE.test(id)) throw new Error("Invalid id");
  return id;
}

function safeReturnPath(v: FormDataEntryValue | null, fallback: string) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

// ---------------------------------------------------------------------------
// Generic record CRUD
// ---------------------------------------------------------------------------
export async function saveRecord(
  objectKey: string,
  recordId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const obj = getObject(objectKey);
  if (!obj) return { error: "Unknown object" };
  const { supabase, user } = await requireUser();

  const { values, fieldErrors } = parseRecordForm(obj, formData);
  if (Object.keys(fieldErrors).length) {
    return { error: "Review the errors on this page.", fieldErrors };
  }
  if (obj.hasOwner && !values.owner_id) values.owner_id = user.id;

  let id = recordId;
  if (recordId) {
    const { error } = await supabase.from(obj.table).update(values).eq("id", assertUuid(recordId));
    if (error) return { error: friendlyDbError(error.message) };
  } else {
    const { data, error } = await supabase.from(obj.table).insert(values).select("id").single();
    if (error) return { error: friendlyDbError(error.message) };
    id = data.id as string;
  }

  revalidatePath(`/${obj.key}`);
  redirect(safeReturnPath(formData.get("__return"), `/${obj.key}/${id}`));
}

export async function deleteRecord(objectKey: string, recordId: string) {
  const obj = getObject(objectKey);
  if (!obj) throw new Error("Unknown object");
  const { supabase } = await requireUser();

  const { data, error } = await supabase.from(obj.table).delete().eq("id", assertUuid(recordId)).select("id");
  if (error) return { error: friendlyDbError(error.message) };
  if (!data?.length) return { error: "You don't have permission to delete this record." };

  revalidatePath(`/${obj.key}`);
  redirect(`/${obj.key}`);
}

/** Path component / kanban: update a single picklist field. */
export async function updatePicklistField(objectKey: ObjectKey, recordId: string, field: string, value: string) {
  const obj = OBJECTS[objectKey];
  const def = obj?.fields.find((f) => f.name === field && f.type === "picklist");
  if (!def?.picklist) return { error: "Invalid field" };
  if (!(PICKLISTS[def.picklist] as Option[]).some((o) => o.value === value)) return { error: "Invalid value" };
  if (objectKey === "leads" && value === "converted") return { error: "Use Convert to convert a lead." };

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from(obj.table)
    .update({ [field]: value })
    .eq("id", assertUuid(recordId))
    .select("id");
  if (error) return { error: friendlyDbError(error.message) };
  if (!data?.length) return { error: "You don't have permission to edit this record." };

  revalidatePath(`/${objectKey}`);
  revalidatePath(`/${objectKey}/${recordId}`);
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Activities & notes
// ---------------------------------------------------------------------------
function relatedIds(formData: FormData) {
  const out: Record<string, string> = {};
  for (const fk of ACTIVITY_FKS) {
    const v = formData.get(fk);
    if (typeof v === "string" && UUID_RE.test(v)) out[fk] = v;
  }
  return out;
}

export async function createActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const subject = String(formData.get("subject") ?? "").trim();
  if (!subject) return { error: "Subject is required" };

  const type = String(formData.get("type") ?? "task");
  if (!PICKLISTS.activity_type.some((o) => o.value === type)) return { error: "Invalid type" };

  const due = String(formData.get("due_date") ?? "");
  const start = String(formData.get("start_at") ?? "");
  const end = String(formData.get("end_at") ?? "");
  // Calls and emails are logged after the fact, so they are completed immediately.
  const status = type === "call" || type === "email" ? "completed" : "not_started";

  const { error } = await supabase.from("activities").insert({
    type,
    subject,
    description: String(formData.get("description") ?? "").trim() || null,
    status,
    priority: formData.get("priority") === "high" ? "high" : "normal",
    due_date: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
    start_at: start ? new Date(start).toISOString() : null,
    end_at: end ? new Date(end).toISOString() : null,
    owner_id: user.id,
    ...relatedIds(formData),
  });
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(safeReturnPath(formData.get("__return"), "/"));
  return null;
}

export async function setActivityCompleted(activityId: string, completed: boolean, returnPath: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("activities")
    .update({ status: completed ? "completed" : "not_started" })
    .eq("id", assertUuid(activityId));
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath(safeReturnPath(returnPath, "/"));
  return { ok: true };
}

export async function createNote(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write something first" };
  const ids = relatedIds(formData);
  if (!Object.keys(ids).length) return { error: "Missing related record" };

  const { error } = await supabase.from("notes").insert({
    title: String(formData.get("title") ?? "").trim() || null,
    body,
    ...ids,
  });
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath(safeReturnPath(formData.get("__return"), "/"));
  return null;
}

export async function deleteNote(noteId: string, returnPath: string) {
  const { supabase } = await requireUser();
  await supabase.from("notes").delete().eq("id", assertUuid(noteId));
  revalidatePath(safeReturnPath(returnPath, "/"));
}

// ---------------------------------------------------------------------------
// Lead conversion
// ---------------------------------------------------------------------------
export async function convertLead(leadId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const accountMode = formData.get("account_mode");
  const existing = String(formData.get("existing_account_id") ?? "");
  if (accountMode === "existing" && !UUID_RE.test(existing)) return { error: "Choose an existing account." };

  const createOpp = formData.get("skip_opportunity") !== "on";
  const { data, error } = await supabase.rpc("convert_lead", {
    p_lead_id: assertUuid(leadId),
    p_account_id: accountMode === "existing" ? existing : null,
    p_create_opportunity: createOpp,
    p_opportunity_name: String(formData.get("opportunity_name") ?? ""),
  });
  if (error) return { error: friendlyDbError(error.message) };

  const result = data as { account_id: string; contact_id: string; opportunity_id: string | null };
  revalidatePath("/leads");
  revalidatePath("/");
  redirect(result.opportunity_id ? `/opportunities/${result.opportunity_id}?converted=1` : `/contacts/${result.contact_id}?converted=1`);
}

// ---------------------------------------------------------------------------
// Opportunity products
// ---------------------------------------------------------------------------
export async function addLineItem(opportunityId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const productId = String(formData.get("product_id") ?? "");
  if (!UUID_RE.test(productId)) return { error: "Choose a product" };

  const quantity = Number(formData.get("quantity") || 1);
  const discount = Number(formData.get("discount") || 0);
  let unitPrice = Number(String(formData.get("unit_price") ?? "").replace(/[$,]/g, ""));
  if (!formData.get("unit_price")) {
    const { data: product } = await supabase.from("products").select("unit_price").eq("id", productId).single();
    unitPrice = Number(product?.unit_price ?? 0);
  }
  if (!(quantity > 0) || Number.isNaN(unitPrice) || unitPrice < 0 || discount < 0 || discount > 100) {
    return { error: "Check quantity, price and discount" };
  }

  const { error } = await supabase.from("opportunity_line_items").insert({
    opportunity_id: assertUuid(opportunityId),
    product_id: productId,
    quantity,
    unit_price: unitPrice,
    discount,
  });
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath(`/opportunities/${opportunityId}`);
  return null;
}

export async function removeLineItem(lineItemId: string, opportunityId: string) {
  const { supabase } = await requireUser();
  await supabase.from("opportunity_line_items").delete().eq("id", assertUuid(lineItemId));
  revalidatePath(`/opportunities/${opportunityId}`);
}

// ---------------------------------------------------------------------------
// Campaign members
// ---------------------------------------------------------------------------
export async function addCampaignMember(campaignId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const member = String(formData.get("member") ?? ""); // "lead:<uuid>" | "contact:<uuid>"
  const [kind, id] = member.split(":");
  if (!(kind === "lead" || kind === "contact") || !UUID_RE.test(id ?? "")) return { error: "Choose a lead or contact" };
  const status = String(formData.get("status") ?? "sent");
  if (!PICKLISTS.campaign_member_status.some((o) => o.value === status)) return { error: "Invalid status" };

  const { error } = await supabase.from("campaign_members").insert({
    campaign_id: assertUuid(campaignId),
    [kind === "lead" ? "lead_id" : "contact_id"]: id,
    status,
  });
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath(`/campaigns/${campaignId}`);
  return null;
}

export async function removeCampaignMember(memberId: string, campaignId: string) {
  const { supabase } = await requireUser();
  await supabase.from("campaign_members").delete().eq("id", assertUuid(memberId));
  revalidatePath(`/campaigns/${campaignId}`);
}

// ---------------------------------------------------------------------------
// User administration
// ---------------------------------------------------------------------------
export async function updateUser(userId: string, formData: FormData) {
  const { supabase, profile } = await requireUser();
  if (profile?.role !== "admin") return;
  const role = String(formData.get("role") ?? "");
  if (!PICKLISTS.user_role.some((o) => o.value === role)) return;
  await supabase
    .from("profiles")
    .update({ role, is_active: formData.get("is_active") === "on" })
    .eq("id", assertUuid(userId));
  revalidatePath("/settings/users");
}

export async function updateMyProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: String(formData.get("full_name") ?? "").trim() || null,
      title: String(formData.get("title") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
    })
    .eq("id", user.id);
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath("/", "layout");
  return { error: undefined, fieldErrors: undefined };
}
