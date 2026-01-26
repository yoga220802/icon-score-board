import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireParticipant } from "@/lib/serverAuth";

const pickRandom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export async function POST() {
  try {
    const { teamId } = await requireParticipant();
    if (!teamId) {
      throw new Error("Missing team");
    }

    const teamSnap = await adminDb.collection("teams").doc(teamId).get();
    const teamData = teamSnap.data() as { prodi?: string; score_phase1?: number } | undefined;
    if (!teamData?.prodi) {
      throw new Error("Prodi belum tersedia.");
    }

    const teamsSnap = await adminDb.collection("teams").get();
    const scores = teamsSnap.docs.map((doc) => doc.data().score_phase1 ?? 0);
    const maxScore = scores.length ? Math.max(...scores) : 0;
    if ((teamData.score_phase1 ?? 0) >= maxScore && maxScore > 0) {
      throw new Error("Tim pemenang tidak dapat mengacak topik.");
    }

    const topicsSnap = await adminDb
      .collection("phase2_topics")
      .where("prodi", "==", teamData.prodi)
      .get();
    if (topicsSnap.empty) {
      throw new Error("Topik untuk prodi ini belum tersedia.");
    }
    const topics = topicsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) }));
    const topic = pickRandom(topics);

    await adminDb.collection("teams").doc(teamId).update({ topic_phase2: topic });

    return NextResponse.json({ ok: true, topic });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
