-- AccessScope v1 — Row Level Security Policies

alter table contractor_profiles enable row level security;
alter table subscriptions       enable row level security;
alter table clients             enable row level security;
alter table jobs                enable row level security;
alter table job_areas           enable row level security;
alter table job_area_modifications enable row level security;
alter table scope_line_items    enable row level security;
alter table job_photos          enable row level security;
alter table proposal_packets    enable row level security;
alter table email_logs          enable row level security;

-- contractor_profiles: own row only
create policy "contractors: own profile"
  on contractor_profiles for all
  using (id = auth.uid());

-- subscriptions: own subscription only
create policy "contractors: own subscription"
  on subscriptions for all
  using (contractor_id = auth.uid());

-- clients: own clients only
create policy "contractors: own clients"
  on clients for all
  using (contractor_id = auth.uid());

-- jobs: own jobs only
create policy "contractors: own jobs"
  on jobs for all
  using (contractor_id = auth.uid());

-- job_areas: via job ownership
create policy "contractors: own job_areas"
  on job_areas for all
  using (
    exists (
      select 1 from jobs j
      where j.id = job_areas.job_id
        and j.contractor_id = auth.uid()
    )
  );

-- job_area_modifications: via job_area → job ownership
create policy "contractors: own modifications"
  on job_area_modifications for all
  using (
    exists (
      select 1 from job_areas ja
      join jobs j on j.id = ja.job_id
      where ja.id = job_area_modifications.job_area_id
        and j.contractor_id = auth.uid()
    )
  );

-- scope_line_items: via job ownership
create policy "contractors: own scope_line_items"
  on scope_line_items for all
  using (
    exists (
      select 1 from jobs j
      where j.id = scope_line_items.job_id
        and j.contractor_id = auth.uid()
    )
  );

-- job_photos: via job_area → job ownership
create policy "contractors: own photos"
  on job_photos for all
  using (
    exists (
      select 1 from job_areas ja
      join jobs j on j.id = ja.job_id
      where ja.id = job_photos.job_area_id
        and j.contractor_id = auth.uid()
    )
  );

-- proposal_packets: via job ownership
create policy "contractors: own packets"
  on proposal_packets for all
  using (
    exists (
      select 1 from jobs j
      where j.id = proposal_packets.job_id
        and j.contractor_id = auth.uid()
    )
  );

-- email_logs: via job ownership
create policy "contractors: own email_logs"
  on email_logs for all
  using (
    exists (
      select 1 from jobs j
      where j.id = email_logs.job_id
        and j.contractor_id = auth.uid()
    )
  );
