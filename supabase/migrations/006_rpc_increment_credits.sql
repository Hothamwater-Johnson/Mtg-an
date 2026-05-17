-- Atomically add packet credits — called from Stripe webhook (service role).
create or replace function increment_packet_credits(p_contractor_id uuid, p_amount int)
returns void language plpgsql security definer as $$
begin
  update subscriptions
  set packet_credits = packet_credits + p_amount
  where contractor_id = p_contractor_id;
end;
$$;
