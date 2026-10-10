# Second Start

**2026 GoodSoil Fall Code Jam entry** — *"Build something that helps people navigate change."*

There is no bigger life change than coming home from incarceration. Second Start is a reentry life-management app that helps formerly incarcerated people navigate that change: track the documents, appointments, job leads, and benefits that make or break the first 90 days, plan curfew-safe travel, and check in on daily stability.

## The problem

People leaving incarceration face dozens of time-sensitive tasks at once — state ID, Social Security card, birth certificate, parole appointments, job applications, benefits enrollment — while under curfew and often without stable transportation or internet. Missing one appointment or violating curfew can mean re-incarceration. There is no single tool built for this.

## The solution

One personal dashboard for reentry:

- **Daily Dashboard** — next appointment, follow-up reminders, curfew countdown
- **ID Checklist** — step-by-step document tracker (State ID, Social Security, birth certificate…)
- **Appointments** — PO, job, and medical appointments with locations and reminders
- **Job Search** — lead pipeline (new → applied → interviewing → hired) with follow-up nudges
- **Benefits** — eligibility and application status tracking
- **Safe Transit** *(built during the Code Jam)* — plan trips and get flagged if a route would violate curfew. Projected arrival = departure + estimated travel time; a trip is "curfew safe" only if arrival clears a user-set safety buffer before curfew
- **Resources** — AI-powered local resource finder (housing, clinics, legal aid) with Google Maps grounding
- **Reentry Chat** — AI assistant for practical reentry questions
- **Career AI** — AI help writing resumes and cover letters that translate lived experience into professional language
- **Daily Check-In** — mood and stability logging shareable with a sponsor or caseworker

## Tech stack

React 19 + TypeScript + Vite · Tailwind CSS 4 · Firebase (Auth + Firestore) · Google Gemini AI · date-fns · lucide-react · motion

## How to run

**Option A — GitHub Codespaces (recommended, works on Chromebook):**

1. Open this repo on GitHub → green **Code** button → **Codespaces** → **Create codespace**
2. In the terminal: `npm install`
3. Copy `.env.example` to `.env.local` and add your Gemini API key as `VITE_GEMINI_API_KEY`
4. Run `npm run dev` — open the forwarded port 3000 URL in your browser

**Option B — Locally:**

```bash
npm install
cp .env.example .env.local   # add your VITE_GEMINI_API_KEY
npm run dev
```

**Deploy:** connect the repo to [Vercel](https://vercel.com) or [Netlify](https://netlify.com) (free tiers) — set `VITE_GEMINI_API_KEY` in the hosting dashboard's environment variables. Add your deployed domain under Firebase Console → Authentication → Authorized domains. Deploy Firestore rules: `firebase deploy --only firestore:rules`.

## AI usage

AI tools were used for: the initial app scaffold (Google AI Studio), the resource finder (Gemini + Maps grounding — listings change too fast to hardcode), the reentry chatbot (open-ended questions need language understanding), and the career AI (writing assistance). The reentry domain logic — the data model, curfew-safety algorithm, and the Safe Transit feature built during the Jam — is human-designed and human-built. The UI system ("Anchor and Path") was designed in Google Stitch.

## Design & architecture

- UI mockups: designed in Google Stitch (see `docs/design/`)
- Database: Firestore, per-user subcollections (`checklist`, `appointments`, `jobLeads`, `benefits`, `checkins`, `routes`) — see `firestore.rules` and `docs/architecture.md`
- Test dataset: synthetic seed data in `docs/second_start_test_dataset.xlsx`
