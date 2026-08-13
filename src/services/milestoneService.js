// src/services/milestoneService.js
// Firestore operations for the Milestones module.

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

const milestonesRef = collection(db, "milestones");

export async function createMilestone(
  { name, description, projectId, dueDate, status, progress },
  createdBy
) {
  const docRef = await addDoc(milestonesRef, {
    name: name.trim(),
    description: description.trim(),
    projectId: projectId || null,
    dueDate: dueDate || null,
    status: status || "open",
    progress: Number(progress) || 0,
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function listMilestones() {
  const q = query(milestonesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateMilestone(
  id,
  { name, description, projectId, dueDate, status, progress }
) {
  const ref = doc(db, "milestones", id);
  await updateDoc(ref, {
    name: name.trim(),
    description: description.trim(),
    projectId: projectId || null,
    dueDate: dueDate || null,
    status,
    progress: Number(progress) || 0,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMilestone(id) {
  const ref = doc(db, "milestones", id);
  await deleteDoc(ref);
}