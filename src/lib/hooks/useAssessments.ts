"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assessment, AssessmentPhase } from "@/lib/types";

export const useAssessments = (teamId: string, phase: AssessmentPhase) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;

    const q = query(
      collection(db, "teams", teamId, "assessments"),
      where("phase", "==", phase)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => doc.data() as Assessment);
      setAssessments(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teamId, phase]);

  return { assessments, loading };
};
