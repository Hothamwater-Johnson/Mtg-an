-- Allow trial users (no Stripe customer yet) to have a subscription row.
alter table subscriptions alter column stripe_customer_id drop not null;

-- Fast webhook lookups by Stripe customer ID.
create index if not exists idx_sub_stripe_customer
  on subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

-- Update profile trigger to also provision a 2-credit trial subscription.
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

  insert into public.subscriptions (contractor_id, status, packet_credits)
  values (new.id, 'trialing', 2)
  on conflict do nothing;

  return new;
end;
$$;
