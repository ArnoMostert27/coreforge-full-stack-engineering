// src/services/meetingService.js
// Firestore operations for the Meetings module.

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

const meetingsRef = collection(db, "meetings");

export async function createMeeting(data, createdBy) {
  const docRef = await addDoc(meetingsRef, {
    title: data.title.trim(),
    date: inputValueToTimestamp(data.date),
    time: data.time || "",
    duration: data.duration.trim(),
    participants: data.participants.trim(),
    type: data.type || "internal",
    agenda: data.agenda.trim(),
    notes: data.notes.trim(),
    actionItems: data.actionItems.trim(),
    status: data.status || "scheduled",
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listMeetings() {
  const q = query(meetingsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateMeeting(id, data) {
  const ref = doc(db, "meetings", id);
  await updateDoc(ref, {
    title: data.title.trim(),
    date: inputValueToTimestamp(data.date),
    time: data.time || "",
    duration: data.duration.trim(),
    participants: data.participants.trim(),
    type: data.type,
    agenda: data.agenda.trim(),
    notes: data.notes.trim(),
    actionItems: data.actionItems.trim(),
    status: data.status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMeeting(id) {
  await deleteDoc(doc(db, "meetings", id));
}