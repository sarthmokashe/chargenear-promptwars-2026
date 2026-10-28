// logic.js — Pure business-logic functions (no DOM access)
// All functions are unit-tested in tests/logic.test.html

// ---------------------------------------------------------------------------
// haversineKm: great-circle distance in km between two lat/lng points.
// ---------------------------------------------------------------------------
function haversineKm(lat1, lng1, lat2, lng2) {
  var R = 6371;
  var toRad = function(d) { return (d * Math.PI) / 180; };
  var dLat = toRad(lat2 - lat1);
  var dLng = toRad(lng2 - lng1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------------------------------------------------------------------
// hasOverlap: returns true if two hour-based slots overlap.
// Slot = [start, start + duration). Overlap when newStart < existEnd && newEnd > existStart.
// ---------------------------------------------------------------------------
function hasOverlap(newStart, newDuration, existingStart, existingDuration) {
  var newEnd      = newStart      + newDuration;
  var existingEnd = existingStart + existingDuration;
  return newStart < existingEnd && newEnd > existingStart;
}

// ---------------------------------------------------------------------------
// parseHour: parse "HH:MM" string to integer hour (0–23).
// ---------------------------------------------------------------------------
function parseHour(timeStr) {
  return parseInt(timeStr.split(":")[0], 10);
}

// ---------------------------------------------------------------------------
// isWithinHours: returns true if [startHour, startHour+duration] fits inside
// the charger's [availableFrom, availableTo].
// ---------------------------------------------------------------------------
function isWithinHours(startHour, durationHours, availableFrom, availableTo) {
  var fromHour = parseHour(availableFrom);
  var toHour   = parseHour(availableTo);
  var endHour  = startHour + durationHours;
  return startHour >= fromHour && endHour <= toHour;
}

// ---------------------------------------------------------------------------
// calcEarnings: monthly earnings estimate.
// availableHours: hours/day the charger is available
// utilization:    fraction 0..1 (e.g. 0.25 = 25%)
// pricePerHour:   INR
// Returns { gross, fee, net, idleHours } all rounded integers except idleHours.
// ---------------------------------------------------------------------------
function calcEarnings(availableHours, utilization, pricePerHour) {
  var PLATFORM_FEE = 0.10;
  var monthlyGross = availableHours * utilization * pricePerHour * 30;
  var fee          = monthlyGross * PLATFORM_FEE;
  var monthlyNet   = monthlyGross * (1 - PLATFORM_FEE);
  var idleHours    = Math.round((24 - availableHours * utilization) * 10) / 10;
  return {
    gross:     Math.round(monthlyGross),
    fee:       Math.round(fee),
    net:       Math.round(monthlyNet),
    idleHours: idleHours
  };
}

// ---------------------------------------------------------------------------
// validateCharger: validate host-form data.
// Returns { valid: bool, errors: { fieldKey: "message" } }
// ---------------------------------------------------------------------------
function validateCharger(data) {
  var errors = {};

  var name = (data.name || "").trim();
  if (name.length < 3 || name.length > 40) {
    errors.name = "Name must be 3–40 characters.";
  }

  if (!data.area) {
    errors.area = "Please select an area.";
  }

  var power = parseFloat(data.powerKw);
  if (isNaN(power) || power < 1 || power > 350) {
    errors.powerKw = "Power must be 1–350 kW.";
  }

  var price = parseInt(data.pricePerHour, 10);
  if (isNaN(price) || price < 10 || price > 500) {
    errors.pricePerHour = "Price must be ₹10–₹500 per hour.";
  }

  if (!data.availableFrom || !data.availableTo) {
    errors.availableHours = "Please set available hours.";
  } else {
    var fromH = parseHour(data.availableFrom);
    var toH   = parseHour(data.availableTo);
    if (toH <= fromH) {
      errors.availableHours = "Available To must be later than Available From.";
    }
  }

  var hostName = (data.hostName || "").trim();
  if (hostName.length < 2 || hostName.length > 30) {
    errors.hostName = "Host name must be 2–30 characters.";
  }

  return { valid: Object.keys(errors).length === 0, errors: errors };
}

// ---------------------------------------------------------------------------
// validateBooking: validate booking-form data against the charger and existing bookings.
// Returns { valid: bool, error: string|null }
// ---------------------------------------------------------------------------
function validateBooking(data, charger, existingBookings) {
  var startHour    = parseInt(data.startHour, 10);
  var duration     = parseInt(data.durationHours, 10);
  var driverName   = (data.driverName || "").trim();

  if (!data.date)                               return { valid: false, error: "Please select a date." };
  if (isNaN(startHour) || startHour < 0 || startHour > 23)
                                                return { valid: false, error: "Invalid start hour." };
  if (isNaN(duration) || duration < 1 || duration > 4)
                                                return { valid: false, error: "Duration must be 1–4 hours." };
  if (driverName.length < 1 || driverName.length > 50)
                                                return { valid: false, error: "Please enter your name (max 50 chars)." };

  // Date must be today..today+7
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var selected = new Date(data.date + "T00:00:00");
  var maxDate  = new Date(today);
  maxDate.setDate(maxDate.getDate() + 7);
  if (selected < today)   return { valid: false, error: "Date cannot be in the past." };
  if (selected > maxDate) return { valid: false, error: "Bookings are limited to 7 days ahead." };

  // Slot must fit inside charger available hours
  if (!isWithinHours(startHour, duration, charger.availableFrom, charger.availableTo)) {
    return {
      valid: false,
      error: "Booking must fit within the charger's hours (" +
             charger.availableFrom + "–" + charger.availableTo +
             "). Your slot would end at " + (startHour + duration) + ":00."
    };
  }

  // Check for overlapping existing bookings on the same charger & date
  var sameDay = existingBookings.filter(function(b) {
    return b.chargerId === charger.id && b.date === data.date;
  });
  for (var i = 0; i < sameDay.length; i++) {
    var b = sameDay[i];
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
