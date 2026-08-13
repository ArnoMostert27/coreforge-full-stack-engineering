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

// Create a new task document.
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

// Fetch all tasks, newest first.
export async function listTasks() {
  const q = query(tasksRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Update an existing task.
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

// Delete a task.
export async function deleteTask(id) {
  const ref = doc(db, "tasks", id);
  await deleteDoc(ref);
}