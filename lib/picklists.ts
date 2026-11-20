export type Option = { value: string; label: string };

const titleCase = (v: string) =>
  v
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const opts = (...values: string[]): Option[] => values.map((value) => ({ value, label: titleCase(value) }));
const same = (...values: string[]): Option[] => values.map((value) => ({ value, label: value }));

export const PICKLISTS = {
  salutation: same("Mr.", "Ms.", "Mrs.", "Dr.", "Prof."),
  user_role: [
    { value: "admin", label: "System Administrator" },
    { value: "manager", label: "Sales Manager" },
    { value: "sales_rep", label: "Sales Rep" },
    { value: "support_agent", label: "Support Agent" },
  ],
  account_type: opts("prospect", "customer", "partner", "reseller", "competitor", "other"),
  rating: opts("hot", "warm", "cold"),
  industry: same(
    "Agriculture",
    "Banking",
    "Biotechnology",
    "Construction",
    "Consulting",
    "Education",
    "Energy",
    "Engineering",
    "Entertainment",
    "Financial Services",
    "Government",
    "Healthcare",
    "Hospitality",
    "Insurance",
    "Manufacturing",
    "Media",
    "Not For Profit",
    "Retail",
    "Technology",
    "Telecommunications",
    "Transportation",
    "Utilities",
    "Other",
  ),
  lead_status: opts("new", "working", "nurturing", "qualified", "unqualified", "converted"),
  lead_source: [
    { value: "web", label: "Web" },
    { value: "phone_inquiry", label: "Phone Inquiry" },
    { value: "partner_referral", label: "Partner Referral" },
    { value: "purchased_list", label: "Purchased List" },
    { value: "trade_show", label: "Trade Show" },
    { value: "webinar", label: "Webinar" },
    { value: "advertisement", label: "Advertisement" },
    { value: "employee_referral", label: "Employee Referral" },
    { value: "other", label: "Other" },
  ],
  opportunity_stage: [
    { value: "prospecting", label: "Prospecting" },
    { value: "qualification", label: "Qualification" },
    { value: "needs_analysis", label: "Needs Analysis" },
    { value: "value_proposition", label: "Value Proposition" },
    { value: "proposal", label: "Proposal/Price Quote" },
    { value: "negotiation", label: "Negotiation/Review" },
    { value: "closed_won", label: "Closed Won" },
    { value: "closed_lost", label: "Closed Lost" },
  ],
  opportunity_type: [
    { value: "new_business", label: "New Business" },
    { value: "existing_business_upgrade", label: "Existing Business - Upgrade" },
    { value: "existing_business_renewal", label: "Existing Business - Renewal" },
  ],
  case_status: opts("new", "working", "escalated", "on_hold", "closed"),
  case_priority: opts("low", "medium", "high", "critical"),
  case_origin: opts("email", "phone", "web", "chat", "social"),
  case_type: same("Question", "Problem", "Feature Request", "Billing"),
  case_reason: same(
    "Installation",
    "Equipment Complexity",
    "Performance",
    "Breakdown",
    "Equipment Design",
    "Feedback",
    "Other",
  ),
  campaign_type: opts("email", "webinar", "conference", "trade_show", "advertisement", "direct_mail", "social", "other"),
  campaign_status: opts("planned", "in_progress", "completed", "aborted"),
  campaign_member_status: opts("sent", "responded", "attended", "converted"),
  product_family: same("Hardware", "Software", "Services", "Support", "Training"),
  activity_type: opts("task", "call", "email", "meeting"),
  activity_status: opts("not_started", "in_progress", "completed", "waiting", "deferred"),
  activity_priority: opts("low", "normal", "high"),
} satisfies Record<string, Option[]>;

export type PicklistKey = keyof typeof PICKLISTS;

export function picklistLabel(key: PicklistKey, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const found = (PICKLISTS[key] as Option[]).find((o) => o.value === value);
  return found ? found.label : String(value);
}
