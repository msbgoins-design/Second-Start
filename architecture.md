# Second Start — Architecture & Database Design

## Overview

Second Start is a single-page React app (Vite + TypeScript) with Firebase as the backend:
no custom server code. Authentication is Google sign-in via Firebase Auth; all data lives
in Cloud Firestore under per-user subcollections, locked down by security rules
(`firestore.rules`) so a user can only read/write their own documents.

```
Browser (React SPA)
  ├── Firebase Auth (Google sign-in)
  ├── Cloud Firestore (per-user data)
  └── Google Gemini API (resource finder, reentry chat, career AI)
```

## Firestore data model

Top-level collection: `users` — one document per user, ID = Firebase Auth UID.

| Field | Type | Notes |
|---|---|---|
| uid | string | = document ID |
| displayName / email | string | from Google profile |
| curfewTime | string (HH:mm) | drives curfew countdown + Safe Transit checks |
| homeLocation | { lat, lng } | optional |
| sponsorEmail / caseworkerEmail | string | check-in sharing recipients |
| role | 'user' \| 'admin' | |

Subcollections under `users/{uid}/`:

**checklist** — ID & task tracker
`{ userId, title, status: pending|in-progress|completed, category: ID|Benefits|Legal|Other, notes? }`

**appointments** — PO / job / medical appointments
`{ userId, title, startTime (ISO), endTime?, location?, type: PO|Job|Medical|Other, notes? }`

**jobLeads** — job application pipeline
`{ userId, company, position, status: new|applied|interviewing|hired|rejected, source?, followUpDate?, notes? }`

**benefits** — benefits enrollment status
`{ userId, name, status: eligible|applied|active|denied|expired, renewalDate?, notes? }`

**checkins** — daily stability logs
`{ userId, timestamp (ISO), mood, challenges?, successes?, location? }`

**routes** — Safe Transit trip plans *(added during the Code Jam)*
`{ userId, tripType, originName, destinationName, departureDate (YYYY-MM-DD), departureTime (HH:mm), estimatedMinutes, safetyBufferMinutes, mode: transit|walking|driving|rideshare|other, status: planned|completed|cancelled, reasonFlagged?, notes? }`

## Security rules

`firestore.rules` enforces: authenticated users read/write **only** documents under
their own UID (`request.auth.uid == uid`); admins bypass. Each collection has a
validator function (`isValidChecklistItem`, `isValidTransitRoute`, …) that checks
required fields, types, and enum values on create/update. Default-deny for everything else.

## Key client logic

- **Curfew countdown** (`App.tsx`): computes minutes remaining until `profile.curfewTime`,
  shows an urgent banner when under the threshold.
- **Safe Transit safety check** (`assessRouteSafety` in `App.tsx`): projected arrival =
  departure + `estimatedMinutes`; a trip is *curfew safe* only if arrival is earlier than
  `curfewTime − safetyBufferMinutes`. Trips departing after curfew or arriving inside the
  buffer are flagged with the reason displayed.
- **Gemini key resolution** (`getGeminiApiKey` in `App.tsx`): reads `VITE_GEMINI_API_KEY`
  in Vite builds, falls back to AI Studio's injected `process.env.GEMINI_API_KEY`.
- All Firestore reads are live `onSnapshot` subscriptions, so the UI updates in real time.

## AI integration points

| Feature | Model | Why AI |
|---|---|---|
| Resource finder | Gemini + Google Maps grounding | local resource listings change too fast to hardcode |
| Reentry chat | Gemini chat | open-ended personal questions need language understanding |
| Career AI | Gemini | personalized resume / cover-letter writing help |

## UI design

Designed in Google Stitch ("Anchor and Path" system): Daily Dashboard, Job & Benefits Hub,
Safe Transit, Support Connection, ID Checklist. Mockups in `docs/design/`.
