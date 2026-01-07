import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { teamId, action } = (await request.json()) as {
      teamId: string;
      action: "start" | "stop";
    };

    await adminDb.runTransaction(async (transaction) => {
      const teamRef = adminDb.collection("teams").doc(teamId);
      const snap = await transaction.get(teamRef);
      if (!snap.exists) {
        throw new Error("Team not found");
      }
      const data = snap.data() ?? {};
      const remaining = data.ai_timer_remaining ?? 0;
      const isActive = data.is_ai_active ?? false;
      const lastStarted = data.ai_timer_last_started as Timestamp | null | undefined;

      if (action === "start" && !isActive) {
        transaction.update(teamRef, {
          is_ai_active: true,
          ai_timer_last_started: Timestamp.now(),
        });
      }

      if (action === "stop" && isActive) {
        const now = Timestamp.now();
        const elapsed = lastStarted ? now.seconds - lastStarted.seconds : 0;
        const nextRemaining = Math.max(0, remaining - elapsed);
        transaction.update(teamRef, {
          is_ai_active: false,
          ai_timer_remaining: nextRemaining,
          ai_timer_last_started: null,
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
