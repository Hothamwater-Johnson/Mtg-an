@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**AccessScope** — B2B SaaS for small remodelers doing aging-in-place / accessibility home modifications. Turns a guided intake form into a branded proposal packet (PDF + checklist + follow-up email).

## Stack

- **Next.js 16 App Router** — TypeScript, Tailwind CSS v4, shadcn/ui
- **Supabase** — Postgres (with RLS), Auth (`@supabase/ssr`), Storage (logos / photos / PDFs)
- **Stripe** — subscription billing + per-packet purchases
- **`@react-pdf/renderer`** — server-side PDF generation (no Chromium)
- **Resend** — transactional email + follow-up templates
- **Vercel** — hosting + cron jobs for follow-up emails

## Commands

```bash
npm run dev       # start dev server (Turbopack)
npm run build     # production build
npm run lint      # ESLint
npx supabase db push          # apply migrations to linked Supabase project
npx supabase gen types typescript --local > types/database.ts  # regenerate DB types
```

## Architecture

### Multi-step Job Wizard
The core UX is a 6-step wizard at `app/(app)/jobs/[jobId]/`:
`intake → areas → [areaId] → scope → quote → preview → send`

Each step saves to Supabase immediately so users can resume mid-wizard. Status stays `draft` until the packet is sent.

### Rule Engine (`lib/rule-engine/`)
Pure TypeScript — no DB dependency, fully unit-testable. Maps `job_area_modifications` rows (modification key + material tier + quantity + labor rate) to `scope_line_items`. Add new room types by adding entries to `pricing-tables.ts` only — the engine itself never changes.

### PDF Generation
`/api/jobs/[jobId]/pdf` calls `lib/pdf/generate.ts` → `@react-pdf/renderer` renders to Buffer → uploads to Supabase Storage `pdfs/` bucket → returns a 1-hour signed URL. Fonts must be registered via `Font.register()` pointing to files in `public/pdf-assets/fonts/` before render.

### Stripe Billing
PDF generation is the only gated action. All form work (intake, area forms, scope, quote) is ungated to reduce trial friction. Webhook handler at `/api/stripe/webhook` uses `Buffer.from(await req.arrayBuffer())` for raw-body parsing — do not deviate from this pattern.

### Supabase Auth Middleware
Uses `@supabase/ssr`. Middleware must both read and write cookies on every request. The `(app)` route group layout enforces auth; `(auth)` pages are public.

## Key Files

| File | Purpose |
|---|---|
| `supabase/migrations/001_initial_schema.sql` | All tables, sequences, generated columns, RLS |
| `lib/rule-engine/pricing-tables.ts` | Material costs + scope templates — drives everything |
| `lib/rule-engine/index.ts` | Engine function: modifications → line items |
| `app/api/stripe/webhook/route.ts` | Billing webhook — idempotent upserts only |
| `components/pdf/ProposalDocument.tsx` | Root react-pdf document |

## MVP Scope (v1)

Two room types only: **bathroom** and **entryway**. Modification keys:

- Bathroom: `grab_bar_tub`, `grab_bar_shower`, `grab_bar_toilet`, `shower_conversion`, `non_slip_floor`, `door_widening_bathroom`, `toilet_riser`, `lighting_upgrade`
- Entryway: `exterior_ramp`, `handrail`, `threshold_reducer`, `door_widening_entry`, `landing_pad`
