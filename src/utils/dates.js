// src/utils/dates.js
// Centralized date handling for CoreForge.
// All conversions between Firestore Timestamps, <input type="date"> strings,
// and display strings live here. Do not scatter date logic elsewhere.

import { Timestamp } from "firebase/firestore";

// Normalize any stored dueDate value (Timestamp | "YYYY-MM-DD" string | null)
// into a JavaScript Date, or null if empty/invalid.
export function toDate(value) {
  if (!value) return null;

  // Firestore Timestamp (has toDate()).
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate();
  }

  // Legacy "YYYY-MM-DD" string.
  if (typeof value === "string") {
    const d = new Date(value + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  // Raw Date.
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  return null;
}

// Date → "YYYY-MM-DD" for <input type="date"> value.
function dateToInputString(d) {
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Stored value → <input type="date"> string.
export function toInputValue(value) {
  return dateToInputString(toDate(value));
}

// <input type="date"> string → Firestore Timestamp (or null if empty).
export function inputValueToTimestamp(inputStr) {
  if (!inputStr) return null;
  const d = new Date(inputStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return Timestamp.fromDate(d);
}

// Stored value → human display string (e.g. "15 Aug 2026"), or "—".
export function toDisplay(value) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Compute the next due date from a stored value + recurrence.
// Returns a Firestore Timestamp, or null if no recurrence / no base date.
export function nextRecurrence(value, recurrence) {
  if (!recurrence || recurrence === "none") return null;
  const base = toDate(value);
  if (!base) return null;

  const next = new Date(base.getTime());

  if (recurrence === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (recurrence === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (recurrence === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else {
    return null;
  }

  return Timestamp.fromDate(next);
}