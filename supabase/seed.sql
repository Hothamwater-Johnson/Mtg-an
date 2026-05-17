-- Seed data for local development.
--
-- Auth users cannot be seeded via SQL — create your test contractor account
-- through the signup UI at http://localhost:3000/signup, then run:
--
--   UPDATE clients
--   SET contractor_id = '<your-user-id>'
--   WHERE email = 'test-client@example.com';
--
-- Find your user ID in Supabase Studio → Authentication → Users.

INSERT INTO clients (
  id,
  contractor_id,
  first_name,
  last_name,
  address_line1,
  city,
  state,
  zip,
  phone,
  email,
  referral_source,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',  -- placeholder, update after signup
  'Jane',
  'Homeowner',
  '123 Maple Street',
  'Springfield',
  'IL',
  '62701',
  '(555) 555-0100',
  'test-client@example.com',
  'referral',
  now(),
  now()
) ON CONFLICT DO NOTHING;
