# Job Application Tracker

A full-stack, self-hosted Kanban-style job application tracker. Track job
applications through stages (Wishlist → Applied → Interview → Offer →
Rejected) on a drag-and-drop board, track follow-up deadlines, and view
analytics on your job search.

- **Frontend**: `frontend/` — React (Vite) SPA
- **Backend**: `backend/` — Spring Boot REST API
- **Database**: MongoDB, run locally (Docker or Homebrew — no Atlas/paid tier)

These are two independently run applications communicating over REST.

## Prerequisites

- **Java 17+** — the backend targets language level 17 (see
  `backend/pom.xml`). This build was developed and tested against a locally
  installed OpenJDK 23.
- **Node.js** — this build used Node v26.7 / npm 11.19. Any reasonably
  current Node 18+ should work; if something doesn't build, check your
  version against this first.
- **MongoDB**, running locally on the default port (`27017`) — via Docker
  or Homebrew, see below. No cloud/Atlas tier is used or required.
- **Maven** — already vendored as the wrapper script `backend/mvnw`; you do
  not need a separate Maven install.

## MongoDB setup

Pick one. Either way, the backend expects Mongo reachable at
`mongodb://localhost:27017` (see the Backend setup section below).

**Option A — Docker** (the primary path called out in this project's
original spec):

```bash
docker run -d -p 27017:27017 --name jobtracker-mongo mongo:7
```

**Option B — Homebrew** (what this project's own development environment
actually used, since Docker wasn't available here):

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

`brew services` manages MongoDB as a background `launchd` service. In a
sandboxed or otherwise restricted environment, `brew services start` can
fail with a `launchd` bootstrap error (this happened during this project's
own build). If that happens, run `mongod` directly in its own terminal
instead — it uses the same config Homebrew installed:

```bash
mongod --config $(brew --prefix)/etc/mongod.conf
```

Leave that terminal running for as long as you want the database up; this
is exactly how MongoDB was run throughout this project's development.

## Backend setup

```bash
cd backend
./mvnw spring-boot:run   # runs on port 8080
```

No config file setup is required to get started: `application.yml` is
already present in the repo, pre-filled with safe local-dev defaults (a
placeholder JWT secret long enough to satisfy HS256's key-length check, a
local Mongo URI, `cookie.secure: false`, etc.) via Spring's
`${ENV_VAR:default}` syntax, so it also picks up the environment variables
below automatically if you set them — nothing extra to wire up.
`application-example.yml` sits alongside it as a flat-value reference
(same settings, same defaults, without the `${...}` env var indirection)
in case you ever need to reconstruct `application.yml` from scratch.

Override any setting by exporting the corresponding environment variable
before `./mvnw spring-boot:run` (Spring Boot's relaxed-binding convention
maps these automatically since `application.yml` references them):

| Env var | Overrides | Default |
| --- | --- | --- |
| `MONGODB_URI` (via `spring.data.mongodb.uri`) | Mongo connection string | `mongodb://localhost:27017/jobtracker` |
| `JWT_SECRET` (via `jwt.secret`) | JWT signing secret | a placeholder — **replace with a real random secret of 32+ chars** before anything beyond local dev |
| `JWT_EXPIRATION_MS` (via `jwt.expiration-ms`) | JWT lifetime, in ms | `86400000` (24h) |
| `COOKIE_SECURE` (via `cookie.secure`) | `Secure` flag on the auth cookie | `false` — set `true` once served over HTTPS |
| `CORS_ALLOWED_ORIGIN_PATTERN` (via `cors.allowed-origin-pattern`) | allowed CORS origin pattern | `http://localhost:[*]` — a local-dev-only wildcard; override to your real origin(s) for any non-local deployment |
| `LOGGING_LEVEL_COM_JOBTRACKER` | log verbosity for `com.jobtracker.*` | `INFO` |

Run the backend test suite (31 JUnit tests, all Mockito-based unit tests
against mocked repositories/`MongoTemplate` — no `@SpringBootTest`, so no
live MongoDB connection is needed to run them):

```bash
./mvnw test
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev     # dev server, defaults to port 5173
```

The dev server's proxy (`vite.config.js`) forwards `/api/**` to
`http://localhost:8080`, and the backend's CORS config accepts any
localhost origin — so if port 5173 is already taken, Vite automatically
falls back to the next free port (5174, 5175, …) and everything still
works without any config changes.

`frontend/.env.example` documents the one frontend env var currently
established as a pattern (`VITE_API_BASE_URL`) — it's commented out and
unused today, since the dev proxy makes it unnecessary in development. It
exists as the place a future production API base URL would go once the
frontend is deployed somewhere other than behind the same origin as the
backend.

Other frontend commands:

```bash
npm run build    # production build, output to frontend/dist/
npm run lint     # eslint check
```

## First run

1. Start MongoDB, the backend, and the frontend as above.
2. Open the frontend dev server URL in a browser and register a new
   account (email + password — no OAuth/social login).
3. Five default columns — Wishlist, Applied, Interview, Offer, Rejected —
   are seeded automatically for every new account. Add applications into
   them, drag cards between columns, and check the Stats page for
   analytics on your applications.

## Known Limitations

Deliberate, consciously-deferred items from this build (not bugs
discovered late — decisions made to keep scope bounded at each stage):

- No reconciliation for a **partial rollback** on a failed drag-and-drop
  move that touches multiple applications.
- A possible race condition on **rapid, successive drags** performed
  faster than their network round-trips resolve.
- `npm audit` currently reports 4 advisories (3 moderate, 1 high) in
  `vite`/`esbuild` and `react-router`/`react-router-dom`, all blocked on
  major-version bumps that aren't a drop-in upgrade for this codebase yet.
- `StatsService`'s `toLong`/timezone handling could use further hardening
  for edge cases (e.g. non-UTC deployments).
- No cascade-delete: deleting a column that still has applications in it
  does not also delete or reassign those applications.
- `ApplicationModal.jsx`'s form fields have real (~390-line) duplication
  that would benefit from a shared field-rendering abstraction.
- No frontend test runner is configured — in particular,
  `utils/dndReorder.js`'s reorder/diff math has no unit tests despite
  being the trickiest pure logic in the frontend.
- Drag-and-drop is intentionally **disabled whenever any filter is
  active** (company, priority, or date range). This is correct-by-design,
  not a bug: reordering renumbers a column's applications based on
  whatever's currently loaded, and a filtered view is only a partial
  slice of a column's real contents, so allowing a drag against that
  partial view would silently corrupt the true stored order of the
  applications the filter is hiding. Clear the filters to resume
  reordering.
