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
  const topFive = leaderboard.slice(0, 5);

  const podiumSlots = [
    { rankIndex: 3, height: 190 },
    { rankIndex: 1, height: 250 },
    { rankIndex: 0, height: 320 },
    { rankIndex: 2, height: 230 },
    { rankIndex: 4, height: 170 },
  ];

  const standings = podiumSlots
    .map((slot) => ({ ...slot, team: topFive[slot.rankIndex] }))
    .filter((slot) => slot.team);

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
          <div className="grid items-end gap-4 md:grid-cols-5">
            {standings.map(({ team, height }) => {
              if (!team) return null;
              const score =
                gameState?.active_phase === "PHASE_1" ? team.score_phase1 : team.final_score;
              const rank = leaderboard.findIndex((entry) => entry.id === team.id) + 1;

              return (
                <div
                  key={team.id}
                  className="flex flex-col items-center justify-end rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-6 text-center shadow-lg"
                  style={{ minHeight: `${height}px` }}>
                  <span className="text-sm font-semibold text-slate-300">#{rank}</span>
                  <p className="mt-2 text-lg font-semibold text-white">{team.name}</p>
                  <p className="text-xs text-slate-400">{team.prodi}</p>
                  <div
                    className="mt-4 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ backgroundColor: `${team.color}33`, color: team.color }}>
                    {score.toFixed(1)} poin
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
