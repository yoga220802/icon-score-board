import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { teamId } = (await request.json()) as { teamId: string | "all" };

    if (teamId === "all") {
      const teams = await adminDb.collection("teams").get();
      const batch = adminDb.batch();
      teams.docs.forEach((doc) => {
        batch.update(doc.ref, { topic_phase2: null });
      });
      await batch.commit();
    } else {
      await adminDb.collection("teams").doc(teamId).update({ topic_phase2: null });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
