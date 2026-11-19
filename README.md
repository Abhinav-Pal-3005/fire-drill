# Money Fire Drill

A safe, timed practice app that teaches UPI safety, fraud response, reversals, interest/credit and phishing indicators through realistic money emergencies. Users act inside a **sandbox UPI-style payment app** (no real money, accounts or personal data), are graded on **steps and step order**, take a short quiz, and get pre-written explanations. An **Admin dashboard** shows aggregated learning analytics.

> Hackathon theme: Cybersecurity, Privacy & Digital Trust.
> **Education, not personal advice · No real payments.**

## Setup

```bash
npm i
npm run dev      # development
npm run build && npm start   # production
```

No API keys, no runtime LLM calls and no database are used by the product. All progress lives in `localStorage`.

### Host note (Next.js instead of Vite)

This workspace is a Next.js (App Router) host, so the app ships as a **client-only React Router v6 SPA** mounted by a catch-all route (`src/app/[[...slug]]/`). Consequences, all documented here on purpose:

- `src/app/App.tsx` and `src/app/router.tsx` follow the requested structure (React Router v6, `BrowserRouter`).
- The spec's `src/pages/` folder is named **`src/views/`**, because Next.js treats `src/pages/` as its own router and would try to build every file as a route.
- Everything else (Tailwind, Zustand `persist`, Recharts, Framer Motion, lucide-react) is as specified. `/api/health` is kept for the platform health check.

## Architecture

```
src/
  app/        App.tsx, router.tsx (+ Next host: layout.tsx, [[...slug]]/)
  theme/      tokens.ts, glass.css (design system), icons.ts
  components/ glass/ (design-system primitives) · layout/ · sandbox/ · quiz/ · results/ · library/ · admin/
  features/   drills/ (engine, validator, loader, runner hook) · randomiser/ · adaptive/ · analytics/ · speech/
  data/       drills/*.json · quizzes/*.json · library/fraud-library.json · concepts.json · seed-analytics.json
  store/      useUserStore · useDrillStore · useAnalyticsStore (Zustand + persist)
  views/      one file per route (pages compose, features hold logic, content lives in JSON)
  types/      index.ts (all shared types)
  utils/      formatters.ts (₹ INR, time), seedRandom.ts, id.ts, cn.ts
```

**Design system first.** `theme/glass.css` defines tokens and the four glass variants (`glass-thin`, `glass-regular`, `glass-thick`, `glass-tinted`) with specular rim, layered shadow, `-webkit-` prefixes and solid fallbacks for `@supports not (backdrop-filter)` and `prefers-reduced-transparency`. Pages are built only from `components/glass/*`. Content surfaces use the non-blurred `Surface` so backdrop-filter layers stay low.

**Engines**
- `drillEngine.ts`: pure runner state + grader (per-step `correct | wrong | out_of_order | missed | critical`; score = steps 40% + order 25% + red flags 20% + speed 15%, minus 5 per hint; critical mistake caps at 20%).
- `stepValidator.ts`: classifies each tap against the drill JSON.
- `scenarioRandomiser.ts`: seeded substitution of `{{amount}}`, `{{name}}`, `{{app}}`, `{{bank}}`, `{{lender}}`, `{{wording}}`, `{{time}}`, `{{txnId}}`, `{{upiId}}`. Seeds are saved with each attempt. First-ever collect-request run uses seed `#A89F` and ₹4,500 (toggle in About).
- `adaptiveEngine.ts`: mistakes and quiz misses per concept (recent attempts weigh 2x), `getRecommendedDrill()` with a human-readable reason.

## How to add a drill (JSON only)

1. Create `src/data/drills/my-drill.json` using the `Drill` type in `src/types/index.ts` (copy an existing drill).
2. In `src/features/drills/drillLoader.ts`, add one import line and add it to the `DRILLS` list.
3. Make sure `quizId` exists in `src/data/quizzes/`.

The mock phone scene is chosen from `trigger.type` (`collect_request`, `lost_phone`, `balance_alert`, `loan_offer`). A new drill that reuses one of these triggers needs no code. Step `actionKey`s must be ones the scene emits:

| Trigger | Action keys emitted by the scene |
|---|---|
| `collect_request` | `spot_red_flags`, `open_app`, `view_request`, `decline_request`, `check_balance`, `block_report` |
| `lost_phone` | `call_bank_helpline`, `block_sim`, `secure_accounts`, `report_cybercrime` |
| `balance_alert` | `skip_pleading`, `note_txn_id`, `raise_complaint`, `contact_bank`, `escalate_npci` |
| `loan_offer` | `spot_red_flags`, `open_offer`, `use_calculator`, `check_lender`, `decline_revoke` |

Distractors are data-driven: each has a `screen` where it is shown as a button, and `opensPin: "pin" | "otp"` makes it open the fake keypad (finishing the keypad triggers `criticalActions[0]`).

## How to add a library entry

Append an object to `entries` in `src/data/library/fraud-library.json` (fields: `id, title, scamType, concept, summary, howItWorks[], redFlags[], howToStop[], source{name,publisher,url,date}, linkedDrillId, verified, lastVerifiedOn`). Leave `verified: false` and `source.url: ""` until a real source is checked; the UI shows "Source pending verification" automatically. See the `TODO(verify)` comment in `drillLoader.ts`.

## Scope matrix

| Area | v1 |
|---|---|
| Shell, routing, all pages, design system, disclaimer | FULL |
| 4 drills end to end (timer, ordered grading, critical mistakes, hints) | FULL |
| Red-flag spotting | FULL in drills 1 and 4, simple (optional, 2-3 flags) in 2 and 3 |
| Quiz + explanations, results, readiness checklist | FULL |
| Randomiser, adaptive suggestion, mistake tracking | FULL |
| Fraud Library + link to drill | FULL (static JSON, unverified badges) |
| Admin analytics + CSV | FULL (seed data + local attempts) |
| Read aloud | FULL where `speechSynthesis` exists |
| Auth, backend, multi-user sync, family sharing, live news feed | STUB, labelled in the UI |
| Dark mode, i18n, PWA, notifications | NOT in v1 |

## Known limitations

- Role switch is a demo toggle (`// v2`), there is no sign-in.
- Admin data is synthetic (`seed-analytics.json`, generated by `scripts/generate-seed-analytics.mjs`) merged with this browser's attempts.
- Library entries are general patterns with no verified sources yet.
- The optional SVG "lens" effect is Chromium-only and degrades silently elsewhere.
- Not an offline PWA: there is no service worker in v1.

## v2 roadmap

Real authentication and server-side roles, verified library sources with dates, more drills and trigger scenes, dark theme (tokens are already CSS variables), i18n, installable PWA with offline cache, shared family checklists.

## Judge demo script

1. `/library` → open **Collect-request or refund scam** → **Practice this drill**.
2. Briefing → **Start drill** → after 3-2-1, tap red flags in the message (any 3), open the app from the banner, **Decline** the ₹4,500 request, open balance, then Security and help → **Block and report**.
3. Quiz (3 questions, instant feedback, Read aloud) → Results (rings, step review, checklist).
4. Run it again: names and amounts are now randomised (seed shown). This time tap **Pay** and finish the keypad to see the critical-mistake sheet and the 20% cap.
5. Home and Results show the adaptive suggestion with its reason.
6. Role chip → **Admin** → KPIs, radar, funnel, trend, most-missed steps, cohort (you appear as "You") → **Export CSV**.
