"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useGameState } from "@/lib/hooks/useGameState";
import { useTeams } from "@/lib/hooks/useTeams";
import { useActiveQuestion } from "@/lib/hooks/useActiveQuestion";

export default function ParticipantDisplayPage() {
  const params = useParams<{ teamId: string }>();
  const { gameState } = useGameState();
  const { teams } = useTeams("name");
  const activeQuestion = useActiveQuestion(gameState?.p1_question_id);

  const team = useMemo(
    () => teams.find((item) => item.id === params.teamId),
    [params.teamId, teams]
  );

  const isLocked = gameState?.p1_buzzer_locked_by === params.teamId;

  return (
    <main
      className={`min-h-screen px-8 py-10 text-white ${
        isLocked ? "bg-emerald-600" : "bg-slate-950"
      }`}>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Participant View</p>
          <h1 className="text-3xl font-semibold md:text-5xl">
            {team?.name ?? "Team"}
          </h1>
          {team?.prodi && <p className="text-sm text-slate-200">{team.prodi}</p>}
        </header>

        <section className="rounded-3xl border border-white/20 bg-black/30 p-8">
          <div className="flex flex-col gap-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Soal Aktif</p>
            <h2 className="text-2xl font-semibold text-white md:text-4xl">
              {activeQuestion?.text ?? "Menunggu soal berikutnya..."}
            </h2>
            {activeQuestion?.image_url && (
              <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-white/20">
                <Image
                  src={activeQuestion.image_url}
                  alt={activeQuestion.text}
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/20 bg-black/30 p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-200">Status Buzzer</span>
            <span className={`text-lg font-semibold ${isLocked ? "text-emerald-200" : "text-slate-100"}`}>
              {isLocked ? "LOCKED!" : "Menunggu"}
            </span>
          </div>
          {isLocked && (
            <p className="mt-2 text-xs text-emerald-100">
              Tim Anda berhasil mengunci buzzer. Tunggu instruksi admin.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
