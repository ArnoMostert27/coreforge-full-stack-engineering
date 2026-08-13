// src/services/invoiceService.js
// Firestore operations for the Invoices module.
// Stored total fields are computed at save time; line items stored as an array.

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { inputValueToTimestamp } from "../utils/dates";
import { calculateInvoice } from "../utils/invoice";

const invoicesRef = collection(db, "invoices");

function cleanLineItems(lineItems) {
  return (lineItems || [])
    .filter((li) => (li.description || "").trim() !== "" || Number(li.unitPrice) > 0)
    .map((li) => ({
      description: (li.description || "").trim(),
      quantity: Number(li.quantity) || 0,
      unitPrice: Number(li.unitPrice) || 0,
    }));
}

function buildDoc(data) {
  const lineItems = cleanLineItems(data.lineItems);
  const totals = calculateInvoice(lineItems, data.taxPercent, data.discountPercent);

  return {
    invoiceNumber: data.invoiceNumber.trim(),
    clientId: data.clientId || null,
    projectId: data.projectId || null,
    contractId: data.contractId || null,
    issueDate: inputValueToTimestamp(data.issueDate),
    dueDate: inputValueToTimestamp(data.dueDate),
    lineItems,
    taxPercent: Number(data.taxPercent) || 0,
    discountPercent: Number(data.discountPercent) || 0,
    subtotal: totals.subtotal,
    total: totals.total,
    currency: data.currency || "ZAR",
    status: data.status || "draft",
    notes: data.notes.trim(),
  };
}

export async function createInvoice(data, createdBy) {
  const docRef = await addDoc(invoicesRef, {
    ...buildDoc(data),
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listInvoices() {
  const q = query(invoicesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateInvoice(id, data) {
  const ref = doc(db, "invoices", id);
  await updateDoc(ref, {
    ...buildDoc(data),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteInvoice(id) {
  const ref = doc(db, "invoices", id);
  await deleteDoc(ref);
}