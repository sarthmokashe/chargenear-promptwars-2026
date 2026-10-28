/**
 * logic.js — Pure business-logic functions (zero DOM access).
 * Every function is independently unit-tested in tests/logic.test.html.
 *
 * Exports (plain globals, loaded before other scripts):
 *   haversineKm · hasOverlap · parseHour · isWithinHours
 *   calcEarnings · validateCharger · validateBooking
 *   suggestConnector · getAvailableSlots · recommendPricing
 */

"use strict";

/* ─── Distance Calculation ─────────────────────────────────────────────────── */

/**
 * haversineKm — Calculates great-circle distance between two lat/lng points.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lng1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lng2 Longitude of point 2
 * @returns {number} Distance in kilometres.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R     = 6371; // Earth radius in km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLng  = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* ─── Slot Overlap Logic ───────────────────────────────────────────────────── */

/**
 * hasOverlap — Checks if two hour intervals overlap.
 * Intervals are treated as half-open: [start, start + duration).
 * Rule: newStart < existingEnd && newEnd > existingStart.
 * @param {number} newStart Start hour of candidate slot
 * @param {number} newDuration Duration of candidate slot
 * @param {number} existingStart Start hour of existing slot
 * @param {number} existingDuration Duration of existing slot
 * @returns {boolean} True if slots overlap.
 */
function hasOverlap(newStart, newDuration, existingStart, existingDuration) {
  const newEnd      = newStart      + newDuration;
  const existingEnd = existingStart + existingDuration;
  return newStart < existingEnd && newEnd > existingStart;
}

/* ─── Time Helpers ─────────────────────────────────────────────────────────── */

/**
 * parseHour — Converts "HH:MM" 24h string to integer hour (0–23).
 * @param {string} timeStr e.g. "08:00"
 * @returns {number} Integer hour.
 */
function parseHour(timeStr) {
  return parseInt(timeStr.split(":")[0], 10);
}

/**
 * isWithinHours — Verifies that a slot fits completely within the charger's window.
 * @param {number} startHour
 * @param {number} durationHours
 * @param {string} availableFrom "HH:MM"
 * @param {string} availableTo "HH:MM"
 * @returns {boolean}
 */
function isWithinHours(startHour, durationHours, availableFrom, availableTo) {
  const fromHour = parseHour(availableFrom);
  const toHour   = parseHour(availableTo);
  const endHour  = startHour + durationHours;
  return startHour >= fromHour && endHour <= toHour;
}

/* ─── Financial Estimator ──────────────────────────────────────────────────── */

/**
 * calcEarnings — Computes monthly gross, platform fee and net payout.
 * Formula:
 *   monthlyGross = availableHours * utilization * pricePerHour * 30
 *   fee = monthlyGross * 0.10
 *   monthlyNet = monthlyGross * 0.90
 * @param {number} availableHours Hours per day charger is listed
 * @param {number} utilization Fraction 0..1 (e.g. 0.25 for 25%)
 * @param {number} pricePerHour Hourly price in INR
 * @returns {{ gross: number, fee: number, net: number, idleHours: number }}
 */
function calcEarnings(availableHours, utilization, pricePerHour) {
  const PLATFORM_FEE = 0.10;
  const monthlyGross = availableHours * utilization * pricePerHour * 30;
  const fee          = monthlyGross * PLATFORM_FEE;
  const monthlyNet   = monthlyGross * (1 - PLATFORM_FEE);
  const idleHours    = Math.round((24 - availableHours * utilization) * 10) / 10;
  return {
    gross:     Math.round(monthlyGross),
    fee:       Math.round(fee),
    net:       Math.round(monthlyNet),
    idleHours: idleHours
  };
}

/* ─── Context-Aware Assistant Helpers ──────────────────────────────────────── */

/**
 * suggestConnector — Determines the dominant connector type from a list of chargers.
 * @param {Array<{connector: string}>} chargers
 * @returns {string} Most common connector name.
 */
function suggestConnector(chargers) {
  if (!chargers || chargers.length === 0) return "";
  const freq = {};
  chargers.forEach((c) => {
    freq[c.connector] = (freq[c.connector] || 0) + 1;
  });
  return Object.keys(freq).reduce((a, b) => (freq[a] >= freq[b] ? a : b));
}

/**
 * getAvailableSlots — Computes free 1-hour slots for a charger on a specific date.
 * @param {{ id: string, availableFrom: string, availableTo: string }} charger
 * @param {string} date "YYYY-MM-DD"
 * @param {Array<{ chargerId: string, date: string, startHour: number, durationHours: number }>} existingBookings
 * @returns {number[]} Array of available start hours.
 */
function getAvailableSlots(charger, date, existingBookings) {
  const fromH    = parseHour(charger.availableFrom);
  const toH      = parseHour(charger.availableTo);
  const sameDayB = existingBookings.filter((b) => b.chargerId === charger.id && b.date === date);
  const slots = [];
  for (let h = fromH; h < toH; h++) {
    const blocked = sameDayB.some((b) => hasOverlap(h, 1, b.startHour, b.durationHours));
    if (!blocked) slots.push(h);
  }
  return slots;
}

/**
 * recommendPricing — Dynamic pricing benchmark assistant for hosts.
 * Calculates optimal hourly market rate based on charger power and location demand.
 * @param {number|string} powerKw Charger power in kW
 * @param {string} area Selected Pune neighborhood
 * @returns {number} Suggested market price in INR (integer, ₹10–₹500).
 */
function recommendPricing(powerKw, area) {
  const p = parseFloat(powerKw) || 7.4;
  let baseRate = 75;

  if (p < 4) {
    baseRate = 45; // 3-pin slow (under 4kW)
  } else if (p <= 11) {
    baseRate = 75; // Standard 7.4–11 kW AC home charger
  } else if (p <= 25) {
    baseRate = 120; // 15–25 kW commercial fast AC/DC
  } else if (p <= 60) {
    baseRate = 175; // 50–60 kW DC fast
  } else {
    baseRate = 240; // 100kW+ Ultra fast
  }

  // Premium adjustment for high-density tech/commercial clusters
  const highDemand = ["Hinjewadi, Pune", "Baner, Pune", "Viman Nagar, Pune"];
  if (highDemand.indexOf(area) !== -1) {
    baseRate = Math.round((baseRate * 1.15) / 5) * 5; // +15% rounded to nearest ₹5
  }

  return Math.min(500, Math.max(10, baseRate));
}

/* ─── Validation Rules ─────────────────────────────────────────────────────── */

/**
 * validateCharger — Validates new charger data submitted by hosts.
 * @param {{ name: string, area: string, powerKw: string|number, pricePerHour: string|number, availableFrom: string, availableTo: string, hostName: string }} data
 * @returns {{ valid: boolean, errors: Object.<string, string> }}
 */
function validateCharger(data) {
  const errors = {};

  const name = (data.name || "").trim();
  if (name.length < 3 || name.length > 40) {
    errors.name = "Name must be 3–40 characters.";
  }

  if (!data.area) {
    errors.area = "Please select an area.";
  }

  const power = parseFloat(data.powerKw);
  if (isNaN(power) || power < 1 || power > 350) {
    errors.powerKw = "Power must be 1–350 kW.";
  }

  const price = parseInt(data.pricePerHour, 10);
  if (isNaN(price) || price < 10 || price > 500) {
    errors.pricePerHour = "Price must be ₹10–₹500 per hour.";
  }

  if (!data.availableFrom || !data.availableTo) {
    errors.availableHours = "Please set available hours.";
  } else {
    const fromH = parseHour(data.availableFrom);
    const toH   = parseHour(data.availableTo);
    if (toH <= fromH) {
      errors.availableHours = "Available To must be later than Available From.";
    }
  }

  const hostName = (data.hostName || "").trim();
  if (hostName.length < 2 || hostName.length > 30) {
    errors.hostName = "Host name must be 2–30 characters.";
  }

  return { valid: Object.keys(errors).length === 0, errors: errors };
}

/**
 * validateBooking — Validates booking parameters and checks for slot conflicts.
 * @param {{ date: string, startHour: number|string, durationHours: number|string, driverName: string }} data
 * @param {{ id: string, availableFrom: string, availableTo: string }} charger
 * @param {Array} existingBookings
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateBooking(data, charger, existingBookings) {
  const startHour  = parseInt(data.startHour, 10);
  const duration   = parseInt(data.durationHours, 10);
  const driverName = (data.driverName || "").trim();

  if (!data.date) {
    return { valid: false, error: "Please select a date." };
  }
  if (isNaN(startHour) || startHour < 0 || startHour > 23) {
    return { valid: false, error: "Invalid start hour." };
  }
  if (isNaN(duration) || duration < 1 || duration > 4) {
    return { valid: false, error: "Duration must be 1–4 hours." };
  }
  if (driverName.length < 2 || driverName.length > 30) {
    return { valid: false, error: "Driver name must be 2–30 characters." };
  }

  // Booking window limit: today to today + 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(data.date + "T00:00:00");
  const maxDate  = new Date(today);
  maxDate.setDate(maxDate.getDate() + 7);

  if (selected < today) {
    return { valid: false, error: "Date cannot be in the past." };
  }
  if (selected > maxDate) {
    return { valid: false, error: "Bookings are limited to 7 days ahead." };
  }

  // Must fit entirely within operating hours
  if (!isWithinHours(startHour, duration, charger.availableFrom, charger.availableTo)) {
    return {
      valid: false,
      error: "Booking must fit within the charger's hours (" +
             charger.availableFrom + "–" + charger.availableTo +
             "). Your slot would end at " + (startHour + duration) + ":00."
    };
  }

  // Overlap verification with existing bookings
  const sameDay = existingBookings.filter((b) => b.chargerId === charger.id && b.date === data.date);
  for (let i = 0; i < sameDay.length; i++) {
    const b = sameDay[i];
    if (hasOverlap(startHour, duration, b.startHour, b.durationHours)) {
      return {
        valid: false,
        error: "This slot (" + startHour + ":00–" + (startHour + duration) +
               ":00) overlaps an existing booking (" + b.startHour + ":00–" +
               (b.startHour + b.durationHours) + ":00). Please choose a different time."
      };
    }
  }

  return { valid: true, error: null };
}
