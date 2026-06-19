@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**AccessScope** — B2B SaaS for small remodelers doing aging-in-place / accessibility home modifications. Turns a guided intake form into a branded proposal packet (PDF + checklist + follow-up email).

## Stack

- **Next.js 16.2.6 App Router** — TypeScript 5.x (strict mode), Tailwind CSS v4
- **Radix UI** — direct dependency, no shadcn/ui registry; wrapper components live in `components/ui/`
- **React 19** — `useActionState` is the form pattern throughout; react-hook-form is a dependency but not used
- **Supabase** — Postgres v15 (with RLS), Auth (`@supabase/ssr`), Storage (logos / photos / PDFs)
- **Stripe 22.x** — subscription billing + per-packet credit purchases
- **`@react-pdf/renderer` 4.5.x** — server-side PDF generation (no Chromium); uses Helvetica (no custom font registration)
- **Resend 6.x** — transactional email + follow-up templates (HTML strings, not JSX)
- **Zod 4.x** — validation schemas in `lib/validations/`
- **Vercel** — hosting + cron jobs (`vercel.json`)

## Commands

```bash
# Development (run each in a separate terminal)
npm run dev                    # start dev server (Turbopack) — http://localhost:3000
npm run supabase:start         # start local Supabase stack (Docker required)
npm run stripe:listen          # Stripe webhook forwarder (only for billing tests)

# Code quality
npm run build                  # production build check
npm run lint                   # ESLint

# Supabase
npm run supabase:stop          # stop local Supabase
npm run supabase:reset         # wipe + restart with migrations + seed.sql
npx supabase db push           # apply migrations to linked Supabase project
npx supabase gen types typescript --local > types/database.ts  # regenerate DB types

# Utilities
npm run cron:trigger           # manually trigger follow-up email job
npm run env:ui                 # environment variable helper UI
```

**First-time setup:**
1. `npm run supabase:start` — prints API URL, anon key, service role key
2. `cp .env.local.example .env.local` — fill in keys from step 1
3. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`
4. `npm run dev`

## Architecture

### Multi-step Job Wizard
The core UX is a **7-step wizard** at `app/(app)/jobs/[jobId]/`:
```
intake → areas → [areaId] → scope → quote → preview → send
```
Each step saves to Supabase immediately so users can resume mid-wizard. Status stays `draft` until the packet is sent. The `[areaId]` step repeats once per selected room.

### Rule Engine (`lib/rule-engine/`)
Pure TypeScript — no DB dependency, fully unit-testable. Maps `job_area_modifications` rows (modification key + material tier + quantity + labor rate) to `scope_line_items`.

- `buildScopeLineItems(modifications, laborRatePerHour, defaultMarkupPct)` → `ScopeLineItem[]`
- `computeJobTotals(items)` → `{ totalMaterial, totalLabor, totalMarkup, grandTotal }`
- Automatically generates demo/removal lines, permit lines, and risk-flag advisory items

**To add a new room type or modification key: edit `pricing-tables.ts` only.** The engine, DB schema, and UI require no changes.

### PDF Generation
`/api/jobs/[jobId]/pdf` → `lib/pdf/generate.ts` → `components/pdf/ProposalDocument.tsx` → `@react-pdf/renderer` renders to Buffer → uploads to Supabase Storage `pdfs/` bucket → returns a 1-hour signed URL.

Uses Helvetica (built-in PDF font). Do not attempt to register custom fonts from `public/` — the existing implementation does not use them.

### Stripe Billing
PDF generation is the **only gated action**. All form work (intake, area forms, scope, quote) is ungated to reduce trial friction.

- Webhook handler at `/api/stripe/webhook` uses `Buffer.from(await req.arrayBuffer())` for raw-body parsing — do not deviate from this pattern
- New signups get `trialing` status with 2 free credits (created by DB trigger in migration 004)
- Team plan has unlimited packets; Solo/Pro use monthly credit allowances reset on `invoice.paid`
- One-off packs stack with monthly credits via atomic `increment_packet_credits()` RPC
- 30-second cooldown per job on PDF generation (prevents credit-burning loops)

### Supabase Auth
Uses `@supabase/ssr` (cookie-based, works without JS).

- `lib/supabase/server.ts` — `createClient()` for Server Components/Actions (reads user session via cookies); `createServiceClient()` bypasses RLS (use only in webhook + cron routes)
- `lib/supabase/client.ts` — `createBrowserClient()` for Client Components
- The `(app)` route group layout reads `auth.getUser()` server-side and redirects to `/login` if unauthenticated
- The `(auth)` route group is fully public
- Magic-link redirect is handled by `app/api/auth/callback/route.ts`

### Form Handling
All forms use `useActionState` from React 19:
```typescript
const [state, formAction, pending] = useActionState(serverAction, null)
```
- Server actions live in `actions.ts` files colocated with their page
- Validation uses Zod schemas from `lib/validations/`
- `state?.error` for server-level errors; `state?.fieldErrors` for field-level
- Never use client-side state for DB mutations — always go through server actions

### Tailwind CSS v4
No `tailwind.config.ts`. Configuration is CSS-first:
- `app/globals.css` — `@import "tailwindcss"` + `@theme { ... }` block with CSS variables
- `postcss.config.mjs` — single plugin: `@tailwindcss/postcss`
- Dark mode via `@media (prefers-color-scheme: dark)` in globals.css

### Cron Job
`vercel.json` schedules `GET /api/cron/follow-up` daily at 10:00 UTC. The route is protected by `Authorization: Bearer <CRON_SECRET>`. It finds jobs with `status='sent'` updated 3–4 days ago, sends follow-up emails via Resend, and logs to `email_logs`.

## Database (10 tables, all RLS-enabled)

| Table | Key Columns | Notes |
|---|---|---|
| `contractor_profiles` | id (= auth.uid), company_name, default_labor_rate, default_markup_pct | Created on signup via trigger (migration 004) |
| `subscriptions` | contractor_id, plan_id, status, packet_credits, stripe_customer_id | `status`: trialing / active / past_due / canceled |
| `clients` | contractor_id, first_name, last_name, email, address fields | Homeowner contact info |
| `jobs` | contractor_id, client_id, job_number (AS-YYYY-####), status | `status`: draft / sent / accepted / declined / archived |
| `job_areas` | job_id, area_type (bathroom / entryway), area_label | One row per selected room |
| `job_area_modifications` | job_area_id, modification_key, material_tier, quantity, override_unit_cost | `material_tier`: economy / standard / premium |
| `scope_line_items` | job_id, category, description, unit costs, markup_pct, is_included | `total_material` + `total_labor` are generated columns |
| `proposal_packets` | job_id, version, storage_path, generated_at | PDF version history |
| `email_logs` | job_id, resend_id, template_key, status | Delivery tracking |
| `job_photos` | area_id, storage_url | Table exists; no UI yet |

**Scope line items pattern:** delete all existing rows for the job, then re-insert from the rule engine. The engine is deterministic — diffing is unnecessary complexity.

All RLS policies resolve to `contractor_id = auth.uid()` through join chains. Service role client (`createServiceClient()`) bypasses RLS — only use it in Stripe webhook and cron routes.

## Environment Variables

See `.env.local.example` for all required keys:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_SOLO_MONTHLY
STRIPE_PRICE_PRO_MONTHLY
STRIPE_PRICE_TEAM_MONTHLY
STRIPE_PRICE_PACK_5
STRIPE_PRICE_PACK_15
STRIPE_PRICE_PACK_30        # (if present)
RESEND_API_KEY
RESEND_FROM_EMAIL
NEXT_PUBLIC_APP_URL
CRON_SECRET                 # 32+ char random string
```

## Key Files

| File | Purpose |
|---|---|
| `supabase/migrations/001_initial_schema.sql` | All 10 tables, sequences, generated columns |
| `supabase/migrations/002_rls_policies.sql` | Row Level Security on all tables |
| `supabase/migrations/004_profile_trigger.sql` | Auto-create profile + trial subscription on signup |
| `supabase/migrations/006_rpc_increment_credits.sql` | Atomic `increment_packet_credits()` RPC |
| `lib/rule-engine/types.ts` | `ModificationKey`, `ModificationInput`, `ScopeLineItem`, `RuleDefinition` |
| `lib/rule-engine/pricing-tables.ts` | Material costs + scope templates — the only file to edit for new modifications |
| `lib/rule-engine/index.ts` | `buildScopeLineItems()` + `computeJobTotals()` |
| `lib/supabase/server.ts` | `createClient()` (session) + `createServiceClient()` (RLS bypass) |
| `lib/supabase/client.ts` | `createBrowserClient()` for Client Components |
| `lib/stripe/plans.ts` | Plan IDs, price IDs, monthly credit limits |
| `lib/email/send.ts` | `sendEmail()` wrapper (console.log in dev, Resend in prod) |
| `lib/email/templates.ts` | `proposalEmailHtml()` + `followUpEmailHtml()` — vanilla HTML strings |
| `lib/validations/client.ts` | Zod schema for client forms |
| `lib/validations/job.ts` | Zod schemas for job, area, and modification forms |
| `lib/utils.ts` | `cn()`, `formatCurrency()`, `formatDate()` |
| `app/api/jobs/[jobId]/scope/route.ts` | POST → run rule engine → write scope_line_items |
| `app/api/jobs/[jobId]/pdf/route.ts` | POST → validate credits → render PDF → upload → return signed URL |
| `app/api/stripe/webhook/route.ts` | Billing webhook — idempotent upserts only |
| `app/api/cron/follow-up/route.ts` | Daily follow-up email job (Bearer-token protected) |
| `components/pdf/ProposalDocument.tsx` | Root react-pdf document |
| `components/forms/AreaModForm.tsx` | Modification selector (material tier, quantity, risk flags, cost overrides) |
| `components/scope/ScopeLineItemTable.tsx` | Editable line-item table with is_included toggles |
| `types/database.ts` | DB type definitions (hand-written stub — replace with generated types before production) |
| `vercel.json` | Cron schedule: 10:00 UTC daily |
| `.env.local.example` | All required environment variable keys |

## MVP Scope (v1)

Two room types only: **bathroom** and **entryway**. Modification keys:

- Bathroom: `grab_bar_tub`, `grab_bar_shower`, `grab_bar_toilet`, `shower_conversion`, `non_slip_floor`, `door_widening_bathroom`, `toilet_riser`, `lighting_upgrade`
- Entryway: `exterior_ramp`, `handrail`, `threshold_reducer`, `door_widening_entry`, `landing_pad`

`job_photos` table exists but has no UI. `types/database.ts` is a hand-written stub — run `npx supabase gen types typescript --local > types/database.ts` before the first production deployment.

## Architectural Decisions

| Decision | Rationale |
|---|---|
| No LLM dependency | Scope of work must be precise and auditable; deterministic rule engine is fast, consistent, and client-verifiable |
| `@react-pdf/renderer` instead of Chromium | Chromium is 300 MB+ and won't run in Vercel serverless; `@react-pdf/renderer` is pure Node.js with byte-identical output |
| Delete-then-reinsert for scope line items | Rule engine is deterministic; diffing + patching adds complexity with no benefit |
| `useActionState` + Server Actions for all forms | Works without JavaScript; integrates cleanly with React 19; progressive enhancement is free |
| Radix UI directly (no shadcn registry) | shadcn registry was blocked in the build environment; Radix primitives provide the same accessibility guarantees |
| Nullable `stripe_customer_id` | Trial users exist before entering a payment method; eager customer creation on signup adds latency |
| Service role client only in webhook + cron | Bypasses RLS; must never be used in browser-reachable paths or user-facing Server Components |
