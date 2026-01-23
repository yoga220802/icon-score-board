import { headers } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const requireAdmin = async () => {
  const authHeader = (await headers()).get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new Error("Missing auth token");
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const role = userSnap.exists ? userSnap.data()?.role : null;

  if (role !== "admin") {
    throw new Error("Forbidden");
  }

  return decoded.uid;
};

export const requireParticipant = async (teamId?: string) => {
  const authHeader = (await headers()).get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new Error("Missing auth token");
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const role = userSnap.exists ? userSnap.data()?.role : null;
  const profileTeamId = userSnap.exists ? userSnap.data()?.team_id : null;

  if (role !== "participant") {
    throw new Error("Forbidden");
  }

  if (teamId && profileTeamId !== teamId) {
    throw new Error("Forbidden");
  }

  return { uid: decoded.uid, teamId: profileTeamId ?? null };
};
