# AccessScope

**B2B SaaS for small remodelers and handymen doing aging-in-place / accessibility home modifications.**

A contractor fills in a guided intake form, selects which rooms and modifications apply, reviews a scope of work, and sends the homeowner a branded proposal PDF — all in one workflow. No LLM dependency. Pricing is deterministic from a rule engine table, so proposals are fast, consistent, and auditable.

---

## What it does

1. **Client management** — store homeowner contact info and work-site addresses
2. **Job wizard** — 6-step guided flow: intake → rooms → modifications → scope → quote → preview → send
3. **Rule engine** — maps modification selections (material tier, quantity, risk flags) to itemized scope line items with costs
4. **Editable scope table** — contractor can tweak descriptions, quantities, and costs before locking the quote
5. **Quote review** — read-only summary with per-area subtotals and grand total breakdown
6. **PDF generation** — branded proposal PDF built server-side with `@react-pdf/renderer`; uploaded to Supabase Storage
7. **Email delivery** — proposal email sent via Resend with a 7-day signed PDF link; automatic follow-up at 3 days
8. **Stripe billing** — subscription tiers (Solo / Pro / Team) + one-off packet credit packs; PDF generation is the only gated action

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (TypeScript) |
| Styling | Tailwind CSS v4 |
| UI primitives | Radix UI (no shadcn registry) |
| Database | Supabase Postgres + RLS |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Storage | Supabase Storage (logos, photos, PDFs) |
| PDF | `@react-pdf/renderer` v4 — server-side, no Chromium |
| Email | Resend v6 |
| Payments | Stripe v22 (API version `2026-04-22.dahlia`) |
| Hosting | Vercel (App Router + cron jobs) |
| Validation | Zod v4 |

---

## Project structure

```
app/
  (auth)/           login, signup, magic-link, auth callback
  (app)/            authenticated shell
    dashboard/      job list with status overview
    clients/        client CRUD
    jobs/
      new/          intake form
      [jobId]/      job hub + wizard steps
        areas/      select room types
        [areaId]/   modification form per room
        scope/      generate + edit line items
        quote/      read-only review + notes
        preview/    PDF generate + view
        send/       email composer + send history
    billing/        plan management + credit top-up
    profile/        contractor info + logo upload
  api/
    jobs/[jobId]/
      scope/        POST — run rule engine → write scope_line_items
      pdf/          POST — render PDF → upload Storage → return signed URL
    stripe/
      checkout/     POST — create Stripe Checkout session
      portal/       POST — open Stripe billing portal
      webhook/      POST — handle subscription + payment events
    cron/
      follow-up/    GET — daily job: send 3-day follow-up emails

components/
  dashboard/        SideNav, StatusBadge, WizardProgress
  forms/            ClientForm, AreaModForm
  scope/            ScopeLineItemTable (editable)
  quote/            QuoteNotes
  pdf/              ProposalDocument (react-pdf)
  ui/               button, input, label, select, textarea

lib/
  rule-engine/      types.ts, pricing-tables.ts, index.ts
  supabase/         client.ts, server.ts (createClient, createServiceClient)
  stripe/           client.ts, plans.ts
  email/            send.ts (Resend wrapper), templates.ts (HTML templates)
  pdf/              generate.ts (renderToBuffer wrapper)
  validations/      client.ts, job.ts (Zod schemas)
  utils.ts          cn(), formatCurrency(), formatDate()

supabase/
  migrations/
    001_initial_schema.sql       9 tables, sequences, generated columns, triggers
    002_rls_policies.sql         RLS on all tables
    003_storage_buckets.sql      logos (public), photos, pdfs (private)
    004_profile_trigger.sql      auto-create profile + trial subscription on signup
    005_stripe_billing.sql       nullable stripe_customer_id, trial sub on signup
    006_rpc_increment_credits.sql  atomic credit increment for packet purchases

types/
  database.ts       hand-written stub — replace with generated types (see below)
```

---

## Rule engine

The rule engine (`lib/rule-engine/`) is pure TypeScript with no database dependency. It is fully unit-testable in isolation.

**13 modification keys across 2 room types (MVP):**

| Room | Key |
|---|---|
| Bathroom | `grab_bar_tub`, `grab_bar_shower`, `grab_bar_toilet`, `shower_conversion`, `non_slip_floor`, `door_widening_bathroom`, `toilet_riser`, `lighting_upgrade` |
| Entryway | `exterior_ramp`, `handrail`, `threshold_reducer`, `door_widening_entry`, `landing_pad` |

**How it works:**

1. Each key has a `RuleDefinition` in `pricing-tables.ts`: material cost per unit × 3 tiers, labor hours per unit × 3 tiers, scope/customer description templates
2. `buildScopeLineItems(modifications, laborRatePerHour, defaultMarkupPct)` maps `ModificationInput[]` → `ScopeLineItem[]`, automatically generating demo lines, permit lines, and risk-flag advisory items
3. `computeJobTotals()` sums included items into `{ totalMaterial, totalLabor, totalMarkup, grandTotal }`

**To add a new room type or modification key:** add entries to `pricing-tables.ts` only. The engine, database, and UI do not need to change.

---

## Database schema

| Table | Purpose |
|---|---|
| `contractor_profiles` | Company name, logo, default labor rate + markup |
| `subscriptions` | Stripe customer/subscription ID, plan, credit balance |
| `clients` | Homeowner contact info |
| `jobs` | Job header: client FK, status, site address, permit jurisdiction |
| `job_areas` | Room selections per job (bathroom, entryway) |
| `job_area_modifications` | Selected modifications with tier, quantity, flags, overrides |
| `scope_line_items` | Generated line items; editable; `total_material` + `total_labor` are generated columns |
| `job_photos` | Photo uploads per room (storage only, no UI yet) |
| `proposal_packets` | PDF version history + Storage path |
| `email_logs` | Resend message IDs, template keys, delivery status |

All tables have Row Level Security. Every policy resolves to `contractor_id = auth.uid()` through join chains. The service role (used only by the Stripe webhook and cron job) bypasses RLS by design.

---

## Billing model

| Plan | Price | Monthly packets | Stripe mode |
|---|---|---|---|
| Solo | $79/mo | 10 | Subscription |
| Pro | $149/mo | 30 | Subscription |
| Team | $299/mo | Unlimited | Subscription |
| Pack 5 | $35 one-time | +5 | Payment |
| Pack 15 | $79 one-time | +15 | Payment |

- New signups get **2 free trial PDF generations** (status = `trialing`, `packet_credits = 2`)
- PDF generation is the **only gated action** — all intake, area, scope, and quote work is ungated to reduce trial friction
- On `invoice.paid`, monthly credits are reset to the plan limit
- One-off pack credits stack with the monthly allowance via atomic `increment_packet_credits()` RPC

---

## Environment variables

Copy `.env.local.example` to `.env.local`. All keys are required in production.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # safe to expose — RLS enforces access
SUPABASE_SERVICE_ROLE_KEY=          # KEEP SECRET — bypasses RLS

# Stripe
STRIPE_SECRET_KEY=                  # KEEP SECRET
STRIPE_WEBHOOK_SECRET=              # from Stripe dashboard → Webhooks
STRIPE_PRICE_SOLO=
STRIPE_PRICE_PRO=
STRIPE_PRICE_TEAM=
STRIPE_PRICE_PACK_5=
STRIPE_PRICE_PACK_15=

# Resend
RESEND_API_KEY=                     # KEEP SECRET
RESEND_FROM_EMAIL=proposals@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Cron (random 32+ char string — add to Vercel env)
CRON_SECRET=
```

---

## Local development

### One codebase, three environments

The same code runs locally, in staging, and in production. **Going live = swapping env vars only — no code changes required.**

| | Local dev | Staging | Production |
|---|---|---|---|
| **Supabase** | Local Docker (`localhost:54321`) | Free-tier cloud project | Paid cloud project |
| **Stripe** | `sk_test_...` + `stripe listen` | `sk_test_...` | `sk_live_...` |
| **Email** | Console log (no API calls) | Resend test domain | Resend verified domain |
| **Hosting** | `npm run dev` | Vercel preview | Vercel production |

### Closed-environment startup sequence

Requires: [Docker Desktop](https://www.docker.com/products/docker-desktop/), [Stripe CLI](https://stripe.com/docs/stripe-cli), `jq` (optional, for cron output).

```bash
# Terminal 1 — Supabase local stack (Postgres + Auth + Storage + Studio)
npm run supabase:start
# Prints API URL, anon key, service role key — copy into .env.local

# Terminal 2 — Next.js dev server
cp .env.local.example .env.local
# Fill in the keys printed by supabase:start above
# Set NEXT_PUBLIC_APP_URL=http://localhost:3000
# Set CRON_SECRET=any-32-char-string
npm run dev      # http://localhost:3000

# Terminal 3 — Stripe webhook forwarder (only needed for billing tests)
npm run stripe:listen
# Copy the whsec_ secret into .env.local → STRIPE_WEBHOOK_SECRET, then restart npm run dev
```

### Apply migrations + seed data

```bash
# After supabase:start, push all migrations
npx supabase db push

# Seed a test client row (see supabase/seed.sql for instructions)
# After signing up in the UI, update the placeholder contractor_id:
# UPDATE clients SET contractor_id = '<your-user-id>' WHERE email = 'test-client@example.com';

# To wipe and start fresh:
npm run supabase:reset   # reapplies all migrations + seed.sql
```

### Local service URLs

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| Supabase Studio | http://localhost:54323 |
| Inbucket (email catcher) | http://localhost:54324 |
| Supabase API | http://localhost:54321 |

Magic links and signup confirmation emails are captured by Inbucket — no real email is sent.

### Dev email behavior

When `NODE_ENV=development`, `sendEmail()` skips Resend entirely and logs the email to the terminal:

```
📧 [DEV EMAIL] { to: 'client@example.com', subject: 'Your proposal is ready' }
--- HTML preview (first 500 chars) ---
...
```

The `email_logs` row is still inserted to Supabase, so the full code path runs. No Resend key needed for local dev.

### Trigger the cron job manually

```bash
npm run cron:trigger
# → {"processed":N,"sent":N,"failed":0}
```

### What works locally

| Feature | Works? | Notes |
|---|---|---|
| Signup / login | ✅ | Email confirm disabled; magic links in Inbucket |
| Client CRUD | ✅ | |
| Full job wizard | ✅ | |
| Scope generation | ✅ | |
| PDF generation | ✅ | |
| Email send | ✅ | Logged to terminal; `email_logs` row inserted |
| Stripe checkout | ✅ | Test card `4242 4242 4242 4242`; requires `stripe:listen` |
| Stripe webhook | ✅ | Requires `stripe:listen` in a separate terminal |
| Cron follow-up | ✅ | `npm run cron:trigger` |
| Logo / PDF upload | ✅ | Supabase local Storage |

### Other commands

```bash
npm run build    # production build check
npm run lint     # ESLint
npx supabase gen types typescript --local > types/database.ts  # regenerate DB types
```

> **Note on `types/database.ts`:** This file is currently a hand-written stub that keeps TypeScript happy without requiring a live Supabase instance. Replace it with the generated version (`npx supabase gen types typescript --local > types/database.ts`) to get full type safety and remove the `as any` casts throughout the codebase.

---

## Deployment (Vercel)

1. Connect the GitHub repo to a new Vercel project
2. Add all env vars from `.env.local.example` to the Vercel project settings
3. Register the Stripe webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Events to enable: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
4. The cron job (`vercel.json`) runs daily at 10:00 UTC — requires Vercel Pro or Enterprise
5. Push to main — Vercel builds and deploys automatically

---

## Key architectural decisions

**Why no LLM?**
Scope of work for accessibility modifications must be precise and auditable. Deterministic rule-engine output is consistent, fast, and doesn't require human review on every proposal. LLMs can be added later for description enhancement without changing the pricing model.

**Why `@react-pdf/renderer` instead of Puppeteer/Chromium?**
Chromium is 300MB+ and doesn't run in Vercel serverless functions. `@react-pdf/renderer` runs pure Node.js and produces byte-identical output on every render.

**Why delete-then-reinsert for scope line items?**
The rule engine is deterministic. Diffing and patching old rows adds complexity with no benefit — a full replace is idempotent and keeps the code simple. Contractor edits are preserved separately (the editable table saves to the existing rows before regeneration replaces them).

**Why Server Actions for forms?**
Next.js 16 Server Actions work without JavaScript on the client, degrade gracefully, and integrate cleanly with `useActionState`. No separate API routes needed for form mutations, and progressive enhancement comes for free.

**Why is `stripe_customer_id` nullable?**
Trial users exist before ever entering a credit card. The column is only populated on first checkout. Forcing Stripe customer creation on signup would add latency and a Stripe API call to the auth flow.

**Why Radix UI directly instead of shadcn/ui?**
The shadcn/ui CLI registry was blocked in the build environment. Radix UI primitives provide the same accessibility guarantees; the Tailwind styling is equivalent and easier to customize.

---

## Security

- All secrets in `.env.local` / Vercel env — never committed (`.env*` in `.gitignore`)
- RLS enabled on all 10 tables; policies in `002_rls_policies.sql`
- Stripe webhook validates `stripe-signature` header using raw body (`Buffer.from(await req.arrayBuffer())`) — do not deviate from this pattern
- Cron job protected by `Authorization: Bearer <CRON_SECRET>` header check
- PDF endpoint has a **30-second per-job cooldown** (checked via `proposal_packets.generated_at`) to prevent credit-burning loops
- Scope generation has a **5-second cooldown** via `jobs.updated_at`
- `error.tsx` React Error Boundary catches server component crashes gracefully
- `not-found.tsx` handles 404s across all routes

---

## Next steps

### Before first paying customer

- [ ] **Stripe test → live** — swap `sk_test_` keys, create live products/prices in Stripe dashboard, update price ID env vars
- [ ] **Custom domain + Resend DNS** — verify sending domain in Resend; update `RESEND_FROM_EMAIL`
- [ ] **Generate real DB types** — `npx supabase gen types typescript --local > types/database.ts` to remove `as any` casts
- [ ] **Register Stripe webhook** — add production URL in Stripe dashboard with the 4 required event types
- [ ] **End-to-end smoke test** — create a job, generate scope, generate PDF, send email, confirm client receipt, complete a Stripe checkout

### Near-term product

- [ ] **Client portal** — read-only link where homeowners can view and accept/decline the proposal without an account (`proposal_packets.public_token` column + public route)
- [ ] **Proposal acceptance tracking** — update `jobs.status` to `accepted` or `declined` when the client acts on the proposal
- [ ] **Photo capture** — attach before/after photos per room (`job_photos` table already exists in schema, no UI yet)
- [ ] **Multiple contractors per company** — the Team plan promises "up to 5 users" but multi-user is not implemented; requires a `team_id` FK and updated RLS policies
- [ ] **Proposal version history UI** — `proposal_packets.version` is tracked; add a version history panel to the preview page

### Infrastructure

- [ ] **Rate limiting at scale** — the current DB-based throttle works for MVP but doesn't protect against distributed abuse; add [Upstash Redis](https://upstash.com) with a sliding-window check in `proxy.ts` for all API routes
- [ ] **Error monitoring** — wire in Sentry (or Vercel's built-in error tracking) to get visibility into production errors before customers report them
- [ ] **Email status webhooks** — Resend can POST delivery/open/bounce events; implement `/api/resend/webhook` to update `email_logs.status` in real time
- [ ] **`supabase db lint`** — run after replacing type stub to catch any RLS policy gaps automatically

### Expand the product

- [ ] **New room types** — kitchen, bedroom, living room, garage. Add entries to `pricing-tables.ts` only; engine, DB, and UI require no changes
- [ ] **New contractor verticals** — the rule engine is industry-agnostic; could serve plumbers, HVAC techs, painters, landscapers with a new set of modification keys and pricing tables
- [ ] **Proposal templates** — allow contractors to save a default modification set per room type so repeat jobs don't start from scratch
- [ ] **QuickBooks / ServiceTitan sync** — export job data to the contractor's back-office tool via their APIs

---

## Build history

| Phase | Commits | What was built |
|---|---|---|
| 0 | 1 | Next.js 16 scaffold, 6 Supabase migrations, rule engine (types + pricing tables + engine), stub DB types |
| 1 | 1 | Auth pages (login, signup, magic link, callback), app shell, sidebar nav, dashboard |
| 2 | 1 | Contractor profile (logo upload to Supabase Storage), client CRUD |
| 3 | 1 | Job wizard — intake form, area selection, modification forms (AreaModForm with all 13 keys) |
| 4 | 1 | Scope builder — POST API runs rule engine → `scope_line_items`; editable `ScopeLineItemTable` with save action |
| Mobile | 4 | Sidebar drawer, 44px touch targets, responsive grids on all forms, scope table mobile layout |
| 5 | 1 | Quote review — read-only line items, per-area subtotals, grand total, optional notes saved to `jobs.notes` |
| 6 | 3 | `ProposalDocument` (react-pdf), PDF generation API route, Supabase Storage upload, preview page with generate button |
| 7 | 2 | Resend email templates, send proposal action (7-day signed URL), send page with history, follow-up cron + `vercel.json` |
| 8 | 3 | Stripe checkout + portal + webhook, billing page, PDF credit gating with decrement, 2 new DB migrations |
| 9 | 2 | `middleware.ts` → `proxy.ts` (Next.js 16), scope page client/server split, build fixes, error boundaries, rate limiting |
