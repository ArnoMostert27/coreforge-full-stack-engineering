// src/services/clientService.js
// Firestore operations for the Clients module.

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

const clientsRef = collection(db, "clients");

export async function createClient(data, createdBy) {
  const docRef = await addDoc(clientsRef, {
    companyName: data.companyName.trim(),
    primaryContact: data.primaryContact.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    address: data.address.trim(),
    website: data.website.trim(),
    status: data.status || "lead",
    notes: data.notes.trim(),
    createdBy: createdBy || null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listClients() {
  const q = query(clientsRef, orderBy("companyName"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateClient(id, data) {
  const ref = doc(db, "clients", id);
  await updateDoc(ref, {
    companyName: data.companyName.trim(),
    primaryContact: data.primaryContact.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    address: data.address.trim(),
    website: data.website.trim(),
    status: data.status,
    notes: data.notes.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteClient(id) {
  const ref = doc(db, "clients", id);
  await deleteDoc(ref);
}