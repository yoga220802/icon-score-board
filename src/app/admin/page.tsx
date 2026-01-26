"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { addToast } from "@heroui/toast";
import { db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useGameState } from "@/lib/hooks/useGameState";
import { useTeams } from "@/lib/hooks/useTeams";
import { useActiveQuestion } from "@/lib/hooks/useActiveQuestion";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { callAdminApi } from "@/lib/api";
import type { GameState, Phase2Topic, Question, QuestionCategory, Team } from "@/lib/types";

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
  const [phase2Topics, setPhase2Topics] = useState<Phase2Topic[]>([]);
  const [questionDuration, setQuestionDuration] = useState(60);
  const [answerDuration, setAnswerDuration] = useState(20);
  const [now, setNow] = useState(Date.now());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [topicForm, setTopicForm] = useState({
    id: "",
    prodi: "",
    title: "",
    case_study: "",
  });
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [scoreEdits, setScoreEdits] = useState<Record<string, number>>({});
  const [newQuestion, setNewQuestion] = useState({
    number: 1,
    category: "GENERAL" as QuestionCategory,
    text: "",
    image_url: "",
    options: ["", ""],
    answer_key: "",
    correctOptionIndex: 0,
  });
  const [settings, setSettings] = useState({
    general_count: 5,
    logic_count: 5,
    shuffle_questions: false,
  });
  const [editingQuestion, setEditingQuestion] = useState<{
    id: string;
    number: number;
    category: QuestionCategory;
    text: string;
    image_url: string;
    options: string[];
    answer_key: string;
    correctOptionIndex: number;
  } | null>(null);

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
      setQuestions(snapshot.docs.map((doc) => ({ ...(doc.data() as Question), id: doc.id })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "phase2_topics"), orderBy("prodi", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPhase2Topics(snapshot.docs.map((doc) => ({ ...(doc.data() as Phase2Topic), id: doc.id })));
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
    if (typeof gameState?.p1_question_duration === "number") {
      setQuestionDuration(gameState.p1_question_duration);
    }
    if (typeof gameState?.p1_answer_duration === "number") {
      setAnswerDuration(gameState.p1_answer_duration);
    }
  }, [gameState?.p1_answer_duration, gameState?.p1_question_duration, gameState?.p1_settings]);

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

  useEffect(() => {
    setScoreEdits((prev) => {
      const updated: Record<string, number> = { ...prev };
      teams.forEach((team) => {
        if (updated[team.id] === undefined) {
          updated[team.id] = team.score_phase1 ?? 0;
        }
      });
      return updated;
    });
  }, [teams]);

  const setGameState = async (
    updates: Partial<GameState>,
    timerEndMs?: number | null,
    p2TimerEndMs?: number | null
  ) => {
    await callAdminApi("/api/admin/game-state", { updates, timerEndMs, p2TimerEndMs });
  };

  const timerRemaining = useMemo(() => {
    if (gameState?.p1_timer_end) {
      const endMs = gameState.p1_timer_end.toDate().getTime();
      return Math.max(0, Math.floor((endMs - now) / 1000));
    }
    if (gameState?.p1_timer_remaining !== null && gameState?.p1_timer_remaining !== undefined) {
      return gameState.p1_timer_remaining;
    }
    return null;
  }, [gameState?.p1_timer_end, gameState?.p1_timer_remaining, now]);

  const aiTimerRemaining = (team: Team) => {
    if (!team.is_ai_active || !team.ai_timer_last_started) {
      return team.ai_timer_remaining;
    }
    const startMs = team.ai_timer_last_started.toDate().getTime();
    const elapsed = Math.floor((now - startMs) / 1000);
    return Math.max(0, team.ai_timer_remaining - elapsed);
  };

  const handleAddQuestion = async () => {
    const options = newQuestion.options.map((option) => option.trim()).filter(Boolean);
    const safeCorrectIndex = Math.min(
      newQuestion.correctOptionIndex,
      Math.max(0, options.length - 1)
    );
    const optionAnswerKey = options[safeCorrectIndex]?.trim() ?? "";
    const manualAnswerKey = newQuestion.answer_key.trim();

    if (!newQuestion.text.trim()) {
      handleStatus("Lengkapi teks soal.", "warning");
      return;
    }

    if (options.length > 0 && options.length < 2) {
      handleStatus("Minimal 2 pilihan jawaban diperlukan.", "warning");
      return;
    }

    if (options.length > 0 && !optionAnswerKey) {
      handleStatus("Pilih jawaban benar untuk opsi yang tersedia.", "warning");
      return;
    }

    await addDoc(collection(db, "questions_phase1"), {
      number: newQuestion.number,
      category: newQuestion.category,
      text: newQuestion.text.trim(),
      image_url: newQuestion.image_url?.trim() || null,
      options,
      answer_key: options.length ? optionAnswerKey : manualAnswerKey,
      is_active: false,
    });

    setNewQuestion((prev) => ({
      ...prev,
      text: "",
      image_url: "",
      options: ["", ""],
      answer_key: "",
      correctOptionIndex: 0,
    }));
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

  const handleSaveDurations = async () => {
    await setGameState({
      p1_question_duration: questionDuration,
      p1_answer_duration: answerDuration,
    });
    handleStatus("Durasi fase 1 diperbarui.");
  };

  const handleEditQuestion = (question: Question) => {
    const options = question.options?.length ? question.options : [];
    const correctIndex = Math.max(
      0,
      options.findIndex((option) => option === question.answer_key)
    );
    setEditingQuestion({
      id: question.id,
      number: question.number,
      category: question.category,
      text: question.text,
      image_url: question.image_url ?? "",
      options,
      answer_key: question.answer_key ?? "",
      correctOptionIndex: correctIndex,
    });
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;
    const options = editingQuestion.options.map((option) => option.trim()).filter(Boolean);
    const safeCorrectIndex = Math.min(
      editingQuestion.correctOptionIndex,
      Math.max(0, options.length - 1)
    );
    const optionAnswerKey = options[safeCorrectIndex]?.trim() ?? "";
    const manualAnswerKey = editingQuestion.answer_key.trim();

    if (!editingQuestion.text.trim()) {
      handleStatus("Lengkapi teks soal.", "warning");
      return;
    }

    if (options.length > 0 && options.length < 2) {
      handleStatus("Minimal 2 pilihan jawaban diperlukan.", "warning");
      return;
    }

    if (options.length > 0 && !optionAnswerKey) {
      handleStatus("Pilih jawaban benar untuk opsi yang tersedia.", "warning");
      return;
    }

    const questionRef = doc(db, "questions_phase1", editingQuestion.id);
    await updateDoc(questionRef, {
      number: editingQuestion.number,
      category: editingQuestion.category,
      text: editingQuestion.text.trim(),
      image_url: editingQuestion.image_url?.trim() || null,
      options,
      answer_key: options.length ? optionAnswerKey : manualAnswerKey,
    });

    setEditingQuestion(null);
    handleStatus("Soal berhasil diperbarui.");
  };

  const handleDeleteQuestion = async (question: Question) => {
    const confirmed = window.confirm(`Hapus soal #${question.number}?`);
    if (!confirmed) return;
    await deleteDoc(doc(db, "questions_phase1", question.id));
    if (editingQuestion?.id === question.id) {
      setEditingQuestion(null);
    }
    handleStatus("Soal dihapus.");
  };

  const prodiOptions = useMemo(
    () => Array.from(new Set(teams.map((team) => team.prodi).filter(Boolean))),
    [teams]
  );

  const resetTopicForm = () => {
    setTopicForm({ id: "", prodi: "", title: "", case_study: "" });
    setEditingTopicId(null);
  };

  const openTopicModal = (topic?: Phase2Topic) => {
    if (topic) {
      setTopicForm({
        id: topic.id,
        prodi: topic.prodi,
        title: topic.title,
        case_study: topic.case_study,
      });
      setEditingTopicId(topic.id);
    } else {
      resetTopicForm();
    }
    setIsTopicModalOpen(true);
  };

  const handleSaveTopic = async () => {
    if (!topicForm.prodi.trim() || !topicForm.title.trim() || !topicForm.case_study.trim()) {
      handleStatus("Lengkapi prodi, judul topik, dan studi kasus.", "warning");
      return;
    }
    if (editingTopicId) {
      await updateDoc(doc(db, "phase2_topics", editingTopicId), {
        prodi: topicForm.prodi.trim(),
        title: topicForm.title.trim(),
        case_study: topicForm.case_study.trim(),
      });
      handleStatus("Topik fase 2 diperbarui.");
    } else {
      await addDoc(collection(db, "phase2_topics"), {
        prodi: topicForm.prodi.trim(),
        title: topicForm.title.trim(),
        case_study: topicForm.case_study.trim(),
      });
      handleStatus("Topik fase 2 ditambahkan.");
    }
    setIsTopicModalOpen(false);
    resetTopicForm();
  };

  const handleDeleteTopic = async (topic: Phase2Topic) => {
    const confirmed = window.confirm(`Hapus topik "${topic.title}" untuk ${topic.prodi}?`);
    if (!confirmed) return;
    await deleteDoc(doc(db, "phase2_topics", topic.id));
    handleStatus("Topik fase 2 dihapus.");
  };

  const handleSaveScore = async (teamId: string) => {
    await updateDoc(doc(db, "teams", teamId), {
      score_phase1: scoreEdits[teamId] ?? 0,
    });
    handleStatus("Poin awal tim diperbarui.");
  };

  const handleResetPhase1Scores = async () => {
    await callAdminApi("/api/admin/phase1/reset", {});
    handleStatus("Skor fase 1 direset.");
  };

  return (
			<ProtectedRoute allowedRoles={["admin"]}>
				<div className='min-h-screen bg-slate-950 px-4 py-8 text-slate-100'>
					<div className='mx-auto max-w-7xl space-y-6'>
						<header className='flex flex-col gap-4 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900/70 via-slate-900/40 to-slate-950/80 p-6 shadow-xl'>
							<div className='flex flex-wrap items-center justify-between gap-3'>
								<div>
									<p className='text-xs uppercase tracking-[0.3em] text-cyan-400'>
										Super Admin Command Center
									</p>
									<h1 className='text-2xl font-semibold md:text-3xl'>
										ICON Score Board
									</h1>
								</div>
								<div className='flex items-center gap-3'>
									{statusMessage && (
										<span className='rounded-full bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200'>
											{statusMessage}
										</span>
									)}
									<button
										className='rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200'
										onClick={() => {
											handleStatus("Logout berhasil.", "default");
											signOut(auth);
										}}>
										Logout
									</button>
								</div>
							</div>
							<div className='grid gap-3 text-xs text-slate-400 md:grid-cols-3'>
								<div className='rounded-2xl border border-slate-800 bg-slate-900/70 p-4'>
									<p>Phase aktif</p>
									<p className='mt-2 text-lg font-semibold text-white'>
										{gameState?.active_phase ?? "IDLE"}
									</p>
								</div>
								<div className='rounded-2xl border border-slate-800 bg-slate-900/70 p-4'>
									<p>Pot Skor</p>
									<p className='mt-2 text-lg font-semibold text-white'>
										{gameState?.p1_pot_score ?? 0}
									</p>
								</div>
								<div className='rounded-2xl border border-slate-800 bg-slate-900/70 p-4'>
									<p>Buzzer Locked</p>
									<p className='mt-2 text-lg font-semibold text-white'>
										{gameState?.p1_buzzer_locked_by ?? "-"}
									</p>
								</div>
							</div>
						</header>

						{/* Make left column wider and right column narrower */}
						<div className='grid gap-6 lg:grid-cols-[1.6fr_0.7fr]'>
							<section className='space-y-6'>
								<div className='rounded-3xl border border-slate-800 bg-slate-900/60 p-6'>
									<h2 className='text-lg font-semibold text-white'>Kontrol Fase</h2>
									<p className='mt-2 text-xs text-slate-400'>
										Atur fase aktif secara manual dan reset skor fase 1.
									</p>
									<div className='mt-4 flex flex-wrap gap-2'>
										{[
											{ label: "Idle", phase: "IDLE" },
											{ label: "Phase 1", phase: "PHASE_1" },
											{ label: "Phase 2", phase: "PHASE_2" },
											{ label: "Phase 3", phase: "PHASE_3" },
										].map((item) => (
											<button
												key={item.phase}
												className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
													gameState?.active_phase === item.phase
														? "bg-cyan-500 text-slate-900"
														: "border border-slate-700 text-slate-200"
												}`}
												onClick={async () => {
													await setGameState({ active_phase: item.phase as GameState["active_phase"] });
													handleStatus(`Fase aktif: ${item.label}`);
												}}>
												{item.label}
											</button>
										))}
										<button
											className='rounded-full border border-rose-500/60 px-4 py-2 text-xs text-rose-200'
											onClick={handleResetPhase1Scores}>
											Reset Skor Phase 1
										</button>
									</div>
								</div>
								<div className='rounded-3xl border border-slate-800 bg-slate-900/60 p-6'>
									<h2 className='text-lg font-semibold text-white'>
										Phase 1 — Control Soal & Buzzer
									</h2>
									<div className='mt-4 grid gap-4 md:grid-cols-2'>
										<div className='rounded-2xl border border-slate-800 bg-slate-950/60 p-4'>
											<p className='text-xs uppercase tracking-[0.25em] text-slate-400'>
												Soal Aktif
											</p>
											<p className='mt-2 text-base text-white'>
												{activeQuestion?.text ?? "Belum ada soal dipilih"}
											</p>
											{activeQuestion?.answer_key && gameState?.p1_show_answer && (
												<div className='mt-3 space-y-1 text-sm text-emerald-300'>
													<p>Jawaban: {activeQuestion.answer_key}</p>
													{activeQuestion.options?.length ? (
														<ul className='list-inside list-disc text-xs text-emerald-200'>
															{activeQuestion.options.map((option) => (
																<li key={option}>{option}</li>
															))}
														</ul>
													) : null}
												</div>
											)}
										</div>
										<div className='rounded-2xl border border-slate-800 bg-slate-950/60 p-4'>
											<p className='text-xs uppercase tracking-[0.25em] text-slate-400'>
												Durasi & Timer Fase 1
											</p>
											<div className='mt-3 grid gap-3 text-sm'>
												<label className='flex items-center gap-2'>
													Durasi soal
													<input
														className='w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm'
														type='number'
														min={10}
														value={questionDuration}
														onChange={(event) =>
															setQuestionDuration(Number(event.target.value))
														}
													/>
													<span className='text-xs text-slate-400'>detik</span>
												</label>
												<label className='flex items-center gap-2'>
													Durasi jawab
													<input
														className='w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm'
														type='number'
														min={5}
														value={answerDuration}
														onChange={(event) =>
															setAnswerDuration(Number(event.target.value))
														}
													/>
													<span className='text-xs text-slate-400'>detik</span>
												</label>
											</div>
											<p className='mt-3 text-lg font-semibold text-cyan-300'>
												{timerRemaining !== null ? formatSeconds(timerRemaining) : "00:00"}
											</p>
											<div className='mt-4 flex flex-wrap gap-2'>
												<button
													className='rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-900'
													onClick={handleSaveDurations}>
													Simpan Durasi
												</button>
												<button
													className='rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200'
													onClick={async () => {
														await setGameState(
															{
																p1_timer_remaining:
																	timerRemaining ?? gameState?.p1_question_duration ?? questionDuration,
																p1_timer_end: null,
															},
															null
														);
														handleStatus("Timer dijeda");
													}}>
													Jeda Timer
												</button>
												<button
													className='rounded-full border border-emerald-500/60 px-4 py-2 text-xs text-emerald-200'
													onClick={async () => {
														await setGameState({
															p1_show_answer: !gameState?.p1_show_answer,
														});
														handleStatus("Tampilan jawaban diperbarui");
													}}>
													{gameState?.p1_show_answer ? "Sembunyikan" : "Tampilkan"} Jawaban
												</button>
												<button
													className='rounded-full border border-slate-600 px-4 py-2 text-xs text-slate-200'
													onClick={async () => {
														await setGameState({
															p1_show_question: !(gameState?.p1_show_question ?? true),
														});
														handleStatus("Tampilan soal diperbarui");
													}}>
													{gameState?.p1_show_question ?? true ? "Sembunyikan" : "Tampilkan"} Soal
												</button>
											</div>
										</div>
									</div>

									<div className='mt-6 grid gap-3'>
										<p className='text-xs uppercase tracking-[0.25em] text-slate-400'>
											Daftar Soal
										</p>
										<div className='grid gap-2 max-h-56 overflow-y-auto pr-2'>
											{questions.map((question) => (
												<div
													key={question.id}
													role='button'
													tabIndex={0}
													className={`rounded-2xl border px-4 py-3 text-left text-sm transition cursor-pointer ${
														gameState?.p1_question_id === question.id
															? "border-cyan-400 bg-cyan-500/10 text-cyan-200"
															: "border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-600"
													}`}
													onClick={async () => {
														await setGameState(
															{
																active_phase: "PHASE_1",
																p1_question_id: question.id,
																p1_show_question: false,
																p1_show_answer: false,
																p1_buzzer_open: false,
																p1_buzzer_locked_by: null,
																p1_answer_deadline: null,
																p1_timer_remaining: questionDuration,
																p1_timer_end: null,
																p1_question_duration: questionDuration,
																p1_answer_duration: answerDuration,
															},
															null
														);
														handleStatus("Soal dipilih, buzzer siap dibuka");
													}}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															(e.currentTarget as HTMLDivElement).click();
														}
													}}>
													<div className='flex items-center justify-between gap-2'>
														<span>
															#{question.number} •{" "}
															{question.category === "GENERAL"
																? "Pengetahuan Umum"
																: "Kemampuan Logika"}
														</span>

															<div className='flex items-center gap-2'>
																<button
																	className='rounded-full border border-slate-600 px-2 py-1 text-[10px] uppercase text-slate-300'
																	type='button'
																	onClick={(event) => {
																		event.stopPropagation();
																		handleEditQuestion(question);
																	}}>
																	Edit
																</button>
																<button
																	className='rounded-full border border-rose-500/50 px-2 py-1 text-[10px] uppercase text-rose-200'
																	type='button'
																	onClick={(event) => {
																		event.stopPropagation();
																		handleDeleteQuestion(question);
																	}}>
																	Hapus
																</button>

															{question.is_active && (
																<span className='rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200'>
																	Active
																</span>
															)}
														</div>
													</div>

													<p className='mt-2 text-xs text-slate-400 line-clamp-2'>
														{question.text}
													</p>
												</div>
											))}
										</div>
									</div>

									<div className='mt-8 grid gap-4 md:grid-cols-2'>
										<div className='rounded-2xl border border-slate-800 bg-slate-950/60 p-4'>
											<p className='text-xs uppercase tracking-[0.25em] text-slate-400'>
												Pengaturan Soal Phase 1
											</p>
											<div className='mt-3 grid gap-3 text-sm'>
												<label className='flex flex-col gap-2'>
													Jumlah Pengetahuan Umum
													<input
														className='rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
														type='number'
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
												<label className='flex flex-col gap-2'>
													Jumlah Kemampuan Logika
													<input
														className='rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
														type='number'
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
												<label className='flex items-center gap-2 text-xs text-slate-300'>
													<input
														type='checkbox'
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
													className='rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-900'
													onClick={handleSaveSettings}>
													Simpan Pengaturan
												</button>
											</div>
										</div>
										<div className='rounded-2xl border border-slate-800 bg-slate-950/60 p-4'>
											<p className='text-xs uppercase tracking-[0.25em] text-slate-400'>
												Tambah Soal Phase 1
											</p>
											<div className='mt-3 grid gap-3 text-sm'>
												<label className='flex flex-col gap-2'>
													Nomor Soal
													<input
														className='rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
														type='number'
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
												<label className='flex flex-col gap-2'>
													Kategori
													<select
														className='rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
														value={newQuestion.category}
														onChange={(event) =>
															setNewQuestion((prev) => ({
																...prev,
																category: event.target.value as QuestionCategory,
															}))
														}>
														<option value='GENERAL'>Pengetahuan Umum</option>
														<option value='LOGIC'>Kemampuan Logika</option>
													</select>
												</label>
												<label className='flex flex-col gap-2'>
													Teks Soal
													<textarea
														className='min-h-[80px] rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
														value={newQuestion.text}
														onChange={(event) =>
															setNewQuestion((prev) => ({ ...prev, text: event.target.value }))
														}
													/>
												</label>
												<label className='flex flex-col gap-2'>
													URL Gambar (opsional)
													<input
														className='rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
														type='text'
														value={newQuestion.image_url}
														onChange={(event) =>
															setNewQuestion((prev) => ({
																...prev,
																image_url: event.target.value,
															}))
														}
													/>
												</label>
												<label className='flex flex-col gap-2'>
													Pilihan Jawaban
													<span className='text-[11px] text-slate-400'>
														Kosongkan jika soal tanpa pilihan.
													</span>
													<div className='space-y-2'>
														{newQuestion.options.map((option, index) => (
															<div key={`option-${index}`} className='flex items-center gap-2'>
																<input
																	className='flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
																	type='text'
																	placeholder={`Pilihan ${index + 1}`}
																	value={option}
																	onChange={(event) =>
																		setNewQuestion((prev) => {
																			const updated = [...prev.options];
																			updated[index] = event.target.value;
																			return { ...prev, options: updated };
																		})
																	}
																/>
																<button
																	className={`rounded-full border px-3 py-1 text-[10px] uppercase ${
																		newQuestion.correctOptionIndex === index
																			? "border-emerald-400 text-emerald-200"
																			: "border-slate-600 text-slate-300"
																	}`}
																	type='button'
																	onClick={() =>
																		setNewQuestion((prev) => ({
																			...prev,
																			correctOptionIndex: index,
																		}))
																	}>
																	{newQuestion.correctOptionIndex === index ? "Benar" : "Pilih"}
																</button>
																<button
																	className='rounded-full border border-rose-500/50 px-3 py-1 text-[10px] text-rose-200'
																	type='button'
																	disabled={newQuestion.options.length === 0}
																	onClick={() =>
																		setNewQuestion((prev) => {
																			if (prev.options.length === 0) return prev;
																			const updated = prev.options.filter(
																				(_, optIndex) => optIndex !== index
																			);
																			const nextCorrect = Math.min(
																				prev.correctOptionIndex,
																				Math.max(0, updated.length - 1)
																			);
																			return {
																				...prev,
																				options: updated,
																				correctOptionIndex: nextCorrect,
																			};
																		})
																	}>
																	Hapus
																</button>
															</div>
														))}
														<button
															className='rounded-full border border-slate-600 px-3 py-1 text-[10px] uppercase text-slate-300'
															type='button'
															onClick={() =>
																setNewQuestion((prev) => ({
																	...prev,
																	options: [...prev.options, ""],
																}))
															}>
															Tambah Pilihan
														</button>
													</div>
												</label>
												{newQuestion.options.length === 0 && (
													<label className='flex flex-col gap-2'>
														Jawaban Benar (opsional)
														<input
															className='rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
															type='text'
															placeholder='Isi jika perlu validasi otomatis'
															value={newQuestion.answer_key}
															onChange={(event) =>
																setNewQuestion((prev) => ({
																	...prev,
																	answer_key: event.target.value,
																}))
															}
														/>
													</label>
												)}
												<button
													className='rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-900'
													onClick={handleAddQuestion}>
													Simpan Soal
												</button>
											</div>
										</div>
										{editingQuestion ? (
											<div className='rounded-2xl border border-emerald-500/30 bg-slate-950/60 p-4 md:col-span-2'>
												<div className='flex items-center justify-between'>
													<p className='text-xs uppercase tracking-[0.25em] text-emerald-200'>
														Edit Soal Phase 1
													</p>
													<button
														className='rounded-full border border-slate-600 px-3 py-1 text-[10px] uppercase text-slate-300'
														type='button'
														onClick={() => setEditingQuestion(null)}>
														Batal
													</button>
												</div>
												<div className='mt-3 grid gap-3 text-sm'>
													<label className='flex flex-col gap-2'>
														Nomor Soal
														<input
															className='rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
															type='number'
															min={1}
															value={editingQuestion.number}
															onChange={(event) =>
																setEditingQuestion((prev) =>
																	prev
																		? {
																				...prev,
																				number: Number(event.target.value),
																		  }
																		: prev
																)
															}
														/>
													</label>
													<label className='flex flex-col gap-2'>
														Kategori
														<select
															className='rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
															value={editingQuestion.category}
															onChange={(event) =>
																setEditingQuestion((prev) =>
																	prev
																		? {
																				...prev,
																				category: event.target.value as QuestionCategory,
																		  }
																		: prev
																)
															}>
															<option value='GENERAL'>Pengetahuan Umum</option>
															<option value='LOGIC'>Kemampuan Logika</option>
														</select>
													</label>
													<label className='flex flex-col gap-2'>
														Teks Soal
														<textarea
															className='min-h-[80px] rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
															value={editingQuestion.text}
															onChange={(event) =>
																setEditingQuestion((prev) =>
																	prev
																		? {
																				...prev,
																				text: event.target.value,
																		  }
																		: prev
																)
															}
														/>
													</label>
													<label className='flex flex-col gap-2'>
														URL Gambar (opsional)
														<input
															className='rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
															type='text'
															value={editingQuestion.image_url}
															onChange={(event) =>
																setEditingQuestion((prev) =>
																	prev
																		? {
																				...prev,
																				image_url: event.target.value,
																		  }
																		: prev
																)
															}
														/>
													</label>
													<label className='flex flex-col gap-2'>
														Pilihan Jawaban
														<span className='text-[11px] text-slate-400'>
															Kosongkan jika soal tanpa pilihan.
														</span>
														<div className='space-y-2'>
															{editingQuestion.options.map((option, index) => (
																<div
																	key={`edit-option-${index}`}
																	className='flex items-center gap-2'>
																	<input
																		className='flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
																		type='text'
																		placeholder={`Pilihan ${index + 1}`}
																		value={option}
																		onChange={(event) =>
																			setEditingQuestion((prev) => {
																				if (!prev) return prev;
																				const updated = [...prev.options];
																				updated[index] = event.target.value;
																				return { ...prev, options: updated };
																			})
																		}
																	/>
																	<button
																		className={`rounded-full border px-3 py-1 text-[10px] uppercase ${
																			editingQuestion.correctOptionIndex === index
																				? "border-emerald-400 text-emerald-200"
																				: "border-slate-600 text-slate-300"
																		}`}
																		type='button'
																		onClick={() =>
																			setEditingQuestion((prev) =>
																				prev ? { ...prev, correctOptionIndex: index } : prev
																			)
																		}>
																		{editingQuestion.correctOptionIndex === index
																			? "Benar"
																			: "Pilih"}
																	</button>
																	<button
																		className='rounded-full border border-rose-500/50 px-3 py-1 text-[10px] text-rose-200'
																		type='button'
																		disabled={editingQuestion.options.length === 0}
																		onClick={() =>
																			setEditingQuestion((prev) => {
																				if (!prev || prev.options.length === 0) return prev;
																				const updated = prev.options.filter(
																					(_, optIndex) => optIndex !== index
																				);
																				const nextCorrect = Math.min(
																					prev.correctOptionIndex,
																					Math.max(0, updated.length - 1)
																				);
																				return {
																					...prev,
																					options: updated,
																					correctOptionIndex: nextCorrect,
																				};
																			})
																		}>
																		Hapus
																	</button>
																</div>
															))}
															<button
																className='rounded-full border border-slate-600 px-3 py-1 text-[10px] uppercase text-slate-300'
																type='button'
																onClick={() =>
																	setEditingQuestion((prev) =>
																		prev ? { ...prev, options: [...prev.options, ""] } : prev
																	)
																}>
																Tambah Pilihan
															</button>
														</div>
													</label>
													{editingQuestion.options.length === 0 && (
														<label className='flex flex-col gap-2'>
															Jawaban Benar (opsional)
															<input
																className='rounded-lg border border-slate-700 bg-slate-900 px-2 py-1'
																type='text'
																placeholder='Isi jika perlu validasi otomatis'
																value={editingQuestion.answer_key}
																onChange={(event) =>
																	setEditingQuestion((prev) =>
																		prev
																			? {
																					...prev,
																					answer_key: event.target.value,
																			  }
																			: prev
																	)
																}
															/>
														</label>
													)}
													<div className='flex flex-wrap gap-2'>
														<button
															className='rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-900'
															onClick={handleUpdateQuestion}>
															Simpan Perubahan
														</button>
														<button
															className='rounded-full border border-slate-600 px-4 py-2 text-xs text-slate-200'
															onClick={() => setEditingQuestion(null)}>
															Batal
														</button>
													</div>
												</div>
											</div>
										) : null}
									</div>
								</div>

								<div className='rounded-3xl border border-slate-800 bg-slate-900/60 p-6'>
									<h2 className='text-lg font-semibold text-white'>
										Phase 1 — Buzzer & Skor Pot
									</h2>
									<p className='mt-2 text-xs text-slate-400'>
										Shortcut buzzer: A=INF, S=SI, D=SIPIL, F=INDUSTRI, G=ARSI.
									</p>
									<div className='mt-4 flex flex-wrap gap-2'>
										<button
											className='rounded-full bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-900'
											onClick={async () => {
												await setGameState(
													{
														p1_buzzer_open: true,
														p1_buzzer_locked_by: null,
														p1_answer_deadline: null,
														p1_timer_remaining: null,
													},
													Date.now() + questionDuration * 1000
												);
												handleStatus("Buzzer dimulai");
											}}>
											Mulai Buzzer
										</button>
										<button
											className='rounded-full border border-slate-700 px-4 py-2 text-xs'
											onClick={async () => {
												await setGameState({
													p1_buzzer_open: false,
													p1_buzzer_locked_by: null,
													p1_answer_deadline: null,
													p1_timer_end: null,
													p1_timer_remaining:
														timerRemaining ?? gameState?.p1_question_duration ?? questionDuration,
												});
												handleStatus("Buzzer ditutup");
											}}>
											Tutup Buzzer
										</button>
									</div>

									<div className='mt-6 grid gap-3 md:grid-cols-3'>
										<button
											className='rounded-2xl bg-emerald-500 px-4 py-4 text-sm font-semibold text-slate-950'
											onClick={async () => {
												await callAdminApi("/api/admin/phase1/score", { action: "BENAR" });
												handleStatus("Skor BENAR diproses");
											}}>
											BENAR
										</button>
										<button
											className='rounded-2xl bg-rose-500 px-4 py-4 text-sm font-semibold text-white'
											onClick={async () => {
												await callAdminApi("/api/admin/phase1/score", { action: "SALAH" });
												handleStatus("Skor SALAH diproses");
											}}>
											SALAH
										</button>
										<button
											className='rounded-2xl border border-slate-600 px-4 py-4 text-sm font-semibold text-slate-200'
											onClick={async () => {
												await callAdminApi("/api/admin/phase1/score", { action: "HANGUS" });
												handleStatus("Soal hangus, pot direset");
											}}>
											HANGUS
										</button>
									</div>
								</div>

								<div className='rounded-3xl border border-slate-800 bg-slate-900/60 p-6'>
									<h2 className='text-lg font-semibold text-white'>
										Phase 2 — Gacha & AI Timer
									</h2>
									<div className='mt-4 flex flex-wrap gap-2'>
										<button
											className='rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-900'
											onClick={async () => {
												const twoHoursMs = 2 * 60 * 60 * 1000;
												await setGameState(
													{ active_phase: "PHASE_2" },
													undefined,
													Date.now() + twoHoursMs
												);
												handleStatus("Fase 2 dimulai (2 jam)");
											}}>
											Mulai Fase 2 (2 Jam)
										</button>
										<button
											className='rounded-full bg-purple-500 px-4 py-2 text-xs font-semibold text-white'
											onClick={async () => {
												await callAdminApi("/api/admin/gacha", { teamId: "all" });
												handleStatus("Gacha semua tim selesai");
											}}>
											Gacha Semua Tim
										</button>
										<button
											className='rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200'
											onClick={async () => {
												await callAdminApi("/api/admin/phase2/reset-topic", {
													teamId: "all",
												});
												handleStatus("Topik semua tim direset");
											}}>
											Reset Topik Semua
										</button>
										<button
											className='rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200'
											onClick={async () => {
												await callAdminApi("/api/admin/ai-timer", {
													teamId: "all",
													action: "reset",
												});
												handleStatus("Timer AI semua tim direset");
											}}>
											Reset Timer AI Semua
										</button>
									</div>

									<div className='mt-4 grid gap-3'>
										{teams.map((team) => (
											<div
												key={team.id}
												className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4'>
												<div>
													<p className='text-sm font-semibold text-white'>{team.name}</p>
													<p className='text-xs text-slate-400'>
														Topik: {team.topic_phase2?.title ?? "-"}
													</p>
												</div>
												<div className='flex items-center gap-3'>
													<span className='text-sm text-cyan-300'>
														{formatSeconds(aiTimerRemaining(team))}
													</span>
													<button
														className='rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-200'
														onClick={async () => {
															await callAdminApi("/api/admin/gacha", { teamId: team.id });
															handleStatus(`Gacha topik ${team.name}`);
														}}>
														Gacha
													</button>
													<button
														className='rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-200'
														onClick={async () => {
															await callAdminApi("/api/admin/phase2/reset-topic", {
																teamId: team.id,
															});
															handleStatus(`Topik ${team.name} direset`);
														}}>
														Reset Topik
													</button>
													{team.is_ai_active ? (
														<button
															className='rounded-full bg-rose-500 px-3 py-2 text-xs font-semibold text-white'
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
															className='rounded-full bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900'
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
													<button
														className='rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-200'
														onClick={async () => {
															await callAdminApi("/api/admin/ai-timer", {
																teamId: team.id,
																action: "reset",
															});
															handleStatus(`Timer ${team.name} direset`);
														}}>
														Reset Timer
													</button>
												</div>
											</div>
										))}
									</div>
								</div>

								<div className='rounded-3xl border border-slate-800 bg-slate-900/60 p-6'>
									<div className='flex flex-wrap items-center justify-between gap-3'>
										<div>
											<h2 className='text-lg font-semibold text-white'>
												Phase 2 — Daftar Topik per Prodi
											</h2>
											<p className='mt-2 text-xs text-slate-400'>
												Kelola topik & studi kasus untuk pengundian fase 2.
											</p>
										</div>
										<button
											className='rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-900'
											onClick={() => openTopicModal()}>
											Tambah Topik
										</button>
									</div>
									<div className='mt-4 grid gap-4'>
										{phase2Topics.length === 0 ? (
											<p className='text-xs text-slate-400'>
												Belum ada topik. Tambahkan topik untuk setiap prodi.
											</p>
										) : (
											phase2Topics.map((topic) => (
												<div
													key={topic.id}
													className='rounded-2xl border border-slate-800 bg-slate-950/60 p-4'>
													<div className='flex flex-wrap items-center justify-between gap-3'>
														<div>
															<p className='text-xs uppercase tracking-[0.25em] text-slate-400'>
																{topic.prodi}
															</p>
															<p className='mt-2 text-sm font-semibold text-white'>
																{topic.title}
															</p>
														</div>
														<div className='flex items-center gap-2'>
															<button
																className='rounded-full border border-slate-600 px-3 py-1 text-[10px] uppercase text-slate-300'
																type='button'
																onClick={() => openTopicModal(topic)}>
																Edit
															</button>
															<button
																className='rounded-full border border-rose-500/50 px-3 py-1 text-[10px] uppercase text-rose-200'
																type='button'
																onClick={() => handleDeleteTopic(topic)}>
																Hapus
															</button>
														</div>
													</div>
													<p className='mt-3 text-xs text-slate-300 line-clamp-3'>
														{topic.case_study}
													</p>
												</div>
											))
										)}
									</div>
								</div>

								<div className='rounded-3xl border border-slate-800 bg-slate-900/60 p-6'>
									<h2 className='text-lg font-semibold text-white'>
										Phase 3 — Active Team
									</h2>
									<div className='mt-4 flex flex-wrap gap-2'>
										{teams.map((team) => (
											<button
												key={team.id}
												className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
													gameState?.p3_active_team_id === team.id
														? "bg-cyan-500 text-slate-900"
														: "border border-slate-700 text-slate-200"
												}`}
												onClick={async () => {
													await setGameState({
														active_phase: "PHASE_3",
														p3_active_team_id: team.id,
													});
													handleStatus(`Tim aktif: ${team.name}`);
												}}>
												{team.name}
											</button>
										))}
									</div>
								</div>
							</section>

							{/* Prevent overflow in the right column */}
							<section className='space-y-6 min-w-0'>
								<div className='rounded-3xl border border-slate-800 bg-slate-900/60 p-5'>
									<h2 className='text-lg font-semibold text-white'>Ringkasan Tim</h2>
									<div className='mt-4 grid gap-4'>
										{teams.map((team) => (
											<div
												key={team.id}
												className='rounded-2xl border border-slate-800 bg-slate-950/60 p-4'>
												<div className='flex items-center justify-between'>
													<div>
														<p className='text-sm font-semibold text-white'>{team.name}</p>
														<p className='text-xs text-slate-400'>{team.prodi}</p>
													</div>
													<span
														className='rounded-full px-3 py-1 text-xs font-semibold'
														style={{ backgroundColor: `${team.color}33`, color: team.color }}>
														{team.id.toUpperCase()}
													</span>
												</div>
												<div className='mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300'>
													<div>
														<p className='text-slate-400'>P1 Score</p>
														<p className='text-base font-semibold text-white'>
															{team.score_phase1}
														</p>
													</div>
													<div>
														<p className='text-slate-400'>Final Score</p>
														<p className='text-base font-semibold text-white'>
															{team.final_score}
														</p>
													</div>
													<div>
														<p className='text-slate-400'>P2 Avg</p>
														<p className='text-base font-semibold text-white'>
															{team.total_score_phase2}
														</p>
													</div>
													<div>
														<p className='text-slate-400'>P3 Avg</p>
														<p className='text-base font-semibold text-white'>
															{team.total_score_phase3}
														</p>
													</div>
												</div>
												<div className='mt-4 grid gap-3 text-xs text-slate-300'>
													<label className='flex flex-col gap-2'>
														Poin awal Phase 1
														<input
															className='rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm'
															type='number'
															value={scoreEdits[team.id] ?? 0}
															onChange={(event) =>
																setScoreEdits((prev) => ({
																	...prev,
																	[team.id]: Number(event.target.value),
																}))
															}
														/>
													</label>
													<button
														className='rounded-full border border-cyan-500/60 px-3 py-2 text-xs text-cyan-200'
														onClick={() => handleSaveScore(team.id)}>
														Simpan Poin Awal
													</button>
													<div className='rounded-xl border border-slate-800 bg-slate-900/60 p-3'>
														<p className='text-[10px] uppercase tracking-[0.25em] text-slate-500'>
															Link Dokumen Phase 2
														</p>
														{team.drive_link_phase2 ? (
															<a
																className='mt-2 block text-xs text-cyan-200 underline underline-offset-4'
																href={team.drive_link_phase2}
																target='_blank'
																rel='noreferrer'>
																{team.drive_link_phase2}
															</a>
														) : (
															<p className='mt-2 text-xs text-slate-400'>Belum submit</p>
														)}
													</div>
												</div>
											</div>
										))}
									</div>
									<button
										className='mt-4 w-full rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-200'
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
				{isTopicModalOpen && (
					<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8'>
						<div className='w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl'>
							<div className='flex items-center justify-between gap-3'>
								<div>
									<p className='text-xs uppercase tracking-[0.3em] text-cyan-400'>
										{editingTopicId ? "Edit Topik" : "Tambah Topik"}
									</p>
									<h3 className='text-lg font-semibold text-white'>
										Topik Phase 2
									</h3>
								</div>
								<button
									className='rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300'
									onClick={() => {
										setIsTopicModalOpen(false);
										resetTopicForm();
									}}>
									Tutup
								</button>
							</div>
							<div className='mt-4 grid gap-4 text-sm'>
								<label className='flex flex-col gap-2'>
									Program Studi
									<input
										className='rounded-lg border border-slate-700 bg-slate-900 px-3 py-2'
										list='prodi-options'
										value={topicForm.prodi}
										onChange={(event) =>
											setTopicForm((prev) => ({ ...prev, prodi: event.target.value }))
										}
										placeholder='Contoh: Informatika'
									/>
									<datalist id='prodi-options'>
										{prodiOptions.map((prodi) => (
											<option key={prodi} value={prodi} />
										))}
									</datalist>
								</label>
								<label className='flex flex-col gap-2'>
									Judul Topik
									<input
										className='rounded-lg border border-slate-700 bg-slate-900 px-3 py-2'
										value={topicForm.title}
										onChange={(event) =>
											setTopicForm((prev) => ({ ...prev, title: event.target.value }))
										}
									/>
								</label>
								<label className='flex flex-col gap-2'>
									Narasi Studi Kasus
									<textarea
										className='min-h-[120px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2'
										value={topicForm.case_study}
										onChange={(event) =>
											setTopicForm((prev) => ({ ...prev, case_study: event.target.value }))
										}
									/>
								</label>
								<div className='flex flex-wrap justify-end gap-2'>
									<button
										className='rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300'
										onClick={() => {
											setIsTopicModalOpen(false);
											resetTopicForm();
										}}>
										Batal
									</button>
									<button
										className='rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-900'
										onClick={handleSaveTopic}>
										Simpan Topik
									</button>
								</div>
							</div>
						</div>
					</div>
				)}
			</ProtectedRoute>
		);
}
