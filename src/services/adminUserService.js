// src/services/adminUserService.js
// Manage Firestore user records (role, status, notes). Auth accounts are
// created separately in the Firebase console (V1 login model).

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

const usersRef = collection(db, "users");

export async function listAllUsers() {
  const q = query(usersRef, orderBy("email"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Create a user record (not an Auth account).
export async function createUserRecord(data, createdBy) {
  const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();
  const docRef = await addDoc(usersRef, {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    displayName,
    email: data.email.trim(),
    role: data.role || "developer",
    status: data.status || "active",
    notes: data.notes.trim(),
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateUserRecord(id, data) {
  const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();
  const ref = doc(db, "users", id);
  await updateDoc(ref, {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    displayName,
    email: data.email.trim(),
    role: data.role,
    status: data.status,
    notes: data.notes.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUserRecord(id) {
  await deleteDoc(doc(db, "users", id));
}