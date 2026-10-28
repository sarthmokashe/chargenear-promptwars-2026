// ui.js — DOM rendering and event handlers
// Uses only textContent / createElement for user-supplied data (XSS-safe).
// Never uses innerHTML / outerHTML / eval with user data.

// ---------------------------------------------------------------------------
// el: create an element with optional CSS class and text content.
// ---------------------------------------------------------------------------
function el(tag, cls, text) {
  var node = document.createElement(tag);
  if (cls)              node.className   = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---------------------------------------------------------------------------
// setMsg: show / hide a .form-msg element.
// type = "success" | "error" | "" (hidden)
// ---------------------------------------------------------------------------
function setMsg(id, text, type) {
  var node = document.getElementById(id);
  if (!node) return;
  node.textContent = text;
  node.className   = "form-msg" + (type ? " " + type : "");
}

// ---------------------------------------------------------------------------
// setFieldErr: update an inline field-error element.
// ---------------------------------------------------------------------------
function setFieldErr(id, text) {
  var node = document.getElementById(id);
  if (node) node.textContent = text || "";
}

// ---------------------------------------------------------------------------
// clearHostErrors: wipe all host-form validation messages.
// ---------------------------------------------------------------------------
function clearHostErrors() {
  ["err-host-name", "err-host-area", "err-host-power",
   "err-host-price", "err-host-hours", "err-host-hostname"]
    .forEach(function(id) { setFieldErr(id, ""); });
}

// ---------------------------------------------------------------------------
// getFilters: read current filter/sort values from the DOM.
// ---------------------------------------------------------------------------
function getFilters() {
  return {
    connector: document.getElementById("filter-connector").value,
    maxPrice:  parseFloat(document.getElementById("filter-price").value),
    sort:      document.getElementById("filter-sort").value
  };
}

// ---------------------------------------------------------------------------
// resetFilters: clear inputs and re-render the list.
// ---------------------------------------------------------------------------
function resetFilters() {
  document.getElementById("filter-connector").value = "";
  document.getElementById("filter-price").value     = "";
  document.getElementById("filter-sort").value      = "distance";
  renderChargerList();
}

// ---------------------------------------------------------------------------
// renderEmptyState: build a centred empty-state block.
// ---------------------------------------------------------------------------
function renderEmptyState(icon, message, showReset) {
  var wrap = el("div", "empty-state");
  wrap.appendChild(el("div", "empty-icon", icon));
  wrap.appendChild(el("div", "empty-msg",  message));
  if (showReset) {
    var btn = el("button", "btn-secondary", "Reset Filters");
    btn.addEventListener("click", resetFilters);
    wrap.appendChild(btn);
  }
  return wrap;
}

// ---------------------------------------------------------------------------
// renderChargerCard: build one charger card article.
// ---------------------------------------------------------------------------
function renderChargerCard(charger, distKm) {
  var card = el("article", "charger-card");
  card.setAttribute("aria-label", "Charger: " + charger.name);

  // ── Header: name + lime price pill
  var header = el("div", "charger-card-header");
  header.appendChild(el("div", "charger-card-name",  charger.name));
  header.appendChild(el("div", "charger-card-price", "₹" + charger.pricePerHour + "/hr"));
  card.appendChild(header);

  // ── Area
  card.appendChild(el("div", "charger-card-area", "📍 " + charger.area));

  // ── Tags
  var meta = el("div", "charger-card-meta");
  meta.appendChild(el("span", "tag",      charger.connector));
  meta.appendChild(el("span", "tag-muted", charger.powerKw + " kW"));
  meta.appendChild(el("span", "tag-muted", charger.availableFrom + "–" + charger.availableTo));
  meta.appendChild(el("span", "tag-muted", distKm.toFixed(1) + " km away"));
  card.appendChild(meta);

  // ── Divider
  card.appendChild(el("hr", "card-divider"));

  // ── Footer: host + Book button
  var footer = el("div", "charger-card-footer");
  footer.appendChild(el("span", "charger-host", "Host: " + charger.hostName));

  var bookBtn = el("button", "btn-primary", "⚡ Book");
  bookBtn.setAttribute("aria-label", "Book " + charger.name);
  bookBtn.addEventListener("click", function() { showBookingView(charger); });
  footer.appendChild(bookBtn);

  card.appendChild(footer);
  return card;
}

// ---------------------------------------------------------------------------
// renderChargerList: filter → sort → paint the charger list.
// ---------------------------------------------------------------------------
function renderChargerList() {
  var container = document.getElementById("charger-list");
  container.textContent = ""; // XSS-safe clear

  var filters  = getFilters();
  var filtered = state.chargers.slice();

  // Apply filters
  if (filters.connector) {
    filtered = filtered.filter(function(c) { return c.connector === filters.connector; });
  }
  if (!isNaN(filters.maxPrice) && filters.maxPrice > 0) {
    filtered = filtered.filter(function(c) { return c.pricePerHour <= filters.maxPrice; });
  }

  // Compute Haversine distance
  filtered = filtered.map(function(c) {
    return Object.assign({}, c, {
      distKm: haversineKm(state.userLat, state.userLng, c.lat, c.lng)
    });
  });

  // Sort
  if (filters.sort === "price") {
    filtered.sort(function(a, b) { return a.pricePerHour - b.pricePerHour; });
  } else {
    filtered.sort(function(a, b) { return a.distKm - b.distKm; });
  }

  if (filtered.length === 0) {
    container.appendChild(renderEmptyState("🔍", "No chargers match your filters.", true));
    return;
  }

  var list = el("div", "charger-list");
  filtered.forEach(function(c) {
    list.appendChild(renderChargerCard(c, c.distKm));
  });
  container.appendChild(list);
}

// ---------------------------------------------------------------------------
// populateHourOptions: fill the start-hour <select>.
// ---------------------------------------------------------------------------
function populateHourOptions(charger) {
  var select = document.getElementById("booking-hour");
  select.textContent = "";
  var from = parseHour(charger.availableFrom);
  var to   = parseHour(charger.availableTo);
  for (var h = from; h < to; h++) {
    var opt = document.createElement("option");
    opt.value       = String(h);
    opt.textContent = String(h).padStart(2, "0") + ":00";
    select.appendChild(opt);
  }
}

// ---------------------------------------------------------------------------
// updatePricePreview: live total cost display inside booking form.
// ---------------------------------------------------------------------------
function updatePricePreview() {
  var charger  = state.bookingCharger;
  if (!charger) return;
  var hour     = parseInt(document.getElementById("booking-hour").value, 10);
  var duration = parseInt(document.getElementById("booking-duration").value, 10) || 1;
  var total    = charger.pricePerHour * duration;
  var endHour  = hour + duration;
  var preview  = document.getElementById("booking-price-preview");
  preview.textContent =
    "⚡ Total: ₹" + total +
    "  (" + String(hour).padStart(2, "0") + ":00 – " +
    String(endHour).padStart(2, "0") + ":00 · " +
    duration + "h × ₹" + charger.pricePerHour + ")";
}

// ---------------------------------------------------------------------------
// showBookingView: populate charger summary + switch to booking section.
// ---------------------------------------------------------------------------
function showBookingView(charger) {
  state.bookingCharger = charger;

  // ── Build charger info card
  var info = document.getElementById("booking-charger-info");
  info.textContent = ""; // safe clear

  info.appendChild(el("div", "info-card-title", "Selected Charger"));

  function addRow(label, value, extraClass) {
    var row = el("div", "info-row");
    row.appendChild(el("span", "info-row-label", label));
    var val = el("span", "info-row-value" + (extraClass ? " " + extraClass : ""), value);
    row.appendChild(val);
    info.appendChild(row);
  }

  addRow("Name",      charger.name);
  addRow("Area",      charger.area);
  addRow("Connector", charger.connector + " · " + charger.powerKw + " kW");
  addRow("Price",     "₹" + charger.pricePerHour + "/hr", "price-val");
  addRow("Available", charger.availableFrom + " – " + charger.availableTo);

  // ── Date bounds: today → +7 days
  var today    = new Date();
  var yyyy     = today.getFullYear();
  var mm       = String(today.getMonth() + 1).padStart(2, "0");
  var dd       = String(today.getDate()).padStart(2, "0");
  var todayStr = yyyy + "-" + mm + "-" + dd;

  var maxD   = new Date(today);
  maxD.setDate(maxD.getDate() + 7);
  var maxStr = maxD.getFullYear() + "-" +
               String(maxD.getMonth() + 1).padStart(2, "0") + "-" +
               String(maxD.getDate()).padStart(2, "0");

  var dateEl  = document.getElementById("booking-date");
  dateEl.min  = todayStr;
  dateEl.max  = maxStr;
  dateEl.value = todayStr;

  populateHourOptions(charger);
  setMsg("booking-msg", "", "");
  updatePricePreview();
  document.getElementById("booking-name").value = "";

  switchView("booking");
}

// ---------------------------------------------------------------------------
// renderBookingsList: paint the My Bookings section.
// ---------------------------------------------------------------------------
function renderBookingsList() {
  var container = document.getElementById("bookings-list");
  container.textContent = "";

  var sorted = state.bookings.slice().sort(function(a, b) {
    return b.createdAt - a.createdAt;
  });

  if (sorted.length === 0) {
    container.appendChild(renderEmptyState("📋", "No bookings yet.", false));
    return;
  }

  var list = el("div", "bookings-list");

  sorted.forEach(function(booking) {
    var charger     = state.chargers.find(function(c) { return c.id === booking.chargerId; });
    var chargerName = charger ? charger.name : "Unknown charger";
    var endH        = booking.startHour + booking.durationHours;

    var card = el("article", "booking-card");

    // Header: charger name + cancel
    var header = el("div", "booking-card-header");
    header.appendChild(el("div", "booking-card-title", chargerName));

    var cancelBtn = el("button", "btn-danger", "✕ Cancel");
    cancelBtn.setAttribute("aria-label", "Cancel booking at " + chargerName);
    (function(id) {
      cancelBtn.addEventListener("click", function() { cancelBooking(id); });
    })(booking.id);
    header.appendChild(cancelBtn);
    card.appendChild(header);

    // Details grid (uses .booking-card-details + .booking-detail)
    var details = el("div", "booking-card-details");

    details.appendChild(el("p", "booking-detail", "📅 " + booking.date));
    details.appendChild(el("p", "booking-detail",
      "⏰ " + String(booking.startHour).padStart(2, "0") + ":00 – " +
      String(endH).padStart(2, "0") + ":00 (" + booking.durationHours + "h)"));
    details.appendChild(el("p", "booking-detail",
      "💳 ₹" + booking.totalPrice + " (demo)"));
    details.appendChild(el("p", "booking-detail", "👤 " + booking.driverName));

    card.appendChild(details);
    list.appendChild(card);
  });

  container.appendChild(list);
}

// ---------------------------------------------------------------------------
// updateEstimator: recalculate and paint the live earnings estimate.
// ---------------------------------------------------------------------------
function updateEstimator() {
  var fromVal  = document.getElementById("host-from").value;
  var toVal    = document.getElementById("host-to").value;
  var priceVal = parseInt(document.getElementById("host-price").value, 10);
  var util     = parseInt(document.getElementById("host-utilization").value, 10);

  // Update slider display
  document.getElementById("util-value").textContent = util;

  var resultsEl = document.getElementById("estimator-results");
  resultsEl.textContent = "";

  // Guard: need valid price + hours
  if (!fromVal || !toVal || isNaN(priceVal) || priceVal < 10) {
    resultsEl.appendChild(
      el("p", "estimator-placeholder", "Fill in price and hours above to see your estimate.")
    );
    return;
  }

  var fromH = parseHour(fromVal);
  var toH   = parseHour(toVal);
  if (toH <= fromH) return;

  var availHours = toH - fromH;
  var result     = calcEarnings(availHours, util / 100, priceVal);

  var fmt = function(n) { return "₹" + n.toLocaleString("en-IN"); };

  function makeRow(label, value, isTotal) {
    var row = el("div", isTotal ? "estimator-row total" : "estimator-row");
    row.appendChild(el("span", null, label));
    row.appendChild(el("span", null, value));
    return row;
  }

  resultsEl.appendChild(makeRow("Monthly Gross:",       fmt(result.gross), false));
  resultsEl.appendChild(makeRow("Platform Fee (10%):",  "−" + fmt(result.fee), false));
  resultsEl.appendChild(makeRow("Your Net Estimate:",   fmt(result.net),   true));
  resultsEl.appendChild(el("p", "estimator-idle",
    "Your charger would otherwise sit idle ~" + result.idleHours + " hours/day"));
  resultsEl.appendChild(el("p", "estimator-disclaimer",
    "Estimate only. Actual earnings depend on demand."));
}
