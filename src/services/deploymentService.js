// src/services/deploymentService.js
// Firestore operations for the Deployments module.
// Deployment dates stored as Firestore Timestamps via the dates utility.

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

const deploymentsRef = collection(db, "deployments");

export async function createDeployment(data, createdBy) {
  const docRef = await addDoc(deploymentsRef, {
    projectId: data.projectId || null,
    version: data.version.trim(),
    commitSha: data.commitSha.trim(),
    environment: data.environment || "development",
    deploymentDate: inputValueToTimestamp(data.deploymentDate),
    status: data.status || "pending",
    deployedBy: data.deployedBy.trim(),
    notes: data.notes.trim(),
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listDeployments() {
  const q = query(deploymentsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateDeployment(id, data) {
  const ref = doc(db, "deployments", id);
  await updateDoc(ref, {
    projectId: data.projectId || null,
    version: data.version.trim(),
    commitSha: data.commitSha.trim(),
    environment: data.environment,
    deploymentDate: inputValueToTimestamp(data.deploymentDate),
    status: data.status,
    deployedBy: data.deployedBy.trim(),
    notes: data.notes.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDeployment(id) {
  const ref = doc(db, "deployments", id);
  await deleteDoc(ref);
}