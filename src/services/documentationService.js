// src/services/documentationService.js
// Firestore operations for the Documentation module.

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

const docsRef = collection(db, "documentation");

export async function createDoc(data, author) {
  const docRef = await addDoc(docsRef, {
    title: data.title.trim(),
    category: data.category || "development",
    content: data.content.trim(),
    author: data.author.trim() || author || "",
    tags: data.tags.trim(),
    createdBy: author || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listDocs() {
  const q = query(docsRef, orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateDocument(id, data) {
  const ref = doc(db, "documentation", id);
  await updateDoc(ref, {
    title: data.title.trim(),
    category: data.category,
    content: data.content.trim(),
    author: data.author.trim(),
    tags: data.tags.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(id) {
  await deleteDoc(doc(db, "documentation", id));
}