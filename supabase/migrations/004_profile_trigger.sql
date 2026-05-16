-- Auto-create a contractor_profiles row when a new auth user is confirmed.
-- user_metadata fields (company_name, display_name) are set during signUp().

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.contractor_profiles (id, company_name, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'company_name', 'My Company'),
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
