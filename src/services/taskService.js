// src/services/taskService.js
// Firestore operations for the Tasks module.

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

const tasksRef = collection(db, "tasks");

export async function createTask(
  { title, description, projectId, status, priority, dueDate },
  createdBy
) {
  const docRef = await addDoc(tasksRef, {
    title: title.trim(),
    description: description.trim(),
    projectId: projectId || null,
    status: status || "todo",
    priority: priority || "medium",
    dueDate: dueDate || null,
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function listTasks() {
  const q = query(tasksRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateTask(
  id,
  { title, description, projectId, status, priority, dueDate }
) {
  const ref = doc(db, "tasks", id);
  await updateDoc(ref, {
    title: title.trim(),
    description: description.trim(),
    projectId: projectId || null,
    status,
    priority,
    dueDate: dueDate || null,
    updatedAt: serverTimestamp(),
  });
}

// Update only the status of a task (used by the Kanban board).
export async function updateTaskStatus(id, status) {
  const ref = doc(db, "tasks", id);
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(id) {
  const ref = doc(db, "tasks", id);
  await deleteDoc(ref);
}