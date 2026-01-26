import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireParticipant } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    const { teamId } = await requireParticipant();
    if (!teamId) {
      throw new Error("Missing team");
    }

    const { topicId } = (await request.json()) as { topicId?: string };
    if (!topicId) {
      throw new Error("Topik belum dipilih.");
    }

    const teamSnap = await adminDb.collection("teams").doc(teamId).get();
    const teamData = teamSnap.data() as { prodi?: string; score_phase1?: number } | undefined;
    if (!teamData?.prodi) {
      throw new Error("Prodi belum tersedia.");
    }

    const teamsSnap = await adminDb.collection("teams").get();
    const scores = teamsSnap.docs.map((doc) => doc.data().score_phase1 ?? 0);
    const maxScore = scores.length ? Math.max(...scores) : 0;
    if ((teamData.score_phase1 ?? 0) < maxScore) {
      throw new Error("Hanya tim pemenang yang bisa memilih topik.");
    }

    const topicSnap = await adminDb.collection("phase2_topics").doc(topicId).get();
    if (!topicSnap.exists) {
      throw new Error("Topik tidak ditemukan.");
    }
    const topicData = topicSnap.data() as { prodi?: string };
    if (topicData.prodi !== teamData.prodi) {
      throw new Error("Topik tidak sesuai dengan prodi tim.");
    }

    const topic = { id: topicSnap.id, ...topicData };
    await adminDb.collection("teams").doc(teamId).update({ topic_phase2: topic });

    return NextResponse.json({ ok: true, topic });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
