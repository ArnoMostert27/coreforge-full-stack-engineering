// src/services/adminUserService.js
// Manage Firestore user records (role, status, responsibilities, notes). Auth
// accounts are created separately in the Firebase console (V1 login model).

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

function clean(v) {
  return (v || "").trim();
}

export async function listAllUsers() {
  const q = query(usersRef, orderBy("email"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Create a user record (not an Auth account).
export async function createUserRecord(data, createdBy) {
  const displayName = `${clean(data.firstName)} ${clean(data.lastName)}`.trim();
  const docRef = await addDoc(usersRef, {
    firstName: clean(data.firstName),
    lastName: clean(data.lastName),
    displayName,
    email: clean(data.email),
    role: data.role || "developer",
    status: data.status || "active",
    responsibilities: clean(data.responsibilities),
    notes: clean(data.notes),
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateUserRecord(id, data) {
  const displayName = `${clean(data.firstName)} ${clean(data.lastName)}`.trim();
  const ref = doc(db, "users", id);
  await updateDoc(ref, {
    firstName: clean(data.firstName),
    lastName: clean(data.lastName),
    displayName,
    email: clean(data.email),
    role: data.role,
    status: data.status,
    responsibilities: clean(data.responsibilities),
    notes: clean(data.notes),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUserRecord(id) {
  await deleteDoc(doc(db, "users", id));
}
