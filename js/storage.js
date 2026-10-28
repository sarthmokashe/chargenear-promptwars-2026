// storage.js — Safe localStorage read/write helpers for ChargeNear
// Every read/write is wrapped in try/catch; falls back to seed data on error.

/* global SEED_CHARGERS */

const STORAGE_KEYS = {
  CHARGERS: "chargenear_chargers_v1",
  BOOKINGS: "chargenear_bookings_v1",
  USER_LOC: "chargenear_userloc_v1"
};

// Load chargers from localStorage; seeds with SEED_CHARGERS if empty or corrupt.
function loadChargers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHARGERS);
    if (!raw) {
      saveChargers(SEED_CHARGERS);
      return SEED_CHARGERS.map(function(c) { return Object.assign({}, c); });
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed;
  } catch (e) {
    console.warn("ChargeNear: localStorage read error for chargers, using seed data.", e);
    return SEED_CHARGERS.map(function(c) { return Object.assign({}, c); });
  }
}

// Persist the chargers array to localStorage.
function saveChargers(chargers) {
  try {
    localStorage.setItem(STORAGE_KEYS.CHARGERS, JSON.stringify(chargers));
  } catch (e) {
    console.warn("ChargeNear: could not save chargers to localStorage.", e);
  }
}

// Load bookings from localStorage; returns [] on error.
function loadBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed;
  } catch (e) {
    console.warn("ChargeNear: localStorage read error for bookings.", e);
    return [];
  }
}

// Persist the bookings array to localStorage.
function saveBookings(bookings) {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  } catch (e) {
    console.warn("ChargeNear: could not save bookings to localStorage.", e);
  }
}

// Load user location {lat, lng}; returns null if not set or invalid.
function loadUserLoc() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_LOC);
    if (!raw) return null;
    const loc = JSON.parse(raw);
    if (typeof loc.lat !== "number" || typeof loc.lng !== "number") return null;
    return loc;
  } catch (e) {
    return null;
  }
}

// Persist user coordinates (only lat/lng, nothing else).
function saveUserLoc(lat, lng) {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_LOC, JSON.stringify({ lat: lat, lng: lng }));
  } catch (e) {
    console.warn("ChargeNear: could not save user location.", e);
  }
}
