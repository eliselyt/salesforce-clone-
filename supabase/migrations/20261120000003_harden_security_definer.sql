-- Move SECURITY DEFINER role helpers out of the exposed API schema and stop
-- trigger functions from being callable over /rest/v1/rpc.
create schema if not exists private;
grant usage on schema private to authenticated;

-- ALTER ... SET SCHEMA keeps the function OID, so existing RLS policies follow.
alter function public.current_user_role()   set schema private;
alter function public.is_manager_or_admin() set schema private;

revoke execute on function private.current_user_role()   from public, anon;
revoke execute on function private.is_manager_or_admin() from public, anon;
grant  execute on function private.current_user_role()   to authenticated;
grant  execute on function private.is_manager_or_admin() to authenticated;

-- Re-point function bodies that referenced the old names
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and coalesce(private.current_user_role() <> 'admin', true)
     and (select auth.uid()) is not null then
    raise exception 'Only admins can change user roles or active status';
  end if;
  return new;
end;
$$;

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
      and (o.owner_id = (select auth.uid()) or o.owner_id is null or private.is_manager_or_admin())
  );
$$;

-- Trigger-only functions: nobody needs to call them directly
revoke execute on function public.protect_profile_role()    from public, anon, authenticated;
revoke execute on function public.sync_opportunity_amount() from public, anon, authenticated;
revoke execute on function public.handle_new_user()         from public, anon, authenticated;
revoke execute on function public.can_edit_opportunity(uuid) from public, anon;
