import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { teamId } = (await request.json()) as { teamId: string | "all" };

    const topicsSnap = await adminDb.collection("phase2_topics").get();
    const topics = topicsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) }));
    const topicsByProdi = topics.reduce<Record<string, typeof topics>>((acc, topic) => {
      const prodi = (topic as { prodi?: string }).prodi ?? "UNKNOWN";
      if (!acc[prodi]) acc[prodi] = [];
      acc[prodi].push(topic);
      return acc;
    }, {});

    const pickTopic = (prodi: string) => {
      const list = topicsByProdi[prodi] ?? [];
      if (list.length === 0) return null;
      return list[Math.floor(Math.random() * list.length)];
    };

    if (teamId === "all") {
      const teams = await adminDb.collection("teams").get();
      const batch = adminDb.batch();
      teams.docs.forEach((doc) => {
        const teamData = doc.data() as { prodi?: string };
        const topic = pickTopic(teamData.prodi ?? "");
        batch.update(doc.ref, { topic_phase2: topic });
      });
      await batch.commit();
    } else {
      const teamSnap = await adminDb.collection("teams").doc(teamId).get();
      const teamData = teamSnap.data() as { prodi?: string } | undefined;
      const topic = teamData ? pickTopic(teamData.prodi ?? "") : null;
      await adminDb.collection("teams").doc(teamId).update({ topic_phase2: topic });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
