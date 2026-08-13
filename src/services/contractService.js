// src/services/contractService.js
// Firestore operations for the Contracts module.
// Dates stored as Firestore Timestamps via the dates utility.

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

const contractsRef = collection(db, "contracts");

export async function createContract(data, createdBy) {
  const docRef = await addDoc(contractsRef, {
    contractNumber: data.contractNumber.trim(),
    clientId: data.clientId || null,
    projectId: data.projectId || null,
    startDate: inputValueToTimestamp(data.startDate),
    endDate: inputValueToTimestamp(data.endDate),
    renewalDate: inputValueToTimestamp(data.renewalDate),
    value: Number(data.value) || 0,
    currency: data.currency || "ZAR",
    status: data.status || "draft",
    notes: data.notes.trim(),
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listContracts() {
  const q = query(contractsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateContract(id, data) {
  const ref = doc(db, "contracts", id);
  await updateDoc(ref, {
    contractNumber: data.contractNumber.trim(),
    clientId: data.clientId || null,
    projectId: data.projectId || null,
    startDate: inputValueToTimestamp(data.startDate),
    endDate: inputValueToTimestamp(data.endDate),
    renewalDate: inputValueToTimestamp(data.renewalDate),
    value: Number(data.value) || 0,
    currency: data.currency,
    status: data.status,
    notes: data.notes.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteContract(id) {
  const ref = doc(db, "contracts", id);
  await deleteDoc(ref);
}