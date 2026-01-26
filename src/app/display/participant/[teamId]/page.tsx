"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { signOut } from "firebase/auth";
import { addToast } from "@heroui/toast"; // Logic Toast dipertahankan
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ParticipantRoute } from "@/components/ParticipantRoute";
import { callParticipantApi } from "@/lib/api";
import { useGameState } from "@/lib/hooks/useGameState";
import { useTeams } from "@/lib/hooks/useTeams";
import { useActiveQuestion } from "@/lib/hooks/useActiveQuestion";
import { auth, db } from "@/lib/firebase";
import type { Phase2Topic } from "@/lib/types";

export default function ParticipantDisplayPage() {
	const params = useParams<{ teamId: string }>();
	const { gameState } = useGameState();
	const { teams } = useTeams("name");
	const activeQuestion = useActiveQuestion(gameState?.p1_question_id);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [phase2Topics, setPhase2Topics] = useState<Phase2Topic[]>([]);
	const [isRolling, setIsRolling] = useState(false);
	const [rollingTitle, setRollingTitle] = useState<string | null>(null);
	const [driveLink, setDriveLink] = useState<string>("");
	const [driveStatus, setDriveStatus] = useState<string | null>(null);

	// --- Logic State Benar/Salah (Dipertahankan) ---
	// Note: Karena input dibuang, lo butuh trigger eksternal (misal: listen perubahan score)
	// buat ngubah state ini jadi 'correct' atau 'wrong'.
	const [answerState, setAnswerState] = useState<
		"idle" | "answering" | "correct" | "wrong"
	>("idle");

	// --- Logic Image Modal (Dari Codex) ---
	const [isImageOpen, setIsImageOpen] = useState(false);
	const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
	const [activeImageAlt, setActiveImageAlt] = useState<string>("");

	const [now, setNow] = useState(Date.now());
	const timeoutTriggered = useRef(false);

	const team = useMemo(
		() => teams.find((item) => item.id === params.teamId),
		[params.teamId, teams]
	);
	const isPhase2Active = gameState?.active_phase === "PHASE_2";

	const phase1Winner = useMemo(() => {
		if (!teams.length) return null;
		return [...teams].sort((a, b) => (b.score_phase1 ?? 0) - (a.score_phase1 ?? 0))[0];
	}, [teams]);
	const isPhase1Winner = team?.id && phase1Winner?.id === team.id;

	const isLocked = gameState?.p1_buzzer_locked_by === params.teamId;
	const lockedTeam = useMemo(
		() => teams.find((item) => item.id === gameState?.p1_buzzer_locked_by),
		[gameState?.p1_buzzer_locked_by, teams]
	);
	const answerDeadline =
		gameState?.p1_answer_deadline?.toDate().getTime() ?? null;
	const remainingSeconds = answerDeadline
		? Math.max(0, Math.ceil((answerDeadline - now) / 1000))
		: null;

	const questionTimerRemaining = useMemo(() => {
		if (gameState?.p1_timer_end) {
			const endMs = gameState.p1_timer_end.toDate().getTime();
			return Math.max(0, Math.ceil((endMs - now) / 1000));
		}
		if (
			gameState?.p1_timer_remaining !== null &&
			gameState?.p1_timer_remaining !== undefined
		) {
			return gameState.p1_timer_remaining;
		}
		return null;
	}, [gameState?.p1_timer_end, gameState?.p1_timer_remaining, now]);

	const isBuzzerOpen = Boolean(gameState?.p1_buzzer_open);
	const isBuzzerLockedByOther = Boolean(
		gameState?.p1_buzzer_locked_by && !isLocked
	);
	const showTimer = Boolean(gameState?.p1_timer_end);
	const shouldShowQuestion = gameState?.p1_show_question ?? true;
	const visibleQuestion = shouldShowQuestion ? activeQuestion : null;

	// --- Logic Background Color (Dipertahankan) ---
	const isAnswering =
		isLocked && answerState !== "correct" && answerState !== "wrong";
	const pageTheme =
		answerState === "correct"
			? "bg-emerald-600"
			: answerState === "wrong"
			? "bg-rose-600"
			: isAnswering
			? "bg-amber-400"
			: isBuzzerLockedByOther
			? "bg-amber-500"
			: "bg-slate-950";

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 500);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		if (!team?.prodi) {
			setPhase2Topics([]);
			return;
		}
		const q = query(collection(db, "phase2_topics"), where("prodi", "==", team.prodi));
		const unsubscribe = onSnapshot(q, (snapshot) => {
			setPhase2Topics(
				snapshot.docs.map((doc) => ({ ...(doc.data() as Phase2Topic), id: doc.id }))
			);
		});
		return () => unsubscribe();
	}, [team?.prodi]);

	useEffect(() => {
		if (team?.drive_link_phase2) {
			setDriveLink(team.drive_link_phase2);
		}
	}, [team?.drive_link_phase2]);

	// UseEffect Timeout
	useEffect(() => {
		if (!isLocked) {
			timeoutTriggered.current = false;
			// Reset state kalau buzzer lepas (misal di-reset admin atau timeout)
			if (answerState === "answering") {
				setAnswerState("idle");
			}
			return;
		}
		if (!answerDeadline || remainingSeconds === null || remainingSeconds > 0) {
			return;
		}
		if (timeoutTriggered.current) {
			return;
		}
		timeoutTriggered.current = true;
		callParticipantApi("/api/participant/phase1/timeout", {
			teamId: params.teamId,
		}).catch(() => undefined);
	}, [answerDeadline, isLocked, params.teamId, remainingSeconds, answerState]);

	// Reset state pas ganti soal
	useEffect(() => {
		setAnswerState("idle");
	}, [gameState?.p1_question_id]);

	// Auto set status 'MENJAWAB' pas buzzer terkunci
	useEffect(() => {
		if (isLocked && answerState === "idle") {
			setAnswerState("answering");
		}
	}, [answerState, isLocked]);

	const handleLock = async () => {
		setStatusMessage(null);
		try {
			await callParticipantApi("/api/participant/phase1/lock", {
				teamId: params.teamId,
			});
			setStatusMessage("Buzzer terkunci. Tunggu keputusan juri.");
		} catch (error) {
			setStatusMessage((error as Error).message || "Gagal mengunci buzzer.");
		}
	};

	const handleRandomTopic = async () => {
		setDriveStatus(null);
		if (isRolling) return;
		setIsRolling(true);
		const rollingPool = phase2Topics.map((topic) => topic.title);
		let rollIndex = 0;
		const interval = window.setInterval(() => {
			if (rollingPool.length) {
				setRollingTitle(rollingPool[rollIndex % rollingPool.length]);
				rollIndex += 1;
			}
		}, 120);

		try {
			await new Promise((resolve) => window.setTimeout(resolve, 1600));
			await callParticipantApi("/api/participant/phase2/random-topic", {});
			addToast({ title: "Topik berhasil diacak", color: "success" });
		} catch (error) {
			addToast({
				title: (error as Error).message || "Gagal mengacak topik",
				color: "danger",
			});
		} finally {
			window.clearInterval(interval);
			setIsRolling(false);
			setRollingTitle(null);
		}
	};

	const handleSelectTopic = async (topicId: string) => {
		try {
			await callParticipantApi("/api/participant/phase2/select-topic", { topicId });
			addToast({ title: "Topik berhasil dipilih", color: "success" });
		} catch (error) {
			addToast({
				title: (error as Error).message || "Gagal memilih topik",
				color: "danger",
			});
		}
	};

	const handleSubmitDrive = async () => {
		setDriveStatus(null);
		try {
			await callParticipantApi("/api/participant/phase2/drive-link", { link: driveLink });
			setDriveStatus("Link berhasil disimpan. Pastikan akses viewer untuk semua orang.");
		} catch (error) {
			setDriveStatus((error as Error).message || "Gagal menyimpan link.");
		}
	};

	const casePreview = (value?: string, limit = 160) => {
		if (!value) return "-";
		if (value.length <= limit) return value;
		return `${value.slice(0, limit)}...`;
	};

	// --- Image Zoom Handler (Codex) ---
	const handleOpenImage = (url: string, alt: string) => {
		setActiveImageUrl(url);
		setActiveImageAlt(alt);
		setIsImageOpen(true);
	};

	return (
		<ParticipantRoute teamId={params.teamId}>
			<main
				className={`min-h-screen px-8 py-10 text-white transition-colors duration-300 ${pageTheme}`}>
				<div className='mx-auto max-w-5xl space-y-8'>
					<header className='space-y-3'>
						<p className='text-xs uppercase tracking-[0.3em] text-slate-300'>
							Participant View
						</p>
						<div className='flex flex-wrap items-start justify-between gap-4'>
							<div>
								<h1 className='text-3xl font-semibold md:text-5xl'>
									{team?.name ?? "Team"}
								</h1>
								{team?.prodi && <p className='text-sm text-slate-200'>{team.prodi}</p>}
							</div>
							<button
								className='rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white/60'
								onClick={() => signOut(auth)}>
								Logout
							</button>
						</div>
					</header>

					<section className='rounded-3xl border border-white/20 bg-black/30 p-8'>
						<div className='flex flex-col gap-4'>
							<div className='flex flex-wrap items-center justify-between gap-3'>
								<p className='text-xs uppercase tracking-[0.2em] text-slate-300'>
									Soal Aktif
								</p>
								{showTimer && questionTimerRemaining !== null && (
									<span className='rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200'>
										Sisa waktu: {questionTimerRemaining}s
									</span>
								)}
							</div>
							<h2 className='text-2xl font-semibold text-white md:text-4xl'>
								{visibleQuestion?.text ?? "Menunggu soal berikutnya..."}
							</h2>

							{/* Image Section: Gabungan Codex (onClick) */}
							{visibleQuestion?.image_url ? (
								<div
									className='relative mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-white/20'
									role='button'
									tabIndex={0}
									onClick={() => {
										if (visibleQuestion.image_url) {
											handleOpenImage(visibleQuestion.image_url, visibleQuestion.text);
										}
									}}
									onKeyDown={(event) => {
										if (
											(event.key === "Enter" || event.key === " ") &&
											visibleQuestion.image_url
										) {
											event.preventDefault();
											handleOpenImage(visibleQuestion.image_url, visibleQuestion.text);
										}
									}}>
									<Image
										src={visibleQuestion.image_url}
										alt={visibleQuestion.text}
										fill
										className='object-cover'
									/>
								</div>
							) : null}
						</div>
					</section>

					{/* Status Section: Input dibuang, tapi logic text status dipertahankan */}
					<section className='rounded-3xl border border-white/20 bg-black/30 p-6'>
						<div className='flex items-center justify-between'>
							<span className='text-sm text-slate-200'>Status Buzzer</span>
							<span
								className={`text-lg font-semibold ${
									isAnswering
										? "text-amber-100"
										: answerState === "correct"
										? "text-emerald-100"
										: "text-slate-100"
								}`}>
								{answerState === "correct"
									? "BENAR!"
									: answerState === "wrong"
									? "SALAH!"
									: isAnswering
									? "MENJAWAB"
									: isBuzzerLockedByOther
									? "Tidak tersedia"
									: "Menunggu"}
							</span>
						</div>

						{/* Conditional Text Updates */}
						{isAnswering && (
							<p className='mt-2 text-xs text-amber-100'>
								Tim Anda sedang menjawab. Silakan jawab secara lisan.
							</p>
						)}
						{answerState === "correct" && (
							<p className='mt-2 text-xs text-emerald-100'>
								Jawaban benar! Skor tim Anda telah diperbarui.
							</p>
						)}
						{answerState === "wrong" && (
							<p className='mt-2 text-xs text-rose-100'>
								Jawaban salah. Pot skor bertambah untuk perebutan berikutnya.
							</p>
						)}

						{lockedTeam?.prodi && (
							<p className='mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100'>
								PRODI {lockedTeam.prodi.toUpperCase()} sedang menjawab
							</p>
						)}
						{isBuzzerLockedByOther && (
							<p className='mt-1 text-xs text-white/80'>
								Prodi lain hanya bisa menonton dulu sampai buzzer dibuka kembali.
							</p>
						)}

						{/* Button Lock / Jawab */}
						{!isLocked && isBuzzerOpen && visibleQuestion?.text && (
							<button
								className='mt-4 w-full rounded-3xl bg-cyan-400 px-4 py-6 text-lg font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
								onClick={handleLock}
								disabled={isBuzzerLockedByOther}>
								Jawab
							</button>
						)}
						{!isBuzzerOpen && (
							<p className='mt-3 text-xs text-white/80'>
								Menunggu admin membuka buzzer.
							</p>
						)}
						{statusMessage && (
							<p className='mt-3 text-xs text-white/80'>{statusMessage}</p>
						)}
					</section>

					{isPhase2Active && (
						<section className='rounded-3xl border border-white/20 bg-black/30 p-6'>
							<div className='flex flex-wrap items-start justify-between gap-3'>
								<div>
									<p className='text-xs uppercase tracking-[0.2em] text-slate-300'>
										Fase 2 — Topik Studi Kasus
									</p>
									<h2 className='mt-2 text-2xl font-semibold text-white'>
										{team?.topic_phase2?.title ?? "Pilih topik terlebih dahulu"}
									</h2>
								</div>
								{isPhase1Winner && (
									<span className='rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200'>
										Tim pemenang fase 1 (pilih topik manual)
									</span>
								)}
							</div>

							{team?.topic_phase2 ? (
								<div className='mt-4 rounded-2xl border border-white/20 bg-slate-950/40 p-4'>
									<p className='text-xs uppercase tracking-[0.2em] text-slate-400'>
										Preview Studi Kasus
									</p>
									<p className='mt-2 text-sm text-slate-200'>
										{casePreview(team.topic_phase2.case_study)}
									</p>
								</div>
							) : isPhase1Winner ? (
								<div className='mt-4 space-y-3'>
									{phase2Topics.length ? (
										phase2Topics.map((topic) => (
											<div
												key={topic.id}
												className='rounded-2xl border border-white/20 bg-slate-950/40 p-4'>
												<div className='flex flex-wrap items-center justify-between gap-3'>
													<div>
														<p className='text-sm font-semibold text-white'>
															{topic.title}
														</p>
														<p className='mt-2 text-xs text-slate-300'>
															{casePreview(topic.case_study)}
														</p>
													</div>
													<button
														className='rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-900'
														onClick={() => handleSelectTopic(topic.id)}>
														Pilih Topik
													</button>
												</div>
											</div>
										))
									) : (
										<p className='text-xs text-slate-400'>
											Topik untuk prodi ini belum tersedia. Hubungi admin.
										</p>
									)}
								</div>
							) : (
								<div className='mt-4 space-y-3'>
									<div className='rounded-2xl border border-dashed border-white/20 bg-slate-950/40 p-4 text-center'>
										<p className='text-xs uppercase tracking-[0.25em] text-slate-400'>
											{isRolling ? "Mengacak Topik..." : "Topik akan diacak oleh tim"}
										</p>
										<p className='mt-3 text-lg font-semibold text-cyan-200'>
											{rollingTitle || "Siap mengacak topik"}
										</p>
									</div>
									<button
										className='w-full rounded-3xl bg-amber-400 px-4 py-4 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60'
										onClick={handleRandomTopic}
										disabled={isRolling || !phase2Topics.length}>
										{isRolling ? "Mengacak..." : "Acak Topik"}
									</button>
									{!phase2Topics.length && (
										<p className='text-xs text-slate-400'>
											Topik belum tersedia untuk prodi ini.
										</p>
									)}
								</div>
							)}

							<div className='mt-6 rounded-2xl border border-white/10 bg-slate-950/30 p-4'>
								<p className='text-xs uppercase tracking-[0.2em] text-slate-400'>
									Submit Dokumen Studi Kasus
								</p>
								<p className='mt-2 text-xs text-slate-300'>
									Pastikan link drive dapat diakses semua orang (viewer) untuk penilaian juri.
								</p>
								<div className='mt-3 flex flex-col gap-3 md:flex-row md:items-center'>
									<input
										className='flex-1 rounded-xl border border-white/20 bg-black/30 px-4 py-2 text-sm text-white'
										type='url'
										placeholder='https://drive.google.com/...'
										value={driveLink}
										onChange={(event) => setDriveLink(event.target.value)}
									/>
									<button
										className='rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900'
										onClick={handleSubmitDrive}>
										Simpan Link
									</button>
								</div>
								{driveStatus && (
									<p className='mt-2 text-xs text-slate-200'>{driveStatus}</p>
								)}
							</div>
						</section>
					)}

					{/* INPUT SECTION SUDAH DIHAPUS SESUAI REQUEST */}

					{visibleQuestion?.options?.length ? (
						<section className='rounded-3xl border border-white/20 bg-black/30 p-6'>
							<p className='text-xs uppercase tracking-[0.2em] text-slate-300'>
								Pilihan Jawaban
							</p>
							<div className='mt-4 grid gap-3'>
								{visibleQuestion.options.map((option, index) => (
									<div
										key={option}
										className='flex items-center gap-4 rounded-2xl border border-white/20 bg-slate-950/40 px-4 py-3 text-sm text-slate-100'>
										<span className='flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-white'>
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

			{/* Modal Image Viewer (Codex) */}
			{isImageOpen && activeImageUrl ? (
				<div
					className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6'
					onClick={() => setIsImageOpen(false)}
					role='button'
					tabIndex={0}
					onKeyDown={(event) => {
						if (event.key === "Escape") setIsImageOpen(false);
					}}>
					<div className='relative max-h-full w-full max-w-5xl'>
						<button
							className='absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xs text-white'
							type='button'
							onClick={() => setIsImageOpen(false)}>
							Tutup
						</button>
						<div className='relative h-[70vh] w-full'>
							<Image
								src={activeImageUrl}
								alt={activeImageAlt}
								fill
								className='object-contain'
							/>
						</div>
					</div>
				</div>
			) : null}
		</ParticipantRoute>
	);
}
