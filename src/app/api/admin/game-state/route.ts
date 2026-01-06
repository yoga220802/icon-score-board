import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/serverAuth";
import type { GameState } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { updates, timerEndMs } = (await request.json()) as {
      updates: Partial<GameState>;
      timerEndMs?: number | null;
    };

    if (typeof timerEndMs === "number") {
      updates.p1_timer_end = Timestamp.fromMillis(timerEndMs);
    }
    if (timerEndMs === null) {
      updates.p1_timer_end = null;
    }

    await adminDb.collection("game_state").doc("main").set(updates, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
