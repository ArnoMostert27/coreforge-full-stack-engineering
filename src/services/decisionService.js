// src/services/decisionService.js
// Firestore operations for the Decisions log.

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

const decisionsRef = collection(db, "decisions");

export async function createDecision(data, createdBy) {
  const docRef = await addDoc(decisionsRef, {
    title: data.title.trim(),
    category: data.category.trim(),
    description: data.description.trim(),
    date: inputValueToTimestamp(data.date),
    owner: data.owner.trim(),
    status: data.status || "proposed",
    projectId: data.projectId || null,
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listDecisions() {
  const q = query(decisionsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateDecision(id, data) {
  const ref = doc(db, "decisions", id);
  await updateDoc(ref, {
    title: data.title.trim(),
    category: data.category.trim(),
    description: data.description.trim(),
    date: inputValueToTimestamp(data.date),
    owner: data.owner.trim(),
    status: data.status,
    projectId: data.projectId || null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDecision(id) {
  await deleteDoc(doc(db, "decisions", id));
}