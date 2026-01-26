import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/serverAuth";

export async function POST() {
  try {
    await requireAdmin();
    const teamsSnap = await adminDb.collection("teams").get();
    const batch = adminDb.batch();
    teamsSnap.docs.forEach((doc) => {
      batch.update(doc.ref, { score_phase1: 0 });
    });
    batch.update(adminDb.collection("game_state").doc("main"), {
      p1_pot_score: 0,
      p1_buzzer_locked_by: null,
    });
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
