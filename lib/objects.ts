/**
 * Object metadata — the "schema builder" of the CRM.
 *
 * Every list view, record page, form and server action is driven by these
 * definitions, so adding a field means: add the column in a migration, then add
 * one line here.
 */
import type { PicklistKey } from "./picklists";

export type ObjectKey =
  | "accounts"
  | "contacts"
  | "leads"
  | "opportunities"
  | "cases"
  | "campaigns"
  | "products"
  | "activities";

export type LookupTarget = ObjectKey | "users";

export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "url"
  | "textarea"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "datetime"
  | "picklist"
  | "lookup"
  | "boolean";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  section: string;
  required?: boolean;
  picklist?: PicklistKey;
  /** Picklist values that can't be chosen on the form (e.g. "converted"). */
  excludeOptions?: string[];
  lookup?: LookupTarget;
  /** Not shown on create/edit forms (system-managed). */
  readOnly?: boolean;
  fullWidth?: boolean;
}

export type Row = Record<string, unknown> & { id: string };

export interface ListView {
  key: string;
  label: string;
  mine?: boolean;
  /** Simple equality / not-equal filters applied to the list query. */
  eq?: Record<string, string | boolean>;
  neq?: Record<string, string>;
  notIn?: Record<string, string[]>;
}

export interface ObjectDef {
  key: ObjectKey;
  table: string;
  label: string;
  plural: string;
  icon: string;
  color: string;
  /** Columns needed to compute displayName (also used when embedding as a lookup). */
  nameSelect: string;
  displayName: (row: Record<string, unknown>) => string;
  searchColumns: string[];
  fields: FieldDef[];
  listColumns: string[];
  highlights: string[];
  defaultSort: { column: string; ascending: boolean };
  listViews: ListView[];
  hasOwner: boolean;
  /** Column on activities/notes that points at this object (enables the activity timeline). */
  activityFk?: string;
  path?: { field: string; picklist: PicklistKey; steps: string[]; closed?: string[] };
  related?: { object: ObjectKey; fk: string; title?: string; columns: string[] }[];
}

const person = (r: Record<string, unknown>) =>
  [r.salutation, r.first_name, r.last_name].filter(Boolean).join(" ") || "(no name)";

const ownerField = (section: string): FieldDef => ({
  name: "owner_id",
  label: "Owner",
  type: "lookup",
  lookup: "users",
  section,
});

export const USERS_LOOKUP = {
  table: "profiles",
  nameSelect: "full_name,email",
  displayName: (r: Record<string, unknown>) => String(r.full_name || r.email || "Unknown user"),
};

export const OBJECTS: Record<ObjectKey, ObjectDef> = {
  accounts: {
    key: "accounts",
    table: "accounts",
    label: "Account",
    plural: "Accounts",
    icon: "building",
    color: "#5867e8",
    nameSelect: "name",
    displayName: (r) => String(r.name ?? ""),
    searchColumns: ["name", "phone", "website", "billing_city", "industry"],
    defaultSort: { column: "name", ascending: true },
    hasOwner: true,
    activityFk: "account_id",
    listViews: [
      { key: "all", label: "All Accounts" },
      { key: "mine", label: "My Accounts", mine: true },
      { key: "customers", label: "Customers", eq: { type: "customer" } },
      { key: "prospects", label: "Prospects", eq: { type: "prospect" } },
    ],
    fields: [
      { name: "name", label: "Account Name", type: "text", required: true, section: "Account Information" },
      ownerField("Account Information"),
      { name: "account_number", label: "Account Number", type: "text", section: "Account Information" },
      { name: "parent_account_id", label: "Parent Account", type: "lookup", lookup: "accounts", section: "Account Information" },
      { name: "type", label: "Type", type: "picklist", picklist: "account_type", section: "Account Information" },
      { name: "industry", label: "Industry", type: "picklist", picklist: "industry", section: "Account Information" },
      { name: "rating", label: "Rating", type: "picklist", picklist: "rating", section: "Account Information" },
      { name: "annual_revenue", label: "Annual Revenue", type: "currency", section: "Account Information" },
      { name: "phone", label: "Phone", type: "phone", section: "Account Information" },
      { name: "number_of_employees", label: "Employees", type: "number", section: "Account Information" },
      { name: "website", label: "Website", type: "url", section: "Account Information" },
      { name: "billing_street", label: "Billing Street", type: "text", section: "Address Information", fullWidth: true },
      { name: "billing_city", label: "Billing City", type: "text", section: "Address Information" },
      { name: "billing_state", label: "Billing State/Province", type: "text", section: "Address Information" },
      { name: "billing_postal_code", label: "Billing Zip/Postal Code", type: "text", section: "Address Information" },
      { name: "billing_country", label: "Billing Country", type: "text", section: "Address Information" },
      { name: "description", label: "Description", type: "textarea", section: "Description Information", fullWidth: true },
    ],
    listColumns: ["billing_city", "phone", "type", "industry", "owner_id"],
    highlights: ["type", "phone", "website", "industry", "owner_id"],
    related: [
      { object: "contacts", fk: "account_id", columns: ["title", "email", "phone"] },
      { object: "opportunities", fk: "account_id", columns: ["stage", "amount", "close_date"] },
      { object: "cases", fk: "account_id", columns: ["subject", "status", "priority"] },
    ],
  },

  contacts: {
    key: "contacts",
    table: "contacts",
    label: "Contact",
    plural: "Contacts",
    icon: "user",
    color: "#a094ed",
    nameSelect: "salutation,first_name,last_name",
    displayName: person,
    searchColumns: ["first_name", "last_name", "email", "phone", "title"],
    defaultSort: { column: "last_name", ascending: true },
    hasOwner: true,
    activityFk: "contact_id",
    listViews: [
      { key: "all", label: "All Contacts" },
      { key: "mine", label: "My Contacts", mine: true },
    ],
    fields: [
      { name: "salutation", label: "Salutation", type: "picklist", picklist: "salutation", section: "Contact Information" },
      ownerField("Contact Information"),
      { name: "first_name", label: "First Name", type: "text", section: "Contact Information" },
      { name: "last_name", label: "Last Name", type: "text", required: true, section: "Contact Information" },
      { name: "account_id", label: "Account Name", type: "lookup", lookup: "accounts", section: "Contact Information" },
      { name: "title", label: "Title", type: "text", section: "Contact Information" },
      { name: "department", label: "Department", type: "text", section: "Contact Information" },
      { name: "reports_to_id", label: "Reports To", type: "lookup", lookup: "contacts", section: "Contact Information" },
      { name: "email", label: "Email", type: "email", section: "Contact Information" },
      { name: "phone", label: "Phone", type: "phone", section: "Contact Information" },
      { name: "mobile_phone", label: "Mobile", type: "phone", section: "Contact Information" },
      { name: "lead_source", label: "Lead Source", type: "picklist", picklist: "lead_source", section: "Contact Information" },
      { name: "birthdate", label: "Birthdate", type: "date", section: "Contact Information" },
      { name: "mailing_street", label: "Mailing Street", type: "text", section: "Address Information", fullWidth: true },
      { name: "mailing_city", label: "Mailing City", type: "text", section: "Address Information" },
      { name: "mailing_state", label: "Mailing State/Province", type: "text", section: "Address Information" },
      { name: "mailing_postal_code", label: "Mailing Zip/Postal Code", type: "text", section: "Address Information" },
      { name: "mailing_country", label: "Mailing Country", type: "text", section: "Address Information" },
      { name: "description", label: "Description", type: "textarea", section: "Description Information", fullWidth: true },
    ],
    listColumns: ["account_id", "title", "phone", "email", "owner_id"],
    highlights: ["title", "account_id", "phone", "email", "owner_id"],
    related: [
      { object: "opportunities", fk: "contact_id", columns: ["stage", "amount", "close_date"] },
      { object: "cases", fk: "contact_id", columns: ["subject", "status", "priority"] },
      { object: "contacts", fk: "reports_to_id", title: "Direct Reports", columns: ["title", "email"] },
    ],
  },

  leads: {
    key: "leads",
    table: "leads",
    label: "Lead",
    plural: "Leads",
    icon: "star",
    color: "#f88962",
    nameSelect: "salutation,first_name,last_name",
    displayName: person,
    searchColumns: ["first_name", "last_name", "company", "email", "phone"],
    defaultSort: { column: "created_at", ascending: false },
    hasOwner: true,
    activityFk: "lead_id",
    listViews: [
      { key: "open", label: "All Open Leads", notIn: { status: ["converted", "unqualified"] } },
      { key: "mine", label: "My Open Leads", mine: true, notIn: { status: ["converted", "unqualified"] } },
      { key: "all", label: "All Leads" },
      { key: "converted", label: "Converted Leads", eq: { status: "converted" } },
    ],
    path: {
      field: "status",
      picklist: "lead_status",
      steps: ["new", "working", "nurturing", "qualified", "converted"],
      closed: ["unqualified"],
    },
    fields: [
      { name: "salutation", label: "Salutation", type: "picklist", picklist: "salutation", section: "Lead Information" },
      ownerField("Lead Information"),
      { name: "first_name", label: "First Name", type: "text", section: "Lead Information" },
      { name: "last_name", label: "Last Name", type: "text", required: true, section: "Lead Information" },
      { name: "company", label: "Company", type: "text", required: true, section: "Lead Information" },
      { name: "title", label: "Title", type: "text", section: "Lead Information" },
      { name: "status", label: "Lead Status", type: "picklist", picklist: "lead_status", required: true, excludeOptions: ["converted"], section: "Lead Information" },
      { name: "lead_source", label: "Lead Source", type: "picklist", picklist: "lead_source", section: "Lead Information" },
      { name: "email", label: "Email", type: "email", section: "Lead Information" },
      { name: "phone", label: "Phone", type: "phone", section: "Lead Information" },
      { name: "mobile_phone", label: "Mobile", type: "phone", section: "Lead Information" },
      { name: "website", label: "Website", type: "url", section: "Lead Information" },
      { name: "industry", label: "Industry", type: "picklist", picklist: "industry", section: "Lead Information" },
      { name: "rating", label: "Rating", type: "picklist", picklist: "rating", section: "Lead Information" },
      { name: "annual_revenue", label: "Annual Revenue", type: "currency", section: "Lead Information" },
      { name: "number_of_employees", label: "No. of Employees", type: "number", section: "Lead Information" },
      { name: "campaign_id", label: "Campaign", type: "lookup", lookup: "campaigns", section: "Lead Information" },
      { name: "street", label: "Street", type: "text", section: "Address Information", fullWidth: true },
      { name: "city", label: "City", type: "text", section: "Address Information" },
      { name: "state", label: "State/Province", type: "text", section: "Address Information" },
      { name: "postal_code", label: "Zip/Postal Code", type: "text", section: "Address Information" },
      { name: "country", label: "Country", type: "text", section: "Address Information" },
      { name: "description", label: "Description", type: "textarea", section: "Description Information", fullWidth: true },
      { name: "converted_account_id", label: "Converted Account", type: "lookup", lookup: "accounts", readOnly: true, section: "Conversion" },
      { name: "converted_contact_id", label: "Converted Contact", type: "lookup", lookup: "contacts", readOnly: true, section: "Conversion" },
      { name: "converted_opportunity_id", label: "Converted Opportunity", type: "lookup", lookup: "opportunities", readOnly: true, section: "Conversion" },
      { name: "converted_at", label: "Converted On", type: "datetime", readOnly: true, section: "Conversion" },
    ],
    listColumns: ["company", "status", "email", "lead_source", "owner_id"],
    highlights: ["title", "company", "phone", "email", "owner_id"],
  },

  opportunities: {
    key: "opportunities",
    table: "opportunities",
    label: "Opportunity",
    plural: "Opportunities",
    icon: "crown",
    color: "#fcb95b",
    nameSelect: "name",
    displayName: (r) => String(r.name ?? ""),
    searchColumns: ["name", "next_step"],
    defaultSort: { column: "close_date", ascending: true },
    hasOwner: true,
    activityFk: "opportunity_id",
    listViews: [
      { key: "open", label: "All Open Opportunities", notIn: { stage: ["closed_won", "closed_lost"] } },
      { key: "mine", label: "My Opportunities", mine: true },
      { key: "all", label: "All Opportunities" },
      { key: "won", label: "Closed Won", eq: { stage: "closed_won" } },
    ],
    path: {
      field: "stage",
      picklist: "opportunity_stage",
      steps: ["prospecting", "qualification", "needs_analysis", "value_proposition", "proposal", "negotiation", "closed_won"],
      closed: ["closed_lost"],
    },
    fields: [
      { name: "name", label: "Opportunity Name", type: "text", required: true, section: "Opportunity Information" },
      ownerField("Opportunity Information"),
      { name: "account_id", label: "Account Name", type: "lookup", lookup: "accounts", section: "Opportunity Information" },
      { name: "close_date", label: "Close Date", type: "date", required: true, section: "Opportunity Information" },
      { name: "contact_id", label: "Primary Contact", type: "lookup", lookup: "contacts", section: "Opportunity Information" },
      { name: "stage", label: "Stage", type: "picklist", picklist: "opportunity_stage", required: true, section: "Opportunity Information" },
      { name: "type", label: "Type", type: "picklist", picklist: "opportunity_type", section: "Opportunity Information" },
      { name: "probability", label: "Probability (%)", type: "percent", section: "Opportunity Information" },
      { name: "lead_source", label: "Lead Source", type: "picklist", picklist: "lead_source", section: "Opportunity Information" },
      { name: "amount", label: "Amount", type: "currency", section: "Opportunity Information" },
      { name: "campaign_id", label: "Primary Campaign Source", type: "lookup", lookup: "campaigns", section: "Opportunity Information" },
      { name: "next_step", label: "Next Step", type: "text", section: "Opportunity Information" },
      { name: "description", label: "Description", type: "textarea", section: "Description Information", fullWidth: true },
      { name: "closed_at", label: "Closed On", type: "datetime", readOnly: true, section: "Description Information" },
    ],
    listColumns: ["account_id", "amount", "close_date", "stage", "owner_id"],
    highlights: ["account_id", "close_date", "amount", "probability", "owner_id"],
  },

  cases: {
    key: "cases",
    table: "cases",
    label: "Case",
    plural: "Cases",
    icon: "briefcase",
    color: "#f2cf5b",
    nameSelect: "case_number,subject",
    displayName: (r) => `${r.case_number ?? ""}${r.subject ? ` · ${r.subject}` : ""}`,
    searchColumns: ["case_number", "subject"],
    defaultSort: { column: "created_at", ascending: false },
    hasOwner: true,
    activityFk: "case_id",
    listViews: [
      { key: "open", label: "All Open Cases", neq: { status: "closed" } },
      { key: "mine", label: "My Cases", mine: true },
      { key: "escalated", label: "Escalated", eq: { status: "escalated" } },
      { key: "all", label: "All Cases" },
    ],
    path: { field: "status", picklist: "case_status", steps: ["new", "working", "escalated", "closed"], closed: ["on_hold"] },
    fields: [
      { name: "subject", label: "Subject", type: "text", required: true, section: "Case Information", fullWidth: true },
      { name: "case_number", label: "Case Number", type: "text", readOnly: true, section: "Case Information" },
      ownerField("Case Information"),
      { name: "account_id", label: "Account Name", type: "lookup", lookup: "accounts", section: "Case Information" },
      { name: "contact_id", label: "Contact Name", type: "lookup", lookup: "contacts", section: "Case Information" },
      { name: "status", label: "Status", type: "picklist", picklist: "case_status", required: true, section: "Case Information" },
      { name: "priority", label: "Priority", type: "picklist", picklist: "case_priority", required: true, section: "Case Information" },
      { name: "origin", label: "Case Origin", type: "picklist", picklist: "case_origin", section: "Case Information" },
      { name: "type", label: "Type", type: "picklist", picklist: "case_type", section: "Case Information" },
      { name: "reason", label: "Case Reason", type: "picklist", picklist: "case_reason", section: "Case Information" },
      { name: "closed_at", label: "Closed On", type: "datetime", readOnly: true, section: "Case Information" },
      { name: "description", label: "Description", type: "textarea", section: "Description Information", fullWidth: true },
    ],
    listColumns: ["subject", "account_id", "status", "priority", "created_at", "owner_id"],
    highlights: ["priority", "status", "case_number", "contact_id", "owner_id"],
  },

  campaigns: {
    key: "campaigns",
    table: "campaigns",
    label: "Campaign",
    plural: "Campaigns",
    icon: "megaphone",
    color: "#f49756",
    nameSelect: "name",
    displayName: (r) => String(r.name ?? ""),
    searchColumns: ["name"],
    defaultSort: { column: "start_date", ascending: false },
    hasOwner: true,
    listViews: [
      { key: "active", label: "Active Campaigns", eq: { is_active: true } },
      { key: "mine", label: "My Campaigns", mine: true },
      { key: "all", label: "All Campaigns" },
    ],
    path: { field: "status", picklist: "campaign_status", steps: ["planned", "in_progress", "completed"], closed: ["aborted"] },
    fields: [
      { name: "name", label: "Campaign Name", type: "text", required: true, section: "Campaign Information" },
      ownerField("Campaign Information"),
      { name: "type", label: "Type", type: "picklist", picklist: "campaign_type", section: "Campaign Information" },
      { name: "status", label: "Status", type: "picklist", picklist: "campaign_status", required: true, section: "Campaign Information" },
      { name: "start_date", label: "Start Date", type: "date", section: "Campaign Information" },
      { name: "end_date", label: "End Date", type: "date", section: "Campaign Information" },
      { name: "is_active", label: "Active", type: "boolean", section: "Campaign Information" },
      { name: "budgeted_cost", label: "Budgeted Cost", type: "currency", section: "Budget" },
      { name: "actual_cost", label: "Actual Cost", type: "currency", section: "Budget" },
      { name: "expected_revenue", label: "Expected Revenue", type: "currency", section: "Budget" },
      { name: "description", label: "Description", type: "textarea", section: "Description Information", fullWidth: true },
    ],
    listColumns: ["type", "status", "start_date", "end_date", "owner_id"],
    highlights: ["type", "status", "start_date", "end_date", "expected_revenue"],
    related: [
      { object: "leads", fk: "campaign_id", columns: ["company", "status", "email"] },
      { object: "opportunities", fk: "campaign_id", columns: ["stage", "amount", "close_date"] },
    ],
  },

  products: {
    key: "products",
    table: "products",
    label: "Product",
    plural: "Products",
    icon: "package",
    color: "#b781d3",
    nameSelect: "name,product_code",
    displayName: (r) => String(r.name ?? ""),
    searchColumns: ["name", "product_code", "family"],
    defaultSort: { column: "name", ascending: true },
    hasOwner: false,
    listViews: [
      { key: "active", label: "Active Products", eq: { is_active: true } },
      { key: "all", label: "All Products" },
    ],
    fields: [
      { name: "name", label: "Product Name", type: "text", required: true, section: "Product Information" },
      { name: "product_code", label: "Product Code", type: "text", section: "Product Information" },
      { name: "family", label: "Product Family", type: "picklist", picklist: "product_family", section: "Product Information" },
      { name: "unit_price", label: "List Price", type: "currency", required: true, section: "Product Information" },
      { name: "is_active", label: "Active", type: "boolean", section: "Product Information" },
      { name: "description", label: "Product Description", type: "textarea", section: "Product Information", fullWidth: true },
    ],
    listColumns: ["product_code", "family", "unit_price", "is_active"],
    highlights: ["product_code", "family", "unit_price", "is_active"],
  },

  activities: {
    key: "activities",
    table: "activities",
    label: "Task",
    plural: "Tasks",
    icon: "check-square",
    color: "#3ba755",
    nameSelect: "subject",
    displayName: (r) => String(r.subject ?? ""),
    searchColumns: ["subject", "description"],
    defaultSort: { column: "due_date", ascending: true },
    hasOwner: true,
    listViews: [
      { key: "open", label: "My Open Tasks", mine: true, neq: { status: "completed" } },
      { key: "mine", label: "All My Tasks", mine: true },
      { key: "all", label: "All Tasks" },
      { key: "completed", label: "Completed", eq: { status: "completed" } },
    ],
    fields: [
      { name: "subject", label: "Subject", type: "text", required: true, section: "Task Information", fullWidth: true },
      { name: "type", label: "Type", type: "picklist", picklist: "activity_type", required: true, section: "Task Information" },
      ownerField("Task Information"),
      { name: "status", label: "Status", type: "picklist", picklist: "activity_status", required: true, section: "Task Information" },
      { name: "priority", label: "Priority", type: "picklist", picklist: "activity_priority", required: true, section: "Task Information" },
      { name: "due_date", label: "Due Date", type: "date", section: "Task Information" },
      { name: "start_at", label: "Start", type: "datetime", section: "Task Information" },
      { name: "end_at", label: "End", type: "datetime", section: "Task Information" },
      { name: "completed_at", label: "Completed On", type: "datetime", readOnly: true, section: "Task Information" },
      { name: "contact_id", label: "Contact", type: "lookup", lookup: "contacts", section: "Related To" },
      { name: "lead_id", label: "Lead", type: "lookup", lookup: "leads", section: "Related To" },
      { name: "account_id", label: "Account", type: "lookup", lookup: "accounts", section: "Related To" },
      { name: "opportunity_id", label: "Opportunity", type: "lookup", lookup: "opportunities", section: "Related To" },
      { name: "case_id", label: "Case", type: "lookup", lookup: "cases", section: "Related To" },
      { name: "description", label: "Comments", type: "textarea", section: "Description Information", fullWidth: true },
    ],
    listColumns: ["type", "status", "priority", "due_date", "contact_id", "account_id", "owner_id"],
    highlights: ["type", "status", "priority", "due_date", "owner_id"],
  },
};

export const NAV_OBJECTS: ObjectKey[] = [
  "leads",
  "accounts",
  "contacts",
  "opportunities",
  "cases",
  "campaigns",
  "products",
  "activities",
];

export function getObject(key: string): ObjectDef | null {
  return Object.prototype.hasOwnProperty.call(OBJECTS, key) ? OBJECTS[key as ObjectKey] : null;
}

export function lookupMeta(target: LookupTarget) {
  if (target === "users") return USERS_LOOKUP;
  const o = OBJECTS[target];
  return { table: o.table, nameSelect: o.nameSelect, displayName: o.displayName };
}

/** Alias used for an embedded lookup: owner_id -> owner, parent_account_id -> parent_account. */
export const lookupAlias = (fieldName: string) => fieldName.replace(/_id$/, "");

/** PostgREST select string with every lookup embedded via its explicit FK name. */
export function selectFor(obj: ObjectDef, opts: { withCreatedBy?: boolean } = {}) {
  const parts = ["*"];
  for (const f of obj.fields) {
    if (f.type !== "lookup" || !f.lookup) continue;
    const meta = lookupMeta(f.lookup);
    parts.push(`${lookupAlias(f.name)}:${meta.table}!${obj.table}_${f.name}_fkey(id,${meta.nameSelect})`);
  }
  if (opts.withCreatedBy) {
    parts.push(`created_by_user:profiles!${obj.table}_created_by_fkey(id,full_name,email)`);
  }
  return parts.join(",");
}

export function fieldDef(obj: ObjectDef, name: string): FieldDef {
  const f = obj.fields.find((x) => x.name === name);
  if (f) return f;
  // System columns that are not part of the editable layout
  if (name === "created_at") return { name, label: "Created", type: "datetime", section: "System", readOnly: true };
  if (name === "updated_at") return { name, label: "Last Modified", type: "datetime", section: "System", readOnly: true };
  return { name, label: name, type: "text", section: "System", readOnly: true };
}
