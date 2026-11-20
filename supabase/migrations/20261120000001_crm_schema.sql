-- =============================================================================
-- Salesforce Clone — core CRM schema
-- Objects: profiles, accounts, contacts, leads, opportunities, products,
--          opportunity_line_items, campaigns, campaign_members, cases,
--          activities (tasks / calls / emails / meetings), notes
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums (picklists)
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'manager', 'sales_rep', 'support_agent');

create type public.account_type as enum
  ('prospect', 'customer', 'partner', 'reseller', 'competitor', 'other');
create type public.account_rating as enum ('hot', 'warm', 'cold');

create type public.lead_status as enum
  ('new', 'working', 'nurturing', 'qualified', 'unqualified', 'converted');
create type public.lead_source as enum
  ('web', 'phone_inquiry', 'partner_referral', 'purchased_list', 'trade_show',
   'webinar', 'advertisement', 'employee_referral', 'other');

create type public.opportunity_stage as enum
  ('prospecting', 'qualification', 'needs_analysis', 'value_proposition',
   'proposal', 'negotiation', 'closed_won', 'closed_lost');
create type public.opportunity_type as enum
  ('new_business', 'existing_business_upgrade', 'existing_business_renewal');

create type public.case_status as enum
  ('new', 'working', 'escalated', 'on_hold', 'closed');
create type public.case_priority as enum ('low', 'medium', 'high', 'critical');
create type public.case_origin as enum ('email', 'phone', 'web', 'chat', 'social');

create type public.campaign_type as enum
  ('email', 'webinar', 'conference', 'trade_show', 'advertisement',
   'direct_mail', 'social', 'other');
create type public.campaign_status as enum
  ('planned', 'in_progress', 'completed', 'aborted');
create type public.campaign_member_status as enum ('sent', 'responded', 'attended', 'converted');

create type public.activity_type as enum ('task', 'call', 'email', 'meeting');
create type public.activity_status as enum
  ('not_started', 'in_progress', 'completed', 'waiting', 'deferred');
create type public.activity_priority as enum ('low', 'normal', 'high');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  title       text,
  phone       text,
  avatar_url  text,
  role        public.user_role not null default 'sales_rep',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'CRM users (mirrors auth.users).';

-- Role helpers (security definer so RLS policies can read roles without recursion)
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role in ('admin', 'manager') from public.profiles where id = (select auth.uid())),
    false
  );
$$;

-- Auto-create a profile for every new auth user. First user becomes admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when exists (select 1 from public.profiles) then 'sales_rep'::public.user_role
         else 'admin'::public.user_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
create table public.accounts (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  account_number      text,
  type                public.account_type default 'prospect',
  industry            text,
  rating              public.account_rating,
  website             text,
  phone               text,
  annual_revenue      numeric(16, 2),
  number_of_employees integer check (number_of_employees >= 0),
  parent_account_id   uuid references public.accounts (id) on delete set null,
  billing_street      text,
  billing_city        text,
  billing_state       text,
  billing_postal_code text,
  billing_country     text,
  description         text,
  owner_id            uuid references public.profiles (id) on delete set null default auth.uid(),
  created_by          uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------
create table public.contacts (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid references public.accounts (id) on delete set null,
  salutation          text,
  first_name          text,
  last_name           text not null,
  title               text,
  department          text,
  email               text,
  phone               text,
  mobile_phone        text,
  lead_source         public.lead_source,
  birthdate           date,
  reports_to_id       uuid references public.contacts (id) on delete set null,
  mailing_street      text,
  mailing_city        text,
  mailing_state       text,
  mailing_postal_code text,
  mailing_country     text,
  description         text,
  owner_id            uuid references public.profiles (id) on delete set null default auth.uid(),
  created_by          uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  type                public.campaign_type default 'email',
  status              public.campaign_status not null default 'planned',
  start_date          date,
  end_date            date,
  budgeted_cost       numeric(14, 2),
  actual_cost         numeric(14, 2),
  expected_revenue    numeric(16, 2),
  is_active           boolean not null default true,
  description         text,
  owner_id            uuid references public.profiles (id) on delete set null default auth.uid(),
  created_by          uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- ---------------------------------------------------------------------------
-- Opportunities
-- ---------------------------------------------------------------------------
create table public.opportunities (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  account_id          uuid references public.accounts (id) on delete cascade,
  contact_id          uuid references public.contacts (id) on delete set null,
  campaign_id         uuid references public.campaigns (id) on delete set null,
  stage               public.opportunity_stage not null default 'prospecting',
  amount              numeric(16, 2),
  probability         smallint check (probability between 0 and 100),
  close_date          date not null default (current_date + 30),
  type                public.opportunity_type,
  lead_source         public.lead_source,
  next_step           text,
  description         text,
  closed_at           timestamptz,
  owner_id            uuid references public.profiles (id) on delete set null default auth.uid(),
  created_by          uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Default probability per stage (like Salesforce), and closed_at stamping
create or replace function public.opportunity_stage_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.stage is distinct from old.stage then
    if tg_op = 'INSERT' and new.probability is not null then
      null; -- respect explicit probability on insert
    else
      new.probability := case new.stage
        when 'prospecting'       then 10
        when 'qualification'     then 20
        when 'needs_analysis'    then 30
        when 'value_proposition' then 50
        when 'proposal'          then 70
        when 'negotiation'       then 90
        when 'closed_won'        then 100
        when 'closed_lost'       then 0
      end;
    end if;
    if new.stage in ('closed_won', 'closed_lost') then
      new.closed_at := coalesce(new.closed_at, now());
    else
      new.closed_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger opportunity_stage_defaults
  before insert or update on public.opportunities
  for each row execute function public.opportunity_stage_defaults();

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------
create table public.leads (
  id                        uuid primary key default gen_random_uuid(),
  salutation                text,
  first_name                text,
  last_name                 text not null,
  company                   text not null,
  title                     text,
  email                     text,
  phone                     text,
  mobile_phone              text,
  website                   text,
  status                    public.lead_status not null default 'new',
  lead_source               public.lead_source,
  industry                  text,
  rating                    public.account_rating,
  annual_revenue            numeric(16, 2),
  number_of_employees       integer check (number_of_employees >= 0),
  street                    text,
  city                      text,
  state                     text,
  postal_code               text,
  country                   text,
  description               text,
  campaign_id               uuid references public.campaigns (id) on delete set null,
  converted_at              timestamptz,
  converted_account_id      uuid references public.accounts (id) on delete set null,
  converted_contact_id      uuid references public.contacts (id) on delete set null,
  converted_opportunity_id  uuid references public.opportunities (id) on delete set null,
  owner_id                  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_by                uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Campaign members (lead or contact)
-- ---------------------------------------------------------------------------
create table public.campaign_members (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns (id) on delete cascade,
  lead_id      uuid references public.leads (id) on delete cascade,
  contact_id   uuid references public.contacts (id) on delete cascade,
  status       public.campaign_member_status not null default 'sent',
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  check (num_nonnulls(lead_id, contact_id) = 1)
);
create unique index campaign_members_lead_uq    on public.campaign_members (campaign_id, lead_id)    where lead_id is not null;
create unique index campaign_members_contact_uq on public.campaign_members (campaign_id, contact_id) where contact_id is not null;

-- ---------------------------------------------------------------------------
-- Products & opportunity line items
-- ---------------------------------------------------------------------------
create table public.products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  product_code  text unique,
  family        text,
  description   text,
  unit_price    numeric(14, 2) not null default 0 check (unit_price >= 0),
  is_active     boolean not null default true,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.opportunity_line_items (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references public.opportunities (id) on delete cascade,
  product_id      uuid not null references public.products (id) on delete restrict,
  quantity        numeric(12, 2) not null default 1 check (quantity > 0),
  unit_price      numeric(14, 2) not null check (unit_price >= 0),
  discount        numeric(5, 2) not null default 0 check (discount between 0 and 100),
  total_price     numeric(16, 2) generated always as
                    (round(quantity * unit_price * (1 - discount / 100), 2)) stored,
  description     text,
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Cases (customer support)
-- ---------------------------------------------------------------------------
create sequence public.case_number_seq start 1001;

create table public.cases (
  id              uuid primary key default gen_random_uuid(),
  case_number     text not null unique
                    default lpad(nextval('public.case_number_seq')::text, 8, '0'),
  subject         text not null,
  description     text,
  status          public.case_status not null default 'new',
  priority        public.case_priority not null default 'medium',
  origin          public.case_origin default 'web',
  type            text,
  reason          text,
  account_id      uuid references public.accounts (id) on delete set null,
  contact_id      uuid references public.contacts (id) on delete set null,
  closed_at       timestamptz,
  owner_id        uuid references public.profiles (id) on delete set null default auth.uid(),
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create or replace function public.case_closed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'closed' then
    new.closed_at := coalesce(new.closed_at, now());
  else
    new.closed_at := null;
  end if;
  return new;
end;
$$;

create trigger case_closed_at
  before insert or update of status on public.cases
  for each row execute function public.case_closed_at();

-- ---------------------------------------------------------------------------
-- Activities (tasks, calls, emails, meetings) — linked to any record
-- "who" = lead or contact; "what" = account / opportunity / case / campaign
-- ---------------------------------------------------------------------------
create table public.activities (
  id              uuid primary key default gen_random_uuid(),
  type            public.activity_type not null default 'task',
  subject         text not null,
  description     text,
  status          public.activity_status not null default 'not_started',
  priority        public.activity_priority not null default 'normal',
  due_date        date,
  start_at        timestamptz,
  end_at          timestamptz,
  completed_at    timestamptz,
  lead_id         uuid references public.leads (id) on delete cascade,
  contact_id      uuid references public.contacts (id) on delete cascade,
  account_id      uuid references public.accounts (id) on delete cascade,
  opportunity_id  uuid references public.opportunities (id) on delete cascade,
  case_id         uuid references public.cases (id) on delete cascade,
  owner_id        uuid references public.profiles (id) on delete set null default auth.uid(),
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (end_at is null or start_at is null or end_at >= start_at)
);

create or replace function public.activity_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger activity_completed_at
  before insert or update of status on public.activities
  for each row execute function public.activity_completed_at();

-- ---------------------------------------------------------------------------
-- Notes — linked to any record
-- ---------------------------------------------------------------------------
create table public.notes (
  id              uuid primary key default gen_random_uuid(),
  title           text,
  body            text not null,
  lead_id         uuid references public.leads (id) on delete cascade,
  contact_id      uuid references public.contacts (id) on delete cascade,
  account_id      uuid references public.accounts (id) on delete cascade,
  opportunity_id  uuid references public.opportunities (id) on delete cascade,
  case_id         uuid references public.cases (id) on delete cascade,
  owner_id        uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (num_nonnulls(lead_id, contact_id, account_id, opportunity_id, case_id) >= 1)
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'accounts', 'contacts', 'campaigns', 'opportunities', 'leads',
    'products', 'opportunity_line_items', 'cases', 'activities', 'notes'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Indexes (foreign keys, owners, common filters, search)
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;

create index accounts_owner_idx           on public.accounts (owner_id);
create index accounts_created_by_idx      on public.accounts (created_by);
create index accounts_parent_idx          on public.accounts (parent_account_id);
create index accounts_name_trgm_idx       on public.accounts using gin (name extensions.gin_trgm_ops);

create index contacts_account_idx         on public.contacts (account_id);
create index contacts_owner_idx           on public.contacts (owner_id);
create index contacts_created_by_idx      on public.contacts (created_by);
create index contacts_reports_to_idx      on public.contacts (reports_to_id);
create index contacts_email_idx           on public.contacts (lower(email));
create index contacts_name_trgm_idx       on public.contacts using gin ((coalesce(first_name, '') || ' ' || last_name) extensions.gin_trgm_ops);

create index campaigns_owner_idx          on public.campaigns (owner_id);
create index campaigns_created_by_idx     on public.campaigns (created_by);

create index opportunities_account_idx    on public.opportunities (account_id);
create index opportunities_contact_idx    on public.opportunities (contact_id);
create index opportunities_campaign_idx   on public.opportunities (campaign_id);
create index opportunities_owner_idx      on public.opportunities (owner_id);
create index opportunities_created_by_idx on public.opportunities (created_by);
create index opportunities_stage_idx      on public.opportunities (stage, close_date);

create index leads_owner_idx              on public.leads (owner_id);
create index leads_created_by_idx         on public.leads (created_by);
create index leads_status_idx             on public.leads (status);
create index leads_campaign_idx           on public.leads (campaign_id);
create index leads_conv_account_idx       on public.leads (converted_account_id);
create index leads_conv_contact_idx       on public.leads (converted_contact_id);
create index leads_conv_opp_idx           on public.leads (converted_opportunity_id);
create index leads_email_idx              on public.leads (lower(email));

create index campaign_members_campaign_idx   on public.campaign_members (campaign_id);
create index campaign_members_lead_idx       on public.campaign_members (lead_id);
create index campaign_members_contact_idx    on public.campaign_members (contact_id);
create index campaign_members_created_by_idx on public.campaign_members (created_by);

create index products_created_by_idx      on public.products (created_by);
create index oli_opportunity_idx          on public.opportunity_line_items (opportunity_id);
create index oli_product_idx              on public.opportunity_line_items (product_id);
create index oli_created_by_idx           on public.opportunity_line_items (created_by);

create index cases_account_idx            on public.cases (account_id);
create index cases_contact_idx            on public.cases (contact_id);
create index cases_owner_idx              on public.cases (owner_id);
create index cases_created_by_idx         on public.cases (created_by);
create index cases_status_idx             on public.cases (status, priority);

create index activities_owner_idx         on public.activities (owner_id, status, due_date);
create index activities_created_by_idx    on public.activities (created_by);
create index activities_lead_idx          on public.activities (lead_id);
create index activities_contact_idx       on public.activities (contact_id);
create index activities_account_idx       on public.activities (account_id);
create index activities_opportunity_idx   on public.activities (opportunity_id);
create index activities_case_idx          on public.activities (case_id);

create index notes_owner_idx              on public.notes (owner_id);
create index notes_lead_idx               on public.notes (lead_id);
create index notes_contact_idx            on public.notes (contact_id);
create index notes_account_idx            on public.notes (account_id);
create index notes_opportunity_idx        on public.notes (opportunity_id);
create index notes_case_idx               on public.notes (case_id);
