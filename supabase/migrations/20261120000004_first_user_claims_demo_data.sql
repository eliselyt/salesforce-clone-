-- The first person to sign up becomes the System Administrator and takes
-- ownership of any unowned (seeded demo) records.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first boolean := not exists (select 1 from public.profiles);
  t text;
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when v_first then 'admin'::public.user_role else 'sales_rep'::public.user_role end
  );

  if v_first then
    foreach t in array array['accounts', 'contacts', 'leads', 'opportunities', 'campaigns', 'cases', 'activities'] loop
      execute format('update public.%I set owner_id = $1 where owner_id is null', t) using new.id;
      execute format('update public.%I set created_by = $1 where created_by is null', t) using new.id;
    end loop;
    update public.products set created_by = new.id where created_by is null;
    update public.notes set owner_id = new.id where owner_id is null;
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
