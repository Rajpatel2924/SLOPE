# SLOPE 2.0

SLOPE (Self Learning & Optimized Personal Learning Environment) helps engineering
students create personalized roadmaps, track learning progress, ask contextual
study questions, and prepare for placements. Roadmaps use Gemini with curated
resources and handwritten fallback plans when AI is unavailable.

## Stack and layout

- Client: JavaScript, React 19, Vite 7, React Router, Axios, Tailwind 4, Recharts.
- API: Node.js 22 LTS, Express 5, Mongoose, JWT, bcryptjs, Zod, `@google/genai`.
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
| Client | `VITE_API_URL` | API base including `/api`; production Render HTTPS URL. |

Keep secrets in the server environment only. Never commit `.env` files. Vite
variables are public and embedded during build; changing them requires redeploying
the client. A missing/invalid Gemini key triggers roadmap fallback and a friendly
chat 503; it does not prevent server startup. Restart local servers after env edits.

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
2. Add server variables from the table. Set `NODE_ENV=production` and
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

## Future Scope

Adaptive re-planning, quizzes, RAG/embeddings, gamification, admin tooling,
multilingual support, and notifications are future extensions.
