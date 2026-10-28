# ⚡ ChargeNear: Rent Idle EV Chargers

> PromptWars × KickToTech 2026 · Track: **Entrepreneurship & Local Business** · Individual entry

**Live Demo:** https://sarthmokashe.github.io/chargenear-promptwars-2026

---

## 1. Chosen Vertical & Persona

- **Track & Vertical:** Entrepreneurship & Local Business · Sustainable Mobility & Clean Energy Marketplace.
- **Target Personas:**
  1. **EV Drivers (Guests):** Urban commuters and travelers in Pune seeking immediate, reliable neighborhood charging without waiting in lines at scarce commercial stations.
  2. **Charger Owners (Hosts):** Residents, apartment societies, cafés, shops, and small businesses with private EV chargers that sit idle 20+ hours a day.
- **Value Proposition:** Empowers local hosts to run micro-businesses generating recurring passive income while providing EV drivers with an instant, affordable decentralized charging network.

---

## 2. Approach & Architecture

ChargeNear is engineered as a zero-dependency, ultra-fast Progressive Web Application (PWA-ready) built with vanilla HTML5, modern CSS3 (Light Neumorphic Design System with Electric Lime accents), and pure JavaScript.

### Core Architectural Pillars
- **Strict Separation of Concerns:**
  - `logic.js`: Pure mathematical and business functions (100% testable, zero DOM access).
  - `storage.js`: Robust persistence layer with JSON fault-tolerance, quota recovery, and seed fallback.
  - `ui.js`: Presentation layer strictly utilizing `textContent` and `createElement` for provable XSS immunity.
  - `app.js`: Reactive event orchestrator maintaining a single immutable state model.
- **Offline & Zero Latency:** No bundlers, external CDNs, or heavy frameworks. 100% functional both via HTTP servers and direct filesystem execution (`file://`).
- **Security-First Architecture:** Strict Content Security Policy (CSP) blocking unauthorized scripts, external connections, and inline event handlers.

---

## 3. Smart Dynamic Assistant & Contextual Logic

ChargeNear features dynamic contextual assistance tailored to user needs and environment:

1. **Smart Match Driver Assistant (Find View):**
   - Contextual intent presets: *⚡ Fast CCS2*, *💰 Under ₹60/hr*, *📍 Nearest*, and *🔌 Type 2*.
   - Automatically adapts connector filters, price limits, and Haversine distance sorting with single-click ease.
2. **Dynamic Slot Availability Intelligence (Booking View):**
   - Computes open vs. booked hourly intervals dynamically when selecting any date within a 7-day rolling window.
   - Visually indicates slot status (`✅ Available` vs. `❌ Booked`), disables conflicted options, and highlights the next available slot automatically.
3. **Smart Host Pricing Advisor (Host View):**
   - Implements a heuristic pricing model (`recommendPricing`) factoring in charger kW rating and neighborhood market density (e.g. +15% regional benchmark in Hinjewadi/Baner tech corridors).
   - Instant "💡 Suggest Price" button auto-populates optimal rates to maximize host booking conversion.
4. **Live Utilization & Earnings Estimator:**
   - Real-time slider (10%–60%) calculating gross earnings, transparent 10% platform fee, net monthly revenue, and idle asset utilization.

---

## 4. Features Built

| # | Feature | Capability | Status |
|---|---|---|---|
| 1 | **Find Chargers** | 50 curated listings with connector, kW speed badge, ₹/hr, distance, and 3D imagery | ✅ Working |
| 2 | **Smart Search & Filters** | Filter by connector, max price, distance/price sort, and 4 smart assistant presets | ✅ Working |
| 3 | **Geolocation Assistant** | "Use My Location" via Haversine great-circle calculation with privacy-first fallback | ✅ Working |
| 4 | **Conflict-Free Booking** | Hourly slot booking with start time, 1–4h duration, live price calculation | ✅ Working |
| 5 | **Double-Booking Shield** | Guaranteed conflict prevention via interval overlap check (`newStart < existEnd && newEnd > existStart`) | ✅ Working |
| 6 | **Host Listing Engine** | Validated multi-field form adding user-hosted chargers directly to the live registry | ✅ Working |
| 7 | **Host Pricing Advisor** | Benchmark recommendation engine tailored to power rating and Pune area | ✅ Working |
| 8 | **Interactive Earnings Estimator** | Live monthly gross, 10% platform fee, net payout, and idle hours counter | ✅ Working |
| 9 | **My Bookings Manager** | Reverse-chronological booking ledger with one-click slot cancellation | ✅ Working |
| 10 | **Storage & Fault Recovery** | Safe localStorage with automatic corrupted-JSON recovery and seed reset | ✅ Working |

---

## 5. File Structure

```
chargenear/
├── index.html              # Accessible single-page layout (Semantic HTML5)
├── css/
│   └── styles.css          # Neumorphic light theme, CSS custom properties, responsive
├── js/
│   ├── data.js             # 50 realistic seed chargers across Pune neighborhoods
│   ├── storage.js          # Fault-tolerant localStorage engine with try/catch guards
│   ├── logic.js            # Pure business logic: distance, overlap, pricing, validation
│   ├── ui.js               # DOM rendering with textContent (zero XSS vulnerability)
│   └── app.js              # Event management, single global state, view routing
├── tests/
│   └── logic.test.html     # 34 in-browser unit tests verifying all business logic
├── assets/
│   ├── logo-icon.png       # ChargeNear branding icon
│   └── chargers/           # 20 optimized local EV & charging station images
├── screenshots/            # UI screenshots for presentation and review
├── .nojekyll               # Disables Jekyll processing on GitHub Pages
├── .gitignore              # Ignores OS and temporary files
└── README.md
```

---

## 6. How to Run Locally

```bash
# Option 1: Direct file execution (zero tooling required)
open index.html

# Option 2: Local HTTP server
python -m http.server 5500
# Then open http://localhost:5500 in your browser
```

---

## 7. Security & Responsible Design

| Pillar | Implementation |
|---|---|
| **Zero XSS** | All user inputs and text nodes are inserted strictly via `textContent` and `createElement`. Zero usage of `innerHTML` or `document.write`. |
| **Strict CSP** | `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;">` |
| **Zero External Tracking** | Completely offline-capable; no remote CDN scripts, fonts, analytics, or third-party tracking. |
| **Input Sanitization** | Strict validation rules on length, number ranges (₹10–₹500/hr, 1–350 kW), valid operational hours, and date constraints. |
| **Privacy First** | Geolocation requested strictly upon explicit click; only `{lat, lng}` coordinate floats are saved locally. |
| **Honest UI** | Transparent notices explicitly clarifying demo status, sample data, and non-binding earnings estimates. |

---

## 8. Test Suite & Verification Results

Unit tests are executable in any browser via `tests/logic.test.html`. **All 34 tests pass cleanly (100% pass rate).**

| Test Category | Target Function | Test Assertion | Result |
|---|---|---|---|
| **Distance** | `haversineKm` | Identical coordinates return 0 km | ✅ Pass |
| **Distance** | `haversineKm` | Kothrud to Wagholi calculates between 10–25 km | ✅ Pass |
| **Overlap Detection** | `hasOverlap` | Back-to-back contiguous slots (10–12 and 12–14) do NOT overlap | ✅ Pass |
| **Overlap Detection** | `hasOverlap` | Reverse contiguous slots (12–14 and 10–12) do NOT overlap | ✅ Pass |
| **Overlap Detection** | `hasOverlap` | Partially overlapping intervals (10–12 and 11–13) detect conflict | ✅ Pass |
| **Overlap Detection** | `hasOverlap` | Identical intervals (10–12 and 10–12) detect conflict | ✅ Pass |
| **Overlap Detection** | `hasOverlap` | Contained intervals (10–14 containing 11–12) detect conflict | ✅ Pass |
| **Operating Hours** | `isWithinHours` | Slot 10–12 within 08:00–20:00 validates true | ✅ Pass |
| **Operating Hours** | `isWithinHours` | Slot 19–21 ending after 20:00 rejects false | ✅ Pass |
| **Operating Hours** | `isWithinHours` | Slot 06–08 starting before 08:00 rejects false | ✅ Pass |
| **Operating Hours** | `isWithinHours` | Exact boundary fill (08:00–20:00) validates true | ✅ Pass |
| **Earnings Engine** | `calcEarnings` | 10h @ 25% utilization @ ₹80/hr → Gross ₹6,000 | ✅ Pass |
| **Earnings Engine** | `calcEarnings` | 10h @ 25% utilization @ ₹80/hr → Platform Fee ₹600 | ✅ Pass |
| **Earnings Engine** | `calcEarnings` | 10h @ 25% utilization @ ₹80/hr → Net Earnings ₹5,400 | ✅ Pass |
| **Earnings Engine** | `calcEarnings` | 12h @ 40% utilization @ ₹100/hr → Gross ₹14,400 | ✅ Pass |
| **Earnings Engine** | `calcEarnings` | 12h @ 40% utilization @ ₹100/hr → Net Earnings ₹12,960 | ✅ Pass |
| **Smart Assistant** | `suggestConnector` | Detects majority connector type (CCS2) across fleet | ✅ Pass |
| **Smart Assistant** | `getAvailableSlots`| Correctly computes free hourly slots on scheduled dates | ✅ Pass |
| **Smart Assistant** | `recommendPricing` | Standard 7.4kW charger recommends baseline ₹75/hr | ✅ Pass |
| **Smart Assistant** | `recommendPricing` | Hinjewadi tech corridor adds regional demand benchmark (₹85/hr) | ✅ Pass |
| **Smart Assistant** | `recommendPricing` | 50kW DC fast charger calculates commercial tier (₹200/hr) | ✅ Pass |
| **Host Validation** | `validateCharger` | Valid complete charger model returns true | ✅ Pass |
| **Host Validation** | `validateCharger` | Empty charger name rejects false | ✅ Pass |
| **Host Validation** | `validateCharger` | Name under 3 characters rejects false | ✅ Pass |
| **Host Validation** | `validateCharger` | Price of 0 rejects false | ✅ Pass |
| **Host Validation** | `validateCharger` | Price below ₹10 minimum rejects false | ✅ Pass |
| **Host Validation** | `validateCharger` | Reversed hours (`availableTo <= availableFrom`) rejects false | ✅ Pass |
| **Host Validation** | `validateCharger` | Identical start and end hours rejects false | ✅ Pass |
| **Host Validation** | `validateCharger` | Missing neighborhood area rejects false | ✅ Pass |
| **Host Validation** | `validateCharger` | Host name under 2 characters rejects false | ✅ Pass |
| **Booking Validation** | `validateBooking` | Valid booking parameters return true | ✅ Pass |
| **Booking Validation** | `validateBooking` | Driver name under 2 characters rejects false | ✅ Pass |
| **Booking Validation** | `validateBooking` | Booking duration over 4 hours rejects false | ✅ Pass |
| **Booking Validation** | `validateBooking` | Slot exceeding charger operating hours rejects false | ✅ Pass |

---

## 9. Assumptions Made

1. **Pune Geographic Scope:** Initial seed dataset and area dropdown are focused on key hubs across Pune (Kothrud, Baner, Wagholi, Viman Nagar, Hinjewadi, Hadapsar, Shivajinagar, Aundh).
2. **Default Coordinates:** Default driver location is centered at Wagholi (`18.5800, 73.9800`) until the user triggers "Use My Location".
3. **Discrete 1-Hour Booking Increments:** Slot bookings operate on clean 1-hour increments (1–4 hours) to avoid fragmented fractional intervals.
4. **Client-Side Persistence:** Local browser storage (`localStorage`) serves as the prototype database, simulating real-world operations with zero server setup friction.

---

## 10. Future Work Roadmap

- **v1.0 Authentication & Profiles:** Mobile OTP verification and driver/host profile dashboards.
- **v1.5 Integrated Payments:** UPI dynamic QR codes and escrow payout upon charging completion.
- **v2.0 Smart Hardware Integration:** OCPP 1.6/2.0 protocol support and smart plug relay automation.
- **v2.5 Society Governance:** Housing society resident approvals and automated common-area electricity submetering.

---

## 11. Originality Declaration

*"I built this project myself using AI tools as assistants, and I can explain all of the code."*
