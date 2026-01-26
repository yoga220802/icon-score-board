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
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [activeImageAlt, setActiveImageAlt] = useState<string>("");
  const [now, setNow] = useState(Date.now());
  const timeoutTriggered = useRef(false);

  const team = useMemo(
    () => teams.find((item) => item.id === params.teamId),
    [params.teamId, teams]
  );

  const isLocked = gameState?.p1_buzzer_locked_by === params.teamId;
  const lockedTeam = useMemo(
    () => teams.find((item) => item.id === gameState?.p1_buzzer_locked_by),
    [gameState?.p1_buzzer_locked_by, teams]
  );
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
  const isBuzzerOpen = Boolean(gameState?.p1_buzzer_open);
  const isBuzzerLockedByOther = Boolean(gameState?.p1_buzzer_locked_by && !isLocked);
  const showTimer = Boolean(gameState?.p1_timer_end);
  const shouldShowQuestion = gameState?.p1_show_question ?? true;
  const visibleQuestion = shouldShowQuestion ? activeQuestion : null;
  const isAnswering = isLocked;
  const pageTheme =
    isAnswering
      ? "bg-amber-400"
      : isBuzzerLockedByOther
        ? "bg-amber-500"
        : "bg-slate-950";

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
      setStatusMessage("Buzzer terkunci. Tunggu keputusan juri.");
    } catch (error) {
      setStatusMessage((error as Error).message || "Gagal mengunci buzzer.");
    }
  };

  const handleOpenImage = (url: string, alt: string) => {
    setActiveImageUrl(url);
    setActiveImageAlt(alt);
    setIsImageOpen(true);
  };

  return (
    <ParticipantRoute teamId={params.teamId}>
      <main
        className={`min-h-screen px-8 py-10 text-white transition-colors duration-300 ${pageTheme}`}>
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
                {showTimer && questionTimerRemaining !== null && (
                  <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200">
                    Sisa waktu: {questionTimerRemaining}s
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-semibold text-white md:text-4xl">
                {visibleQuestion?.text ?? "Menunggu soal berikutnya..."}
              </h2>
              {visibleQuestion?.image_url && (
                <div
                  className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-white/20"
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    handleOpenImage(visibleQuestion.image_url, visibleQuestion.text)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenImage(visibleQuestion.image_url, visibleQuestion.text);
                    }
                  }}>
                  <Image
                    src={visibleQuestion.image_url}
                    alt={visibleQuestion.text}
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
                className={`text-lg font-semibold ${isAnswering ? "text-amber-100" : "text-slate-100"}`}>
                {isAnswering
                  ? "MENJAWAB"
                  : isBuzzerLockedByOther
                    ? "Tidak tersedia"
                    : "Menunggu"}
              </span>
            </div>
            {isAnswering && (
              <p className="mt-2 text-xs text-amber-100">
                Tim Anda sedang menjawab. Jawaban akan ditentukan oleh admin.
              </p>
            )}
            {lockedTeam?.prodi && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                PRODI {lockedTeam.prodi.toUpperCase()} sedang menjawab
              </p>
            )}
            {isBuzzerLockedByOther && (
              <p className="mt-1 text-xs text-white/80">
                Prodi lain hanya bisa menonton dulu sampai buzzer dibuka kembali.
              </p>
            )}
            {!isLocked && isBuzzerOpen && visibleQuestion?.text && (
              <button
                className="mt-4 w-full rounded-3xl bg-cyan-400 px-4 py-6 text-lg font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleLock}
                disabled={isBuzzerLockedByOther}>
                Jawab
              </button>
            )}
            {!isBuzzerOpen && (
              <p className="mt-3 text-xs text-white/80">Menunggu admin membuka buzzer.</p>
            )}
            {statusMessage && <p className="mt-3 text-xs text-white/80">{statusMessage}</p>}
          </section>

          {visibleQuestion?.options?.length ? (
            <section className="rounded-3xl border border-white/20 bg-black/30 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Pilihan Jawaban</p>
              <div className="mt-4 grid gap-3">
                {visibleQuestion.options.map((option, index) => (
                  <div
                    key={option}
                    className="flex items-center gap-4 rounded-2xl border border-white/20 bg-slate-950/40 px-4 py-3 text-sm text-slate-100">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-white">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
      {isImageOpen && activeImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setIsImageOpen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsImageOpen(false);
          }}>
          <div className="relative max-h-full w-full max-w-5xl">
            <button
              className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xs text-white"
              type="button"
              onClick={() => setIsImageOpen(false)}>
              Tutup
            </button>
            <div className="relative h-[70vh] w-full">
              <Image
                src={activeImageUrl}
                alt={activeImageAlt}
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </ParticipantRoute>
  );
}
