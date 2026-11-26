# Manual Testing Guide — VC × Startup Platform

A hand-over script for testing the whole application end to end through the browser. Anyone can
follow it without reading the code: every step says what to click and what you should see.

It covers both sides of the product (the **VC firm** side and the **Startup** side), the features
they share (discovery, mutual-consent messaging, events, signals), the rules the backend enforces,
and the checks that numbers on different pages agree with each other.

> For automated checks and developer commands see `TESTING.md`. This file is for a person with a
> browser.

---

## Contents

1. [Before you start](#1-before-you-start)
2. [Accounts and demo data](#2-accounts-and-demo-data)
3. [How to record results](#3-how-to-record-results)
4. [Smoke test (10 minutes)](#4-smoke-test-10-minutes)
5. [Authentication and onboarding](#5-authentication-and-onboarding)
6. [App shell: navigation, search, theme](#6-app-shell-navigation-search-theme)
7. [VC side](#7-vc-side)
8. [Startup side](#8-startup-side)
9. [Shared features](#9-shared-features)
10. [Settings, team and plans](#10-settings-team-and-plans)
11. [End-to-end journeys](#11-end-to-end-journeys)
12. [Permissions matrix](#12-permissions-matrix)
13. [Cross-page consistency checks](#13-cross-page-consistency-checks)
14. [Validation, errors and edge cases](#14-validation-errors-and-edge-cases)
15. [Responsive, accessibility and dark mode](#15-responsive-accessibility-and-dark-mode)
16. [Looking at the database](#16-looking-at-the-database)
17. [Known limitations — not bugs](#17-known-limitations--not-bugs)
18. [Bug report template and sign-off](#18-bug-report-template-and-sign-off)

---

## 1. Before you start

### What you need

| Need | Notes |
|---|---|
| A modern browser | Chrome or Safari. Use a **private window** for the second person in two-person tests. |
| The app running | Frontend at **http://localhost:3002**, backend at **http://localhost:8081**. |
| Seeded demo data | The `demo` profile creates the accounts and records listed in section 2. |

### Starting the app (if you are the one running it)

```bash
docker start dashboard-postgres-1 dashboard-redis-1 adminer   # if Docker was restarted
scripts/dev-up.sh                                              # Postgres, Redis, backend, frontend + demo data
```

`scripts/dev-down.sh` stops everything. If `localhost:3002` does not load, Docker is usually not
running — start Docker Desktop first. Details are in `TESTING.md`.

### Starting from a clean slate

Some tests change data (they create events, add team members, record investments). To reset to the
exact demo data, stop the app, drop and recreate the database, and start again with seeding on:

```bash
scripts/dev-down.sh
docker exec dashboard-postgres-1 psql -U postgres -c "DROP DATABASE IF EXISTS dashboard_api;"
docker exec dashboard-postgres-1 psql -U postgres -c "CREATE DATABASE dashboard_api;"
DB_NAME=dashboard_api PORT=8081 FRONTEND_PORT=3002 scripts/dev-up.sh
```

Better still: **test against a scratch database** (`DB_NAME=dashboard_scratch`) so the demo
database stays tidy.

### Two sessions at once

Many tests need a VC and a founder logged in at the same time. A browser keeps one session per
site, so use **a normal window for one person and a private/incognito window for the other** (or two
different browsers).

---

## 2. Accounts and demo data

Every demo account uses the password **`Password123!`**. Email domain: `@demo.dashboard.test`.

| Email | Side | Role | Belongs to |
|---|---|---|---|
| `owner@…` | VC | OWNER | Meridian Ventures |
| `pm@…` | VC | PORTFOLIO_MANAGER | Meridian Ventures |
| `staff@…` | VC | STAFF | Meridian Ventures |
| `founder@…` | Startup | FOUNDER | Ledgerly |
| `cofounder@…` | Startup | CO_FOUNDER | Ledgerly (the same startup as `founder@…`, which is already connected to Meridian) |
| `vaultline@…` | Startup | FOUNDER | Vaultline — **only on a freshly seeded database** |

### What the demo database contains

| Area | Data |
|---|---|
| VC firms | **Meridian Ventures** (Starter plan, 3 seats used of 5), Kestrel Capital (Free), Bay Harbour Partners (Free) |
| Meridian thesis | Sectors Fintech, SaaS, Logistics; cheque size ₹1 Cr – ₹10 Cr |
| Startups | Ledgerly (Fintech, Series A), Shiprack (Logistics, Seed), ClinicOS (Healthtech, Seed), Vaultline (SaaS, Pre-seed) |
| Meridian investments | Ledgerly ₹6 Cr Series A (active), Shiprack ₹2.5 Cr Seed (active), ClinicOS ₹80 L Pre-seed (**exited**) |
| Funding rounds | Ledgerly Series A — **open**, target ₹25 Cr; Ledgerly Seed — closed, ₹4.5 Cr |
| Commitments on the Series A | Meridian ₹6 Cr **Committed**; Kestrel ₹4 Cr **Soft committed**; Bay Harbour ₹2.5 Cr **Indicated** |
| Deal Triage queue | Quantaloop (approved), Pocketly (pending), Veridian Grid (pending) |
| Pool | Vaultline (high priority), Nimbus Grid (interested — a company not on the platform) |
| Messaging | One accepted connection and chat between Ledgerly and Meridian |
| Signals | Funding, product, hiring, regulatory and market items |
| Outreach | One message sent by Meridian ("Introduction from Meridian Ventures") |
| Events | A demo day, office hours and a networking mixer. **Dates are set relative to when the data was seeded, so some may now be in the past** — create new events when a test needs a future one. |

The database may contain extra rows if automated suites or earlier testers ran against it (for
example a rejected "QA Test Co" opportunity). Ignore anything you do not recognise.

### Quick reference of expected figures (demo data, nothing changed yet)

| Where | Figure | Value |
|---|---|---|
| VC Dashboard / Investments | Active holdings | 2 |
| | Capital deployed | ₹8.5 Cr (the exited ClinicOS is **not** included) |
| Founder (Ledgerly) Insights | Capital raised | ₹6 Cr (signed only) |
| | Committed investors | 1 |
| | Funnel — Investor pledges | 3 (all live pledges) |
| Open round | Pledged | ₹12.5 Cr of ₹25 Cr (6 + 4 + 2.5); signed ₹6 Cr |
| Both Insights pages | Connection requests / Accepted / Active conversations | 1 / 1 / 1 |

---

## 3. How to record results

Each test has an ID, steps, an **Expected** result and a checkbox. Mark one of:

| Mark | Meaning |
|---|---|
| ✅ | Passed — matches Expected exactly |
| ❌ | Failed — raise a bug (section 18) and note its number |
| ⚠️ | Works but something looks wrong (typo, odd layout, slow) — raise as minor |
| ⏭ | Skipped, with the reason |

**Severity** to use in bug reports:

| Level | Meaning | Example |
|---|---|---|
| **S1 Blocker** | App unusable, data lost or exposed, security hole | A founder can see a rival firm's commitment |
| **S2 Major** | A feature does not work or shows wrong numbers | Totals disagree between two pages |
| **S3 Minor** | Works but wrong text, label, layout | A raw enum such as `SERIES_A` shown to users |
| **S4 Cosmetic** | Polish | Misaligned icon |

While testing, also keep the browser **developer console** open (F12 → Console). Any red error on a
page that otherwise looks fine is worth a ⚠️ note.

---

## 4. Smoke test (10 minutes)

Run this first. If any step fails, stop and report — the rest will not be reliable.

| ID | Steps | Expected | Result |
|---|---|---|---|
| S-01 | Open http://localhost:3002 signed out | Landing page with sign-in options loads, no console errors | ☐ |
| S-02 | Sign in as `owner@demo.dashboard.test` | Lands on **Dashboard** with Meridian's figures; sidebar shows VC menus | ☐ |
| S-03 | Click every sidebar item once | Each page loads (data, empty state, or a clear message) — never a blank page or a crash screen | ☐ |
| S-04 | Refresh the browser on `/pool` | Still signed in, still on Pool | ☐ |
| S-05 | Sign out, sign in as `founder@demo.dashboard.test` | Lands on **Dashboard** with Ledgerly's round; sidebar shows Startup menus (Funding Rounds, Discover Investors) | ☐ |
| S-06 | Open **Messages** as the founder | One conversation with Meridian Ventures, with message history | ☐ |
| S-07 | Open a URL that does not exist, e.g. `/nope` | Redirects to the landing page, no error screen | ☐ |

---

## 5. Authentication and onboarding

### 5.1 Sign in and out

| ID | Steps | Expected | Result |
|---|---|---|---|
| A-01 | On the landing page find the dev sign-in (email/password) and sign in as `owner@…` with the right password | Signed in, redirected to Dashboard | ☐ |
| A-02 | Sign in with the right email and a **wrong** password | Error message; no hint whether the email exists | ☐ |
| A-03 | Sign in with an email that does not exist | The **same** generic error as A-02 | ☐ |
| A-04 | Submit the form empty | Field-level validation messages; nothing is sent | ☐ |
| A-05 | While signed in, open `/` | Behaves sensibly (stays signed in / goes to Dashboard) — not a broken screen | ☐ |
| A-06 | Click **Sign out** (user menu) | Back on the landing page; the browser **Back** button does not reveal app pages | ☐ |
| A-07 | Signed out, open `/dashboard` directly | Sent to the landing page | ☐ |
| A-08 | Sign in, then refresh several times | Session persists | ☐ |
| A-09 | Sign in on browser A and a different account on browser B | Each session is independent — neither shows the other's data | ☐ |

### 5.2 Registering a new account

Use a unique address each run, e.g. `tester+<number>@example.test`.

| ID | Steps | Expected | Result |
|---|---|---|---|
| A-10 | Register with a new email and password | Account created; lands on **Choose Your Account Type** | ☐ |
| A-11 | Register again with the **same** email | Rejected with a clear message (not a crash) | ☐ |
| A-12 | Try a very short password | Rejected with a clear message | ☐ |
| A-13 | On account type, choose **Venture Capitalist** ("I invest in startups") | Goes to **Set up your firm** | ☐ |
| A-14 | With a fresh account, choose **Startup Founder** ("I'm building a company") | Goes to **Set up your startup** | ☐ |
| A-15 | Close the browser mid-onboarding, sign in again | Returned to the step you were on, not to an empty dashboard | ☐ |
| A-16 | While on onboarding, type `/dashboard` in the address bar | Sent back to onboarding until setup is complete | ☐ |
| A-17 | After setup is complete, type `/onboarding/firm` | Sent away to the Dashboard (cannot set up twice) | ☐ |

### 5.3 Set up a firm (VC onboarding)

| ID | Steps | Expected | Result |
|---|---|---|---|
| O-01 | Leave **Name** blank and submit | Validation error on the field | ☐ |
| O-02 | Enter a website without `http(s)://` or with `javascript:alert(1)` | Rejected | ☐ |
| O-03 | Enter a founded year in the future / before 1900 | Rejected | ☐ |
| O-04 | Fill in name, about, website, primary stage, sectors (pick several), location, founded year; submit | Firm created; Dashboard opens; the creator is the **OWNER** | ☐ |
| O-05 | Open **Settings** | Firm details match what you entered | ☐ |

### 5.4 Set up a startup (founder onboarding)

| ID | Steps | Expected | Result |
|---|---|---|---|
| O-06 | Leave **Name** blank and submit | Validation error | ☐ |
| O-07 | Fill in name, what you do, sector, stage, website, pitch deck URL, team size, location, founded year; submit | Startup created; Dashboard opens; the creator is the **FOUNDER** | ☐ |
| O-08 | Open **Settings** | Details match | ☐ |

### 5.5 Google / LinkedIn sign-in

Not verifiable in the demo environment — see section 17.

---

## 6. App shell: navigation, search, theme

| ID | Steps | Expected | Result |
|---|---|---|---|
| N-01 | Signed in as VC, read the sidebar | Groups: **Overview** (Dashboard, Insights), **Deals** (Deal Flow, Deal Triage, Pool, Outreach), **Portfolio** (Investments, Commitments, Conflict Sentinel, Portfolio Pulse), **Network** (Discover Startups, Messages, Wishlist, Events), **Intel** (Signals, AI Suggestions) | ☐ |
| N-02 | Signed in as a founder, read the sidebar | Groups: **Overview** (Dashboard, Insights), **Fundraise** (Funding Rounds, Discover Investors, Wishlist), **Network** (Messages, Events), **Intel** (Signals, AI Suggestions). No VC-only items | ☐ |
| N-03 | As a founder, type `/investments` or `/pool` in the address bar | Not usable — redirected or refused, never shows VC data | ☐ |
| N-04 | As a VC, type `/funding` in the address bar | Not usable — never shows founder tools | ☐ |
| N-05 | Click through a few pages and watch the browser tab title | Title changes per page (for example "Pool · Dashboard") | ☐ |
| N-06 | Press **⌘K** (Mac) / **Ctrl+K** | Command palette opens; typing filters pages; Enter navigates; Esc closes | ☐ |
| N-07 | Use the theme toggle in the top bar: light → dark → system | Theme changes immediately and survives a refresh; no unreadable text in either | ☐ |
| N-08 | Collapse/expand the sidebar if the control exists | Layout adjusts; no overlap | ☐ |
| N-09 | Press Tab from the top of any page | First stop is a **Skip to content** link; focus is always visible | ☐ |
| N-10 | Navigate to a new page | Keyboard focus moves to the page heading | ☐ |
| N-11 | Resize the window below ~1000 px | Sidebar becomes a menu button; the menu opens, traps focus, closes with Esc | ☐ |

---

## 7. VC side

Sign in as **`owner@…`** unless stated. Roles are tested in section 12.

### 7.1 Dashboard

| ID | Steps | Expected | Result |
|---|---|---|---|
| V-01 | Open **Dashboard** | Cards: Capital deployed **₹8.5 Cr**, Active holdings **2**, Tracked in pool **2**, Awaiting triage (pending count) | ☐ |
| V-02 | Read the charts | "Capital deployed over time", "Sector exposure" (active positions by sector, largest first), "Pace" (cheques per quarter) — each either draws or shows a clear "appears once…" message | ☐ |
| V-03 | Check sector exposure | **ClinicOS (exited) is not counted**; percentages add to 100% and agree with the Investments page | ☐ |
| V-04 | Look at "Waiting on you" / "Needs a decision" / "Upcoming events" | Items link to the right pages; counts match the pages they link to | ☐ |
| V-05 | Click the shortcut cards (Investments, Deal Flow …) | Navigate correctly | ☐ |
| V-06 | Stop the backend, refresh | A clear **error card with a retry** — never "₹0 / 0 / 0" figures. Restart the backend and press retry | ☐ |

### 7.2 Insights (investor)

| ID | Steps | Expected | Result |
|---|---|---|---|
| V-10 | Open **Insights** | Headline cards: Profile views, Connection requests (**1**), Wishlisted by, Active conversations (**1**), Average cheque, Largest position, Since last cheque, Companies | ☐ |
| V-11 | Read the **Engagement funnel** | Steps: Profile views → Wishlisted → Connection requests → Accepted → **Investments made = 2**. Conversion text between steps never exceeds 100% | ☐ |
| V-12 | Compare funnel "Investments made" with the Investments page | Same number (active holdings) | ☐ |
| V-13 | Use the filter bar: **Round**, **Sector**, **Status** (and date range if present) | Charts and cards narrow together; an empty result shows a message such as "No positions in this slice" | ☐ |
| V-14 | Set Status to **Exited** | The exited ClinicOS appears; with the default view it does not | ☐ |
| V-15 | Read each chart: Capital deployed over time, By round, By company, Investment activity (monthly), Pace, Cheque size against frequency, Pipeline behind the book | Each renders with sensible labels and tooltips; "By company" merges follow-ons into one name | ☐ |
| V-16 | Clear filters | Everything returns to the full view | ☐ |

### 7.3 Deal Flow (discovering open rounds)

| ID | Steps | Expected | Result |
|---|---|---|---|
| V-20 | Open **Deal Flow** | Open rounds appear — Ledgerly's Series A — with target, progress and ticket band | ☐ |
| V-21 | Filter by **sector** and **stage** | List narrows; "No open rounds" with a hint when nothing matches | ☐ |
| V-22 | Open a round's profile | Opens the company/round detail | ☐ |
| V-23 | As Meridian, find the round you have already pledged to | Your existing pledge is shown; you are not offered a second one | ☐ |
| V-24 | As a **different** VC firm (create one in a private window), commit to the round with an amount inside the ticket band | Commitment recorded at the level you choose (Indicated / Soft committed / Committed) | ☐ |
| V-25 | Commit with an amount **below the minimum** or **above the maximum** ticket | Rejected with a clear message | ☐ |
| V-26 | Commit in a **different currency** from the round | Rejected with a clear message | ☐ |
| V-27 | As **STAFF** (`staff@…`), try to commit | Not permitted — button hidden or a clear refusal (403 message) | ☐ |

### 7.4 Deal Triage

| ID | Steps | Expected | Result |
|---|---|---|---|
| V-30 | Open **Deal Triage** | Queue with columns Company, Sector / stage, Score, Recommendation, Status. Demo: Quantaloop (approved, score 100, Pursue), Pocketly (pending, 100, Pursue), Veridian Grid (pending, 12, Pass) | ☐ |
| V-31 | Click **New opportunity** | Form: company, website, contact email, sector, stage, what they do, raise/ask, currency. Note "The scoring agent runs automatically once this is saved" | ☐ |
| V-32 | Submit with required fields empty | Validation errors | ☐ |
| V-33 | Add a Fintech seed company asking ₹3 Cr (`30000000`) with a good description | Saved; appears in the queue **already scored** with a recommendation (Pursue) | ☐ |
| V-34 | Add a company in a sector **outside** your thesis, with a huge ask | Low score and a **Pass** recommendation | ☐ |
| V-35 | Open an opportunity | Detail page: Sector, Stage, Ask, Contact, Website, Logged, Scored, Status; **Thesis fit** section with reasons | ☐ |
| V-36 | Read the reasons in Thesis fit (e.g. for Pocketly) | Reasons are **specific**: they name your thesis values (e.g. "Fintech is one of the sectors in your thesis (Fintech, SaaS, Logistics)") and quote the company's own description — no generic filler | ☐ |
| V-37 | Approve a pending opportunity with a note ("Why you're taking this call.") | Status becomes **Approved**; note saved; queue updates | ☐ |
| V-38 | Reject another with a note | Status **Rejected** | ☐ |
| V-39 | On the detail page click **Conflict Sentinel** | Opens Conflict Sentinel for that company | ☐ |
| V-40 | As **STAFF**, try to approve/reject | Refused or hidden (see section 12) | ☐ |
| V-41 | Open a URL with a made-up id: `/deal-triage/00000000-0000-0000-0000-000000000000` | A clear "not found" state | ☐ |

### 7.5 Pool

| ID | Steps | Expected | Result |
|---|---|---|---|
| V-50 | Open **Pool** | Table: Company, Sector / stage, Interest, Notes/tags, Added, Actions. Demo: Vaultline (high priority), Nimbus Grid (interested) | ☐ |
| V-51 | Add a **registered** startup (pick from the list) with an interest level, tags (`fintech, founder-known, revisit-Q3`) and notes | Row appears with tags | ☐ |
| V-52 | Add a **company not on the platform** by typing a name, sector and stage | Row appears; marked as off-platform | ☐ |
| V-53 | Add the same registered startup twice | Rejected (already in your pool) | ☐ |
| V-54 | Edit a row's interest level / notes | Saved and shown | ☐ |
| V-55 | Remove a row | Confirmation: "Your notes and tags for this company will be deleted."; after confirming it disappears | ☐ |
| V-56 | Cancel the removal | Nothing is deleted | ☐ |
| V-57 | Sign in as a different firm | **Does not see Meridian's pool** (private per firm) | ☐ |
| V-58 | Empty pool (use a brand-new firm) | "Pool is empty" with a helpful prompt, not a blank page | ☐ |

### 7.6 Outreach

| ID | Steps | Expected | Result |
|---|---|---|---|
| V-60 | Open **Outreach** | Table of sent messages: Subject, Status. Demo: "Introduction from Meridian Ventures" (Sent) | ☐ |
| V-61 | Click **New outreach**, choose a startup you are not connected with, add subject and body, send | Appears in the list with status **Sent** | ☐ |
| V-62 | Try to send with an empty subject/body | Validation error | ☐ |
| V-62b | As **STAFF**, try to send outreach | Not permitted | ☐ |
| V-63 | Sign in as the receiving founder | Can see the outreach (where the app shows it) with the firm's identity | ☐ |
| V-64 | New firm with no outreach | "No outreach sent" empty state | ☐ |

### 7.7 Investments

| ID | Steps | Expected | Result |
|---|---|---|---|
| V-70 | Open **Investments** | Table: company, round, amount, equity, status, date. Demo: Ledgerly, Shiprack (active), ClinicOS (exited). Header shows Capital deployed ₹8.5 Cr (**active positions only** — the exited ClinicOS ₹80 L is in the table but not in this total), Active holdings 2, Exits 1 | ☐ |
| V-71 | Record a new investment: pick a startup, amount, currency, round, equity %, date, status, notes | Saved; totals update on this page, the Dashboard and Insights | ☐ |
| V-72 | Enter equity above 100% or a negative / zero amount | Rejected | ☐ |
| V-73 | Record in **USD** | Totals are shown **per currency** (not summed with rupees) | ☐ |
| V-74 | Edit an investment (change status to **Exited**) | Capital deployed and Active holdings **drop**; sector exposure updates | ☐ |
| V-75 | Remove an investment | Confirmation; after confirming, totals update | ☐ |
| V-76 | Page through / sort if more than one page exists | Counts stay consistent | ☐ |
| V-77 | As **STAFF**, try to add/edit/remove | Not permitted | ☐ |
| V-78 | Round labels in the table and filters | Human-readable ("Series A", "Pre-seed"), never raw `SERIES_A` | ☐ |

### 7.8 Commitments (your pledges)

| ID | Steps | Expected | Result |
|---|---|---|---|
| V-80 | Open **Commitments** | What your firm has pledged across open rounds: Company, Round, Round target, Pledged, status, Likely to fund. Demo: Ledgerly Series A — ₹6 Cr, Committed | ☐ |
| V-81 | Change a pledge's status or amount | Saved; the founder's round view reflects it | ☐ |
| V-82 | **Withdraw** a pledge | "Withdraw this commitment?" confirmation; after confirming it leaves the live list and the round's totals fall | ☐ |
| V-83 | After a round is **closed**, use **Record as investment** | Asks for the investment date ("The day the round closed"); creates an investment visible in Investments | ☐ |
| V-84 | Try to record the same commitment twice | Refused | ☐ |

### 7.9 Conflict Sentinel

| ID | Steps | Expected | Result |
|---|---|---|---|
| V-90 | Open **Conflict Sentinel** | Left: searchable list of opportunities; right: "Pick an opportunity" placeholder | ☐ |
| V-91 | Search "Poc" | List narrows to Pocketly | ☐ |
| V-92 | Select a deal and run the check | A report compares the candidate against **every portfolio company** for sector, customer and competing-product overlap, with explanations | ☐ |
| V-93 | Select a Fintech candidate | Flags overlap with Ledgerly (also Fintech) | ☐ |
| V-94 | Select a company in a sector you hold nothing in | Low or no conflict | ☐ |
| V-95 | New firm with no investments | "No investments recorded" message | ☐ |

### 7.10 Portfolio Pulse

| ID | Steps | Expected | Result |
|---|---|---|---|
| V-100 | Open **Portfolio Pulse** | A digest of portfolio status with alerts, or "No digests yet" with a **Generate** button | ☐ |
| V-101 | Click **Generate now** | A digest appears. Round names read **"Series A"**, not `SERIES A` | ☐ |
| V-102 | Read the alerts | Each alert has the right icon: **Info** alerts show an info "i", **warnings** show a warning triangle — not the same icon for both | ☐ |
| V-103 | Read the news/signal items | **No item is repeated**; the "opened a Series A round" news does not appear twice (once as an alert and once as news) | ☐ |
| V-104 | Check any sector percentages mentioned | They agree with the Dashboard and Investments pages | ☐ |
| V-105 | Click **Generate now** again the same day | The button is disabled while running; afterwards there is still **one digest for today** (it is refreshed, not duplicated) | ☐ |
| V-106 | Open an older digest from the list (if any) | Opens correctly | ☐ |

### 7.11 Compare

| ID | Steps | Expected | Result |
|---|---|---|---|
| V-110 | In **Discover Startups**, select two or more startups to compare, press **Compare** | Side-by-side table (sector, stage, revenue, team size, whether raising …) | ☐ |
| V-111 | Open **Compare** with nothing selected | "Nothing selected — pick two or more startups in Discover" | ☐ |
| V-112 | Select only one startup | Prompt to pick at least two | ☐ |

---

## 8. Startup side

Sign in as **`founder@…`** (Ledgerly) unless stated.

### 8.1 Dashboard

| ID | Steps | Expected | Result |
|---|---|---|---|
| F-01 | Open **Dashboard** | Cards: Current round, Total committed, Investors, Rounds run; "Your round, your investors, and who's looking at your profile." | ☐ |
| F-02 | Compare "Total committed" and "Investors" with the Funding page | Same figures | ☐ |
| F-03 | A founder with no round (use a new startup) | A friendly empty state with a prompt to open a round | ☐ |

### 8.2 Insights (founder)

| ID | Steps | Expected | Result |
|---|---|---|---|
| F-10 | Open **Insights** | Capital raised **₹6 Cr**; Committed investors **1** — **signed money only** (indicated and soft pledges are not counted) | ☐ |
| F-11 | Read the funnel | Profile views → Wishlisted → Connection requests (**1**) → Accepted (**1**) → Investor pledges (**3**) | ☐ |
| F-12 | Look between "Accepted" and "Investor pledges" | **No percentage above 100%** — a step that is bigger than the one above shows no "% continue" text | ☐ |
| F-13 | Compare Connection requests / Active conversations with the VC side | Founder shows 1 / 1 and so does Meridian — the two sides agree | ☐ |
| F-14 | Read the "Backers by investor focus" card | Groups backers by each investor's focus sector; empty text appears until a commitment is **signed** | ☐ |
| F-15 | Read the round chart ("How the round filled") | Signed money at the bottom, conversations stacked on top; the last point matches the round's current total | ☐ |
| F-16 | A brand-new founder with no activity | Funnel card says **"No activity yet…"** instead of being blank | ☐ |

### 8.3 Funding rounds

| ID | Steps | Expected | Result |
|---|---|---|---|
| F-20 | Open **Funding Rounds** | List of rounds: Series A (open, target ₹25 Cr) and Seed (closed). Investor table with Amount, Committed, Likely to land | ☐ |
| F-21 | Click **Open round** | Form: round type, target amount, currency, min/max ticket, pitch deck URL, data room URL. Note: "Investors browsing Deal Flow will see this while it's open." | ☐ |
| F-22 | Submit with min ticket greater than max ticket | Rejected | ☐ |
| F-23 | Submit with a zero/negative target | Rejected | ☐ |
| F-24 | Open a second round while one is already open | Allowed or refused with a clear message (record which) | ☐ |
| F-25 | Open a valid round | It appears in the list and in **Deal Flow** for VCs | ☐ |
| F-26 | Edit the round (target, tickets) | Saved | ☐ |
| F-27 | **Pause / close** the round | Disappears from VC Deal Flow when closed | ☐ |
| F-28 | As a **VC** user, try to open a round (call the page or API) | Refused — only founders / co-founders open rounds | ☐ |

### 8.4 Round detail (`/rounds/…`)

| ID | Steps | Expected | Result |
|---|---|---|---|
| F-30 | Open the open Series A as the **founder** | Pledged of target **₹12.5 Cr of ₹25 Cr**; Committed ₹6 Cr; Likely to land; Investors list with each firm, amount and status; Ticket band; Documents; History | ☐ |
| F-31 | Open the same round as **Meridian (owner)** | Sees **its own** pledge and the round's aggregate — **not** Kestrel's or Bay Harbour's individual amounts | ☐ |
| F-32 | Open the same round as **Kestrel** (if you can sign in as that firm's user) | Sees Kestrel's own pledge only | ☐ |
| F-33 | A VC with **no** pledge opens the round | "Not pledged yet — Pledge from Deal Flow to put your firm on this round." | ☐ |
| F-34 | Check the progress bar and labels | Text and bar agree with the numbers; no overflow on mobile | ☐ |
| F-35 | Open `/rounds/` with a made-up id | A clear "not found" state | ☐ |

### 8.5 Investor discovery

Covered in section 9.1 (Discover Investors).

---

## 9. Shared features

### 9.1 Discover (startups for VCs, investors for founders)

| ID | Steps | Expected | Result |
|---|---|---|---|
| D-01 | As VC, open **Discover Startups** | Cards for the platform's startups (Ledgerly, Shiprack, ClinicOS, Vaultline) with sector, stage and an **actively raising** badge where relevant | ☐ |
| D-02 | As founder, open **Discover Investors** | Cards for firms (Meridian, Kestrel, Bay Harbour) | ☐ |
| D-03 | Search by name | Results narrow; "No startups found / No firms found — try a different search term" when nothing matches | ☐ |
| D-04 | Filter by sector, by stage, and "raising" | Filters combine; clearing restores the list | ☐ |
| D-05 | Click the **heart** on a card | Heart fills; the item appears in Wishlist; the heart has an accessible name and state | ☐ |
| D-06 | Click the heart again | Removed from Wishlist | ☐ |
| D-07 | Open a card | Profile page opens (section 9.2) | ☐ |
| D-08 | As VC, tick two or more startups for comparison | **Compare** becomes available | ☐ |
| D-09 | Check that your **own** organisation is not offered to you as a match | It is not listed (or is clearly marked) | ☐ |

### 9.2 Profile pages (`/startups/…`, `/firms/…`)

| ID | Steps | Expected | Result |
|---|---|---|---|
| D-10 | Open a startup profile | "At a glance": Sector, Stage, Team size, Location, Founded, Annual revenue; "Actively raising" if so; Materials (website, pitch deck) | ☐ |
| D-11 | Open a firm profile | Assets under management, Founded, Investment stage, sectors, location, website | ☐ |
| D-12 | Click the website / pitch deck links | Open in a new tab. A link whose URL is not `http(s)` is **not** clickable | ☐ |
| D-13 | A profile that fails to load (backend off) | Error with retry — not an empty profile | ☐ |
| D-14 | Visiting a profile counts as a **profile view** | The other side's Insights "Profile views" increases | ☐ |

### 9.3 Mutual-consent messaging

The rule: **no chat exists until both sides agree.** A connection request is sent first; when it is
accepted a conversation opens.

| ID | Steps | Expected | Result |
|---|---|---|---|
| M-01 | As founder (`founder@…`) open **Messages** | The conversation with **Meridian Ventures** and its history. The header shows the organisation name — **not** "Founder" or "Owner" | ☐ |
| M-02 | Open Messages as `owner@…` | The same conversation, titled with the startup name (**Ledgerly**), no duplicated name line | ☐ |
| M-03 | Send a message as the owner | Appears for the owner immediately; refresh as the founder and it is there | ☐ |
| M-04 | Open the thread as the other person | Messages are marked read; the unread indicator clears | ☐ |
| M-05 | Press **Send** with an empty box | Nothing sent / button disabled | ☐ |
| M-06 | Send a very long message | Wrapped correctly, no layout break | ☐ |
| M-07 | In a private window register a **new startup account** (A-series), finish setup, open **Discover Investors** → Meridian → **Connect** with an intro message | Request sent; Connect button changes to a "pending" state | ☐ |
| M-07b | As `cofounder@…` (Ledgerly) open **Discover Investors** → Meridian → **Connect** | **Refused — already connected**: Ledgerly already has an accepted connection with Meridian through `founder@…`, and connections are checked per organisation, not per person | ☐ |
| M-08 | Sign in as `owner@…` (requests addressed to a firm go to its **Owner**) | The request shows in Messages as a pending request | ☐ |
| M-09 | Before accepting, try to message the founder | **No chat is possible** — the screen says chat unlocks only after both sides accept | ☐ |
| M-10 | **Accept** the request | A conversation opens for both people; both can message | ☐ |
| M-11 | Repeat with another request and **Decline** it | No conversation is created; the requester can see it was declined | ☐ |
| M-12 | As `founder@…` (already connected to Meridian) try to **Connect** to Meridian again | Refused with: "You're already connected with Meridian Ventures — open Messages…" | ☐ |
| M-13 | As **another person at Ledgerly** try to connect to Meridian while a request or chat already exists between the two organisations | Refused: connections are between **organisations**, not just individuals | ☐ |
| M-14 | While a request is pending, try to send a second one | Refused: "A request between you and … is already waiting for a reply." | ☐ |
| M-15 | After a request is accepted, check **Insights** on both sides | Both sides show the same request and accepted counts (1 / 1) | ☐ |
| M-16 | Check both sides' conversation titles | Each side sees the **other organisation's name** (Ledgerly ⇄ Meridian Ventures) | ☐ |
| M-17 | Open Messages with nothing connected (new account) | "No conversations yet" with an explanation of the consent rule | ☐ |

### 9.4 Wishlist

| ID | Steps | Expected | Result |
|---|---|---|---|
| W-01 | Open **Wishlist** | Saved profiles; "Only you can see this list." Empty state "Nothing saved yet — tap the heart on any profile in Discover" | ☐ |
| W-02 | Save a profile from Discover, open Wishlist | Appears | ☐ |
| W-03 | Remove an item | Disappears; its heart in Discover is empty again | ☐ |
| W-04 | Sign in as someone else | They do **not** see your wishlist | ☐ |
| W-05 | The saved party's Insights ("Wishlisted by") | Increases by one | ☐ |

### 9.5 Events

Event dates in the demo data are relative to when it was seeded — create fresh ones for these tests.

| ID | Steps | Expected | Result |
|---|---|---|---|
| E-01 | Open **Events** | List of upcoming and past events with type, date (**including the year**), host and attendee count | ☐ |
| E-02 | **Host an event**: title, description, type (demo day / networking / office hours / webinar), start, end, location **or** virtual link, public / private | Created; appears in the list | ☐ |
| E-03 | Create an event with a start time **in the past** | Rejected: "An event can't start in the past…" | ☐ |
| E-04 | Create an event whose end is before its start | Rejected | ☐ |
| E-05 | Create an event with start = a minute from now | Accepted (a few minutes of grace) | ☐ |
| E-06 | RSVP as another user: Going / Maybe / Not going | Status saved; attendee count updates | ☐ |
| E-07 | Change the RSVP | Updated, not duplicated | ☐ |
| E-08 | A **private** event from another account | Not visible to people who are not invited/attending | ☐ |
| E-09 | As the **host**, look at an event | A **Delete event** button is available | ☐ |
| E-10 | Click Delete event | "Delete this event?" confirmation; confirm → event and its RSVPs are gone | ☐ |
| E-11 | As a **non-host**, look at the same event | **No** delete button | ☐ |
| E-12 | Delete a **past** event as its host | Works (a past event can be removed) | ☐ |
| E-13 | A past event in the list | Shows the year; labelled as past | ☐ |

### 9.6 Signals

| ID | Steps | Expected | Result |
|---|---|---|---|
| G-01 | Open **Signals** (both sides) | News items about tracked companies and firms: headline, type (Funding / Hiring / Product / Regulatory / Market), sentiment, date | ☐ |
| G-02 | Click a source link | Opens in a new tab (safe URLs only) | ☐ |
| G-03 | Filter by type, if offered | List narrows | ☐ |
| G-04 | New firm with an empty pool and portfolio | "No signals yet — signals are aggregated in the background…" | ☐ |

### 9.7 AI Suggestions

| ID | Steps | Expected | Result |
|---|---|---|---|
| G-10 | Open **AI Suggestions** | Matches with a score and a written reason | ☐ |
| G-11 | Read the reasons | Specific to your profile (sector, stage, cheque size) — not placeholder text | ☐ |
| G-12 | **Regenerate** | A fresh pass is queued; the list refreshes | ☐ |
| G-13 | **Dismiss** a suggestion | It leaves the list and does not return on refresh | ☐ |
| G-14 | Act on a suggestion (open/connect) | Navigates to the right profile | ☐ |
| G-15 | Empty state | "No suggestions right now" with the regenerate hint | ☐ |

---

## 10. Settings, team and plans

### 10.1 Profile settings

| ID | Steps | Expected | Result |
|---|---|---|---|
| T-01 | As VC owner open **Settings** | About (firm details), Thesis (sectors, stages, min/max cheque, notes), Team, Plan | ☐ |
| T-02 | Edit the firm's details and save | Saved; the profile page and Discover show the new values | ☐ |
| T-03 | Edit the **thesis** — change sectors and cheque range | Saved; **Deal Triage scores** and **AI Suggestions** reflect the new thesis on the next scoring | ☐ |
| T-04 | Invalid website / empty name | Rejected with field errors | ☐ |
| T-05 | As a founder open **Settings** | Startup details editable: what you do, sector, stage, team size, website, pitch deck URL, location | ☐ |
| T-06 | As **PM** or **STAFF** try to change firm details | Not permitted (only the Owner changes firm details) | ☐ |

### 10.2 Team and seats

Seat limits by plan: **Free 1**, **Starter 5**, **Growth unlimited**. Meridian is on Starter with 3
people.

| ID | Steps | Expected | Result |
|---|---|---|---|
| T-10 | As `owner@…`, open **Settings → Team** | Lists three members with roles | ☐ |
| T-11 | Invite a teammate by email with a role (the OWNER role is not offered) | The person must already be registered as a **VC** user; added to the list | ☐ |
| T-12 | Invite an email that is not registered | Clear message that the person must sign up first | ☐ |
| T-13 | Invite a user who registered as a **startup** founder | Rejected (must be a VC user) | ☐ |
| T-14 | Invite someone already in the firm | Rejected | ☐ |
| T-15 | Fill the firm up to **5** members, then add a 6th | Refused: the **Starter plan includes 5 seats and they are all taken** | ☐ |
| T-16 | On a **Free** firm (Kestrel / Bay Harbour, or a new firm) add a second member | Refused: the Free plan includes **1 seat** | ☐ |
| T-17 | Switch to a smaller plan than the number of people on the team | Refused with a message telling you to remove people first | ☐ |
| T-18 | Change a member's role | Saved; a second OWNER is refused | ☐ |
| T-19 | Remove a member | "Remove from team?" confirmation; they lose access to the firm | ☐ |
| T-20 | As **PM / STAFF** try to invite or remove | Not permitted | ☐ |
| T-21 | A removed member signs in | Treated as having no firm (sent to onboarding), sees none of the firm's data | ☐ |

### 10.3 Plans

| ID | Steps | Expected | Result |
|---|---|---|---|
| T-30 | Open the plans section | Free (₹0, 1 seat, 10 scored opportunities/month, up to 15 portfolio companies), Starter (₹24,000/month, 5 seats, 150 scored opportunities, unlimited portfolio companies, Conflict Sentinel with citations, weekly Pulse), Growth (unlimited seats) | ☐ |
| T-31 | Note the banner at the top of the Plan tab | An info banner reads **"Billing isn't live yet"** and says no payment is taken and switching plans only changes the seat limit | ☐ |

---

## 11. End-to-end journeys

Each journey crosses roles. Use two windows (normal + private). Do them in order the first time.

### Journey 1 — A founder raises, a VC pledges, the round closes

| Step | Who | Action | Expected |
|---|---|---|---|
| 1 | New founder | Register → Startup Founder → set up startup "Acme Pay" (Fintech, Seed) | Dashboard opens; empty round state |
| 2 | Founder | **Funding Rounds → Open round**: Seed, target ₹5 Cr, tickets ₹25 L – ₹1 Cr | Round listed as open |
| 3 | `owner@…` | **Deal Flow** | Acme Pay's round is listed |
| 4 | `owner@…` | Open the round, pledge ₹50 L as **Indicated** | Pledge recorded |
| 5 | Founder | Open the round | Meridian listed with ₹50 L, Indicated; pledged total ₹50 L; **Capital raised still ₹0** (nothing signed) |
| 6 | `owner@…` | **Commitments** → raise it to **Committed** | Status updated |
| 7 | Founder | Insights | **Capital raised ₹50 L**, **Committed investors 1** |
| 8 | Founder | Close the round | Round no longer in VC Deal Flow |
| 9 | `owner@…` | **Commitments → Record as investment**, enter the close date | Investment appears in **Investments**; Capital deployed and sector exposure rise |
| 10 | `owner@…` | Dashboard / Insights | New totals consistent everywhere (section 13) |

### Journey 2 — Connecting and chatting under mutual consent

| Step | Who | Action | Expected |
|---|---|---|---|
| 0 | Setup | In a private window register a **new VC account** and finish firm setup (this firm has no existing connection to Ledgerly) | New firm is ready |
| 1 | `cofounder@…` | Discover Investors → the new firm → **Connect** with a short intro | Request pending |
| 2 | New VC user | Messages | Pending request visible; **cannot** chat yet |
| 3 | New VC user | **Accept** | Conversation opens for both |
| 4 | Both | Exchange messages | Delivered, read state updates |
| 5 | `founder@…` | Try to **Connect** to the same new firm | Refused — already connected (Ledgerly is one organisation, so `cofounder@…`'s connection counts for `founder@…` too) |
| 6 | Both | Insights | New firm: 1 request, 1 accepted. Ledgerly: 2 requests, 2 accepted (this one plus the Meridian one) |

### Journey 3 — From discovery to decision (VC deal pipeline)

| Step | Who | Action | Expected |
|---|---|---|---|
| 1 | `owner@…` | Discover Startups → heart **Vaultline** | In Wishlist |
| 2 | `owner@…` | Add Vaultline to the **Pool** as High priority with tags | Visible in Pool |
| 3 | `owner@…` | **Deal Triage → New opportunity** for a Fintech company | Scored automatically, with specific reasons |
| 4 | `owner@…` | Open it → **Conflict Sentinel** | Report lists overlaps with Ledgerly (Fintech) |
| 5 | `owner@…` | Approve with a note | Status Approved |
| 6 | `owner@…` | **Outreach → New outreach** to the company | Listed as Sent |
| 7 | `owner@…` | **Portfolio Pulse → Generate now** | Digest includes the new activity; one digest for today |

### Journey 4 — Team growth and seat limits

| Step | Who | Action | Expected |
|---|---|---|---|
| 1 | Two new VC accounts | Register both as VC (they need no firm) | Accounts exist |
| 2 | `owner@…` | Invite the first | Added (4 of 5 seats) |
| 3 | `owner@…` | Invite the second | Added (5 of 5) |
| 4 | `owner@…` | Invite a sixth | **Refused — seats full** |
| 5 | `owner@…` | Remove one member, invite again | Works |
| 6 | New member | Sign in | Sees Meridian's data according to their role |

### Journey 5 — Events

| Step | Who | Action | Expected |
|---|---|---|---|
| 1 | `owner@…` | Host a **public** demo day next week | Listed |
| 2 | `founder@…` | RSVP **Going** | Attendee count 1 |
| 3 | `owner@…` | Try to create an event yesterday | Rejected (past) |
| 4 | `founder@…` | Look for a delete option on the owner's event | **None** |
| 5 | `owner@…` | Delete the event | Gone for both |

---

## 12. Permissions matrix

Verify by signing in as each role and trying the action. "Not allowed" means the control is hidden
**or** the action is refused with a clear message — never a silent failure or a crash screen.

### VC roles

| Action | OWNER | PORTFOLIO_MANAGER | STAFF |
|---|---|---|---|
| View Dashboard, Insights, Pool, Deal Flow, Signals | ✅ | ✅ | ✅ |
| Add / edit / remove **investments** | ✅ | ✅ | ❌ |
| Commit to a round / change or withdraw a pledge | ✅ | ✅ | ❌ |
| Record a closed round's commitment as an investment | ✅ | ✅ | ❌ |
| **Create** an opportunity (Deal Triage → New opportunity) | ✅ | ✅ | ✅ |
| Approve / reject opportunities | ✅ | ✅ | ❌ |
| Add / edit / remove **Pool** entries | ✅ | ✅ | ✅ |
| Send **outreach** | ✅ | ✅ | ❌ |
| Edit firm details and thesis | ✅ | ❌ | ❌ |
| Invite / remove team members, change roles | ✅ | ❌ | ❌ |
| Change plan | ✅ | ❌ | ❌ |

> These cells reflect how the backend enforces roles (`FirmAccessPolicy`: investment-type actions
> need OWNER or PORTFOLIO_MANAGER; team, firm details and plan need OWNER). If a cell does not match
> what you see, note the observed behaviour and raise it. Staff should be able to **read** every
> VC page.

### Startup roles

| Action | FOUNDER | CO_FOUNDER |
|---|---|---|
| Edit startup profile | ✅ | ✅ |
| Open / edit / close funding rounds | ✅ | ✅ |
| Host events, RSVP, message, wishlist | ✅ | ✅ |
| Invite / remove startup teammates (Settings → "Invite a teammate") | ✅ | verify and record |

### Cross-side boundaries

| Check | Expected | Result |
|---|---|---|
| A **founder** opens VC-only pages by URL (`/investments`, `/pool`, `/deal-triage`, `/commitments`, `/outreach`, `/conflict-sentinel`, `/pulse`, `/deal-flow`) | Not usable | ☐ |
| A **VC** opens `/funding` | Not usable | ☐ |
| One firm opens another firm's data by guessing ids (pool entries, investments, opportunities) | Not found / refused — **never the other firm's data** | ☐ |
| One firm sees another firm's commitment amounts on a shared round | **No** — only its own pledge and the aggregate | ☐ |
| A founder sees an investor's pool, notes or tags | **No** | ☐ |
| Signed out, call a protected page | Sent to the landing page | ☐ |

---

## 13. Cross-page consistency checks

The same number must read the same everywhere. Check these after the demo data is loaded, and again
after every journey that changes money.

| ID | Check | Expected | Result |
|---|---|---|---|
| X-01 | VC **Capital deployed** on Dashboard vs Investments vs Insights | Identical (₹8.5 Cr in the demo) | ☐ |
| X-02 | **Active holdings** on Dashboard vs Investments vs Insights "Companies" | Identical (2) | ☐ |
| X-03 | Insights funnel **Investments made** vs the "cheques" count on the page | Identical — exited positions excluded from both | ☐ |
| X-04 | Sector exposure % on Dashboard, Insights and Portfolio Pulse | Same percentages (e.g. Fintech and Logistics), computed from **active** holdings only | ☐ |
| X-05 | Founder **Capital raised** vs the round's "Committed" figure | Identical; indicated/soft pledges are in "pledged", not "raised" | ☐ |
| X-06 | Founder "Investors" on Dashboard vs round detail vs Insights "Committed investors" | Consistent with the definitions (all pledgers vs signed backers) — read the labels | ☐ |
| X-07 | Round "Pledged" vs the sum of the investor rows | Equal | ☐ |
| X-08 | Connection requests / Accepted / Active conversations on **both** sides | Equal on both sides | ☐ |
| X-09 | **Awaiting triage** on Dashboard vs the number of Pending rows in Deal Triage | Equal | ☐ |
| X-10 | **Tracked in pool** vs rows in Pool | Equal | ☐ |
| X-11 | Names of people in Messages | Always a real name or an organisation name — never the generic words "Founder" / "Owner" | ☐ |
| X-12 | Money formatting everywhere | Indian grouping and units (₹6 Cr, ₹80 L), per-currency totals when mixed | ☐ |
| X-13 | Dates | Always include the year; shown consistently | ☐ |
| X-14 | Round and stage names | "Series A", "Pre-seed", "Seed" — never `SERIES_A` or `PRE_SEED` | ☐ |

---

## 14. Validation, errors and edge cases

### Forms and input

| ID | Try | Expected | Result |
|---|---|---|---|
| I-01 | Submit every form empty | Field-level messages; nothing saved | ☐ |
| I-02 | Fields at their maximum length, then one over | Over-length is rejected; the maximum is accepted | ☐ |
| I-03 | Leading/trailing spaces in names and emails | Trimmed or rejected sensibly | ☐ |
| I-04 | Special characters and emoji in text (`<script>`, `"quotes"`, `é`, `😀`) | Stored and shown **as text** — nothing executes, nothing breaks | ☐ |
| I-05 | A website value of `javascript:alert(1)` anywhere | Rejected, or shown but **not** a clickable link | ☐ |
| I-06 | Negative, zero, decimal and very large amounts | Rejected or handled with a clear message | ☐ |
| I-07 | Double-click Save quickly | Only one record is created | ☐ |
| I-08 | Pasting very long text into notes | No layout break | ☐ |
| I-09a | Set **Founded year** to next year or 2099 on a firm and on a startup profile | Refused: "Founded year can't be in the future"; 1800 is also refused (too early); the current year is accepted | ☐ |
| I-09b | Record an investment with equity **0%** | Refused: "Equity must be more than 0%"; leaving equity blank is fine | ☐ |
| I-09c | Host an event with **no location and no link** | Refused: add a location, a link, or both | ☐ |
| I-09d | Open a round with a **maximum ticket larger than the target** (e.g. ₹10 Cr maximum on a ₹5 Cr target) | Refused: the maximum ticket can't be larger than the round's target | ☐ |
| I-09e | Record the **same investment twice** (same company, date, amount and round), including two quick API submissions | The second is refused as "already recorded"; only one record exists. A follow-on with a different date or amount is allowed | ☐ |
| I-09f | Press **Generate now** several times quickly on Portfolio Pulse | No error toast; one digest for the day, refreshed | ☐ |

### Failure handling

| ID | Try | Expected | Result |
|---|---|---|---|
| I-10 | Stop the backend while on a page and use it | A readable error with a **Retry**; no infinite spinner | ☐ |
| I-11 | Restart the backend, press Retry | Page recovers without a full reload | ☐ |
| I-12 | Let a session sit until it expires (or sign out in another tab), then act | Sent to sign in; pages you visited earlier no longer show the previous account's data | ☐ |
| I-13 | Open the same record in two tabs, delete it in one, act in the other | A clear "not found", not a crash | ☐ |
| I-14 | Slow network (browser dev tools → throttling) | Loading skeletons show; buttons disable while saving | ☐ |
| I-15 | A page's data comes back empty | A helpful empty state, never a blank area | ☐ |

### Concurrency and rules

| ID | Try | Expected | Result |
|---|---|---|---|
| I-20 | Two people send a connection request to each other at once | Only one live request exists | ☐ |
| I-21 | Click **Generate now** repeatedly | One digest for the day | ☐ |
| I-22 | Two people edit the same pool entry | Last save wins, no crash | ☐ |
| I-23 | Withdraw a pledge, then pledge again | Allowed; totals correct | ☐ |

---

## 15. Responsive, accessibility and dark mode

Repeat a sample of pages (Dashboard, Insights, Deal Triage, Round detail, Messages, Settings) in each
mode below.

| ID | Check | Expected | Result |
|---|---|---|---|
| R-01 | Width **375 px** (phone) | No horizontal page scroll; tables scroll inside their card; nothing cut off | ☐ |
| R-02 | Width **768 px** (tablet) | Layout adapts; charts resize | ☐ |
| R-03 | Width **1440 px** (desktop) | Sidebar visible; content not stretched awkwardly | ☐ |
| R-04 | Tap targets on a phone | Buttons and hearts large enough to hit (about 44 px) | ☐ |
| R-05 | **Dark mode** on every page | Text readable, charts legible, no white flashes | ☐ |
| R-06 | **Keyboard only**: Tab through a page, open a modal, close with Esc | Focus visible, trapped inside modals, returns where it started | ☐ |
| R-07 | Tabs component: arrow keys, Home, End | Moves between tabs | ☐ |
| R-08 | Deal Triage rows by keyboard | The company name is a focusable link | ☐ |
| R-09 | Screen reader (VoiceOver / NVDA) on the sidebar, a form and a table | Controls have names; errors are announced | ☐ |
| R-10 | Browser zoom 200% | Still usable | ☐ |
| R-11 | "Reduce motion" enabled in the OS | Animations (funnel, skeleton) are reduced or off | ☐ |
| R-12 | Print preview of Dashboard (optional) | Not broken | ☐ |

---

## 16. Looking at the database

Useful for checking that what the UI shows is what is stored.

**Adminer** (browser database tool): http://localhost:8089

| Field | Value |
|---|---|
| System | PostgreSQL |
| Server | `dashboard-postgres-1` |
| Username / Password | `postgres` / `postgres` |
| Database | `dashboard_api` |

Or from a terminal:

```bash
docker exec -it dashboard-postgres-1 psql -U postgres -d dashboard_api
```

| Check | Query | Expected |
|---|---|---|
| People and roles | `select u.email, m.role from users u join vc_firm_members m on m.user_id = u.id;` | Matches the Team list |
| Investments | `select s.name, i.amount, i.status from investments i join startups s on s.id = i.startup_id;` | Matches the Investments page |
| Commitments | `select fc.amount, fc.status from funding_commitments fc;` | Matches the round detail |
| One digest per day | `select vc_firm_id, period_end, count(*) from digests group by 1,2 having count(*) > 1;` | **No rows** |
| Consent rule | `select status, count(*) from connection_requests group by 1;` and conversations only for ACCEPTED requests | No conversation without an accepted request |
| Deleted event | `select count(*) from events where title = '…';` after deleting | 0 |

Changing a row in the database changes what the app shows after a refresh — that is expected, and a
quick way to prove the page reads live data. Avoid editing rows by hand during formal testing; it
makes results hard to reproduce.

---

## 17. Known limitations — not bugs

Do not raise these unless the behaviour differs from what is written here.

| Area | Status |
|---|---|
| **Google / LinkedIn sign-in** | Implemented but not tested against the real providers in this environment (needs client IDs and secrets). The demo accounts use email and password. |
| **Billing / plans** | Prices are shown but no payment is taken; plans are not live. Switching plan exists to exercise seat limits. |
| **AI features** (scoring, suggestions, digests, conflict reports) | Rule-based in this build; they use your thesis and data but do not call an external model. Wording is deterministic. |
| **Signals** | Seeded sample items; there is no live news feed. |
| **Email notifications** | Not sent. |
| **Kafka / background workers** | Not used yet; "asynchronous" generation is simulated in-process. |
| **Founder "Backers by investor focus"** | Groups each investor by the **first** sector in its list, so Meridian appears under its first-listed sector. |
| **Digest "Generate now"** | A second press on the same day **refreshes** the digest; it does not show an error. |
| **Event dates in demo data** | Relative to the seeding date, so older demo events become past events. |
| **Single organisation per user** | A user belongs to one firm or one startup. |

---

## 18. Bug report template and sign-off

### Bug report template

Copy this for each failure.

```
Title:        [Area] short description          (e.g. "[Events] Past event accepted")
Test ID:      e.g. E-03
Severity:     S1 / S2 / S3 / S4
Account:      e.g. owner@demo.dashboard.test (VC / OWNER)
Browser:      e.g. Chrome 130 on macOS, window width 1440
Page / URL:   e.g. http://localhost:3002/events

Steps:
  1.
  2.
  3.

Expected:
Actual:

Console errors / screenshot / network response (F12 → Network → the failing request):

Reproducible?  Always / Sometimes / Once
Data state:    fresh demo data / after Journey 1 / other
```

### Sign-off sheet

| Section | Tester | Date | Passed | Failed | Skipped | Notes |
|---|---|---|---|---|---|---|
| 4 Smoke | | | | | | |
| 5 Authentication and onboarding | | | | | | |
| 6 App shell | | | | | | |
| 7 VC side | | | | | | |
| 8 Startup side | | | | | | |
| 9 Shared features | | | | | | |
| 10 Settings, team and plans | | | | | | |
| 11 End-to-end journeys | | | | | | |
| 12 Permissions matrix | | | | | | |
| 13 Consistency checks | | | | | | |
| 14 Validation and errors | | | | | | |
| 15 Responsive and accessibility | | | | | | |

**Release recommendation** (tick one):

- ☐ Ready — no S1/S2 open
- ☐ Ready with known issues — only S3/S4 open, listed above
- ☐ Not ready — S1 or S2 open

Tester name: ____________________   Date: ______________   Build / commit: ______________
