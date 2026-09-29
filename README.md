# Kinchaku 巾着

A free, offline-first budget tracker for Android and iPhone. A *kinchaku* is a
Japanese drawstring coin purse.

- Works fully offline; data is stored on the device (IndexedDB).
- Installs from the browser: on iPhone, Safari → Share → **Add to Home Screen**.
- Android APK builds are planned through GitHub Releases.

## Layout

One build, two pages:

- `/` is the website (`index.html`, `src/site/`): what Kinchaku is, the APK
  download and iPhone install steps.
- `/app/` is the app itself (`app/index.html`, `src/`), also used as the
  desktop version. Installing from either page opens the app.

Set `BASE_PATH=/kinchaku/` when building for GitHub Pages.

## Develop

Run these from this folder (`Project Kinchaku`), not from another project.

```bash
npm install
npm run dev        # website at http://localhost:5173, app at /app/
npm run build      # typecheck + production build with the offline service worker
npm run preview    # serve the production build on http://localhost:4173
npm run icons      # regenerate app icons from public/logo.svg
```

`scripts/serve.mjs` starts the same servers for tools that can only launch
commands without spaces in their paths (it resolves the real folder first).

## How data is stored

- Amounts are integer thousandths of the currency unit (`src/lib/money.ts`), so
  sums stay exact for every currency.
- Every record has a random id, `updatedAt` and a `deleted` flag, ready for
  offline-first sync between devices.
- Built-in categories use fixed ids so devices never create duplicates.

## How the money works

Money-in categories (allowance, salary, pension, reward, paid loans, your own)
fill the month's pot. Expenses come out of it. What's left is money in minus
money out, and at the start of a new month the app offers to carry last
month's leftover in (or take an overspend out) as a "Carried over" entry.

## Features

- Money in and money out by category, with the month's balance and carry-over
- Day, week, month and year views; a calendar of each day's in and out; stats
- Monthly budgets, overall and per category, with warnings at 80% and over
- Accounts (cash, bank, e-wallet, card, savings, loan), transfers, net worth
- Repeating entries, entries left out of totals, quick notes, "add another"
- Savings goals, separate ledgers (e.g. Personal and Business)
- Custom categories with an icon or your own picture
- Backup and restore (JSON), spreadsheet export and import (CSV)
- Light and dark mode; works offline
- A budget cat on Home (`src/pet/`) that points out overspending, budgets
  running low and bills coming up, and answers money questions ("can I afford
  shoes for 2.5k?", "magkano pa natitira?") in English or Tagalog. Its answers
  come from rules that run on the device, so it needs no AI service, account
  or download.

Data code lives in `src/data/`, one module per feature; the schema and its
migrations are in `src/db.ts`.

## Roadmap

1. ✅ Offline app, website, desktop layout, light/dark mode
2. ✅ Money in and out, balances, carry-over, budgets, accounts, goals, ledgers, stats, backup
3. Sign-in and sync between devices (Firebase, free tier), then sharing a ledger
4. GitHub Pages hosting and an automatic APK build
