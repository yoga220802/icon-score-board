import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { requireParticipant } from "@/lib/serverAuth";
import type { GameState } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { teamId } = (await request.json()) as { teamId: string };

    if (!teamId) {
      throw new Error("Team tidak ditemukan.");
    }

    await requireParticipant(teamId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const stateRef = adminDb.collection("game_state").doc("main");
      const stateSnap = await transaction.get(stateRef);

      if (!stateSnap.exists) {
        throw new Error("Game state not found");
      }

      const state = stateSnap.data() as GameState;

      if (state.p1_buzzer_locked_by !== teamId) {
        return { cleared: false };
      }

      const now = Date.now();
      const resumeMs =
        state.p1_timer_remaining !== null && state.p1_timer_remaining !== undefined
          ? Timestamp.fromMillis(now + state.p1_timer_remaining * 1000)
          : state.p1_timer_end ?? null;

      transaction.update(stateRef, {
        p1_buzzer_open: true,
        p1_buzzer_locked_by: null,
        p1_answer_deadline: null,
        p1_timer_end: resumeMs,
        p1_timer_remaining: null,
      });

      return { cleared: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
