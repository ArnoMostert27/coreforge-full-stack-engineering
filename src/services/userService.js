// src/services/userService.js
// Firestore read operations for the Team directory.

import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

const usersRef = collection(db, "users");

// List all users. Ordered by email for a stable directory.
export async function listUsers() {
  const q = query(usersRef, orderBy("email"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}