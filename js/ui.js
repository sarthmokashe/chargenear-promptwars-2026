/**
 * ui.js — DOM rendering, UI component generation, and view updates for ChargeNear.
 * Security: Uses exclusively textContent / createElement for all user-supplied data (XSS-safe).
 * Never uses innerHTML / outerHTML / eval with dynamic user data.
 */

"use strict";

/* global state, haversineKm, parseHour, calcEarnings, getAvailableSlots, switchView, cancelBooking */

/**
 * el — Safe DOM element factory with optional className and text content.
 * @param {string} tag HTML tag name
 * @param {string} [cls] CSS class list
 * @param {string} [text] Safe text content (assigned via textContent)
 * @returns {HTMLElement}
 */
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/**
 * setMsg — Updates a .form-msg status banner.
 * @param {string} id Container element ID
 * @param {string} text Message text
 * @param {"success"|"error"|""} type
 */
function setMsg(id, text, type) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = text;
  node.className = "form-msg" + (type ? " " + type : "");
}

/**
 * setFieldErr — Updates an inline validation error message.
 * @param {string} id Error label ID
 * @param {string} text Error text (or empty to clear)
 */
function setFieldErr(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text || "";
}

/**
 * clearHostErrors — Clears all field validation errors on the Host form.
 */
function clearHostErrors() {
  const fields = [
    "err-host-name",
    "err-host-area",
    "err-host-power",
    "err-host-price",
    "err-host-hours",
    "err-host-hostname"
  ];
  fields.forEach((id) => setFieldErr(id, ""));
}

/**
 * getFilters — Reads filter criteria from the search bar.
 * @returns {{ connector: string, maxPrice: number, sort: string }}
 */
function getFilters() {
  return {
    connector: document.getElementById("filter-connector").value,
    maxPrice:  parseFloat(document.getElementById("filter-price").value),
    sort:      document.getElementById("filter-sort").value
  };
}

/**
 * resetFilters — Restores default filter values and unselects preset pills.
 */
function resetFilters() {
  document.getElementById("filter-connector").value = "";
  document.getElementById("filter-price").value     = "";
  document.getElementById("filter-sort").value      = "distance";

  document.querySelectorAll(".preset-pill").forEach((pill) => {
    pill.classList.remove("active");
  });

  renderChargerList();
}

/**
 * applyPresetFilter — Smart assistant handler to configure filters by user intent.
 * @param {"fast"|"budget"|"nearest"|"standard"} preset
 */
function applyPresetFilter(preset) {
  document.querySelectorAll(".preset-pill").forEach((pill) => {
    pill.classList.toggle("active", pill.getAttribute("data-preset") === preset);
  });

  const connectorEl = document.getElementById("filter-connector");
  const priceEl     = document.getElementById("filter-price");
  const sortEl      = document.getElementById("filter-sort");

  switch (preset) {
    case "fast":
      connectorEl.value = "CCS2";
      priceEl.value     = "";
      sortEl.value      = "distance";
      break;
    case "budget":
      connectorEl.value = "";
      priceEl.value     = "60";
      sortEl.value      = "price";
      break;
    case "nearest":
      connectorEl.value = "";
      priceEl.value     = "";
      sortEl.value      = "distance";
      break;
    case "standard":
      connectorEl.value = "Type 2";
      priceEl.value     = "";
      sortEl.value      = "distance";
      break;
  }

  renderChargerList();
}

/**
 * renderEmptyState — Builds an accessible empty state placeholder.
 * @param {string} icon Emoji or symbol
 * @param {string} message Descriptive text
 * @param {boolean} showReset Whether to render a reset button
 * @returns {HTMLElement}
 */
function renderEmptyState(icon, message, showReset) {
  const wrap = el("div", "empty-state");
  wrap.appendChild(el("div", "empty-icon", icon));
  wrap.appendChild(el("div", "empty-msg", message));

  if (showReset) {
    const btn = el("button", "btn-secondary", "Reset Filters");
    btn.addEventListener("click", resetFilters);
    wrap.appendChild(btn);
  }
  return wrap;
}

// 3D image assets for chargers
const CHARGER_IMAGES = Object.freeze([
  "assets/chargers/charger_ev_car_front.jpg",
  "assets/chargers/charger_wallbox_home.jpg",
  "assets/chargers/charger_pedestal_dual.jpg",
  "assets/chargers/charger_suv_rear.jpg",
  "assets/chargers/charger_canopy_station.jpg",
  "assets/chargers/charger_commercial_post.jpg",
  "assets/chargers/charger_compact_wall.jpg",
  "assets/chargers/charger_green_pillar.jpg",
  "assets/chargers/ev_socket_plugged.jpg",
  "assets/chargers/ev_sedan_white.jpg",
  "assets/chargers/ev_compact_car.jpg",
  "assets/chargers/ev_scooter_lime.jpg"
]);

/**
 * getChargerImage — Returns a stable image matching the charger ID.
 * @param {{ id: string }} charger
 * @returns {string} Image path
 */
function getChargerImage(charger) {
  const idNum = parseInt((charger.id || "1").replace(/\D/g, ""), 10) || 1;
  return CHARGER_IMAGES[(idNum - 1) % CHARGER_IMAGES.length];
}

/**
 * renderChargerCard — Constructs the charger card component with image, tags, and booking trigger.
 * @param {Object} charger
 * @param {number} distKm
 * @returns {HTMLElement}
 */
function renderChargerCard(charger, distKm) {
  const card = el("article", "charger-card");
  card.setAttribute("aria-label", "Charger: " + charger.name);

  // Thumbnail Container
  const imgWrap = el("div", "charger-card-media");
  const img = document.createElement("img");
  img.src = getChargerImage(charger);
  img.alt = charger.name;
  img.className = "charger-card-img";
  img.loading = "lazy";
  imgWrap.appendChild(img);

  // Speed Badge
  const badge = el("span", "charger-badge-speed", charger.powerKw + " kW Fast");
  imgWrap.appendChild(badge);
  card.appendChild(imgWrap);

  // Card Content
  const body = el("div", "charger-card-content");

  // Title & Price
  const header = el("div", "charger-card-header");
  header.appendChild(el("div", "charger-card-name", charger.name));
  header.appendChild(el("div", "charger-card-price", "₹" + charger.pricePerHour + "/hr"));
  body.appendChild(header);

  // Location Area
  body.appendChild(el("div", "charger-card-area", "📍 " + charger.area));

  // Metadata Tags
  const meta = el("div", "charger-card-meta");
  meta.appendChild(el("span", "tag", charger.connector));
  meta.appendChild(el("span", "tag-muted", charger.availableFrom + "–" + charger.availableTo));
  meta.appendChild(el("span", "tag-muted", distKm.toFixed(1) + " km"));
  body.appendChild(meta);

  // Divider
  body.appendChild(el("hr", "card-divider"));

  // Host & Action
  const footer = el("div", "charger-card-footer");
  footer.appendChild(el("span", "charger-host", "Host: " + charger.hostName));

  const bookBtn = el("button", "btn-primary", "⚡ Book");
  bookBtn.setAttribute("aria-label", "Book " + charger.name);
  bookBtn.addEventListener("click", () => {
    showBookingView(charger);
  });
  footer.appendChild(bookBtn);

  body.appendChild(footer);
  card.appendChild(body);
  return card;
}

/**
 * renderChargerList — Filters, sorts, and renders all chargers.
 */
function renderChargerList() {
  const container = document.getElementById("charger-list");
  container.textContent = "";

  const filters = getFilters();
  let filtered  = state.chargers.slice();

  // Filter by connector
  if (filters.connector) {
    filtered = filtered.filter((c) => c.connector === filters.connector);
  }

  // Filter by maximum hourly price
  if (!isNaN(filters.maxPrice) && filters.maxPrice > 0) {
    filtered = filtered.filter((c) => c.pricePerHour <= filters.maxPrice);
  }

  // Calculate distance
  filtered = filtered.map((c) => {
    return Object.assign({}, c, {
      distKm: haversineKm(state.userLat, state.userLng, c.lat, c.lng)
    });
  });

  // Sort
  if (filters.sort === "price") {
    filtered.sort((a, b) => a.pricePerHour - b.pricePerHour);
  } else {
    filtered.sort((a, b) => a.distKm - b.distKm);
  }

  if (filtered.length === 0) {
    container.appendChild(renderEmptyState("🔍", "No chargers match your filters.", true));
    return;
  }

  const list = el("div", "charger-list");
  filtered.forEach((c) => {
    list.appendChild(renderChargerCard(c, c.distKm));
  });
  container.appendChild(list);
}

/**
 * populateHourOptions — Populates the start-hour dropdown with smart real-time availability badges.
 * @param {Object} charger
 */
function populateHourOptions(charger) {
  const select  = document.getElementById("booking-hour");
  select.textContent = "";

  const dateVal = document.getElementById("booking-date").value;
  const from    = parseHour(charger.availableFrom);
  const to      = parseHour(charger.availableTo);
  const freeSlots = getAvailableSlots(charger, dateVal, state.bookings);

  let firstFree = null;

  for (let h = from; h < to; h++) {
    const isFree = freeSlots.indexOf(h) !== -1;
    const opt = document.createElement("option");
    opt.value = String(h);
    opt.textContent = String(h).padStart(2, "0") + ":00 " + (isFree ? "— ✅ Available" : "— ❌ Booked");
    if (!isFree) {
      opt.disabled = true;
    } else if (firstFree === null) {
      firstFree = h;
    }
    select.appendChild(opt);
  }

  if (firstFree !== null) {
    select.value = String(firstFree);
  }

  // Smart slot availability badge
  const hintEl = document.getElementById("booking-slot-hint");
  if (hintEl) {
    if (freeSlots.length > 0) {
      hintEl.textContent = "⚡ Smart Assistant: " + freeSlots.length + " slot(s) open on this date. Next: " + String(freeSlots[0]).padStart(2, "0") + ":00";
    } else {
      hintEl.textContent = "⚠️ Fully booked on this date. Please pick another date.";
    }
  }
}

/**
 * updatePricePreview — Live cost calculation in the booking view.
 */
function updatePricePreview() {
  const charger = state.bookingCharger;
  if (!charger) return;

  const hour     = parseInt(document.getElementById("booking-hour").value, 10);
  const duration = parseInt(document.getElementById("booking-duration").value, 10) || 1;
  const total    = charger.pricePerHour * duration;
  const endHour  = hour + duration;

  const preview = document.getElementById("booking-price-preview");
  preview.textContent =
    "⚡ Total: ₹" + total +
    "  (" + String(hour).padStart(2, "0") + ":00 – " +
    String(endHour).padStart(2, "0") + ":00 · " +
    duration + "h × ₹" + charger.pricePerHour + ")";
}

/**
 * showBookingView — Switches to the booking view and pre-fills selected charger data.
 * @param {Object} charger
 */
function showBookingView(charger) {
  state.bookingCharger = charger;

  const info = document.getElementById("booking-charger-info");
  info.textContent = "";

  // Preview Image
  const photoWrap = el("div", "booking-preview-media");
  const previewImg = document.createElement("img");
  previewImg.src = getChargerImage(charger);
  previewImg.alt = charger.name;
  previewImg.className = "booking-preview-img";
  photoWrap.appendChild(previewImg);
  info.appendChild(photoWrap);

  const infoContent = el("div", "info-card-content");
  infoContent.appendChild(el("div", "info-card-title", "Selected Charger"));

  const addRow = (label, value, extraClass) => {
    const row = el("div", "info-row");
    row.appendChild(el("span", "info-row-label", label));
    row.appendChild(el("span", "info-row-value" + (extraClass ? " " + extraClass : ""), value));
    infoContent.appendChild(row);
  };

  addRow("Name",      charger.name);
  addRow("Area",      charger.area);
  addRow("Connector", charger.connector + " · " + charger.powerKw + " kW");
  addRow("Price",     "₹" + charger.pricePerHour + "/hr", "price-val");
  addRow("Available", charger.availableFrom + " – " + charger.availableTo);

  info.appendChild(infoContent);

  // Date range constraints: today to today + 7 days
  const today    = new Date();
  const yyyy     = today.getFullYear();
  const mm       = String(today.getMonth() + 1).padStart(2, "0");
  const dd       = String(today.getDate()).padStart(2, "0");
  const todayStr = yyyy + "-" + mm + "-" + dd;

  const maxD   = new Date(today);
  maxD.setDate(maxD.getDate() + 7);
  const maxStr = maxD.getFullYear() + "-" +
                 String(maxD.getMonth() + 1).padStart(2, "0") + "-" +
                 String(maxD.getDate()).padStart(2, "0");

  const dateEl = document.getElementById("booking-date");
  dateEl.min   = todayStr;
  dateEl.max   = maxStr;
  dateEl.value = todayStr;

  populateHourOptions(charger);
  setMsg("booking-msg", "", "");
  updatePricePreview();
  document.getElementById("booking-name").value = "";

  switchView("booking");
}

/**
 * renderBookingsList — Renders the user's booking history and cancellation controls.
 */
function renderBookingsList() {
  const container = document.getElementById("bookings-list");
  container.textContent = "";

  const sorted = state.bookings.slice().sort((a, b) => b.createdAt - a.createdAt);

  if (sorted.length === 0) {
    container.appendChild(renderEmptyState("📋", "No bookings yet.", false));
    return;
  }

  const list = el("div", "bookings-list");

  sorted.forEach((booking) => {
    const charger     = state.chargers.find((c) => c.id === booking.chargerId);
    const chargerName = charger ? charger.name : "Unknown charger";
    const endH        = booking.startHour + booking.durationHours;

    const card = el("article", "booking-card");

    const header = el("div", "booking-card-header");
    header.appendChild(el("div", "booking-card-title", chargerName));

    const cancelBtn = el("button", "btn-danger", "✕ Cancel");
    cancelBtn.setAttribute("aria-label", "Cancel booking at " + chargerName);
    cancelBtn.addEventListener("click", () => {
      cancelBooking(booking.id);
    });
    header.appendChild(cancelBtn);
    card.appendChild(header);

    const details = el("div", "booking-card-details");
    details.appendChild(el("p", "booking-detail", "📅 " + booking.date));
    details.appendChild(el("p", "booking-detail",
      "⏰ " + String(booking.startHour).padStart(2, "0") + ":00 – " +
      String(endH).padStart(2, "0") + ":00 (" + booking.durationHours + "h)"));
    details.appendChild(el("p", "booking-detail", "💳 ₹" + booking.totalPrice + " (demo)"));
    details.appendChild(el("p", "booking-detail", "👤 " + booking.driverName));

    card.appendChild(details);
    list.appendChild(card);
  });

  container.appendChild(list);
}

/**
 * updateEstimator — Recalculates host earnings based on operating hours, utilization, and price.
 */
function updateEstimator() {
  const fromVal  = document.getElementById("host-from").value;
  const toVal    = document.getElementById("host-to").value;
  const priceVal = parseInt(document.getElementById("host-price").value, 10);
  const util     = parseInt(document.getElementById("host-utilization").value, 10);

  document.getElementById("util-value").textContent = util;

  const resultsEl = document.getElementById("estimator-results");
  resultsEl.textContent = "";

  if (!fromVal || !toVal || isNaN(priceVal) || priceVal < 10) {
    resultsEl.appendChild(
      el("p", "estimator-placeholder", "Fill in price and hours above to see your estimate.")
    );
    return;
  }

  const fromH = parseHour(fromVal);
  const toH   = parseHour(toVal);
  if (toH <= fromH) return;

  const availHours = toH - fromH;
  const result     = calcEarnings(availHours, util / 100, priceVal);

  const fmt = (n) => "₹" + n.toLocaleString("en-IN");

  const makeRow = (label, value, isTotal) => {
    const row = el("div", isTotal ? "estimator-row total" : "estimator-row");
    row.appendChild(el("span", null, label));
    row.appendChild(el("span", null, value));
    return row;
  };

  resultsEl.appendChild(makeRow("Monthly Gross:", fmt(result.gross), false));
  resultsEl.appendChild(makeRow("Platform Fee (10%):", "−" + fmt(result.fee), false));
  resultsEl.appendChild(makeRow("Your Net Estimate:", fmt(result.net), true));
  resultsEl.appendChild(el("p", "estimator-idle",
    "Your charger would otherwise sit idle ~" + result.idleHours + " hours/day"));
  resultsEl.appendChild(el("p", "estimator-disclaimer",
    "Estimate only. Actual earnings depend on demand."));
}
