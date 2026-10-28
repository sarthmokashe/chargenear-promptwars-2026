// app.js — Application startup, view switching, event wiring.
// Single global `state` object; no other global mutable state.

// ---------------------------------------------------------------------------
// Area → approximate coordinates (for user-listed chargers)
// ---------------------------------------------------------------------------
var AREA_COORDS = {
  "Kothrud, Pune":      { lat: 18.5074, lng: 73.8077 },
  "Baner, Pune":        { lat: 18.5590, lng: 73.7868 },
  "Wagholi, Pune":      { lat: 18.5679, lng: 73.9814 },
  "Viman Nagar, Pune":  { lat: 18.5679, lng: 73.9143 },
  "Hinjewadi, Pune":    { lat: 18.5912, lng: 73.7380 },
  "Hadapsar, Pune":     { lat: 18.5018, lng: 73.9260 },
  "Shivajinagar, Pune": { lat: 18.5308, lng: 73.8474 },
  "Aundh, Pune":        { lat: 18.5590, lng: 73.8080 }
};

// Default location: Wagholi, Pune
var DEFAULT_LAT = 18.5800;
var DEFAULT_LNG = 73.9800;

// ---------------------------------------------------------------------------
// Global app state
// ---------------------------------------------------------------------------
var state = {
  chargers:       [],
  bookings:       [],
  userLat:        DEFAULT_LAT,
  userLng:        DEFAULT_LNG,
  bookingCharger: null
};

// ---------------------------------------------------------------------------
// switchView: show one section, hide others, update nav highlight.
// ---------------------------------------------------------------------------
function switchView(viewName) {
  document.querySelectorAll(".view").forEach(function(v) {
    v.classList.remove("active");
  });
  document.querySelectorAll(".nav-btn").forEach(function(b) {
    b.classList.remove("active");
  });

  var section = document.getElementById("view-" + viewName);
  if (section) section.classList.add("active");

  var navBtn = document.querySelector(".nav-btn[data-view='" + viewName + "']");
  if (navBtn) navBtn.classList.add("active");

  // Refresh dynamic views on entry
  if (viewName === "find")     renderChargerList();
  if (viewName === "bookings") renderBookingsList();
}

// ---------------------------------------------------------------------------
// cancelBooking: remove a booking by id and repaint the list.
// ---------------------------------------------------------------------------
function cancelBooking(bookingId) {
  state.bookings = state.bookings.filter(function(b) { return b.id !== bookingId; });
  saveBookings(state.bookings);
  renderBookingsList();
}

// ---------------------------------------------------------------------------
// ── EVENT LISTENERS ─────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

// Nav buttons
document.querySelectorAll(".nav-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    switchView(btn.getAttribute("data-view"));
  });
});

// Back button in booking view → return to Find
document.getElementById("btn-back-find").addEventListener("click", function() {
  switchView("find");
});

// "Use My Location" — only called on explicit click (location privacy)
document.getElementById("btn-use-location").addEventListener("click", function() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      state.userLat = pos.coords.latitude;
      state.userLng = pos.coords.longitude;
      saveUserLoc(state.userLat, state.userLng);
      renderChargerList();
    },
    function() {
      // User denied or error — silently keep default location
    }
  );
});

// Live filter updates
["filter-connector", "filter-price", "filter-sort"].forEach(function(id) {
  document.getElementById(id).addEventListener("input", function() {
    renderChargerList();
  });
});

// Reset filters button
document.getElementById("btn-reset-filters").addEventListener("click", resetFilters);

// Booking form: live price preview on change
document.getElementById("booking-hour").addEventListener("change",     updatePricePreview);
document.getElementById("booking-duration").addEventListener("change", updatePricePreview);

// Booking form: submit
document.getElementById("booking-form").addEventListener("submit", function(e) {
  e.preventDefault();
  var charger = state.bookingCharger;
  if (!charger) return;

  var data = {
    date:          document.getElementById("booking-date").value,
    startHour:     parseInt(document.getElementById("booking-hour").value, 10),
    durationHours: parseInt(document.getElementById("booking-duration").value, 10),
    driverName:    document.getElementById("booking-name").value.trim()
  };

  // Re-validate at save time (not only UI)
  var result = validateBooking(data, charger, state.bookings);
  if (!result.valid) {
    setMsg("booking-msg", result.error, "error");
    return;
  }

  var booking = {
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
    " from " + String(data.startHour).padStart(2,"0") + ":00" +
    " for " + data.durationHours + "h." +
    " Total: ₹" + booking.totalPrice + " (demo — not charged).",
    "success"
  );

  // Reset form but keep charger info visible
  document.getElementById("booking-name").value = "";
  document.getElementById("booking-duration").value = "1";
  populateHourOptions(charger);
  updatePricePreview();
});

// Host form: live estimator on any relevant input change
["host-from", "host-to", "host-price", "host-utilization"].forEach(function(id) {
  document.getElementById(id).addEventListener("input", updateEstimator);
});

// Host form: submit
document.getElementById("host-form").addEventListener("submit", function(e) {
  e.preventDefault();
  clearHostErrors();

  var data = {
    name:          document.getElementById("host-charger-name").value.trim(),
    area:          document.getElementById("host-area").value,
    connector:     document.getElementById("host-connector").value,
    powerKw:       document.getElementById("host-power").value,
    pricePerHour:  document.getElementById("host-price").value,
    availableFrom: document.getElementById("host-from").value,
    availableTo:   document.getElementById("host-to").value,
    hostName:      document.getElementById("host-hostname").value.trim()
  };

  var result = validateCharger(data);
  if (!result.valid) {
    var errMap = {
      name:           "err-host-name",
      area:           "err-host-area",
      powerKw:        "err-host-power",
      pricePerHour:   "err-host-price",
      availableHours: "err-host-hours",
      hostName:       "err-host-hostname"
    };
    Object.keys(result.errors).forEach(function(field) {
      setFieldErr(errMap[field] || "err-host-name", result.errors[field]);
    });
    setMsg("host-msg", "Please fix the errors above.", "error");
    return;
  }

  var coords  = AREA_COORDS[data.area] || { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
  var charger = {
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

// ---------------------------------------------------------------------------
// init: boot the app
// ---------------------------------------------------------------------------
function init() {
  state.chargers = loadChargers();
  state.bookings = loadBookings();

  var savedLoc = loadUserLoc();
  if (savedLoc) {
    state.userLat = savedLoc.lat;
    state.userLng = savedLoc.lng;
  }

  renderChargerList();
  updateEstimator();
}

init();
