// src/services/taskService.js
// Firestore operations for the Tasks module.
// Due dates are stored as Firestore Timestamps (via the dates utility).
// Recurring tasks regenerate a new record only when completed.
//
// Assignment: assigneeId is the source of truth (a users/{id} doc id).
// assigneeName is denormalized alongside it so boards and lists can render a
// name without a second lookup; the UI prefers the live user record when found.

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
import { inputValueToTimestamp, nextRecurrence } from "../utils/dates";

const tasksRef = collection(db, "tasks");

// dueDate arrives as an <input type="date"> string; convert to Timestamp.
export async function createTask(
  {
    title,
    description,
    projectId,
    status,
    priority,
    dueDate,
    recurrence,
    assigneeId,
    assigneeName,
  },
  createdBy
) {
  const docRef = await addDoc(tasksRef, {
    title: title.trim(),
    description: description.trim(),
    projectId: projectId || null,
    status: status || "todo",
    priority: priority || "medium",
    dueDate: inputValueToTimestamp(dueDate),
    recurrence: recurrence || "none",
    assigneeId: assigneeId || null,
    assigneeName: (assigneeName || "").trim() || null,
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

// Regular edit — never regenerates a recurring task.
export async function updateTask(
  id,
  {
    title,
    description,
    projectId,
    status,
    priority,
    dueDate,
    recurrence,
    assigneeId,
    assigneeName,
  }
) {
  const ref = doc(db, "tasks", id);
  await updateDoc(ref, {
    title: title.trim(),
    description: description.trim(),
    projectId: projectId || null,
    status,
    priority,
    dueDate: inputValueToTimestamp(dueDate),
    recurrence: recurrence || "none",
    assigneeId: assigneeId || null,
    assigneeName: (assigneeName || "").trim() || null,
    updatedAt: serverTimestamp(),
  });
}

// Reassign a task without touching anything else (used by list/board quick
// assign). Pass assigneeId "" / null to unassign.
export async function assignTask(id, assigneeId, assigneeName) {
  const ref = doc(db, "tasks", id);
  await updateDoc(ref, {
    assigneeId: assigneeId || null,
    assigneeName: (assigneeName || "").trim() || null,
    updatedAt: serverTimestamp(),
  });
}

// Status-only update (used by Kanban and Tasks status changes).
// If the task becomes "done" and is recurring, spawn the next occurrence.
// `task` is the full current task object (with its stored dueDate value).
export async function updateTaskStatus(task, newStatus) {
  const ref = doc(db, "tasks", task.id);

  await updateDoc(ref, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  const wasNotDone = task.status !== "done";
  const isNowDone = newStatus === "done";
  const isRecurring = task.recurrence && task.recurrence !== "none";

  if (wasNotDone && isNowDone && isRecurring) {
    const nextDue = nextRecurrence(task.dueDate, task.recurrence);

    await addDoc(tasksRef, {
      title: task.title,
      description: task.description || "",
      projectId: task.projectId || null,
      status: "todo",
      priority: task.priority || "medium",
      dueDate: nextDue,
      recurrence: task.recurrence,
      // The next occurrence stays with whoever owns the recurring task.
      assigneeId: task.assigneeId || null,
      assigneeName: task.assigneeName || null,
      createdBy: task.createdBy || null,
      createdAt: serverTimestamp(),
      regeneratedFrom: task.id,
    });
  }
}

export async function deleteTask(id) {
  const ref = doc(db, "tasks", id);
  await deleteDoc(ref);
}
