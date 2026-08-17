// src/services/auditService.js
// Centralized, reusable audit logging. Records are immutable (create + read only).

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const auditRef = collection(db, "auditLogs");

// Log an action. Call from anywhere: auditLog({ action, module, user, details }).
export async function auditLog({ action, module, user, details }) {
  try {
    await addDoc(auditRef, {
      action: action || "action",
      module: module || "system",
      user: user || "unknown",
      details: details || "",
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // Never let audit failures break the primary action.
    console.error("Audit log failed:", err);
  }
}

export async function listAuditLogs(max = 300) {
  const q = query(auditRef, orderBy("timestamp", "desc"), limit(max));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}