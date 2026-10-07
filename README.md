# SLOPE 2.0

SLOPE (Self Learning & Optimized Personal Learning Environment) helps engineering
students create personalized roadmaps, track learning progress, ask contextual
study questions, and prepare for placements. Roadmaps use Gemini with curated
resources and handwritten fallback plans when AI is unavailable. Students can
plan daily study sessions, take topic quizzes, adjust roadmaps using their results,
and keep private notes, bookmarks, and opt-in reminders.

## Stack and layout

- Client: JavaScript, React 19, Vite 7, React Router, Axios, Tailwind 4, Recharts.
- API: Node.js 22 LTS, Express 5, Mongoose, JWT, bcryptjs, Zod, `@google/genai`, Nodemailer.
- Hosting: Vercel client, Render API, MongoDB Atlas database.

```text
slope/
├── render.yaml                 # Optional Render Blueprint
├── server/                     # API, models, services, resource catalog, Postman
│   ├── .env.example
│   └── .nvmrc
└── client/                     # React single-page application
    ├── .env.example
    ├── .nvmrc
    └── vercel.json             # Deep-link SPA rewrite
```

## Local setup

Prerequisites: Node 22.23.2 with npm, an Atlas database, and a Gemini API key for
live AI/chat. Start in the `slope` directory. Verify `node --version` reports 22.x.
With nvm, use `nvm install 22.23.2` then `nvm use 22.23.2`.

Bash/zsh:

```bash
npm --prefix server ci
npm --prefix client ci
[ -f server/.env ] || cp server/.env.example server/.env
[ -f client/.env ] || cp client/.env.example client/.env
```

Windows PowerShell:

```powershell
npm --prefix server ci
npm --prefix client ci
if (!(Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
if (!(Test-Path client/.env)) { Copy-Item client/.env.example client/.env }
```

Fill `server/.env` using the table below; keep local `CLIENT_URL=http://localhost:5173`
and `client/.env` as `VITE_API_URL=http://localhost:5000/api`.
Generate a JWT secret with this command (also works in PowerShell):

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

In two terminals from `slope`, run `npm --prefix server run dev` and
`npm --prefix client run dev`. Open `http://localhost:5173`.
Check `curl http://localhost:5000/api/health`, or PowerShell
`Invoke-RestMethod http://localhost:5000/api/health`.
Expect HTTP 200, `status: "ok"`, and `database.ready: true`.
Development can start without MongoDB, but health returns 503 until connected.

## Environment variables

| Location | Variable | Value / purpose |
| --- | --- | --- |
| Server | `PORT` | Local `5000`; let Render supply its port. |
| Server | `NODE_ENV` | Local `development`; Render `production`. |
| Render | `NODE_VERSION` | `22.23.2`, matching `server/.nvmrc`. |
| Server | `MONGO_URI` | Atlas URI with database name `slope`. Required in production. |
| Server | `JWT_SECRET` | Random secret, at least 32 characters in production. |
| Server | `CLIENT_URL` | One exact client origin; production example `https://slope-demo.vercel.app`. |
| Server | `GEMINI_API_KEY` | Google AI Studio key; needed for AI roadmaps and chat. |
| Server | `GEMINI_MODEL` | `gemini-2.5-flash` by default; change for an available model. |
| Server | `EMAIL_USER` | Gmail address used by SLOPE to send password-reset and reminder emails. |
| Server | `EMAIL_APP_PASSWORD` | Google App Password for `EMAIL_USER`; never use the normal Gmail password. |
| Server | `EMAIL_FROM` | Sender shown in email, e.g. `SLOPE 2.0 <your-slope-gmail@gmail.com>`. Falls back to `EMAIL_USER`. |
| Server | `REMINDERS_ENABLED` | `true` enables the API's minute-by-minute reminder worker; default `false`. |
| Server | `CRON_SECRET` | Optional random secret of at least 32 characters for the reminder scheduler endpoint. |
| Client | `VITE_API_URL` | API base including `/api`; production Render HTTPS URL. |

Keep secrets in the server environment only. Never commit `.env` files. Vite
variables are public and embedded during build; changing them requires redeploying
the client. A missing/invalid Gemini key triggers roadmap fallback and a friendly
chat 503; it does not prevent server startup. Restart local servers after env edits.

### Gmail SMTP email setup

Password-reset email uses Gmail SMTP through Nodemailer. For local development and
the Render API:

1. Use a Gmail account for SLOPE email delivery.
2. Enable Google 2-Step Verification on that account.
3. Create a Google App Password. This is not the normal Gmail password.
4. Add these variables to the server environment only:

```env
EMAIL_USER=your-slope-gmail@gmail.com
EMAIL_APP_PASSWORD=your-google-app-password
EMAIL_FROM=SLOPE 2.0 <your-slope-gmail@gmail.com>
```

Never commit `.env` or place `EMAIL_APP_PASSWORD` in GitHub, the client, or Vercel.
Gmail SMTP is intended for SLOPE's low-volume/demo usage; a transactional email
provider and verified domain may be preferable for large-scale production.

## Deploy: Atlas → Render → Vercel

### 1. MongoDB Atlas

1. Create an Atlas project and a free cluster; select a region near your Render API.
2. In Database Access, create a database user with `readWrite` access to `slope`.
   This is a database login, separate from your Atlas account login.
3. In Network Access, add your local IP for development. For a demo, allow
   `0.0.0.0/0` so Render can connect. **This allows connections from every IP:**
   use a strong database password and replace it with restricted access for production.
4. Choose Connect → Drivers → Node.js and copy the connection string. Add `/slope`
   before `?`, and URL-encode special characters in the password (`@` becomes `%40`).

```text
mongodb+srv://<db_user>:<url_encoded_password>@<cluster-host>/slope?retryWrites=true&w=majority
```

Set this as `MONGO_URI`. Replace all angle-bracket fields; never publish the URI.
The API connects and creates its indexes before production requests are accepted.

### 2. Put the project on GitHub

Create a repository and push the `slope` root, including both lockfiles and hosting
configs. Keep `.env` and `node_modules` excluded by `.gitignore`. Render and Vercel
will import this same repository. No Git remote is preconfigured by the app.

### 3. Render API

1. Create a **Web Service** from your GitHub repository and set:
   - Runtime: Node; Root Directory: `server`; Plan: Free for a demo.
    - Build Command: `npm ci`; Start Command: `node index.js`.
   - Health Check Path: `/api/health`.
2. Add server variables from the table, including `EMAIL_USER`,
   `EMAIL_APP_PASSWORD`, and `EMAIL_FROM`. Set `NODE_ENV=production` and
   `NODE_VERSION=22.23.2`; use the generated JWT secret. Do not override `PORT`.
3. Before Vercel exists, use `CLIENT_URL=http://localhost:5173` temporarily.
   Add your Gemini key to test live AI/chat, or omit it for fallback-only operation.
4. Deploy and copy the service URL, for example `https://slope-api.onrender.com`.
   Visit its `/api/health`: expect HTTP 200 with `database.ready: true`.

Alternatively, create a Render **Blueprint** using root `render.yaml`. Supply
the variables marked `sync: false` when prompted; Render generates `JWT_SECRET`.
The Blueprint prompts for a Gemini key; manual Web Service setup can omit it.
The API binds `0.0.0.0` and Render's port. Missing required env, a short JWT secret,
an invalid client origin, or failed database/index setup exits with status 1.
Health pings MongoDB with a two-second timeout and returns 503 during outages.

**Free-tier demo note:** Render sleeps after about 15 minutes of inactivity;
the next request may need about a minute to wake it. Open `/api/health` and wait
for 200 before demonstrating. The frontend's 75-second request timeout may still
expire during a cold start plus AI generation; retry after health is ready.

### 4. Vercel client

1. Import the same repository; set Root Directory to `client` and Framework to Vite.
2. Set Node.js Version to **22.x**, Build Command to `npm run build`, and Output
   Directory to `dist`. Keep the normal npm install step.
3. Set `VITE_API_URL=https://<your-render-service>.onrender.com/api` for Production
   (and Preview if you intentionally use that API). Deploy the client.
4. Copy its stable production origin, for example `https://slope-demo.vercel.app`.
5. Update Render `CLIENT_URL` to that exact origin and redeploy the API. Do not
   include `/api`, a path, or a wildcard. Custom domains require this same update.

`client/vercel.json` rewrites every frontend route to `/`, so refreshes of
`/roadmap`, `/dashboard`, `/chat`, and `/placement` load React correctly.
The API is contacted directly on Render. CORS accepts only `CLIENT_URL` in
production; a Vercel preview on a different origin will not automatically work.

## Deployed smoke checks

- API `/api/health`: 200, `status: "ok"`, connected/ready DB, no secrets in response.
- Client landing loads without browser-console errors or failed asset requests.
- Register a fresh account; onboarding appears and login survives a refresh.
- Generate a roadmap; see modules/resources and an honest fallback notice if needed.
- Complete a topic; refresh and confirm the checkbox and dashboard percentage persist.
- Open a resource; verify its title and URL match the curated library.
- Ask a study question; with a valid Gemini key, receive and persist a contextual reply.
- Check failed chat requests show a friendly retry message without saving a fake reply.
- Open Placement, test an accordion, and inspect the mobile menu at 360px width.
- Refresh `/roadmap` and `/chat`; the SPA loads and the signed-in session remains.
- Log out; protected routes redirect to login. Wrong-password login stays on its form.
- Change account name, timezone, session length, and study days; refresh to verify persistence.
- Use Forgot password, follow the emailed reset link, and log in with the new password.
- Mark a daily task studied; confirm the roadmap and daily plan agree after refresh.
- Submit a topic quiz, review explanations, and find the attempt under Saved results.
- Preview and apply a roadmap adjustment; completed work remains and revision tasks appear.
- Save a topic note and bookmark a resource; find both in My library after refresh.
- Enable study reminders for a due time, confirm one in-app reminder, and mark it read.
- Import `server/postman/SLOPE.postman_collection.json`; set `baseUrl` to the Render
  URL plus `/api`. Run once with a unique email; repeated runs can hit auth limits.

## Common deployment errors

| Symptom | Fix |
| --- | --- |
| `EBADENGINE` or Vite Node error | Use Node 22.23.2 locally/Render and 22.x on Vercel; redeploy. |
| Missing env / short JWT secret | Fill `MONGO_URI`, `CLIENT_URL`, and a ≥32-character `JWT_SECRET`. |
| MongoDB startup failure / health 503 | Verify DB user, password encoding, cluster host, network access, and `readWrite` privilege. |
| Browser CORS / network error | Set exact production `CLIENT_URL`; verify HTTPS `VITE_API_URL` ends in `/api`; redeploy both as needed. |
| Refresh gives a Vercel 404 | Confirm Vercel root is `client` and `vercel.json` is included. |
| Frontend calls localhost after deploy | Set Production `VITE_API_URL` and trigger a new client build. |
| First request times out | Wake Render through health, wait for 200, then retry. |
| Chat 503 / fallback roadmap | Check server Gemini key, model access, quota, and provider status. |
| HTTP 429 | Wait 15 minutes; auth is 20/IP and roadmap/chat sends are 30/user per window. |
| HTTP 401 after JWT secret change | Sign in again; changing the secret invalidates existing tokens. |
| Password recovery 503 | Set server `EMAIL_USER` and `EMAIL_APP_PASSWORD`, optionally set `EMAIL_FROM`, then redeploy the API. |
| Preview apply 409 | Progress, quiz results, preferences, or active roadmap changed; create a fresh adjustment preview. |
| Quiz 503 | No curated set covers this topic and Gemini is unavailable; retry after restoring AI access. |

## Learning features

### 1. Password reset and account settings

Visit `/account` to edit your name, timezone, study days, preferred session length,
and reminder preferences. Email is the account identifier and is read-only.
Password changes require your current password and invalidate other sessions.

The login page links to `/forgot-password`. Reset links contain a random token in
the URL fragment, expire in 30 minutes, and work once. Only a SHA-256 hash is stored
in MongoDB. Resetting a password invalidates all existing JWTs. Production responses
do not reveal whether an address is registered and never return a reset token.

Set `EMAIL_USER` and `EMAIL_APP_PASSWORD` on the server to enable real email delivery;
`EMAIL_FROM` is optional and falls back to `SLOPE 2.0 <EMAIL_USER>`. Without these
credentials, development/test mode shows an email-preview link; production recovery
returns a configuration error. The mail transport uses Gmail SMTP through Nodemailer.

### 2. Daily study planning

Visit `/study-plan` or select Today in navigation. The daily minute budget divides
roadmap weekly availability across your selected study days. Tasks follow topic
order, fit your preferred session length, and carry unfinished tasks from the
previous seven days. Rest days have no assigned tasks.

Marking a study task complete updates its roadmap topic; marking revision complete
clears the revision flag without changing earlier completion. Estimates are guidance,
not a measurement of time studied. Daily plans persist across refreshes and are
refreshed when planning preferences or the roadmap schedule change. Future-day
previews are tentative and recalculated when the date arrives; future tasks cannot
be marked complete. Existing accounts and roadmaps receive defaults without a migration.

### 3. Topic quizzes and saved results

Visit `/quizzes` or select Check understanding under a roadmap topic. Each quiz has
five multiple-choice questions and expires in 24 hours. Gemini generates topic-specific
questions when available. The fallback bank covers all topics in the built-in Web,
DSA, and AI/ML roadmaps, and names its foundation-practice coverage explicitly.
Unsupported topics return 503 rather than unrelated questions.

Answer keys stay server-side until submission. Submitted attempts are graded and
saved once, including selected answers and explanations. Saved results remain
available after generating a replacement roadmap. Quizzes do not automatically
mark topics completed. Generation/submission is limited to 30 requests/user/15 minutes.

### 4. Adaptive roadmap

Select Adjust my plan on the roadmap or visit `/roadmap/adjust`. Choose your weekly
availability and preview the proposed module schedule before applying it.
The latest quiz per topic below 70% recommends a 20-minute revision session.
Unfinished planned days in the past week add catch-up time. Remaining workload uses
the selected session length and weekly availability; completed-topic timestamps,
topic order, resources, notes, and quiz history are preserved.

Previews expire in 30 minutes and are rejected if relevant progress, latest quiz
results, preferences, or active roadmap change. Applying updates the existing
roadmap and creates a new daily-plan schedule. Fresh AI generation retains its
1–26 week range; adapted schedules can extend to 156 weeks if availability is low.

### 5. Notes, bookmarks, and reminders

Select Topic notes under any roadmap topic to create, edit, or delete its private
plain-text note. Find and search notes in `/library`. Notes stay attached to the
original topic even after a roadmap is replaced. Notes allow up to 6,000 characters
and 8KB; resource bookmarks reference only items from the curated library.

Save resource buttons are synchronized throughout the app. My library also shows
study reminders and read/unread state. Reminders are off by default. They respect
your timezone, selected study days, preferred reminder time, and unfinished tasks.
There is at most one reminder per user per local date. Email delivery uses a database
lease with up to three attempts and five-minute backoff. Reminder email uses the same
Gmail SMTP transport as password-reset email.

Set `REMINDERS_ENABLED=true` to run the background worker while the API is awake.
Opening My library also checks your due reminder. Render's free service can sleep,
so an always-running scheduler is needed for unattended on-time delivery. The job can
be run from a scheduler with `npm --prefix server run reminders`, or by sending:

```text
POST https://<your-api>/api/library/reminders/run
Authorization: Bearer <CRON_SECRET>
```

Use a dedicated `CRON_SECRET` of at least 32 characters, distinct from `JWT_SECRET`.
Schedule checks every minute or every five minutes; later checks catch up on reminders
still due that local day. Configure the Gmail SMTP variables for email; in-app reminders
work without them.

## Feature API reference

All endpoints below require a user JWT except password recovery and the scheduler.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/forgot-password` | Request a reset email with `{email}`. |
| POST | `/api/auth/reset-password` | Consume `{token,password}`. |
| PATCH | `/api/auth/account` | Save `{name,preferences}`. |
| POST | `/api/auth/change-password` | Verify `{currentPassword,password}`; issue a replacement JWT. |
| GET | `/api/study-plan?date=YYYY-MM-DD` | Get the selected daily plan; date defaults to today in user timezone. |
| GET | `/api/study-plan/upcoming` | Get the next seven days' minute budgets. |
| PATCH | `/api/study-plan/:planId/tasks/:taskId` | Set `{completed}` and update the underlying topic. |
| POST | `/api/quizzes/start` | Start `{roadmapId,moduleIdx,topicIdx}`. |
| GET | `/api/quizzes/:id` | Load an owned quiz and its saved result, if any. |
| POST | `/api/quizzes/:id/submit` | Grade `{answers:[0,1,2,3,0]}`. |
| GET | `/api/quizzes/attempts` | Get the latest 100 saved attempts; optional `roadmapId` filter. |
| POST | `/api/adaptation/preview` | Preview `{hoursPerWeek}`. |
| POST | `/api/adaptation/:id/apply` | Apply an owned, current preview. |
| GET / PUT | `/api/library/notes/topic` | Read a topic reference in query; save reference plus `content` in body. |
| GET | `/api/library/notes?search=...` | Search the latest 100 matching notes. |
| DELETE | `/api/library/notes/:id` | Delete an owned note. |
| GET | `/api/library/bookmarks` | List saved curated resources. |
| PUT / DELETE | `/api/library/bookmarks/:resourceId` | Save/remove a resource. |
| GET | `/api/library/reminders` | Check due reminder and list recent reminders. |
| PATCH | `/api/library/reminders/:id/read` | Mark an owned reminder read. |
| POST | `/api/library/reminders/run` | Run due reminders; uses `CRON_SECRET`, not a user JWT. |

## Verification

Use Node 22.23.2 and run:

```bash
npm --prefix server test
npm --prefix client run build
```

The server suite starts an isolated temporary `mongod` process with a fresh test
database. Install MongoDB locally so `mongod` is on PATH, or supply `TEST_MONGO_URI`
for a dedicated test MongoDB server that permits creating/deleting `slope_test_*`
databases. Tests never use the application's `MONGO_URI` or Gemini key. Email tests
stub the provider transport and exercise real persistence, API validation, isolation,
session invalidation, scoring, preview conflicts, scheduling, and delivery deduplication.

## Future Scope

RAG/embeddings for uploaded study material, gamification, admin resource tooling,
multiple active goals, study groups, and multilingual support are future extensions.
