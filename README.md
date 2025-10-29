# OctoDef

Cybersecurity defense simulator inspired by the octopus — 8 coordinated agents analyze threats (URL, IP, hash, logs, email) with real-time UI and immersive 3D visuals.

## Features

- **8 coordinated agents**: Scout, Sentinel, Analyst, Isolator, Remediator, Learner, Alerter, Orchestrator
- **Multi-threat inputs**: `url`, `ip`, `hash`, `log`, `email`
- **Risk scoring and severity**: overall risk (0–100), severity mapping, timeline, remediation steps
- **Auth**: NextAuth Google/GitHub OAuth, protected pages and API routes
- **Persistence**: MongoDB for storing analysis sessions per user
- **3D hero**: Three.js animated octopus model on the landing page
- **Modern UI**: shadcn/ui + Tailwind v4, Framer Motion animations, Sonner toasts

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **NextAuth v5 (beta)** with MongoDB adapter
- **@tanstack/react-query** for data fetching/caching
- **Tailwind CSS v4** + shadcn/ui (Radix primitives)
- **Three.js** for 3D, **Recharts** for charts
- Deployed on **Vercel** (suggested)

## Quickstart

1. Install deps

```bash
pnpm i
# or npm i / yarn
```

2. Configure environment

Create `.env.local` with:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_long_random_string

AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...

MONGODB_URI=mongodb+srv://...

# optional: send alert when severity === critical
ALERT_WEBHOOK=https://hooks.slack.com/services/...  # or any JSON webhook
```

3. Run dev server

```bash
pnpm dev
# or npm run dev / yarn dev
```

4. Build and start

```bash
pnpm build && pnpm start
```

App runs at `http://localhost:3000`.

## Scripts

- `dev`: Next dev (Turbopack)
- `build`: Next build
- `start`: Next start
- `lint`: eslint

## API

### POST `/api/defend`

Analyze an input with a specified type.

Request body:

```json
{ "data": "<input string>", "type": "url|ip|hash|log|email" }
```

Response shape (abridged):

```json
{
  "input": { "type": "url", "data": "https://..." },
  "overallRisk": 42,
  "severity": "medium",
  "agents": [{ "id": "scout", "status": "complete", "progress": 100 }],
  "findings": [{ "agent": "Sentinel", "type": "info", "message": "..." }],
  "remediationSteps": ["..."],
  "threatMap": [{ "category": "Recon", "risk": 0, "threats": 0 }],
  "timeline": [{ "time": "...", "agent": "Orchestrator", "event": "..." }],
  "status": "complete",
  "timestamp": "...",
  "userId": "user@example.com",
  "_id": "..."
}
```

Auth required (NextAuth session). Stores result in MongoDB.

### GET `/api/defend`

List current user’s recent results (sorted by `timestamp` desc). Auth required.

### DELETE `/api/defend`

Delete multiple results by IDs.

Request body:

```json
{ "sessionIds": ["<mongodb_id>", "<mongodb_id>"] }
```

### Auth routes

`/api/auth/[...nextauth]` provided by NextAuth handlers.

## Project Structure

```
octodef/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # Home → renders HomePage
│   │   ├── dashboard/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── about/page.tsx
│   │   ├── auth/signin/page.tsx
│   │   ├── api/
│   │   │   ├── defend/route.ts              # GET/POST/DELETE analyses
│   │   │   └── auth/[...nextauth]/route.ts  # NextAuth
│   │   ├── layout.tsx
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   │
│   │   └── pages/             # Page components used by routes
│   │       ├── HomePage.tsx   # Three.js hero animation
│   │       ├── DashboardPage.tsx
│   │       ├── ProfilePage.tsx
│   │       ├── SessionDetailPage.tsx
│   │       ├── SignInPage.tsx
│   │       ├── AboutPage.tsx
│   │       └── NotFoundPage.tsx
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── AttackSimulation3D.tsx
│   │   ├── ThreatInputForm.tsx
│   │   ├── AgentProgressBar.tsx
│   │   ├── ThreatGraph.tsx
│   │   ├── ResultsCard.tsx
│   │   ├── Header.tsx / Footer.tsx
│   │   └── OctoDefenderLogo.tsx
│   ├── hooks/
│   │   ├── QueryClientProvider.tsx
│   │   └── defenseQueries.tsx
│   ├── lib/
│   │   ├── auth.ts                    # NextAuth config/handlers
│   │   ├── db.ts                      # MongoDB collections helper
│   │   ├── defense_orcestrator.ts     # main analysis pipeline
│   │   └── defense/                   # per-type analyzers
│   │       ├── email_defense.ts
│   │       ├── ip_defense.ts
│   │       ├── hash_defense.ts
│   │       ├── url_defense.ts
│   │       └── logs_defense.ts
│   └── types/
│       └── types.ts
├── public/
│   ├── og-image.png
│   └── models/octopus/scene.gltf (+ bin/textures)
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
└── vercel.json
```

## Notes on Analysis Pipeline

- Orchestrator coordinates all agents and maintains the timeline
- Sentinel performs threat intel lookup via per-type analyzers
- Analyst runs LOF-style ML on logs (adaptive learning for high/critical)
- Remediator generates steps by severity/type; Alerter hits `ALERT_WEBHOOK` on criticals

## UI/UX

- shadcn/ui + Tailwind v4 styling, Radix primitives
- Framer Motion animations
- Three.js hero octopus with subtle tentacle IK-like motion

## Deployment

- Recommend Vercel. Set env vars in project settings. Add `MONGODB_URI`, NextAuth provider creds, and `NEXTAUTH_URL`.
- If using alerts, set `ALERT_WEBHOOK`.

## Acknowledgements

- Octopus 3D model shipped under its own license (`public/models/octopus/license.txt`). Ensure compliance for redistribution.

## License

MIT (unless otherwise noted). See model license as applicable.
