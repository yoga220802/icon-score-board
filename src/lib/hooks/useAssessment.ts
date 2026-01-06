"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assessment, AssessmentPhase } from "@/lib/types";

export const useAssessment = (
  teamId: string,
  judgeId: string | null | undefined,
  phase: AssessmentPhase
) => {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId || !judgeId) return;

    const ref = doc(db, "teams", teamId, "assessments", `${judgeId}_${phase}`);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      setAssessment(snapshot.exists() ? (snapshot.data() as Assessment) : null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teamId, judgeId, phase]);

  return { assessment, loading };
};
