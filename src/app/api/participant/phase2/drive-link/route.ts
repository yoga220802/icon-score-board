import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireParticipant } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    const { teamId } = await requireParticipant();
    if (!teamId) {
      throw new Error("Missing team");
    }

    const { link } = (await request.json()) as { link?: string };
    if (!link || !link.trim()) {
      throw new Error("Link drive wajib diisi.");
    }

    await adminDb.collection("teams").doc(teamId).update({ drive_link_phase2: link.trim() });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
