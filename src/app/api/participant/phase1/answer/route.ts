import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { requireParticipant } from "@/lib/serverAuth";
import type { GameState, Question } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { teamId, answer } = (await request.json()) as { teamId: string; answer: string };

    if (!teamId) {
      throw new Error("Team tidak ditemukan.");
    }

    await requireParticipant(teamId);

    const trimmedAnswer = answer?.trim();
    if (!trimmedAnswer) {
      throw new Error("Jawaban kosong.");
    }

    const result = await adminDb.runTransaction(async (transaction) => {
      const stateRef = adminDb.collection("game_state").doc("main");
      const stateSnap = await transaction.get(stateRef);

      if (!stateSnap.exists) {
        throw new Error("Game state not found");
      }

      const state = stateSnap.data() as GameState;

      if (state.p1_buzzer_locked_by !== teamId) {
        throw new Error("Buzzer tidak terkunci untuk tim ini.");
      }

      if (!state.p1_question_id) {
        throw new Error("Soal belum tersedia.");
      }

      const questionRef = adminDb.collection("questions_phase1").doc(state.p1_question_id);
      const questionSnap = await transaction.get(questionRef);
      if (!questionSnap.exists) {
        throw new Error("Soal tidak ditemukan.");
      }

      const question = questionSnap.data() as Question;
      const normalizedAnswerKey = question.answer_key?.trim()?.toLowerCase() ?? "";
      const isCorrect = normalizedAnswerKey === trimmedAnswer.toLowerCase();

      const teamRef = adminDb.collection("teams").doc(teamId);
      const teamSnap = await transaction.get(teamRef);
      if (!teamSnap.exists) {
        throw new Error("Team tidak ditemukan.");
      }

      const teamScore = teamSnap.data()?.score_phase1 ?? 0;
      const potScore = state.p1_pot_score ?? 0;
      const now = Date.now();

      if (isCorrect) {
        transaction.update(teamRef, {
          score_phase1: teamScore + 10 + potScore,
        });
        transaction.update(stateRef, {
          p1_pot_score: 0,
          p1_buzzer_open: false,
          p1_buzzer_locked_by: null,
          p1_answer_deadline: null,
          p1_timer_end: null,
          p1_timer_remaining: null,
        });
      } else {
        transaction.update(teamRef, {
          score_phase1: teamScore - 5,
        });
        const resumeMs =
          state.p1_timer_remaining !== null && state.p1_timer_remaining !== undefined
            ? Timestamp.fromMillis(now + state.p1_timer_remaining * 1000)
            : state.p1_timer_end ?? null;
        transaction.update(stateRef, {
          p1_pot_score: potScore + 5,
          p1_buzzer_open: true,
          p1_buzzer_locked_by: null,
          p1_answer_deadline: null,
          p1_timer_end: resumeMs,
          p1_timer_remaining: null,
        });
      }

      return { correct: isCorrect };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
