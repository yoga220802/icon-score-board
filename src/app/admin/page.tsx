"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { addToast } from "@heroui/react";
import { db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useGameState } from "@/lib/hooks/useGameState";
import { useTeams } from "@/lib/hooks/useTeams";
import { useActiveQuestion } from "@/lib/hooks/useActiveQuestion";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { callAdminApi } from "@/lib/api";
import type { GameState, Question, QuestionCategory, Team } from "@/lib/types";

const BUZZER_KEYS: Record<string, string> = {
  a: "inf",
  s: "si",
  d: "sipil",
  f: "industri",
  g: "arsi",
};

const formatSeconds = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${remaining
    .toString()
    .padStart(2, "0")}`;
};

export default function AdminPage() {
  const { gameState } = useGameState();
  const { teams } = useTeams("name");
  const activeQuestion = useActiveQuestion(gameState?.p1_question_id);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [duration, setDuration] = useState(60);
  const [now, setNow] = useState(Date.now());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    number: 1,
    category: "GENERAL" as QuestionCategory,
    text: "",
    image_url: "",
    answer_key: "",
  });
  const [settings, setSettings] = useState({
    general_count: 5,
    logic_count: 5,
    shuffle_questions: false,
  });

  const handleStatus = (message: string, color: "success" | "warning" | "danger" | "default" = "success") => {
    setStatusMessage(message);
    addToast({
      title: message,
      color,
      variant: "flat",
      timeout: 2000,
      shouldShowTimeoutProgress: true,
    });
    window.setTimeout(() => setStatusMessage(null), 2000);
  };

  useEffect(() => {
    const q = query(collection(db, "questions_phase1"), orderBy("number", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQuestions(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Question) })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (gameState?.p1_settings) {
      setSettings({
        general_count: gameState.p1_settings.general_count ?? 0,
        logic_count: gameState.p1_settings.logic_count ?? 0,
        shuffle_questions: gameState.p1_settings.shuffle_questions ?? false,
      });
    }
  }, [gameState?.p1_settings]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const teamId = BUZZER_KEYS[event.key.toLowerCase()];
      if (!teamId || !gameState?.p1_buzzer_open || gameState?.p1_buzzer_locked_by) {
        return;
      }
      callAdminApi("/api/admin/phase1/buzzer-lock", { teamId })
        .then(() => handleStatus(`Buzzer terkunci: ${teamId.toUpperCase()}`))
        .catch(() => undefined);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState?.p1_buzzer_open, gameState?.p1_buzzer_locked_by]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const setGameState = async (updates: Partial<GameState>, timerEndMs?: number | null) => {
    await callAdminApi("/api/admin/game-state", { updates, timerEndMs });
  };

  const timerRemaining = useMemo(() => {
    if (!gameState?.p1_timer_end) return null;
    const endMs = gameState.p1_timer_end.toDate().getTime();
    return Math.max(0, Math.floor((endMs - now) / 1000));
  }, [gameState?.p1_timer_end, now]);

  const aiTimerRemaining = (team: Team) => {
    if (!team.is_ai_active || !team.ai_timer_last_started) {
      return team.ai_timer_remaining;
    }
    const startMs = team.ai_timer_last_started.toDate().getTime();
    const elapsed = Math.floor((now - startMs) / 1000);
    return Math.max(0, team.ai_timer_remaining - elapsed);
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.text.trim() || !newQuestion.answer_key.trim()) {
      handleStatus("Lengkapi teks soal dan jawaban.", "warning");
      return;
    }

    await addDoc(collection(db, "questions_phase1"), {
      number: newQuestion.number,
      category: newQuestion.category,
      text: newQuestion.text.trim(),
      image_url: newQuestion.image_url?.trim() || null,
      answer_key: newQuestion.answer_key.trim(),
      is_active: false,
    });

    setNewQuestion((prev) => ({ ...prev, text: "", image_url: "", answer_key: "" }));
    handleStatus("Soal baru ditambahkan.");
  };

  const handleSaveSettings = async () => {
    await setGameState({
      p1_settings: {
        general_count: settings.general_count,
        logic_count: settings.logic_count,
        shuffle_questions: settings.shuffle_questions,
      },
    });
    handleStatus("Pengaturan soal disimpan.");
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900/70 via-slate-900/40 to-slate-950/80 p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">
                  Super Admin Command Center
                </p>
                <h1 className="text-2xl font-semibold md:text-3xl">ICON Score Board</h1>
              </div>
              <div className="flex items-center gap-3">
                {statusMessage && (
                  <span className="rounded-full bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
                    {statusMessage}
                  </span>
                )}
                <button
                  className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200"
                  onClick={() => {
                    handleStatus("Logout berhasil.", "default");
                    signOut(auth);
                  }}>
                  Logout
                </button>
              </div>
            </div>
            <div className="grid gap-3 text-xs text-slate-400 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p>Phase aktif</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {gameState?.active_phase ?? "IDLE"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p>Pot Skor</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {gameState?.p1_pot_score ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p>Buzzer Locked</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {gameState?.p1_buzzer_locked_by ?? "-"}
                </p>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold text-white">Phase 1 — Control Soal & Buzzer</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                      Soal Aktif
                    </p>
                    <p className="mt-2 text-base text-white">
                      {activeQuestion?.text ?? "Belum ada soal dipilih"}
                    </p>
                    {activeQuestion?.answer_key && gameState?.p1_show_answer && (
                      <p className="mt-3 text-sm text-emerald-300">
                        Jawaban: {activeQuestion.answer_key}
                      </p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                      Timer Soal
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                        type="number"
                        min={10}
                        value={duration}
                        onChange={(event) => setDuration(Number(event.target.value))}
                      />
                      <span className="text-xs text-slate-400">detik</span>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-cyan-300">
                      {timerRemaining !== null ? formatSeconds(timerRemaining) : "00:00"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-900"
                        onClick={async () => {
                          await setGameState({}, Date.now() + duration * 1000);
                          handleStatus("Timer dimulai");
                        }}>
                        Start Timer
                      </button>
                      <button
                        className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200"
                        onClick={async () => {
                          await setGameState({}, null);
                          handleStatus("Timer dihentikan");
                        }}>
                        Stop Timer
                      </button>
                      <button
                        className="rounded-full border border-emerald-500/60 px-4 py-2 text-xs text-emerald-200"
                        onClick={async () => {
                          await setGameState({ p1_show_answer: !gameState?.p1_show_answer });
                          handleStatus("Tampilan jawaban diperbarui");
                        }}>
                        {gameState?.p1_show_answer ? "Sembunyikan" : "Tampilkan"} Jawaban
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Daftar Soal</p>
                  <div className="grid gap-2 max-h-56 overflow-y-auto pr-2">
                    {questions.map((question) => (
                      <button
                        key={question.id}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                          gameState?.p1_question_id === question.id
                            ? "border-cyan-400 bg-cyan-500/10 text-cyan-200"
                            : "border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-600"
                        }`}
                        onClick={async () => {
                          await setGameState({
                            active_phase: "PHASE_1",
                            p1_question_id: question.id,
                            p1_show_answer: false,
                          });
                          handleStatus("Soal dipilih");
                        }}>
                        <div className="flex items-center justify-between">
                          <span>
                            #{question.number} •{" "}
                            {question.category === "GENERAL" ? "Pengetahuan Umum" : "Kemampuan Logika"}
                          </span>
                          {question.is_active && (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-slate-400 line-clamp-2">
                          {question.text}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                      Pengaturan Soal Phase 1
                    </p>
                    <div className="mt-3 grid gap-3 text-sm">
                      <label className="flex flex-col gap-2">
                        Jumlah Pengetahuan Umum
                        <input
                          className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                          type="number"
                          min={0}
                          value={settings.general_count}
                          onChange={(event) =>
                            setSettings((prev) => ({
                              ...prev,
                              general_count: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        Jumlah Kemampuan Logika
                        <input
                          className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                          type="number"
                          min={0}
                          value={settings.logic_count}
                          onChange={(event) =>
                            setSettings((prev) => ({
                              ...prev,
                              logic_count: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={settings.shuffle_questions}
                          onChange={(event) =>
                            setSettings((prev) => ({
                              ...prev,
                              shuffle_questions: event.target.checked,
                            }))
                          }
                        />
                        Acak urutan soal saat tampil
                      </label>
                      <button
                        className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-900"
                        onClick={handleSaveSettings}>
                        Simpan Pengaturan
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                      Tambah Soal Phase 1
                    </p>
                    <div className="mt-3 grid gap-3 text-sm">
                      <label className="flex flex-col gap-2">
                        Nomor Soal
                        <input
                          className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                          type="number"
                          min={1}
                          value={newQuestion.number}
                          onChange={(event) =>
                            setNewQuestion((prev) => ({
                              ...prev,
                              number: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        Kategori
                        <select
                          className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                          value={newQuestion.category}
                          onChange={(event) =>
                            setNewQuestion((prev) => ({
                              ...prev,
                              category: event.target.value as QuestionCategory,
                            }))
                          }>
                          <option value="GENERAL">Pengetahuan Umum</option>
                          <option value="LOGIC">Kemampuan Logika</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-2">
                        Teks Soal
                        <textarea
                          className="min-h-[80px] rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                          value={newQuestion.text}
                          onChange={(event) =>
                            setNewQuestion((prev) => ({ ...prev, text: event.target.value }))
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        URL Gambar (opsional)
                        <input
                          className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                          type="text"
                          value={newQuestion.image_url}
                          onChange={(event) =>
                            setNewQuestion((prev) => ({ ...prev, image_url: event.target.value }))
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        Jawaban
                        <input
                          className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                          type="text"
                          value={newQuestion.answer_key}
                          onChange={(event) =>
                            setNewQuestion((prev) => ({ ...prev, answer_key: event.target.value }))
                          }
                        />
                      </label>
                      <button
                        className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-900"
                        onClick={handleAddQuestion}>
                        Simpan Soal
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold text-white">Phase 1 — Buzzer & Skor Pot</h2>
                <p className="mt-2 text-xs text-slate-400">
                  Shortcut buzzer: A=INF, S=SI, D=SIPIL, F=INDUSTRI, G=ARSI.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="rounded-full bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-900"
                    onClick={async () => {
                      await setGameState({ p1_buzzer_open: true, p1_buzzer_locked_by: null });
                      handleStatus("Buzzer dibuka");
                    }}>
                    Open Buzzer
                  </button>
                  <button
                    className="rounded-full border border-slate-700 px-4 py-2 text-xs"
                    onClick={async () => {
                      await setGameState({ p1_buzzer_open: false, p1_buzzer_locked_by: null });
                      handleStatus("Buzzer ditutup");
                    }}>
                    Close Buzzer
                  </button>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <button
                    className="rounded-2xl bg-emerald-500 px-4 py-4 text-sm font-semibold text-slate-950"
                    onClick={async () => {
                      await callAdminApi("/api/admin/phase1/score", { action: "BENAR" });
                      handleStatus("Skor BENAR diproses");
                    }}>
                    BENAR
                  </button>
                  <button
                    className="rounded-2xl bg-rose-500 px-4 py-4 text-sm font-semibold text-white"
                    onClick={async () => {
                      await callAdminApi("/api/admin/phase1/score", { action: "SALAH" });
                      handleStatus("Skor SALAH diproses");
                    }}>
                    SALAH
                  </button>
                  <button
                    className="rounded-2xl border border-slate-600 px-4 py-4 text-sm font-semibold text-slate-200"
                    onClick={async () => {
                      await callAdminApi("/api/admin/phase1/score", { action: "HANGUS" });
                      handleStatus("Soal hangus, pot direset");
                    }}>
                    HANGUS
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold text-white">Phase 2 — Gacha & AI Timer</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="rounded-full bg-purple-500 px-4 py-2 text-xs font-semibold text-white"
                    onClick={async () => {
                      await callAdminApi("/api/admin/gacha", { teamId: "all" });
                      handleStatus("Gacha semua tim selesai");
                    }}>
                    Gacha Semua Tim
                  </button>
                </div>

                <div className="mt-4 grid gap-3">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{team.name}</p>
                        <p className="text-xs text-slate-400">Topik: {team.topic_phase2 || "-"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-cyan-300">
                          {formatSeconds(aiTimerRemaining(team))}
                        </span>
                        <button
                          className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-200"
                          onClick={async () => {
                            await callAdminApi("/api/admin/gacha", { teamId: team.id });
                            handleStatus(`Gacha topik ${team.name}`);
                          }}>
                          Gacha
                        </button>
                        {team.is_ai_active ? (
                          <button
                            className="rounded-full bg-rose-500 px-3 py-2 text-xs font-semibold text-white"
                            onClick={async () => {
                              await callAdminApi("/api/admin/ai-timer", {
                                teamId: team.id,
                                action: "stop",
                              });
                              handleStatus(`Timer ${team.name} berhenti`);
                            }}>
                            Stop
                          </button>
                        ) : (
                          <button
                            className="rounded-full bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900"
                            onClick={async () => {
                              await callAdminApi("/api/admin/ai-timer", {
                                teamId: team.id,
                                action: "start",
                              });
                              handleStatus(`Timer ${team.name} berjalan`);
                            }}>
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold text-white">Phase 3 — Active Team</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        gameState?.p3_active_team_id === team.id
                          ? "bg-cyan-500 text-slate-900"
                          : "border border-slate-700 text-slate-200"
                      }`}
                      onClick={async () => {
                        await setGameState({ active_phase: "PHASE_3", p3_active_team_id: team.id });
                        handleStatus(`Tim aktif: ${team.name}`);
                      }}>
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold text-white">Ringkasan Tim</h2>
                <div className="mt-4 grid gap-4">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{team.name}</p>
                          <p className="text-xs text-slate-400">{team.prodi}</p>
                        </div>
                        <span className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{ backgroundColor: `${team.color}33`, color: team.color }}
                        >
                          {team.id.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
                        <div>
                          <p className="text-slate-400">P1 Score</p>
                          <p className="text-base font-semibold text-white">{team.score_phase1}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Final Score</p>
                          <p className="text-base font-semibold text-white">{team.final_score}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">P2 Avg</p>
                          <p className="text-base font-semibold text-white">{team.total_score_phase2}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">P3 Avg</p>
                          <p className="text-base font-semibold text-white">{team.total_score_phase3}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="mt-4 w-full rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-200"
                  onClick={async () => {
                    await callAdminApi("/api/admin/recalculate", {});
                    handleStatus("Recalculate selesai");
                  }}>
                  Recalculate Aggregation
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
