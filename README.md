# Crowd Management Dashboard

Real-time crowd analytics for multi-site venues. Operators log in to see live occupancy, footfall, dwell time and demographics per site, browse entry/exit records, and receive live security alerts.

## Features

- **Auth:** JWT login with an inline error message and a password visibility toggle. Expired or `401` sessions redirect to `/login`.
- **Overview:** live occupancy, today's footfall and average dwell time, each compared with yesterday.
- **Charts:** occupancy and male/female demographics over time, plotted in each **site's own timezone**.
- **Real time:** Socket.IO `live_occupancy` updates the KPIs and chart, and `alert` raises a toast and adds the alert to a notification drawer.
- **Crowd entries:** server-side paginated visitor table showing name, gender, entry, exit and dwell time.
- **Multi-site:** every query and socket stream is scoped to the selected site.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query · Zustand · Recharts · Socket.IO client · Axios

## Getting started

Requires **Node.js 20.9+**.

```bash
npm ci
echo "NEXT_PUBLIC_API_BASE_URL=https://hiring-dev.internal.kloudspot.com" > .env.local
npm run dev        # http://localhost:3000
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the Crowd Analytics API and the Socket.IO server. Inlined at build time. |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |

CI should run `npm ci && npm run lint && npx tsc --noEmit && npm run build` on every pull request.

## Project structure

```
app/
  login/            Login page
  (protected)/      Auth-guarded routes: dashboard, entries
  providers.tsx     TanStack Query client
hooks/              One hook per API resource, plus useSocket
lib/                Axios client, JWT expiry check, timezone utilities
store/              Zustand stores: auth, selected site, notifications
components/         Icon set
```

## Design decisions

- **Timezones:** UTC epoch milliseconds are the source of truth. "Today" is computed in the site's IANA timezone, and charts plot the `utc` values, formatting them in that timezone only for display. This handles half-hour offsets such as `Asia/Kolkata`.
- **Charts:** the x-axis covers the operating day up to **17:00 site time**. The latest value carries forward to now, and a LIVE marker shows while the day is in progress. The y-axis keeps the design's scale and grows in steps of 50 if a site exceeds it.
- **Freshness:** the dashboard's time window advances every minute, so KPIs and charts refresh without a reload. The previous result stays visible while the next one loads, but never across a site switch. Socket events update the dashboard in between refreshes.
- **Resilience:** each card and chart has its own loading, error and retry state. Queries retry once, and the socket reconnects automatically.
- **Security:** the token is attached by an Axios interceptor and never logged. All authorization is enforced by the API.

## Deployment

Deploy to Vercel or any Node host. Set `NEXT_PUBLIC_API_BASE_URL` for each environment, then run `npm run build && npm start`. The API must allow the dashboard's origin (CORS) and WebSocket upgrades.

## Roadmap

- Move the token from `localStorage` to an `httpOnly` cookie with refresh rotation, and enforce auth on the server.
- Add unit tests for the timezone utilities, component tests, and Playwright end-to-end tests.
- Add error tracking and Web Vitals monitoring.
- Read the API URL at runtime so one build can be promoted across environments.
- Make operating hours configurable per site, and add a date-range picker for historical days.
