# Luminary Scholars — Parent Portal

A full-stack enrichment program management portal built with Next.js 14, Supabase, and Stripe.

---

## Tech Stack

| Layer      | Technology                     |
|------------|-------------------------------|
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Database   | Supabase (PostgreSQL + Row Level Security) |
| Auth       | Supabase Auth (magic link — no passwords) |
| Storage    | Supabase Storage (photos + videos) |
| Payments   | Stripe (payment intents + webhooks) |
| Hosting    | Vercel (recommended) |

---

## Project Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx          # Magic link login
│   │   └── callback/route.ts       # Auth callback
│   ├── dashboard/
│   │   ├── layout.tsx              # Sidebar + topbar shell
│   │   ├── page.tsx                # Home / KPI dashboard
│   │   ├── students/
│   │   │   ├── page.tsx            # Student list
│   │   │   └── [id]/page.tsx       # Student profile
│   │   ├── attendance/page.tsx
│   │   ├── progress/page.tsx
│   │   ├── schedule/page.tsx
│   │   ├── media/page.tsx          # Photo + video gallery
│   │   ├── payments/page.tsx
│   │   ├── community/page.tsx
│   │   └── reports/page.tsx
│   └── api/
│       ├── students/route.ts
│       ├── attendance/route.ts
│       ├── media/route.ts
│       ├── payments/
│       │   ├── route.ts
│       │   └── webhook/route.ts    # Stripe webhook
│       └── announcements/route.ts
├── components/
│   ├── ui/          # Badge, Card, DataTable, ProgressBar, StudentAvatar
│   ├── layout/      # Sidebar, Topbar, KpiRow, WeeklySchedule, ReportsHub
│   ├── students/    # StudentList, StudentProfile
│   ├── attendance/  # AttendanceManager, AttendanceSummaryCard
│   ├── progress/    # ProgressTracker
│   ├── media/       # MediaGallery, MediaGrid
│   ├── payments/    # PaymentsDashboard
│   └── community/   # CommunityHub, AnnouncementsList
├── lib/
│   ├── supabase.ts  # Browser, server, and admin clients
│   ├── schema.sql   # Full database schema + RLS policies
│   └── utils.ts     # Helpers (cn, formatDate, formatCurrency, etc.)
├── hooks/index.ts   # useFetch, useStudents, useMedia, useDebounce...
├── types/index.ts   # All TypeScript types
├── styles/globals.css
└── middleware.ts    # Auth route protection
```

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/your-org/luminary-scholars.git
cd luminary-scholars
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
# Fill in your Supabase and Stripe keys
```

### 3. Supabase setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `src/lib/schema.sql`
3. Go to **Storage** and create two public buckets: `photos` and `videos`
4. Copy your project URL and anon key into `.env.local`

### 4. Stripe setup

1. Create a [Stripe](https://stripe.com) account
2. Copy your publishable key and secret key into `.env.local`
3. Set up webhook endpoint pointing to `https://your-domain.com/api/payments/webhook`
4. Copy the webhook signing secret into `.env.local`

### 5. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

### 6. Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

---

## Key Features

- **Magic link auth** — parents sign in via email, no passwords
- **Role-based access** — admins/teachers see all data; parents see only their child
- **Media gallery** — drag-and-drop upload of photos and videos, stored in Supabase Storage
- **Attendance** — mark present/late/absent per class per day, with parent notification hooks
- **Progress tracking** — per-skill status (not started / in progress / mastered) with visual progress bars
- **Payments** — Stripe integration for monthly tuition with automatic status updates via webhook
- **Announcements** — post to all families, pin important notices
- **Reports** — generate per-student progress PDFs, attendance summaries, and parent newsletters

---

## Extending

| Task                        | Where to edit                                      |
|-----------------------------|----------------------------------------------------|
| Add a new subject/curriculum | Insert into `skills` table in Supabase            |
| Add a new class day         | Insert into `classes` table                        |
| Customize email templates   | Use Supabase Auth email templates in dashboard     |
| Add PDF export              | Integrate `@react-pdf/renderer` in reports page    |
| Add push notifications      | Integrate OneSignal or Supabase Edge Functions     |
| Add parent-facing app       | Create `/parent` route group with parent-only RLS  |
