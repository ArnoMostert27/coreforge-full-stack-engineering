// src/services/environmentService.js
// Firestore operations for the Environments module.
// Last-deployment date stored as a Firestore Timestamp via the dates utility.

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

const environmentsRef = collection(db, "environments");

export async function createEnvironment(data, createdBy) {
  const docRef = await addDoc(environmentsRef, {
    name: data.name || "development",
    url: data.url.trim(),
    branch: data.branch.trim(),
    status: data.status || "healthy",
    lastDeployment: inputValueToTimestamp(data.lastDeployment),
    notes: data.notes.trim(),
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listEnvironments() {
  const q = query(environmentsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateEnvironment(id, data) {
  const ref = doc(db, "environments", id);
  await updateDoc(ref, {
    name: data.name,
    url: data.url.trim(),
    branch: data.branch.trim(),
    status: data.status,
    lastDeployment: inputValueToTimestamp(data.lastDeployment),
    notes: data.notes.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEnvironment(id) {
  const ref = doc(db, "environments", id);
  await deleteDoc(ref);
}