"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Team } from "@/lib/types";

export const useTeams = (orderField: keyof Team = "name") => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "teams"), orderBy(orderField as string, "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...(doc.data() as Omit<Team, "id">) }) as Team
      );
      setTeams(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderField]);

  return { teams, loading };
};
