"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { signOut } from "firebase/auth";
import { ParticipantRoute } from "@/components/ParticipantRoute";
import { callParticipantApi } from "@/lib/api";
import { useGameState } from "@/lib/hooks/useGameState";
import { useTeams } from "@/lib/hooks/useTeams";
import { useActiveQuestion } from "@/lib/hooks/useActiveQuestion";
import { auth } from "@/lib/firebase";

export default function ParticipantDisplayPage() {
  const params = useParams<{ teamId: string }>();
  const { gameState } = useGameState();
  const { teams } = useTeams("name");
  const activeQuestion = useActiveQuestion(gameState?.p1_question_id);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [now, setNow] = useState(Date.now());
  const timeoutTriggered = useRef(false);

  const team = useMemo(
    () => teams.find((item) => item.id === params.teamId),
    [params.teamId, teams]
  );

  const isLocked = gameState?.p1_buzzer_locked_by === params.teamId;
  const answerDeadline = gameState?.p1_answer_deadline?.toDate().getTime() ?? null;
  const remainingSeconds = answerDeadline ? Math.max(0, Math.ceil((answerDeadline - now) / 1000)) : null;
  const questionTimerRemaining = useMemo(() => {
    if (gameState?.p1_timer_end) {
      const endMs = gameState.p1_timer_end.toDate().getTime();
      return Math.max(0, Math.ceil((endMs - now) / 1000));
    }
    if (gameState?.p1_timer_remaining !== null && gameState?.p1_timer_remaining !== undefined) {
      return gameState.p1_timer_remaining;
    }
    return null;
  }, [gameState?.p1_timer_end, gameState?.p1_timer_remaining, now]);
  const answerDuration = gameState?.p1_answer_duration ?? 20;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLocked) {
      timeoutTriggered.current = false;
      return;
    }
    if (!answerDeadline || remainingSeconds === null || remainingSeconds > 0) {
      return;
    }
    if (timeoutTriggered.current) {
      return;
    }
    timeoutTriggered.current = true;
    callParticipantApi("/api/participant/phase1/timeout", { teamId: params.teamId }).catch(
      () => undefined
    );
  }, [answerDeadline, isLocked, params.teamId, remainingSeconds]);

  const handleLock = async () => {
    setStatusMessage(null);
    try {
      await callParticipantApi("/api/participant/phase1/lock", { teamId: params.teamId });
      setStatusMessage("Buzzer terkunci. Pilih jawaban!");
    } catch (error) {
      setStatusMessage((error as Error).message || "Gagal mengunci buzzer.");
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer) {
      setStatusMessage("Pilih jawaban terlebih dahulu.");
      return;
    }

    setStatusMessage(null);
    try {
      const result = await callParticipantApi<{ correct?: boolean }>(
        "/api/participant/phase1/answer",
        { teamId: params.teamId, answer: selectedAnswer }
      );
      setStatusMessage(result.correct ? "Jawaban benar! ✅" : "Jawaban salah.");
      setSelectedAnswer("");
    } catch (error) {
      setStatusMessage((error as Error).message || "Gagal mengirim jawaban.");
    }
  };

  return (
    <ParticipantRoute teamId={params.teamId}>
      <main
        className={`min-h-screen px-8 py-10 text-white ${
          isLocked ? "bg-emerald-600" : "bg-slate-950"
        }`}>
        <div className="mx-auto max-w-5xl space-y-8">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Participant View</p>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold md:text-5xl">
                  {team?.name ?? "Team"}
                </h1>
                {team?.prodi && <p className="text-sm text-slate-200">{team.prodi}</p>}
              </div>
              <button
                className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white/60"
                onClick={() => signOut(auth)}>
                Logout
              </button>
            </div>
          </header>

          <section className="rounded-3xl border border-white/20 bg-black/30 p-8">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Soal Aktif</p>
                {questionTimerRemaining !== null && (
                  <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200">
                    Sisa waktu: {questionTimerRemaining}s
                  </span>
                )}
              </div>
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
              <span
                className={`text-lg font-semibold ${
                  isLocked ? "text-emerald-200" : "text-slate-100"
                }`}>
                {isLocked ? "LOCKED!" : "Menunggu"}
              </span>
            </div>
            {isLocked && (
              <p className="mt-2 text-xs text-emerald-100">
                Tim Anda berhasil mengunci buzzer. Pilih jawaban dalam {answerDuration} detik.
              </p>
            )}
            {!isLocked && gameState?.p1_buzzer_open && activeQuestion?.text && (
              <button
                className="mt-4 rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-900"
                onClick={handleLock}>
                Jawab
              </button>
            )}
            {statusMessage && <p className="mt-3 text-xs text-white/80">{statusMessage}</p>}
          </section>

          {isLocked && activeQuestion?.options?.length ? (
            <section className="rounded-3xl border border-white/20 bg-black/30 p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Pilih Jawaban</p>
                {remainingSeconds !== null && (
                  <span className="text-sm font-semibold text-amber-200">
                    {remainingSeconds}s
                  </span>
                )}
              </div>
              <div className="mt-4 grid gap-2">
                {activeQuestion.options.map((option) => (
                  <button
                    key={option}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      selectedAnswer === option
                        ? "border-emerald-300 bg-emerald-500/20 text-white"
                        : "border-white/20 text-slate-100 hover:border-white/50"
                    }`}
                    onClick={() => setSelectedAnswer(option)}>
                    {option}
                  </button>
                ))}
              </div>
              <button
                className="mt-4 rounded-full bg-emerald-300 px-4 py-2 text-xs font-semibold text-slate-900"
                onClick={handleSubmitAnswer}
                disabled={remainingSeconds === 0}>
                Kirim Jawaban
              </button>
            </section>
          ) : null}
        </div>
      </main>
    </ParticipantRoute>
  );
}
