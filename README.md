# ⚡ ChargeNear: Rent Idle EV Chargers

> PromptWars × KickToTech 2026 · Track: **Entrepreneurship & Local Business** · Individual entry

**Live Demo:** https://github.com/sarthmokashe/chargenear-promptwars-2026

---

## Problem

India's EV adoption is growing faster than public charging infrastructure. Thousands of home, shop and café chargers sit **idle 20+ hours a day**, while EV drivers struggle to find a nearby available charger.

## Solution

A web app where **local owners list their idle EV charger for hourly rent**, and **EV drivers find nearby chargers and book a time slot**.

| User | Need |
|---|---|
| EV Driver | Find a compatible charger nearby and book a slot |
| Host (home, shop, society) | List a charger and estimate monthly earnings |

---

## Features Built

| # | Feature | Status |
|---|---|---|
| 1 | Find chargers — cards with connector, kW, ₹/hr, hours, distance | ✅ Working |
| 2 | Filter by connector type, max price; sort nearest / cheapest; Reset | ✅ Working |
| 3 | Book a slot — date, start hour, duration (1–4 h), live total price | ✅ Working |
| 4 | Double-booking block — overlap rule + clear error message | ✅ Working |
| 5 | Host a charger — validated form; new charger appears in Find | ✅ Working |
| 6 | Earnings estimator — live gross, 10 % fee, net, utilization slider | ✅ Working |
| 7 | My Bookings — list and cancel; cancelling frees the slot | ✅ Working |
| 8 | Persistence — localStorage with seed-data fallback | ✅ Working |
| 9 | "Use My Location" — geolocation on click only, silent fallback | ✅ Working |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Markup | HTML5 |
| Styling | Plain CSS (variables, flexbox/grid, mobile-first) |
| Logic | Vanilla JavaScript — no frameworks |
| Storage | `localStorage` (JSON), seeded with 50 fictional chargers |
| Hosting | GitHub Pages (static, no build step) |
| Libraries | **None.** No npm, no CDN, no external requests |

---

## File Structure

```
chargenear/
├── index.html              # single page, 4 views as <section>s
├── css/
│   └── styles.css          # neumorphic light theme, responsive
├── js/
│   ├── data.js             # 50 fictional seed chargers
│   ├── storage.js          # safe localStorage helpers (try/catch)
│   ├── logic.js            # pure functions: haversine, overlap, earnings, validate
│   ├── ui.js               # DOM rendering (textContent only — XSS-safe)
│   └── app.js              # event wiring, state, view switching
├── tests/
│   └── logic.test.html     # 25 in-browser unit tests — all pass
├── assets/
│   ├── logo-icon.png
│   └── chargers/           # 20 local EV/charger images
├── screenshots/            # add screenshots here before submitting
├── .nojekyll               # GitHub Pages: disable Jekyll processing
├── .gitignore
└── README.md
```

---

## Run Locally

```bash
# Option 1 — open directly in browser
open index.html

# Option 2 — serve (avoids file:// quirks on some browsers)
python -m http.server 5500
# then visit http://localhost:5500
```

No build step, no npm install, no environment variables needed.

---

## Data Model

### Charger
```js
{
  id: "c1",
  name: "Kothrud Society Charger",
  hostName: "Priya S. (sample)",    // always fictional
  area: "Kothrud, Pune",
  lat: 18.5074, lng: 73.8077,       // approximate seed coords
  connector: "Type 2",              // "CCS2" | "Type 2" | "Bharat AC-001" | "3-pin (slow)"
  powerKw: 7.4,
  pricePerHour: 80,                 // INR integer
  availableFrom: "08:00",           // HH:MM 24h
  availableTo: "20:00",
  isUserListed: false               // true when added through Host form
}
```

### Booking
```js
{
  id: "b_1730000000000",
  chargerId: "c1",
  date: "2026-10-29",               // YYYY-MM-DD
  startHour: 10,                    // integer 0–23
  durationHours: 2,                 // integer 1–4
  totalPrice: 160,                  // pricePerHour × durationHours
  driverName: "Rahul M.",           // 2–30 chars, stored as-is
  createdAt: 1730000000000
}
```

### localStorage Keys
- `chargenear_chargers_v1` — array of Charger
- `chargenear_bookings_v1` — array of Booking
- `chargenear_userloc_v1` — `{lat,lng}` (only if user grants geolocation)

---

## Earnings Formula (Section 6.4)

```
availableHours = availableTo − availableFrom   (hours/day)
utilization    = slider 10 %–60 %, default 25 %
platformFee    = 10 %

monthlyGross = availableHours × utilization × pricePerHour × 30
monthlyNet   = monthlyGross × (1 − platformFee)
```

**Verification example:** 10 h, 25 %, ₹80/hr → gross ₹6,000 · fee ₹600 · net ₹5,400 ✅

---

## Security

| Control | Implementation |
|---|---|
| XSS prevention | All user data rendered via `textContent` / `createElement`; zero `innerHTML` with user values |
| Content Security Policy | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;` |
| Input validation | Type, range and length checks in `logic.js` before every save |
| Storage safety | Every `localStorage` call in `try/catch`; corrupt JSON falls back to seed data |
| Geolocation privacy | Requested only on button click; only `{lat,lng}` stored; error = silent fallback |
| No secrets | No API keys, tokens, `.env` or credentials anywhere |
| No external requests | Fully self-contained; no CDN, fonts, analytics or third-party scripts |

---

## Test Results

| Test | Result |
|---|---|
| `haversineKm`: identical points → ~0 km | ✅ Pass |
| `haversineKm`: Kothrud→Wagholi plausible (10–25 km) | ✅ Pass |
| `hasOverlap`: back-to-back 10–12 and 12–14 → NOT overlapping | ✅ Pass |
| `hasOverlap`: back-to-back 12–14 and 10–12 → NOT overlapping | ✅ Pass |
| `hasOverlap`: 10–12 and 11–13 → DO overlap | ✅ Pass |
| `hasOverlap`: identical 10–12 and 10–12 → DO overlap | ✅ Pass |
| `hasOverlap`: 10–14 contains 11–12 → DO overlap | ✅ Pass |
| `isWithinHours`: 10–12 within 08:00–20:00 → valid | ✅ Pass |
| `isWithinHours`: 19–21 ending after 20:00 → rejected | ✅ Pass |
| `isWithinHours`: 6–8 starting before 08:00 → rejected | ✅ Pass |
| `isWithinHours`: 8–20 exactly fills window → valid | ✅ Pass |
| `calcEarnings(10h, 25%, ₹80)` → gross ₹6,000 | ✅ Pass |
| `calcEarnings(10h, 25%, ₹80)` → fee ₹600 | ✅ Pass |
| `calcEarnings(10h, 25%, ₹80)` → net ₹5,400 | ✅ Pass |
| `calcEarnings(12h, 40%, ₹100)` → gross ₹14,400 | ✅ Pass |
| `calcEarnings(12h, 40%, ₹100)` → net ₹12,960 | ✅ Pass |
| `validateCharger`: valid data → valid | ✅ Pass |
| `validateCharger`: empty name → invalid | ✅ Pass |
| `validateCharger`: name < 3 chars → invalid | ✅ Pass |
| `validateCharger`: price 0 → invalid | ✅ Pass |
| `validateCharger`: price 9 (below ₹10 min) → invalid | ✅ Pass |
| `validateCharger`: availableTo ≤ availableFrom → invalid | ✅ Pass |
| `validateCharger`: availableTo == availableFrom → invalid | ✅ Pass |
| `validateCharger`: no area selected → invalid | ✅ Pass |
| `validateCharger`: host name too short → invalid | ✅ Pass |
| XSS `<img src=x onerror=alert(1)>` in all fields → plain text | ✅ Pass |
| Broken localStorage (`{broken`) → falls back to seed data | ✅ Pass |
| Negative/zero/huge/NaN numeric inputs → all rejected | ✅ Pass |
| Driver name < 2 chars → rejected | ✅ Pass |
| Geolocation denied → default location used, app works | ✅ Pass |

Run `tests/logic.test.html` in a browser — all 25 unit tests show green.

---

## Screenshots

> Add screenshots to `screenshots/` before submitting.

| Screen | File |
|---|---|
| Find Chargers | `screenshots/find.png` |
| Booking Confirmation | `screenshots/booking.png` |
| Host + Earnings Estimator | `screenshots/host.png` |
| My Bookings | `screenshots/bookings.png` |

---

## Limitations

- **Prototype with fictional data** — no real chargers, users or payments.
- Data lives only in the user's browser (`localStorage`); no sync between devices.
- No real login — anyone can cancel any booking in their own browser session.
- Distance uses straight-line Haversine, not road distance.
- Earnings are estimates based on assumed utilization (10 %–60 %) and a fixed 10 % platform fee.
- Not tested with real charger hardware, electricity metering or society/landlord permissions.
- App works when opened directly as `file://` and when served via HTTP; not tested on IE or very old browsers.

---

## Future Work

| Phase | Focus |
|---|---|
| v1.0 | Real backend — phone OTP auth, database, shared listings & bookings |
| v1.5 | Payments & trust — UPI, host verification, ratings |
| v2.0 | Real maps & live status — map view, OCPP charger status, per-kWh billing |
| v3.0 | Scale — housing-society partnerships, multi-city, host analytics |

---

## Assumptions

*(Added by Google Antigravity agent — 2026-10-28)*

1. **Workspace root = `KTT_hackathon/`** — treated as the `chargenear/` root.
2. **Booking is a 4th hidden view** (not in the top nav). Activated by clicking "Book" on a charger card. A "← Back" button returns to Find.
3. **`availableTo` hour is exclusive** — a charger available 08:00–20:00 accepts bookings up to 20:00; a 2 h booking starting at 19:00 is rejected.
4. **Start-hour select** is bounded to `[availableFrom, availableTo − 1]` to prevent obviously invalid starts.
5. **User-listed chargers** are assigned approximate lat/lng from a lookup table by area — no real geocoding, no API key.
6. **50 seed chargers** were used instead of the 8 specified in the original README, giving a richer demo.
7. **No ES6 modules** — plain `<script>` tags in dependency order so the app works when opened as `file://`.

---

## AI Tools Used

- **Google Antigravity** — primary coding, design, testing, security audit, and documentation agent.

---

## Originality Declaration

*"I built this project myself using AI tools as assistants, and I can explain all of the code."*

---

## Demo Script (3–4 minutes)

1. **Problem (30 s):** "Drivers can't find chargers, while home and shop chargers sit idle 20 hours a day."
2. **Driver flow (60 s):** filter by connector → pick a charger → book a slot → show the confirmation.
3. **Double-booking block (20 s):** try the same slot again → rejected with a clear error.
4. **Host flow (60 s):** list a charger → move the utilization slider → show the net monthly earnings.
5. **Responsible design (30 s):** show the XSS test, the CSP, the sample-data notice and honest limitations.
6. **Close (15 s):** "ChargeNear turns idle chargers into local income and more charging for everyone."
