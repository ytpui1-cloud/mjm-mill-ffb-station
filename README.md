# MJM Mill — FFB Reception Station

A web app for the MJM Mill FFB (Fresh Fruit Bunch) Reception Station, covering:

- **FFB Reception**: log deliveries (ticket no, supplier, vehicle, weights, grade, rate, deductions) with auto-calculated net weight and amount payable.
- **Employees**: manage staff records (position, department, salary type/rate).
- **Payroll**: generate payroll records per employee per period with auto-calculated gross/net pay.
- **Dashboard**: at-a-glance summary of active employees, pending payroll, today's deliveries and tonnage, and this month's payout.

## Stack

- **Backend**: Node.js + Express + Postgres (via the `pg` package). Designed to run against a Supabase Postgres database.
- **Frontend**: React + Vite, mobile-responsive (bottom tab bar on mobile, top nav on desktop).

## Running locally

1. Create a Postgres database (e.g. a free [Supabase](https://supabase.com) project) and copy its connection string.
2. Create `server/.env` with:
   ```
   DATABASE_URL=postgresql://...your-supabase-connection-string...
   ```
3. Start both servers:
   ```bash
   # Terminal 1 — API server (port 4000)
   cd server
   npm install
   npm run dev

   # Terminal 2 — frontend (port 5173)
   cd client
   npm install
   npm run dev
   ```

Open http://localhost:5173. The Vite dev server proxies `/api` requests to the Express server on port 4000. Tables are created automatically on first server start.

## Deploying (Render)

`render.yaml` at the project root defines two services:

- `mjm-mill-ffb-api` — the Express backend (needs a `DATABASE_URL` env var set in the Render dashboard, pointing at your Supabase Postgres instance)
- `mjm-mill-ffb-web` — the static React build, configured with `VITE_API_BASE` pointing at the deployed API URL

Connect this repo on [render.com](https://render.com) and it will pick up `render.yaml` as a Blueprint.

## Project structure

```
server/       Express API + Postgres (pg)
client/       React + Vite frontend
render.yaml   Render deployment config
```
