/**
 * app.js — Application startup, single-source-of-truth state, view routing, and event orchestration.
 * Strict constraint: Exactly one global `state` object; zero other global mutable variables.
 */

"use strict";

/* global loadChargers, saveChargers, loadBookings, saveBookings, loadUserLoc, saveUserLoc,
          validateCharger, validateBooking, renderChargerList, renderBookingsList,
          populateHourOptions, updatePricePreview, updateEstimator, setMsg, setFieldErr,
          clearHostErrors, applyPresetFilter, recommendPricing */

/**
 * Area -> Coordinates mapping for Pune neighborhoods (used for user-hosted chargers).
 */
const AREA_COORDS = Object.freeze({
  "Kothrud, Pune":      { lat: 18.5074, lng: 73.8077 },
  "Baner, Pune":        { lat: 18.5590, lng: 73.7868 },
  "Wagholi, Pune":      { lat: 18.5679, lng: 73.9814 },
  "Viman Nagar, Pune":  { lat: 18.5679, lng: 73.9143 },
  "Hinjewadi, Pune":    { lat: 18.5912, lng: 73.7380 },
  "Hadapsar, Pune":     { lat: 18.5018, lng: 73.9260 },
  "Shivajinagar, Pune": { lat: 18.5308, lng: 73.8474 },
  "Aundh, Pune":        { lat: 18.5590, lng: 73.8080 }
});

const DEFAULT_LAT = 18.5800; // Wagholi, Pune
const DEFAULT_LNG = 73.9800;

/**
 * Single global application state object.
 */
var state = {
  chargers:       [],
  bookings:       [],
  userLat:        DEFAULT_LAT,
  userLng:        DEFAULT_LNG,
  bookingCharger: null
};

/**
 * switchView — Controls SPA section visibility and updates navigation highlights.
 * @param {"find"|"host"|"bookings"|"booking"} viewName
 */
function switchView(viewName) {
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.remove("active");
  });
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.remove("active");
  });

  const section = document.getElementById("view-" + viewName);
  if (section) section.classList.add("active");

  const navBtn = document.querySelector(".nav-btn[data-view='" + viewName + "']");
  if (navBtn) navBtn.classList.add("active");

  // Re-render view-specific dynamic lists upon entry
  if (viewName === "find")     renderChargerList();
  if (viewName === "bookings") renderBookingsList();
}

/**
 * cancelBooking — Removes a user booking by ID and updates storage & UI.
 * @param {string} bookingId
 */
function cancelBooking(bookingId) {
  state.bookings = state.bookings.filter((b) => b.id !== bookingId);
  saveBookings(state.bookings);
  renderBookingsList();
}

/* ─── Event Listeners Setup ────────────────────────────────────────────────── */

// Navigation Tab Click Handlers
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchView(btn.getAttribute("data-view"));
  });
});

// Back Button in Booking View -> Return to Find
document.getElementById("btn-back-find").addEventListener("click", () => {
  switchView("find");
});

// Geolocation Handler — Requested exclusively on user interaction
document.getElementById("btn-use-location").addEventListener("click", () => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.userLat = pos.coords.latitude;
      state.userLng = pos.coords.longitude;
      saveUserLoc(state.userLat, state.userLng);
      renderChargerList();
    },
    () => {
      // Graceful degradation: silently retain default Wagholi coordinates
    }
  );
});

// Smart Assistant Preset Pills (Find View)
document.querySelectorAll(".preset-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    const preset = pill.getAttribute("data-preset");
    applyPresetFilter(preset);
  });
});

// Live Filter Input Updates
["filter-connector", "filter-price", "filter-sort"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    // Reset active preset pill state if user manually tweaks filters
    document.querySelectorAll(".preset-pill").forEach((p) => p.classList.remove("active"));
    renderChargerList();
  });
});

// Reset Filters Button
document.getElementById("btn-reset-filters").addEventListener("click", resetFilters);

// Booking Form: Date Change -> Re-check availability & refresh hours
document.getElementById("booking-date").addEventListener("change", () => {
  if (state.bookingCharger) {
    populateHourOptions(state.bookingCharger);
    updatePricePreview();
  }
});

// Booking Form: Hour & Duration change -> Live cost preview
document.getElementById("booking-hour").addEventListener("change", updatePricePreview);
document.getElementById("booking-duration").addEventListener("change", updatePricePreview);

// Booking Form Submission
document.getElementById("booking-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const charger = state.bookingCharger;
  if (!charger) return;

  const data = {
    date:          document.getElementById("booking-date").value,
    startHour:     parseInt(document.getElementById("booking-hour").value, 10),
    durationHours: parseInt(document.getElementById("booking-duration").value, 10),
    driverName:    document.getElementById("booking-name").value.trim()
  };

  // Rigorous re-validation at transaction save time
  const result = validateBooking(data, charger, state.bookings);
  if (!result.valid) {
    setMsg("booking-msg", result.error, "error");
    return;
  }

  const booking = {
    id:            "b_" + Date.now(),
    chargerId:     charger.id,
    date:          data.date,
    startHour:     data.startHour,
    durationHours: data.durationHours,
    totalPrice:    charger.pricePerHour * data.durationHours,
    driverName:    data.driverName,
    createdAt:     Date.now()
  };

  state.bookings.push(booking);
  saveBookings(state.bookings);

  setMsg(
    "booking-msg",
    "✅ Booked! " + charger.name + " on " + data.date +
    " from " + String(data.startHour).padStart(2, "0") + ":00" +
    " for " + data.durationHours + "h." +
    " Total: ₹" + booking.totalPrice + " (demo — not charged).",
    "success"
  );

  document.getElementById("booking-name").value = "";
  document.getElementById("booking-duration").value = "1";
  populateHourOptions(charger);
  updatePricePreview();
});

// Host Form: Live Estimator Updates on input
["host-from", "host-to", "host-price", "host-utilization"].forEach((id) => {
  document.getElementById(id).addEventListener("input", updateEstimator);
});

// Host Form: Smart Pricing Assistant Auto-Suggest
document.getElementById("btn-smart-price").addEventListener("click", () => {
  const power = document.getElementById("host-power").value;
  const area  = document.getElementById("host-area").value;
  const suggestedPrice = recommendPricing(power, area);

  const priceInput = document.getElementById("host-price");
  priceInput.value = suggestedPrice;
  updateEstimator();

  setMsg("host-msg", "💡 Suggested market benchmark rate applied: ₹" + suggestedPrice + "/hr", "success");
  setTimeout(() => {
    const msg = document.getElementById("host-msg");
    if (msg && msg.textContent.includes("Suggested market")) {
      setMsg("host-msg", "", "");
    }
  }, 4000);
});

// Host Form Submission
document.getElementById("host-form").addEventListener("submit", (e) => {
  e.preventDefault();
  clearHostErrors();

  const data = {
    name:          document.getElementById("host-charger-name").value.trim(),
    area:          document.getElementById("host-area").value,
    connector:     document.getElementById("host-connector").value,
    powerKw:       document.getElementById("host-power").value,
    pricePerHour:  document.getElementById("host-price").value,
    availableFrom: document.getElementById("host-from").value,
    availableTo:   document.getElementById("host-to").value,
    hostName:      document.getElementById("host-hostname").value.trim()
  };

  const result = validateCharger(data);
  if (!result.valid) {
    const errMap = {
      name:           "err-host-name",
      area:           "err-host-area",
      powerKw:        "err-host-power",
      pricePerHour:   "err-host-price",
      availableHours: "err-host-hours",
      hostName:       "err-host-hostname"
    };
    Object.keys(result.errors).forEach((field) => {
      setFieldErr(errMap[field] || "err-host-name", result.errors[field]);
    });
    setMsg("host-msg", "Please fix the errors above.", "error");
    return;
  }

  const coords  = AREA_COORDS[data.area] || { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
  const charger = {
    id:            "cu_" + Date.now(),
    name:          data.name,
    hostName:      data.hostName,
    area:          data.area,
    lat:           coords.lat,
    lng:           coords.lng,
    connector:     data.connector,
    powerKw:       parseFloat(data.powerKw),
    pricePerHour:  parseInt(data.pricePerHour, 10),
    availableFrom: data.availableFrom,
    availableTo:   data.availableTo,
    isUserListed:  true
  };

  state.chargers.push(charger);
  saveChargers(state.chargers);

  setMsg("host-msg",
    "✅ \"" + charger.name + "\" listed! Find it in the Find tab.",
    "success");

  document.getElementById("host-form").reset();
  clearHostErrors();
  updateEstimator();
});

/**
 * init — Boots the application, restores storage, and renders the initial view.
 */
function init() {
  state.chargers = loadChargers();
  state.bookings = loadBookings();

  const savedLoc = loadUserLoc();
  if (savedLoc) {
    state.userLat = savedLoc.lat;
    state.userLng = savedLoc.lng;
  }

  renderChargerList();
  updateEstimator();
}

init();
