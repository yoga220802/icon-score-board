"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GameState } from "@/lib/types";

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, "game_state", "main");
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      setGameState(snapshot.exists() ? (snapshot.data() as GameState) : null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { gameState, loading };
};
