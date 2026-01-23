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

  const topTeams = leaderboard.slice(0, 5);
  const podiumOrder = [3, 1, 0, 2, 4];
  const podiumHeights = [150, 210, 280, 210, 150];

  const activeTeamName = leaderboard.find((team) => team.id === gameState?.p3_active_team_id)?.name;
  const answeringTeam = leaderboard.find((team) => team.id === gameState?.p1_buzzer_locked_by);
  const maxScore = Math.max(
    0,
    ...topTeams.map((team) =>
      gameState?.active_phase === "PHASE_1" ? team.score_phase1 : team.final_score
    )
  );

  return (
    <main
      className="min-h-screen px-8 py-10 text-white transition-colors duration-500"
      style={
        answeringTeam?.color
          ? { background: `linear-gradient(135deg, ${answeringTeam.color}55, #020617 70%)` }
          : { background: "linear-gradient(135deg, #020617, #0f172a 60%, #000000)" }
      }>
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

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-4">
            {topTeams.map((team) => (
              <div key={`logo-${team.id}`} className="flex flex-col items-center gap-2">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={`Logo ${team.prodi}`}
                    className="h-12 w-12 rounded-full border border-white/20 object-contain bg-white/90 p-1"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-xs font-semibold uppercase text-white"
                    style={{ backgroundColor: team.color }}>
                    {team.prodi?.slice(0, 3) || team.name.slice(0, 3)}
                  </div>
                )}
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-300">
                  {team.prodi}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-end justify-center gap-4">
            {podiumOrder.map((leaderboardIndex, slotIndex) => {
              const team = topTeams[leaderboardIndex];
              const score = team
                ? gameState?.active_phase === "PHASE_1"
                  ? team.score_phase1
                  : team.final_score
                : 0;
              const barHeight = maxScore ? Math.max(24, (score / maxScore) * 100) : 24;

              if (!team) {
                return (
                  <div
                    key={`empty-${leaderboardIndex}`}
                    className="flex w-40 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-3xl border border-dashed border-slate-800 bg-slate-900/40"
                      style={{ height: `${podiumHeights[slotIndex]}px` }}
                    />
                  </div>
                );
              }

              return (
                <div
                  key={team.id}
                  className="flex w-40 flex-col items-center justify-end gap-3 text-center">
                  <div
                    className="flex w-full flex-col items-center justify-end rounded-3xl border border-slate-800 bg-slate-900/70 px-4 pb-4 pt-6"
                    style={{ height: `${podiumHeights[slotIndex]}px` }}>
                    <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
                      #{leaderboardIndex + 1}
                    </span>
                    <p className="mt-2 text-base font-semibold text-white">{team.name}</p>
                    <p className="text-xs text-slate-400">{team.prodi}</p>
                    <p className="mt-3 text-lg font-bold text-cyan-200">{score.toFixed(1)}</p>
                    <div className="mt-4 w-full">
                      <div className="h-2 w-full rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${barHeight}%`, backgroundColor: team.color }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="h-3 w-10 rounded-full bg-slate-800/80" />
                </div>
              );
            })}
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-center text-sm text-slate-300">
            Standings ditampilkan untuk 5 tim terbaik dengan posisi tertinggi di tengah.
          </div>
        </section>
      </div>
    </main>
  );
}
