import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/serverAuth";
import type { GameState } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { action, teamId } = (await request.json()) as {
      action: "BENAR" | "SALAH" | "HANGUS";
      teamId?: string | null;
    };

    const result = await adminDb.runTransaction(async (transaction) => {
      const stateRef = adminDb.collection("game_state").doc("main");
      const stateSnap = await transaction.get(stateRef);

      if (!stateSnap.exists) {
        throw new Error("Game state not found");
      }

      const state = stateSnap.data() as GameState;
      const lockedTeamId = teamId ?? state.p1_buzzer_locked_by;

      if (action !== "HANGUS" && !lockedTeamId) {
        throw new Error("No team locked");
      }

      if (action === "HANGUS") {
        transaction.update(stateRef, {
          p1_pot_score: 0,
          p1_buzzer_open: false,
          p1_buzzer_locked_by: null,
          p1_question_id: null,
          p1_show_answer: false,
          p1_timer_end: null,
        });
        return { ok: true };
      }

      const teamRef = adminDb.collection("teams").doc(lockedTeamId!);
      const teamSnap = await transaction.get(teamRef);
      if (!teamSnap.exists) {
        throw new Error("Team not found");
      }
      const teamScore = teamSnap.data()?.score_phase1 ?? 0;
      const potScore = state.p1_pot_score ?? 0;

      if (action === "BENAR") {
        transaction.update(teamRef, {
          score_phase1: teamScore + 10 + potScore,
        });
        transaction.update(stateRef, {
          p1_pot_score: 0,
          p1_buzzer_open: false,
          p1_buzzer_locked_by: null,
        });
      }

      if (action === "SALAH") {
        transaction.update(teamRef, {
          score_phase1: teamScore - 5,
        });
        transaction.update(stateRef, {
          p1_pot_score: potScore + 5,
          p1_buzzer_open: true,
          p1_buzzer_locked_by: null,
        });
      }

      return { ok: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
