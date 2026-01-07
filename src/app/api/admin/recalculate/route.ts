import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/serverAuth";
import type { Assessment } from "@/lib/types";

const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { teamId } = (await request.json()) as { teamId?: string };

    const teamsSnapshot = teamId
      ? [await adminDb.collection("teams").doc(teamId).get()]
      : (await adminDb.collection("teams").get()).docs;

    const batch = adminDb.batch();

    for (const teamSnap of teamsSnapshot) {
      if (!teamSnap.exists) continue;
      const assessmentsSnap = await adminDb
        .collection("teams")
        .doc(teamSnap.id)
        .collection("assessments")
        .get();

      const assessments = assessmentsSnap.docs.map((doc) => doc.data() as Assessment);
      const phase2 = assessments.filter((a) => a.phase === "PHASE_2");
      const phase3 = assessments.filter((a) => a.phase === "PHASE_3");

      const totalPhase2 = average(phase2.map((a) => a.final_value));
      const totalPhase3 = average(phase3.map((a) => a.final_value));
      const finalScore = totalPhase2 * 0.4 + totalPhase3 * 0.6;

      batch.update(teamSnap.ref, {
        total_score_phase2: totalPhase2,
        total_score_phase3: totalPhase3,
        final_score: finalScore,
      });
    }

    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
