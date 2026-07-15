# MJM Mill — FFB Reception Station

A web app for the MJM Mill FFB (Fresh Fruit Bunch) Reception Station, covering:

- **FFB Reception**: log deliveries (ticket no, supplier, vehicle, weights, grade, rate, deductions) with auto-calculated net weight and amount payable.
- **Employees**: manage staff records (position, department, salary type/rate).
- **Payroll**: generate payroll records per employee per period with auto-calculated gross/net pay.
- **Dashboard**: at-a-glance summary of active employees, pending payroll, today's deliveries and tonnage, and this month's payout.

## Stack

- **Backend**: Node.js + Express, using the built-in `node:sqlite` module (no native build step required). Data is stored in `server/data/mjm-mill.db`.
- **Frontend**: React + Vite, mobile-responsive (bottom tab bar on mobile, top nav on desktop).

## Running locally

Requires Node.js 22.5+ (for `node:sqlite`).

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

Open http://localhost:5173. The Vite dev server proxies `/api` requests to the Express server on port 4000.

## Project structure

```
server/   Express API + node:sqlite database
client/   React + Vite frontend
```
