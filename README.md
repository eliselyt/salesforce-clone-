# Meridian CRM — a Salesforce-style CRM on Next.js + Supabase

A working clone of the core Salesforce Sales Cloud experience: leads, accounts, contacts,
opportunities, cases, campaigns, products and tasks, with Lightning-style record pages,
a stage path, a Kanban pipeline, lead conversion, activity timelines and reports.

**Stack:** Next.js 16 (App Router, Server Actions) · Supabase (Postgres, Auth, RLS) · Tailwind CSS 4 · TypeScript

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Feliselyt%2Fsalesforce-clone-&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY&envDescription=Supabase%20project%20URL%20and%20publishable%20key%20(see%20.env.example))

## Features

| Area | What you get |
| --- | --- |
| **Home** | KPI tiles (open / weighted pipeline, won this quarter, win rate), pipeline by stage, my open tasks, deals closing in 30 days, newest leads |
| **List views** | Every object: saved views (All / My / filtered), search, sortable columns, pagination |
| **Record pages** | Highlights panel, Details / Related tabs, related lists with "New" pre-filled, edit & delete |
| **Path** | Click-to-advance stage bar for Opportunities, Leads, Cases and Campaigns (with Closed Lost / Unqualified / On Hold) |
| **Kanban** | Drag-and-drop opportunity board that updates the stage |
| **Lead conversion** | Converts a lead into an account (new or existing), a contact and an optional opportunity, moving its activities, notes and campaign history across |
| **Activity** | New Task / Log a Call / New Event / Email composer, upcoming & past timeline, tick-to-complete |
| **Notes** | Notes on any record |
| **Products** | Price book, plus opportunity line items with quantity and discount that roll up into the opportunity amount |
| **Campaigns** | Campaign members (leads or contacts) with status |
| **Reports** | Closed-won revenue by month, pipeline by owner, lead conversion by source, open cases by priority |
| **Search** | Global search across all objects |
| **Users & roles** | System Administrator, Sales Manager, Sales Rep, Support Agent; admins manage roles at **Users** |

## Database schema

All schema lives in [`supabase/migrations`](supabase/migrations); demo data is in [`supabase/seed.sql`](supabase/seed.sql).

```
profiles ─┬─< accounts ──< contacts ──< opportunities >── campaigns
          │      │  └──< cases           │   └──< opportunity_line_items >── products
          │      └─ parent_account_id    │
          ├─< leads ── converted_{account,contact,opportunity}_id
          ├─< activities  (lead | contact | account | opportunity | case)
          └─< notes       (lead | contact | account | opportunity | case)
campaigns ──< campaign_members >── lead | contact
```

| Table | Purpose |
| --- | --- |
| `profiles` | One row per auth user: name, title, `role`, `is_active` |
| `accounts` | Companies; type, industry, rating, revenue, billing address, parent account |
| `contacts` | People at accounts; reports-to hierarchy, mailing address |
| `leads` | Unqualified prospects; status, source, rating, conversion links |
| `opportunities` | Deals; stage, amount, probability, close date, primary contact & campaign |
| `products` / `opportunity_line_items` | Price book and deal line items (`total_price` is a generated column) |
| `cases` | Support tickets with auto-numbered `case_number`, status, priority, origin |
| `campaigns` / `campaign_members` | Marketing campaigns and their lead/contact members |
| `activities` | Tasks, calls, emails and meetings linked to any record |
| `notes` | Free-text notes linked to any record |

**Picklists** are Postgres enums (`opportunity_stage`, `lead_status`, `case_priority`, …).

**Business logic in the database**

- `convert_lead(lead_id, account_id?, create_opportunity?, opportunity_name?)` — lead conversion RPC
- `dashboard_stats()` — home page KPIs in one round trip
- Triggers: stage → default probability and `closed_at`; case/task `closed_at`/`completed_at`;
  line items → opportunity amount; `updated_at`; new auth user → profile
- The **first user to sign up becomes System Administrator** and takes ownership of the demo data

**Security (Row Level Security on every table)**

- Every signed-in user can read all CRM records (like a "Public Read Only" org-wide default)
- Anyone can create records; `created_by` must be themselves
- Only the record owner or a manager/admin can edit or delete; support agents can also work any case
- Only managers/admins maintain products; only admins change roles (enforced by trigger)
- Role helper functions live in a non-exposed `private` schema; the Supabase security advisor reports no issues

## Run locally

```bash
cp .env.example .env.local      # already points at the hosted Supabase project
npm install
npm run dev                     # http://localhost:3000
```

Sign up on the login page. The first account becomes the admin.

## Deploy to Vercel

1. Import this repository in Vercel (or click **Deploy with Vercel** above). The framework is detected as Next.js; no build settings are needed.
2. Add the two environment variables from [`.env.example`](.env.example):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works, so the Vercel ↔ Supabase integration can supply it)
3. Deploy.
4. In Supabase → **Authentication → URL Configuration**, set **Site URL** to your Vercel URL and add
   `https://<your-app>.vercel.app/auth/callback` to **Redirect URLs**, so email-confirmation links come back to the app.
   (While testing you can instead turn off **Confirm email** under Authentication → Providers → Email.)

## Using your own Supabase project

```bash
supabase link --project-ref <ref>
supabase db push                       # applies supabase/migrations
psql "$DATABASE_URL" -f supabase/seed.sql   # optional demo data
supabase gen types typescript --linked > lib/database.types.ts   # optional typed client
```

Then update the two environment variables.

## Project structure

```
app/
  (crm)/                 authenticated app shell (header, nav tabs)
    page.tsx             home dashboard
    [object]/            generic list, record, new, edit and convert pages
    actions.ts           server actions (CRUD, path, activities, notes, convert, line items…)
    reports/ search/ settings/
  login/ auth/           sign in / sign up, email callback, sign out
components/              UI building blocks (record form, path bar, kanban, timeline…)
lib/
  objects.ts             object & field metadata that drives every list, form and page
  picklists.ts           picklist values and labels
  supabase/              server client, session proxy, env
proxy.ts                 Next 16 proxy: refreshes the session and guards routes
supabase/                migrations and seed data
```

Adding a field is two steps: add the column in a new migration, then add one line to that object's `fields` in `lib/objects.ts`. It then shows up in forms, record pages and (optionally) list views.
