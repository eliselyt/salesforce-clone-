-- =============================================================================
-- Row Level Security + business logic RPCs
--
-- Sharing model (similar to a Salesforce "Public Read Only" org-wide default):
--   * Every signed-in user can READ all CRM records.
--   * Any signed-in user can CREATE records (created_by is stamped as them).
--   * Only the record OWNER, or a manager/admin, can EDIT or DELETE a record.
--   * Support agents may also edit any Case.
--   * Products (price book) are maintained by managers/admins only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: read all" on public.profiles
  for select to authenticated using (true);

create policy "profiles: update self or admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.current_user_role()) = 'admin')
  with check (id = (select auth.uid()) or (select public.current_user_role()) = 'admin');

-- Block non-admins from changing their own role / active flag
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and coalesce(public.current_user_role() <> 'admin', true)
     and (select auth.uid()) is not null then
    raise exception 'Only admins can change user roles or active status';
  end if;
  return new;
end;
$$;

create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- Standard owned CRM objects
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['accounts', 'contacts', 'leads', 'opportunities', 'campaigns', 'activities'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format($p$
      create policy "%1$s: read all" on public.%1$I
        for select to authenticated using (true)$p$, t);

    execute format($p$
      create policy "%1$s: insert as self" on public.%1$I
        for insert to authenticated
        with check (created_by = (select auth.uid()))$p$, t);

    execute format($p$
      create policy "%1$s: update own or manager" on public.%1$I
        for update to authenticated
        using (owner_id = (select auth.uid()) or owner_id is null or (select public.is_manager_or_admin()))
        with check ((select auth.uid()) is not null)$p$, t);

    execute format($p$
      create policy "%1$s: delete own or manager" on public.%1$I
        for delete to authenticated
        using (owner_id = (select auth.uid()) or (select public.is_manager_or_admin()))$p$, t);
  end loop;
end;
$$;

-- Cases: support agents can work any case
alter table public.cases enable row level security;

create policy "cases: read all" on public.cases
  for select to authenticated using (true);

create policy "cases: insert as self" on public.cases
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "cases: update own, support or manager" on public.cases
  for update to authenticated
  using (
    owner_id = (select auth.uid()) or owner_id is null
    or (select public.current_user_role()) in ('admin', 'manager', 'support_agent')
  )
  with check ((select auth.uid()) is not null);

create policy "cases: delete own or manager" on public.cases
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_manager_or_admin()));

-- Notes: only the author (or manager) can edit/delete
alter table public.notes enable row level security;

create policy "notes: read all" on public.notes
  for select to authenticated using (true);

create policy "notes: insert as self" on public.notes
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "notes: update own or manager" on public.notes
  for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_manager_or_admin()))
  with check (owner_id = (select auth.uid()) or (select public.is_manager_or_admin()));

create policy "notes: delete own or manager" on public.notes
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_manager_or_admin()));

-- ---------------------------------------------------------------------------
-- Products (price book) — managers/admins maintain
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;

create policy "products: read all" on public.products
  for select to authenticated using (true);

create policy "products: insert manager" on public.products
  for insert to authenticated with check ((select public.is_manager_or_admin()));

create policy "products: update manager" on public.products
  for update to authenticated
  using ((select public.is_manager_or_admin()))
  with check ((select public.is_manager_or_admin()));

create policy "products: delete manager" on public.products
  for delete to authenticated using ((select public.is_manager_or_admin()));

-- ---------------------------------------------------------------------------
-- Opportunity line items — follow the parent opportunity's edit rights
-- ---------------------------------------------------------------------------
create or replace function public.can_edit_opportunity(p_opportunity_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.opportunities o
    where o.id = p_opportunity_id
      and (o.owner_id = (select auth.uid()) or o.owner_id is null or public.is_manager_or_admin())
  );
$$;

alter table public.opportunity_line_items enable row level security;

create policy "oli: read all" on public.opportunity_line_items
  for select to authenticated using (true);

create policy "oli: insert if can edit opp" on public.opportunity_line_items
  for insert to authenticated
  with check (public.can_edit_opportunity(opportunity_id));

create policy "oli: update if can edit opp" on public.opportunity_line_items
  for update to authenticated
  using (public.can_edit_opportunity(opportunity_id))
  with check (public.can_edit_opportunity(opportunity_id));

create policy "oli: delete if can edit opp" on public.opportunity_line_items
  for delete to authenticated
  using (public.can_edit_opportunity(opportunity_id));

-- Keep opportunity.amount in sync with line items when it has products
create or replace function public.sync_opportunity_amount()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_opp uuid := coalesce(new.opportunity_id, old.opportunity_id);
begin
  update public.opportunities
     set amount = (select coalesce(sum(total_price), 0)
                     from public.opportunity_line_items where opportunity_id = v_opp)
   where id = v_opp;
  return null;
end;
$$;

create trigger sync_opportunity_amount
  after insert or update or delete on public.opportunity_line_items
  for each row execute function public.sync_opportunity_amount();

-- ---------------------------------------------------------------------------
-- Campaign members
-- ---------------------------------------------------------------------------
alter table public.campaign_members enable row level security;

create policy "campaign_members: read all" on public.campaign_members
  for select to authenticated using (true);

create policy "campaign_members: insert as self" on public.campaign_members
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "campaign_members: update creator or manager" on public.campaign_members
  for update to authenticated
  using (created_by = (select auth.uid()) or (select public.is_manager_or_admin()))
  with check ((select auth.uid()) is not null);

create policy "campaign_members: delete creator or manager" on public.campaign_members
  for delete to authenticated
  using (created_by = (select auth.uid()) or (select public.is_manager_or_admin()));

-- ---------------------------------------------------------------------------
-- RPC: convert a lead into account + contact (+ optional opportunity)
-- Runs as the caller, so all RLS rules above still apply.
-- ---------------------------------------------------------------------------
create or replace function public.convert_lead(
  p_lead_id             uuid,
  p_account_id          uuid    default null,
  p_create_opportunity  boolean default true,
  p_opportunity_name    text    default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lead    public.leads%rowtype;
  v_account uuid;
  v_contact uuid;
  v_opp     uuid;
begin
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'Lead % not found', p_lead_id;
  end if;
  if v_lead.status = 'converted' then
    raise exception 'Lead has already been converted';
  end if;

  -- Account: use existing or create from lead
  if p_account_id is not null then
    v_account := p_account_id;
  else
    insert into public.accounts
      (name, industry, rating, website, phone, annual_revenue, number_of_employees,
       billing_street, billing_city, billing_state, billing_postal_code, billing_country,
       type, owner_id)
    values
      (v_lead.company, v_lead.industry, v_lead.rating, v_lead.website, v_lead.phone,
       v_lead.annual_revenue, v_lead.number_of_employees,
       v_lead.street, v_lead.city, v_lead.state, v_lead.postal_code, v_lead.country,
       'prospect', (select auth.uid()))
    returning id into v_account;
  end if;

  -- Contact
  insert into public.contacts
    (account_id, salutation, first_name, last_name, title, email, phone, mobile_phone,
     lead_source, mailing_street, mailing_city, mailing_state, mailing_postal_code,
     mailing_country, description, owner_id)
  values
    (v_account, v_lead.salutation, v_lead.first_name, v_lead.last_name, v_lead.title,
     v_lead.email, v_lead.phone, v_lead.mobile_phone, v_lead.lead_source,
     v_lead.street, v_lead.city, v_lead.state, v_lead.postal_code, v_lead.country,
     v_lead.description, (select auth.uid()))
  returning id into v_contact;

  -- Opportunity
  if p_create_opportunity then
    insert into public.opportunities
      (name, account_id, contact_id, campaign_id, lead_source, type, owner_id)
    values
      (coalesce(nullif(trim(p_opportunity_name), ''), v_lead.company || ' - New Business'),
       v_account, v_contact, v_lead.campaign_id, v_lead.lead_source, 'new_business',
       (select auth.uid()))
    returning id into v_opp;
  end if;

  -- Re-parent open activities and notes to the new contact/account
  update public.activities
     set contact_id = v_contact, account_id = coalesce(account_id, v_account),
         opportunity_id = coalesce(opportunity_id, v_opp)
   where lead_id = p_lead_id;
  update public.notes
     set contact_id = v_contact, account_id = coalesce(account_id, v_account)
   where lead_id = p_lead_id;

  -- Campaign history follows the person
  insert into public.campaign_members (campaign_id, contact_id, status)
  select campaign_id, v_contact, 'converted'
    from public.campaign_members where lead_id = p_lead_id
  on conflict do nothing;

  update public.leads
     set status = 'converted',
         converted_at = now(),
         converted_account_id = v_account,
         converted_contact_id = v_contact,
         converted_opportunity_id = v_opp
   where id = p_lead_id;

  return jsonb_build_object(
    'account_id', v_account,
    'contact_id', v_contact,
    'opportunity_id', v_opp
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: home-page dashboard numbers (runs as caller, RLS applies)
-- ---------------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'open_pipeline', (
      select coalesce(sum(amount), 0) from public.opportunities
       where stage not in ('closed_won', 'closed_lost')),
    'weighted_pipeline', (
      select coalesce(sum(amount * coalesce(probability, 0) / 100.0), 0) from public.opportunities
       where stage not in ('closed_won', 'closed_lost')),
    'won_this_quarter', (
      select coalesce(sum(amount), 0) from public.opportunities
       where stage = 'closed_won' and closed_at >= date_trunc('quarter', now())),
    'win_rate', (
      select case when count(*) = 0 then 0
             else round(100.0 * count(*) filter (where stage = 'closed_won') / count(*), 1) end
        from public.opportunities where stage in ('closed_won', 'closed_lost')),
    'open_leads', (
      select count(*) from public.leads where status not in ('converted', 'unqualified')),
    'open_cases', (
      select count(*) from public.cases where status <> 'closed'),
    'by_stage', (
      select coalesce(jsonb_agg(jsonb_build_object('stage', s.stage, 'count', s.cnt, 'amount', s.amt)
                                order by s.ord), '[]'::jsonb)
        from (
          select o.stage, count(*) as cnt, coalesce(sum(o.amount), 0) as amt,
                 array_position(enum_range(null::public.opportunity_stage), o.stage) as ord
            from public.opportunities o
           group by o.stage
        ) s),
    'leads_by_source', (
      select coalesce(jsonb_agg(jsonb_build_object('source', coalesce(l.lead_source::text, 'unknown'), 'count', l.cnt)
                                order by l.cnt desc), '[]'::jsonb)
        from (select lead_source, count(*) as cnt from public.leads group by lead_source) l)
  );
$$;

-- Lock down function execution to signed-in users
revoke execute on function public.convert_lead(uuid, uuid, boolean, text) from public, anon;
grant  execute on function public.convert_lead(uuid, uuid, boolean, text) to authenticated;
revoke execute on function public.dashboard_stats() from public, anon;
grant  execute on function public.dashboard_stats() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
