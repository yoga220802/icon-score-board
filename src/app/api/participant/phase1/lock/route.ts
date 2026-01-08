import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
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

      if (!state.p1_buzzer_open || state.p1_buzzer_locked_by) {
        throw new Error("Buzzer belum tersedia.");
      }

      const now = Date.now();
      const answerDuration = state.p1_answer_duration ?? 20;
      const hasRemaining =
        state.p1_timer_remaining !== null && state.p1_timer_remaining !== undefined;
      const timerRemaining =
        state.p1_timer_end && !hasRemaining
          ? Math.max(0, Math.ceil((state.p1_timer_end.toDate().getTime() - now) / 1000))
          : state.p1_timer_remaining ?? null;

      transaction.update(stateRef, {
        p1_buzzer_locked_by: teamId,
        p1_answer_deadline: Timestamp.fromMillis(now + answerDuration * 1000),
        p1_timer_end: null,
        p1_timer_remaining: timerRemaining,
      });
      return { locked: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
