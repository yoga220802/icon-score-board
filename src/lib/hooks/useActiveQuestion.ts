"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Question } from "@/lib/types";

export const useActiveQuestion = (questionId: string | null | undefined) => {
  const [question, setQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (!questionId) {
      setQuestion(null);
      return;
    }

    const ref = doc(db, "questions_phase1", questionId);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      setQuestion(snapshot.exists() ? (snapshot.data() as Question) : null);
    });

    return () => unsubscribe();
  }, [questionId]);

  return question;
};
