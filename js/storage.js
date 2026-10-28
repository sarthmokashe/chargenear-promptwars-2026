/**
 * storage.js — Safe localStorage read/write helpers for ChargeNear.
 * Every read and write is wrapped in try/catch; gracefully recovers to seed data on error.
 */

"use strict";

/* global SEED_CHARGERS */

const STORAGE_KEYS = Object.freeze({
  CHARGERS: "chargenear_chargers_v1",
  BOOKINGS: "chargenear_bookings_v1",
  USER_LOC: "chargenear_userloc_v1"
});

/**
 * loadChargers — Loads persisted chargers or initializes storage with seed data.
 * @returns {Array<Object>} List of charger objects.
 */
function loadChargers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHARGERS);
    if (!raw) {
      saveChargers(SEED_CHARGERS);
      return SEED_CHARGERS.map((c) => Object.assign({}, c));
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Chargers payload is not an array");
    return parsed;
  } catch (e) {
    console.warn("ChargeNear: localStorage read error for chargers, using seed data.", e);
    return SEED_CHARGERS.map((c) => Object.assign({}, c));
  }
}

/**
 * saveChargers — Persists the chargers list to localStorage.
 * @param {Array<Object>} chargers
 */
function saveChargers(chargers) {
  try {
    localStorage.setItem(STORAGE_KEYS.CHARGERS, JSON.stringify(chargers));
  } catch (e) {
    console.warn("ChargeNear: could not save chargers to localStorage.", e);
  }
}

/**
 * loadBookings — Retrieves stored user bookings.
 * @returns {Array<Object>} List of booking objects.
 */
function loadBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Bookings payload is not an array");
    return parsed;
  } catch (e) {
    console.warn("ChargeNear: localStorage read error for bookings.", e);
    return [];
  }
}

/**
 * saveBookings — Persists user bookings to localStorage.
 * @param {Array<Object>} bookings
 */
function saveBookings(bookings) {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  } catch (e) {
    console.warn("ChargeNear: could not save bookings to localStorage.", e);
  }
}

/**
 * loadUserLoc — Retrieves cached user coordinates.
 * @returns {{lat: number, lng: number}|null}
 */
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

/**
 * saveUserLoc — Persists user coordinates (strictly lat and lng numbers).
 * @param {number} lat
 * @param {number} lng
 */
function saveUserLoc(lat, lng) {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_LOC, JSON.stringify({ lat: lat, lng: lng }));
  } catch (e) {
    console.warn("ChargeNear: could not save user location.", e);
  }
}
