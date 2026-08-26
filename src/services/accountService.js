// src/services/accountService.js
// Firestore operations for the Accounts module (platform logins, links).
//
// NOTE: credentials are stored as entered. Access is gated at the UI level to
// admins only (see permissions.js). Lock the "accounts" collection down in your
// Firestore security rules so only authenticated admin users can read it.

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

const accountsRef = collection(db, "accounts");

function clean(v) {
  return (v || "").trim();
}

function payload(data) {
  return {
    platform: clean(data.platform),
    category: data.category || "other",
    accountLabel: clean(data.accountLabel),
    url: clean(data.url),
    username: clean(data.username),
    email: clean(data.email),
    password: clean(data.password),
    twoFactor: clean(data.twoFactor),
    owner: clean(data.owner),
    links: clean(data.links),
    notes: clean(data.notes),
  };
}

export async function listAccounts() {
  const q = query(accountsRef, orderBy("platform"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createAccount(data, createdBy) {
  const docRef = await addDoc(accountsRef, {
    ...payload(data),
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateAccount(id, data) {
  const ref = doc(db, "accounts", id);
  await updateDoc(ref, {
    ...payload(data),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAccount(id) {
  await deleteDoc(doc(db, "accounts", id));
}
