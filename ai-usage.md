# Second Start — AI Usage Documentation
*Build contest entry — Barbra Nellons-Goins*

Second Start is a reentry life-management app for people leaving incarceration: ID checklists, appointments, job leads, benefits tracking, curfew-safe transit planning, and daily check-ins.

## Where AI was used, and why

1. **Initial scaffold (Google AI Studio).** The first version of the app — React + Vite + TypeScript structure, Tailwind styling, Firebase Auth/Firestore wiring — was generated in Google AI Studio. Why: to get a working full-stack starting point quickly so effort could go into reentry-specific features instead of boilerplate.

2. **Resource finder (Gemini + Google Maps grounding).** The Resources tab searches for local reentry resources (housing, clinics, legal aid) using Gemini with Maps grounding. Why: resource listings change constantly — hardcoding a directory would go stale; grounded AI search returns current names, addresses, and hours.

3. **Reentry chatbot (Gemini).** A conversational assistant answers practical reentry questions (jobs, housing, legal aid, mental health). Why: returning citizens ask open-ended, personal questions — this needs language understanding, not a FAQ page.

4. **Career AI (Gemini).** Generates resume bullet points and cover letters tailored to the user's industry. Why: translating lived experience into professional language is a writing task where AI assistance measurably helps, especially for users re-entering the workforce.

5. **Bug fix assistance.** The Gemini API key was originally read via `process.env`, which breaks in Vite browser builds — diagnosed and fixed with a runtime-aware helper (`getGeminiApiKey()`).

## What was built by hand (no AI)

1. **Safe Transit tab — the contest build piece.** Designed from my own Google Stitch mockups ("Anchor and Path" system) and built by hand: the `TransitRoute` data model, the trip-planning form, the route cards, and the curfew-safety algorithm. The core logic: projected arrival = departure + estimated travel time; a trip is "curfew safe" only if arrival falls outside a user-set safety buffer before curfew; trips departing after curfew or arriving inside the buffer are flagged with the reason shown. Firestore security rules for the new `routes` collection were written by hand following the app's existing per-user ownership pattern.

2. **UI/UX design.** The full layout and visual system were designed by me in Google Stitch before implementation.

3. **Data model & test dataset.** The Firestore schema and the synthetic test dataset (10 sheets covering users, checklists, appointments, job leads, benefits, routes, check-ins) were designed by hand to reflect real reentry workflows.

## Summary

AI accelerated the scaffold and powers the three language/map-dependent features. The reentry domain logic — what the app *knows* about curfews, checklists, and safe transit — is human-designed and human-built.
