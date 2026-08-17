// src/services/settingsService.js
// Centralized CoreForge settings, stored as a single Firestore document.

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const SETTINGS_DOC = doc(db, "settings", "coreforge");

export const DEFAULT_SETTINGS = {
  companyName: "",
  contactEmail: "",
  phone: "",
  address: "",
  defaultCurrency: "ZAR",
  dateFormat: "DD MMM YYYY",
  timeFormat: "24h",
  theme: "dark",
  dashboardDensity: "comfortable",
  notifyOverdueInvoices: true,
  notifyUpcomingMeetings: true,
  notifyTaskDue: true,
  notifyDeployments: false,
};

export async function loadSettings() {
  try {
    const snap = await getDoc(SETTINGS_DOC);
    if (snap.exists()) {
      return { ...DEFAULT_SETTINGS, ...snap.data() };
    }
    return { ...DEFAULT_SETTINGS };
  } catch (err) {
    console.error("Failed to load settings:", err);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  await setDoc(
    SETTINGS_DOC,
    { ...settings, updatedAt: serverTimestamp() },
    { merge: true }
  );
}