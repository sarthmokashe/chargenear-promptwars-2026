# ⚡ ChargeNear: Rent Idle EV Chargers Nearby

> PromptWars × KickToTech 2026 · Track: **Entrepreneurship & Local Business** · Individual entry

---

## 0. INSTRUCTIONS FOR THE AI CODING AGENT (READ FIRST)

You are building a hackathon MVP in a **single afternoon (~5 hours)**. Follow this file exactly.

1. Read this whole file before writing any code.
2. **Do not ask clarifying questions.** If something is unclear, pick the simplest option, build it, and note the assumption in a `## Assumptions` section at the bottom of this file.
3. Build in the **phases in Section 9**, in order. After each phase, the app must run without errors.
4. **Scope is locked.** Anything in "Out of Scope" (Section 3) must NOT be built, even if it seems easy.
5. Prefer **simple, readable code** the student can explain to judges. No clever abstractions, no unnecessary libraries.
6. Never claim a feature works unless it is in the Test Checklist (Section 11) and passes.
7. Keep a working version at all times. Make small changes and re-run after each one.

---

## 1. Problem

India's EV adoption is growing faster than public charging infrastructure. Meanwhile, thousands of home, society, shop and café chargers sit **idle 20+ hours a day**.

- **EV drivers** struggle to find an available charger nearby.
- **Charger owners** have an asset earning nothing.

## 2. Solution (One Sentence)

A web app where **local owners list their idle EV charger for hourly rent**, and **EV drivers find nearby chargers and book a time slot**.

**Target users**

| User | Need |
|---|---|
| EV Driver (Guest) | Find a nearby compatible charger and book a slot |
| Host (home owner, shop, café, housing society) | List a charger and see how much they could earn |

## 3. Scope

### ✅ In Scope (the MVP: build ONLY this)

1. **Find chargers:** list of sample chargers in Pune with filters (connector type, max price, sort by distance/price).
2. **Book a slot:** choose a time slot, confirm, and the slot becomes unavailable (no double-booking).
3. **Host a charger:** form to list a charger with price and available hours.
4. **Earnings estimator:** live "estimated monthly earnings" for the host.
5. **My Bookings:** see and cancel your bookings.
6. All data stored in **localStorage**, seeded with **fictional** sample data.

### ❌ Out of Scope (do NOT build)

Real payments · real login/auth · real maps API · real-time charger hardware status · chat · reviews/ratings · push notifications · backend server · database · any API key. Mention these as *Future Work* only.

---

## 4. Tech Stack (Fixed, Do Not Change)

| Layer | Choice | Why |
|---|---|---|
| Markup | **HTML5** | Zero setup |
| Styling | **Plain CSS** (CSS variables, flexbox/grid, mobile-first) | No build step |
| Logic | **Vanilla JavaScript (ES6 modules or plain scripts)** | Easy to explain |
| Storage | **`localStorage`** (JSON) | No backend needed |
| Hosting | **Open `index.html`** locally; optional GitHub Pages for demo link | Fast |
| Libraries | **None.** No npm, no frameworks, no CDN scripts | Nothing to break offline |
| Fonts | System font stack only | No external requests |

> If you absolutely need a library, stop and use plain JS instead.

### File Structure

```
chargenear/
├── index.html          # single page, all views as <section>s
├── css/
│   └── styles.css
├── js/
│   ├── data.js         # fictional seed chargers
│   ├── storage.js      # safe localStorage read/write helpers
│   ├── logic.js        # distance, overlap check, earnings formula (pure functions)
│   ├── ui.js           # rendering + event handlers
│   └── app.js          # startup, view switching
├── tests/
│   └── logic.test.html # simple in-browser tests for logic.js
└── README.md
```

---

## 5. Data Model

### Charger

```js
{
  id: "c1",                       // string, unique
  name: "Kothrud Society Charger",
  hostName: "Priya S. (sample)",  // fictional
  area: "Kothrud, Pune",
  lat: 18.5074, lng: 73.8077,     // sample coordinates
  connector: "Type 2",            // "CCS2" | "Type 2" | "Bharat AC-001" | "3-pin (slow)"
  powerKw: 7.4,                   // number
  pricePerHour: 80,               // INR, integer
  availableFrom: "08:00",         // "HH:MM" 24h
  availableTo: "20:00",           // "HH:MM" 24h
  isUserListed: false             // true if added through the Host form
}
```

### Booking

```js
{
  id: "b_1730000000000",
  chargerId: "c1",
  date: "2026-10-29",             // YYYY-MM-DD
  startHour: 10,                  // integer 0–23
  durationHours: 2,               // integer 1–4
  totalPrice: 160,                // pricePerHour * durationHours
  driverName: "Guest",            // free text, sanitized
  createdAt: 1730000000000
}
```

### localStorage Keys

- `chargenear_chargers_v1` → array of Charger
- `chargenear_bookings_v1` → array of Booking
- `chargenear_userloc_v1` → `{lat,lng}` (optional, only if the user allows it)

### Seed Data

Create **8 fictional chargers** around Pune (Kothrud, Baner, Wagholi, Viman Nagar, Hinjewadi, Hadapsar, Shivajinagar, Aundh) with a mix of connectors, prices (₹40–₹150/hr) and hours. Hosts are fictional names marked "(sample)". **No real people, phone numbers, addresses or businesses.**

---

## 6. Feature Specs & Acceptance Criteria

### 6.1 Find Chargers (Home view)

- Shows a card per charger: name, area, connector, kW, ₹/hr, available hours, distance in km.
- **Distance:** Haversine formula from the user's location. Default location = Wagholi, Pune (`18.5800, 73.9800`). A "Use my location" button may call `navigator.geolocation` once; on denial or error, silently keep the default. Never store anything but `{lat,lng}` locally.
- **Filters:** connector type (dropdown), max price (number input), sort (nearest / cheapest).
- **Empty state:** "No chargers match your filters" with a Reset button.
- ✅ Done when: changing any filter updates the list instantly, with no page reload.

### 6.2 Book a Slot

- Click "Book" on a card → modal/section with: date (today or later, max 7 days ahead), start hour (only within the charger's available hours), duration (1–4 h), driver name.
- Show total price live.
- **Overlap rule:** a booking is rejected if it overlaps any existing booking for the same charger on the same date. Overlap check: `newStart < existingEnd && newEnd > existingStart`.
- Booking must also fit entirely within the charger's `availableFrom`–`availableTo`.
- On success: save, show a confirmation message with a booking summary.
- ✅ Done when: booking the same slot twice is rejected with a clear message.

### 6.3 Host a Charger

- Form: charger name, area (dropdown of Pune areas), connector, power (kW), price/hour, available from/to, host name.
- Validation (all with inline error messages, not `alert()`):
  - name 3–40 chars, host name 2–30 chars
  - price 10–500, power 1–350, `availableTo` later than `availableFrom`
- New charger is saved with `isUserListed: true` and appears in the Find list.
- ✅ Done when: a newly hosted charger shows up in Find and can be booked.

### 6.4 Earnings Estimator (key differentiator)

Shown live on the Host form as inputs change.

```
availableHours = availableTo - availableFrom        (per day)
utilization    = slider 10%–60%, default 25%        (share of available hours actually booked)
platformFee    = 10%                                (shown transparently)

monthlyGross = availableHours × utilization × pricePerHour × 30
monthlyNet   = monthlyGross × (1 − platformFee)
```

- Display: gross, fee, and **net monthly estimate** in ₹, with the line *"Estimate only. Actual earnings depend on demand."*
- Also show *"Your charger would otherwise sit idle ~X hours/day"* where X = `24 − availableHours × utilization`.
- ✅ Done when: the numbers match the formula for at least 3 manual test cases.

### 6.5 My Bookings

- List bookings (newest first) with charger name, date, time, price.
- "Cancel" button removes the booking and frees the slot.
- Empty state: "No bookings yet".

---

## 7. UI / UX Rules

- **Mobile-first**, works at 360px width and on desktop.
- Single page with a bottom/top nav: **Find · Host · My Bookings**. Switch views by showing/hiding `<section>`s.
- Base font ≥ 16px, tap targets ≥ 44px, color contrast ≥ 4.5:1.
- Every input has a visible `<label>`. Use semantic HTML (`<header> <nav> <main> <section> <button>`). Add `aria-live="polite"` on the message area.
- Visible keyboard focus styles.
- Theme: clean, green/teal accent (e.g. `#0f766e`), light background, rounded cards. Include a simple ⚡ emoji logo (no image files).
- Show friendly empty, error and success states. **Never use `alert()`.**
- Include a small footer: *"Demo with fictional sample data."*

---

## 8. Security & Responsible Design Rules (MANDATORY)

These map directly to the judging criterion "Testing & responsible design".

1. **No secrets.** No API keys, tokens, passwords or `.env` files anywhere in the code or in AI prompts.
2. **Fictional data only.** No real names, phones, addresses, or vehicle numbers. Show a "sample data" notice.
3. **Prevent XSS.** Render any user-entered text with `textContent` / `createElement`. **Never** use `innerHTML`, `outerHTML` or `document.write` with user-supplied values. Never use `eval` or `new Function`.
4. **Validate all input** (type, range, length) before saving. Trim whitespace. Reject NaN and negative numbers. Re-validate the booking at save time, not only in the UI.
5. **Safe storage.** Wrap every `localStorage` read/write in `try/catch`. If JSON is corrupt or storage is blocked, fall back to seed data and show a gentle message.
6. **Content Security Policy.** Add to `<head>`:
   ```html
   <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;">
   ```
   This means **no inline `<script>` blocks and no inline event handlers (`onclick=`)**. Use `addEventListener` in the JS files. Inline `style=""` attributes are also blocked, so use CSS classes.
7. **Location privacy.** Request geolocation only after a user click. Store nothing but coordinates, locally, and let the user clear it.
8. **No tracking, analytics, or external requests** of any kind.
9. **Be honest in the UI.** The earnings are an *estimate*; payments are *not real*; the booking is a *demo*.

---

## 9. Build Phases (follow in order)

| Phase | Goal | Done when |
|---|---|---|
| **1. Skeleton** | `index.html`, CSS, nav, three empty sections, footer, CSP meta | Page loads on mobile width, nav switches views |
| **2. Data + Storage** | `data.js` seed, `storage.js` safe helpers | Seed chargers load and persist across refresh |
| **3. Find view** | Cards, distance, filters, sorting | Filters and sorting work live |
| **4. Booking** | Booking form, overlap check, confirmation, My Bookings, cancel | Double-booking is blocked |
| **5. Host + Estimator** | Host form with validation and live estimator | Hosted charger appears in Find |
| **6. Polish + Tests** | Accessibility pass, empty states, `tests/logic.test.html` | All items in Section 11 pass |
| **7. Docs** | Fill in Section 13 and Section 14 of this file, take screenshots | Ready to submit |

**Time targets (hackathon day):** working Find view by ~2:00 PM · booking + host done by ~3:45 PM · testing/fixes by 4:30 PM · README, screenshots and submission by 5:30 PM.

---

## 10. Code Rules

- Plain functions, small files, meaningful names, a short comment above each function.
- Put **all business logic in `logic.js` as pure functions** (no DOM access) so it can be tested: `haversineKm`, `hasOverlap`, `isWithinHours`, `calcEarnings`, `validateCharger`, `validateBooking`.
- No global mutable state except one `state` object in `app.js`.
- No dead code, no unused files, no TODOs left in the final version.
- Handle errors visibly: never fail silently, and never leave `console.error` as the only feedback.

---

## 11. Test Checklist (must pass before submitting)

**Logic tests (in `tests/logic.test.html`, shown as green/red results on the page)**

- [ ] `haversineKm` returns ~0 for identical points and a plausible value for two Pune points
- [ ] `hasOverlap`: back-to-back slots (10–12 and 12–14) are **not** overlapping; 10–12 and 11–13 **are**
- [ ] `isWithinHours` rejects a slot ending after `availableTo`
- [ ] `calcEarnings(10h, 25%, ₹80)` → gross ₹6,000; net ₹5,400
- [ ] `validateCharger` rejects empty name, price 0, and `availableTo <= availableFrom`

**Manual tests**

- [ ] App loads with 8 sample chargers; refresh keeps data
- [ ] Each filter and sort option works; reset restores the full list
- [ ] Booking a free slot succeeds; the same slot again is rejected
- [ ] Booking outside the charger's hours is rejected
- [ ] Cancelling a booking frees the slot so it can be rebooked
- [ ] Hosted charger appears in Find and can be booked
- [ ] Typing `<img src=x onerror=alert(1)>` as a name displays as plain text and runs nothing
- [ ] Clearing localStorage and reloading restores seed data without errors
- [ ] Geolocation denied → app still works with the default location
- [ ] Usable at 360px width; fully usable by keyboard only

---

## 12. Setup & Run (Google Antigravity)

1. Install/open **Google Antigravity** and sign in (test this before the event).
2. Create a new empty folder named `chargenear` and **open it as the workspace**.
3. Save this file as `README.md` in that folder.
4. In the agent panel, paste this starter prompt:

   > **"Read README.md fully and follow it exactly. Build Phase 1 now, run it, then continue phase by phase through Phase 6. Use only HTML, CSS and vanilla JavaScript, no libraries, no build step. Do not ask me questions; note any assumptions at the bottom of README.md. After each phase tell me how to test it."**

5. **Run the app:** open `index.html` in the browser, *or* in a terminal inside the folder run:
   ```bash
   python -m http.server 5500
   ```
   then visit `http://localhost:5500`.
6. **Version control (keep a working backup):**
   ```bash
   git init
   git add .
   git commit -m "Phase N working"
   ```
   Commit after every working phase.
7. **Optional demo link:** push to GitHub → Settings → Pages → deploy from `main` branch. Confirm the link opens before submitting.
8. **Backup tool:** have Cursor, Replit or GitHub Copilot logged in, in case Antigravity is unavailable or rate-limited.

**Debugging tip:** when something breaks, paste the *exact* error message and the filename into the agent, and ask it to fix only that issue.

---

## 13. Limitations (Be Honest)

- Prototype with **fictional data**; no real chargers, users or payments.
- Data lives only in the user's browser (`localStorage`); there is no sync between devices or users.
- No real login, so anyone can cancel any booking in their own browser.
- Distance uses straight-line (Haversine) distance, not road distance.
- Earnings are estimates based on an assumed utilization rate and a 10% platform fee.
- Not tested with real charger hardware, electricity metering or society/landlord permissions.

## 14. Future Work

Real authentication · secure payments (UPI) · live charger status via OCPP/smart plugs · map view · host verification & safety checks · ratings · electricity cost split · society-level approvals · multi-city support.

---

## 15. Submission Checklist

- [ ] Project name & track: **ChargeNear · Entrepreneurship & Local Business**
- [ ] Problem & users described (Sections 1–2)
- [ ] Working demo link or project folder opens cleanly
- [ ] README includes run steps and limitations
- [ ] 3–4 screenshots (Find, Booking confirmation, Host + estimator, My Bookings)
- [ ] AI tools used: **Google Antigravity (+ any backup tool actually used)**
- [ ] Originality declaration: *"I built this project myself using AI tools as assistants, and I can explain all of the code."*
- [ ] Submitted **before 5:30 PM**

## 16. Demo Script (3–4 minutes)

1. **Problem (30s):** "Drivers can't find chargers, while home and shop chargers sit idle 20 hours a day."
2. **Driver flow (60s):** filter by connector → pick a charger → book a slot → show the confirmation.
3. **Double-booking block (20s):** try the same slot again → rejected.
4. **Host flow (60s):** list a charger → move the utilization slider → show the net monthly earnings.
5. **Responsible design (30s):** show the XSS test, the CSP, the sample-data notice and the honest limitations.
6. **Close (15s):** "ChargeNear turns idle chargers into local income and more charging for everyone."

**Likely questions:** *How do you handle safety and trust?* (Future Work: host verification, ratings, society approvals.) *What stops overbooking?* (Overlap rule, show the test.) *How is this different from existing apps?* (Hyper-local, individual and shop hosts, transparent earnings estimator.)

---

## Assumptions

*(The AI agent appends assumptions here as it builds.)*
