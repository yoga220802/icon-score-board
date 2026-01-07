import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import type { GameState } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { teamId } = (await request.json()) as { teamId: string };

    if (!teamId) {
      throw new Error("Team tidak ditemukan.");
    }

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

      transaction.update(stateRef, {
        p1_buzzer_locked_by: teamId,
        p1_answer_deadline: Timestamp.fromMillis(Date.now() + 30 * 1000),
      });
      return { locked: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
