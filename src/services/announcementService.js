// src/services/announcementService.js
// Firestore operations for the Announcements module.

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

const announcementsRef = collection(db, "announcements");

export async function createAnnouncement(data, author) {
  const docRef = await addDoc(announcementsRef, {
    title: data.title.trim(),
    message: data.message.trim(),
    category: data.category || "company",
    priority: data.priority || "medium",
    publishDate: inputValueToTimestamp(data.publishDate),
    expirationDate: inputValueToTimestamp(data.expirationDate),
    author: data.author.trim() || author || "",
    status: data.status || "draft",
    createdBy: author || null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listAnnouncements() {
  const q = query(announcementsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateAnnouncement(id, data) {
  const ref = doc(db, "announcements", id);
  await updateDoc(ref, {
    title: data.title.trim(),
    message: data.message.trim(),
    category: data.category,
    priority: data.priority,
    publishDate: inputValueToTimestamp(data.publishDate),
    expirationDate: inputValueToTimestamp(data.expirationDate),
    author: data.author.trim(),
    status: data.status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAnnouncement(id) {
  await deleteDoc(doc(db, "announcements", id));
}