import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/serverAuth";

const TOPICS = [
  "Smart City Mobility",
  "Sustainable Energy",
  "Health Tech",
  "Inclusive Education",
  "Waste Management",
  "Agritech Automation",
  "Disaster Mitigation",
  "Green Architecture",
  "Smart Manufacturing",
  "Digital Public Service",
];

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { teamId } = (await request.json()) as { teamId: string | "all" };

    const pickTopic = () => TOPICS[Math.floor(Math.random() * TOPICS.length)];

    if (teamId === "all") {
      const teams = await adminDb.collection("teams").get();
      const batch = adminDb.batch();
      teams.docs.forEach((doc) => {
        batch.update(doc.ref, { topic_phase2: pickTopic() });
      });
      await batch.commit();
    } else {
      await adminDb.collection("teams").doc(teamId).update({ topic_phase2: pickTopic() });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
