# StoryPoint — MVP Scaffold

Overview
- Stack: React (TypeScript) frontend, Node.js + Express (TypeScript) backend, Socket.IO for realtime.
- DB: PostgreSQL with Prisma ORM.
- Auth: Simple email magic-link. For now magic links are logged to the server console (no SMTP). You can swap to real email later.
- Single-team, realtime sessions for story pointing.

Prereqs
- Docker & Docker Compose
- Node 18+
- pnpm, npm or yarn (optional; containerized run uses Docker)

Quick start (docker)
1. Copy files into a repo.
2. Create a `.env` in backend from `.env.example`.
3. Run:
   - docker-compose up --build
4. Backend: http://localhost:4000
   Frontend: http://localhost:5173

Dev notes
- To generate Prisma client: run `npx prisma generate` (or `pnpm prisma generate`) in backend.
- To run migrations: `npx prisma migrate dev --name init`

Auth flow (dev)
- POST /api/auth/magic-link with { email } — server creates token and prints a magic URL in backend logs.
- Visit printed URL (or use returned token) to obtain JWT; JWT stored in localStorage by the frontend.

Next steps you might ask me to do
- Hook up real SMTP (SendGrid/Postmark) to send magic link emails.
- Add SSO (Okta/Google) if you want.
- Persist sessions across multiple teams (multi-tenant).
- Add role-based checks for reveal/finalize.

If you want, I can:
- push this scaffold to a GitHub repo (give me owner/repo), or
- generate prioritized GitHub issues and a PR plan, or
- implement real SMTP and demo email sender.