-- AccessScope v1 — Initial Schema

-- ─── Contractor Profiles ────────────────────────────────────────────────────
create table contractor_profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  company_name       text not null,
  display_name       text not null,
  license_number     text,
  phone              text,
  email              text not null,
  logo_url           text,
  address_line1      text,
  city               text,
  state              char(2),
  zip                text,
  default_labor_rate numeric(8,2) default 75,
  default_markup_pct numeric(5,2) default 20,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ─── Subscriptions ──────────────────────────────────────────────────────────
create table subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  contractor_id       uuid not null references contractor_profiles(id) on delete cascade,
  stripe_customer_id  text unique not null,
  stripe_sub_id       text unique,
  plan_id             text,  -- 'solo' | 'pro' | 'team' | 'per_packet'
  status              text not null default 'trialing',  -- 'active' | 'trialing' | 'past_due' | 'canceled'
  current_period_end  timestamptz,
  packet_credits      int not null default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ─── Clients ────────────────────────────────────────────────────────────────
create table clients (
  id              uuid primary key default gen_random_uuid(),
  contractor_id   uuid not null references contractor_profiles(id) on delete cascade,
  first_name      text not null,
  last_name       text not null,
  address_line1   text not null,
  address_line2   text,
  city            text not null,
  state           char(2) not null,
  zip             text not null,
  phone           text,
  email           text,
  referral_source text,  -- 'self' | 'referral' | 'physician' | 'ot' | 'other'
  referral_notes  text,
  created_at      timestamptz default now()
);

-- ─── Job Number Sequence ─────────────────────────────────────────────────────
create sequence job_number_seq;

-- ─── Jobs ────────────────────────────────────────────────────────────────────
create table jobs (
  id                      uuid primary key default gen_random_uuid(),
  contractor_id           uuid not null references contractor_profiles(id) on delete cascade,
  client_id               uuid not null references clients(id),
  job_number              text unique not null default (
    'AS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('job_number_seq')::text, 4, '0')
  ),
  title                   text,
  status                  text not null default 'draft',  -- 'draft' | 'sent' | 'accepted' | 'declined' | 'archived'
  notes                   text,
  site_address_override   text,
  permit_jurisdiction     text,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now(),
  sent_at                 timestamptz,
  accepted_at             timestamptz
);

-- ─── Job Areas ───────────────────────────────────────────────────────────────
create table job_areas (
  id                uuid primary key default gen_random_uuid(),
  job_id            uuid not null references jobs(id) on delete cascade,
  area_type         text not null check (area_type in ('bathroom', 'entryway')),
  area_label        text,
  area_order        int not null default 0,
  current_condition text,
  notes             text,
  created_at        timestamptz default now()
);

-- ─── Job Area Modifications ───────────────────────────────────────────────────
create table job_area_modifications (
  id                  uuid primary key default gen_random_uuid(),
  job_area_id         uuid not null references job_areas(id) on delete cascade,
  modification_key    text not null,
  is_selected         boolean not null default true,
  material_tier       text not null default 'standard' check (material_tier in ('economy', 'standard', 'premium')),
  quantity            numeric(8,2),
  unit                text,
  measurement_notes   text,
  permit_required     boolean not null default false,
  risk_flags          text[] not null default '{}',
  contractor_notes    text,
  override_unit_cost  numeric(8,2),
  override_labor_cost numeric(8,2),
  sort_order          int not null default 0
);

-- ─── Scope Line Items ─────────────────────────────────────────────────────────
create table scope_line_items (
  id                    uuid primary key default gen_random_uuid(),
  job_id                uuid not null references jobs(id) on delete cascade,
  job_area_id           uuid references job_areas(id),
  modification_id       uuid references job_area_modifications(id),
  line_number           int,
  category              text not null default 'material' check (category in ('material', 'labor', 'permit', 'demo', 'misc')),
  description           text not null,
  scope_description     text,
  customer_description  text,
  quantity              numeric(8,2) not null default 1,
  unit                  text,
  unit_material_cost    numeric(8,2) not null default 0,
  unit_labor_cost       numeric(8,2) not null default 0,
  markup_pct            numeric(5,2) not null default 20,
  total_material        numeric(10,2) generated always as (quantity * unit_material_cost) stored,
  total_labor           numeric(10,2) generated always as (quantity * unit_labor_cost) stored,
  total_line            numeric(10,2),
  is_included           boolean not null default true,
  sort_order            int not null default 0
);

-- ─── Job Photos ──────────────────────────────────────────────────────────────
create table job_photos (
  id            uuid primary key default gen_random_uuid(),
  job_area_id   uuid not null references job_areas(id) on delete cascade,
  storage_path  text not null,
  caption       text,
  taken_at      timestamptz,
  uploaded_at   timestamptz default now()
);

-- ─── Proposal Packets ─────────────────────────────────────────────────────────
create table proposal_packets (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid not null references jobs(id) on delete cascade,
  version          int not null default 1,
  storage_path     text,
  generated_at     timestamptz default now(),
  packet_type      text not null default 'full' check (packet_type in ('full', 'checklist_only', 'estimate_only')),
  stripe_charge_id text
);

-- ─── Email Logs ──────────────────────────────────────────────────────────────
create table email_logs (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references jobs(id) on delete cascade,
  resend_id       text,
  template_key    text not null,
  sent_at         timestamptz default now(),
  recipient_email text not null,
  status          text not null default 'sent' check (status in ('sent', 'delivered', 'bounced', 'opened'))
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index on jobs (contractor_id, status);
create index on jobs (client_id);
create index on job_areas (job_id);
create index on job_area_modifications (job_area_id);
create index on scope_line_items (job_id, sort_order);
create index on proposal_packets (job_id);
create index on email_logs (job_id, template_key);
create index on subscriptions (contractor_id);
create index on clients (contractor_id);

-- ─── Updated-at Trigger ───────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on contractor_profiles
  for each row execute function set_updated_at();

create trigger set_updated_at before update on jobs
  for each row execute function set_updated_at();

create trigger set_updated_at before update on subscriptions
  for each row execute function set_updated_at();
