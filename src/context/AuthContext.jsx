// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const profileData = await loadOrCreateProfile(currentUser);
        setProfile(profileData);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

async function loadOrCreateProfile(currentUser) {
  const ref = doc(db, "users", currentUser.uid);

  try {
    const snapshot = await getDoc(ref);

    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }

    // First login for this account — create the user record.
    const newProfile = {
      email: currentUser.email,
      displayName: currentUser.email.split("@")[0],
      role: "admin",
      createdAt: serverTimestamp(),
    };

    await setDoc(ref, newProfile);

    return { id: currentUser.uid, ...newProfile };
  } catch (err) {
    console.error("Failed to load or create user profile:", err);
    return null;
  }
}

export function useAuth() {
  return useContext(AuthContext);
}