// src/services/paymentService.js
// Firestore operations for Payments + invoice settlement recalculation.

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { inputValueToTimestamp } from "../utils/dates";
import { settledStatus } from "../utils/payment";

const paymentsRef = collection(db, "payments");

export async function listPayments() {
  const q = query(paymentsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Recalculate a single invoice's status from all its payments.
async function recalcInvoice(invoiceId) {
  if (!invoiceId) return;

  const invoiceRef = doc(db, "invoices", invoiceId);
  const invoiceSnap = await getDoc(invoiceRef);
  if (!invoiceSnap.exists()) return;

  const invoice = invoiceSnap.data();

  // Sum payments for this invoice.
  const q = query(paymentsRef, where("invoiceId", "==", invoiceId));
  const snap = await getDocs(q);
  const paid = snap.docs.reduce(
    (sum, d) => sum + (Number(d.data().amount) || 0),
    0
  );

  const newStatus = settledStatus(invoice.status, invoice.total, paid);

  if (newStatus !== invoice.status) {
    await updateDoc(invoiceRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function createPayment(data, recordedBy) {
  const docRef = await addDoc(paymentsRef, {
    invoiceId: data.invoiceId || null,
    clientId: data.clientId || null,
    amount: Number(data.amount) || 0,
    currency: data.currency || "ZAR",
    paymentDate: inputValueToTimestamp(data.paymentDate),
    method: data.method || "",
    reference: data.reference.trim(),
    notes: data.notes.trim(),
    recordedBy: recordedBy || null,
    createdAt: serverTimestamp(),
  });

  await recalcInvoice(data.invoiceId);
  return docRef.id;
}

export async function deletePayment(id) {
  // Read the payment first so we know which invoice to recalc.
  const ref = doc(db, "payments", id);
  const snap = await getDoc(ref);
  const invoiceId = snap.exists() ? snap.data().invoiceId : null;

  await deleteDoc(ref);
  await recalcInvoice(invoiceId);
}