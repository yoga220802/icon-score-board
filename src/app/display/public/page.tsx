"use client";

import { useMemo } from "react";
import { useGameState } from "@/lib/hooks/useGameState";
import { useTeams } from "@/lib/hooks/useTeams";

const getStatusText = (gameState: ReturnType<typeof useGameState>["gameState"]) => {
  if (!gameState) return "Menunggu...";

  if (gameState.active_phase === "PHASE_1") {
    if (gameState.p1_show_answer) return "JAWABAN DITAMPILKAN";
    if (gameState.p1_buzzer_open) {
      return gameState.p1_buzzer_locked_by ? "BUZZER TERKUNCI" : "REBUTAN!";
    }
    return gameState.p1_question_id ? "SOAL DIBACAKAN" : "MODE SCOREBOARD";
  }

  if (gameState.active_phase === "PHASE_2") return "INNOVATION LAB";
  if (gameState.active_phase === "PHASE_3") return "SESI DEFENSE";
  return "IDLE";
};

export default function PublicDisplayPage() {
  const { gameState } = useGameState();
  const { teams } = useTeams("name");

  const leaderboard = useMemo(() => {
    const scoreKey = gameState?.active_phase === "PHASE_1" ? "score_phase1" : "final_score";
    return [...teams].sort((a, b) => (b[scoreKey] ?? 0) - (a[scoreKey] ?? 0));
  }, [gameState?.active_phase, teams]);

  const activeTeamName = leaderboard.find((team) => team.id === gameState?.p3_active_team_id)?.name;
  const maxScore = Math.max(
    0,
    ...leaderboard.map((team) =>
      gameState?.active_phase === "PHASE_1" ? team.score_phase1 : team.final_score
    )
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black px-8 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Public Display</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold md:text-5xl">Leaderboard ICON</h1>
            <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-200">
              {getStatusText(gameState)}
            </span>
          </div>
          {activeTeamName && (
            <p className="text-sm text-slate-300">
              Tim sedang presentasi: <span className="text-cyan-300">{activeTeamName}</span>
            </p>
          )}
        </header>

        <section className="grid gap-4">
          {leaderboard.map((team, index) => {
            const score =
              gameState?.active_phase === "PHASE_1" ? team.score_phase1 : team.final_score;
            const barWidth = maxScore ? Math.max(10, (score / maxScore) * 100) : 10;

            return (
              <div
                key={team.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-semibold text-slate-300">#{index + 1}</span>
                    <div>
                      <p className="text-lg font-semibold text-white">{team.name}</p>
                      <p className="text-xs text-slate-400">{team.prodi}</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white">{score.toFixed(1)}</div>
                </div>
                <div className="mt-4 h-3 w-full rounded-full bg-slate-800">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${barWidth}%`, backgroundColor: team.color }}
                  />
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
