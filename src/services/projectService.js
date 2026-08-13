// src/services/projectService.js
// Firestore operations for the Projects module.

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

const projectsRef = collection(db, "projects");

// Create a new project document.
export async function createProject({ name, description, status }, createdBy) {
  const docRef = await addDoc(projectsRef, {
    name: name.trim(),
    description: description.trim(),
    status: status || "active",
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

// Fetch all projects, newest first.
export async function listProjects() {
  const q = query(projectsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Update an existing project.
export async function updateProject(id, { name, description, status }) {
  const ref = doc(db, "projects", id);
  await updateDoc(ref, {
    name: name.trim(),
    description: description.trim(),
    status,
    updatedAt: serverTimestamp(),
  });
}

// Delete a project.
export async function deleteProject(id) {
  const ref = doc(db, "projects", id);
  await deleteDoc(ref);
}