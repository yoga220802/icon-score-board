"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserDoc, UserRole } from "@/lib/types";

export type AuthState = {
  user: User | null;
  profile: UserDoc | null;
  role: UserRole | null;
  loading: boolean;
};

export const useAuth = (): AuthState => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, profile: null, role: null, loading: false });
        return;
      }

      const profileRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(profileRef);
      const profile = snapshot.exists() ? (snapshot.data() as UserDoc) : null;

      setState({
        user,
        profile,
        role: profile?.role ?? null,
        loading: false,
      });
    });

    return () => unsubscribe();
  }, []);

  return state;
};
