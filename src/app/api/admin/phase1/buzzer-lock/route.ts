import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/serverAuth";
import type { GameState } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { teamId } = (await request.json()) as { teamId: string };

    const result = await adminDb.runTransaction(async (transaction) => {
      const stateRef = adminDb.collection("game_state").doc("main");
      const stateSnap = await transaction.get(stateRef);

      if (!stateSnap.exists) {
        throw new Error("Game state not found");
      }

      const state = stateSnap.data() as GameState;

      if (!state.p1_buzzer_open || state.p1_buzzer_locked_by) {
        return { locked: false };
      }

      transaction.update(stateRef, { p1_buzzer_locked_by: teamId });
      return { locked: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
