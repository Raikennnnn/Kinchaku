# Kinchaku 巾着

A free, offline-first budget tracker for Android and iPhone. A *kinchaku* is a
Japanese drawstring coin purse.

- Works fully offline; data is stored on the device (IndexedDB).
- Optional account (email or Google) keeps phones and computers in sync.
- Installs from the browser: on iPhone, Safari → Share → **Add to Home Screen**.
- Android APK builds are planned through GitHub Releases.

## Layout

One build, two pages:

- `/` is the website (`index.html`, `src/site/`): what Kinchaku is, the APK
  download and iPhone install steps.
- `/app/` is the app itself (`app/index.html`, `src/`), also used as the
  desktop version. Installing from either page opens the app.

Hosted on Vercel (`vercel.json`), which builds every push to `main`.

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
- Every record has a random id, `updatedAt` and a `deleted` flag. Deletes are
  flags so a device that was offline can't bring a record back.
- Built-in categories use fixed ids so devices never create duplicates, and
  count as never edited until someone edits them.

## Accounts and sync

Signing in is optional; the app works the same without it. Code is in
`src/sync/`, and Firebase only downloads for people who sign in.

- Every local write marks its record as not yet synced (`_dirty`, set by hooks
  in `src/db.ts`). When online, marked records go up to Firestore at
  `users/{uid}/{table}/{id}` with the server time they arrived.
- Each device listens for records that arrived since it last looked. The newer
  edit (`updatedAt`) wins; the merge rules are in `src/sync/merge.ts`.
- Offline, changes wait on the device and go up once it's back online. The
  header shows the state (synced, syncing, offline, error).
- The first time a device signs in, the account's settings (currency, cat)
  win, and the device's existing entries are added to the account.
- Signing out clears the device; the account keeps everything.

### Firebase setup (once per project)

1. Authentication → Sign-in method: turn on **Email/Password** and **Google**.
2. Authentication → Settings → Authorized domains: add the site's domain.
3. Firestore Database: create it, then paste `firestore.rules` into **Rules**
   and publish. People can only reach their own records.
4. Put the web app's config in `src/sync/config.ts` (it's public by design).
5. Google sign-in on the deployed site goes through the site's own address
   (`/__/auth/` in `vercel.json`), which phones need. In Google Cloud console →
   APIs & Services → Credentials → the "Web client" OAuth client, add
   `https://<site>/__/auth/handler` to **Authorized redirect URIs**.

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
3. ✅ Sign-in and sync between devices (Firebase, free tier); hosting on Vercel
4. Sharing a ledger with someone else
5. An automatic Android APK build on GitHub Releases
