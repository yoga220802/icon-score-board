"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useGameState } from "@/lib/hooks/useGameState";
import { useTeams } from "@/lib/hooks/useTeams";
import { useActiveQuestion } from "@/lib/hooks/useActiveQuestion";
import { getTeamBranding } from "@/lib/teamBranding";

const getStatusText = (
	gameState: ReturnType<typeof useGameState>["gameState"]
) => {
	if (!gameState) return "Menunggu...";

	if (gameState.active_phase === "PHASE_1") {
		if (!(gameState.p1_show_question ?? true)) return "SOAL DISEMBUNYIKAN";
		if (gameState.p1_show_answer) return "JAWABAN DITAMPILKAN";
		if (gameState.p1_buzzer_open) {
			return gameState.p1_buzzer_locked_by ? "BUZZER TERKUNCI" : "REBUTAN!";
		}
		return gameState.p1_question_id ? "SOAL DISIAPKAN" : "MODE SCOREBOARD";
	}

	if (gameState.active_phase === "PHASE_2") return "INNOVATION LAB";
	if (gameState.active_phase === "PHASE_3") return "SESI DEFENSE";
	return "IDLE";
};

export default function PublicQuestionPage() {
	const { gameState } = useGameState();
	const { teams } = useTeams("name");
	const activeQuestion = useActiveQuestion(gameState?.p1_question_id);
	const shouldShowQuestion = gameState?.p1_show_question ?? true;
	const visibleQuestion = shouldShowQuestion ? activeQuestion : null;
	const [isImageOpen, setIsImageOpen] = useState(false);
	const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
	const [activeImageAlt, setActiveImageAlt] = useState<string>("");
	const [now, setNow] = useState(Date.now());

	const leaderboard = useMemo(() => {
		const scoreKey =
			gameState?.active_phase === "PHASE_1" ? "score_phase1" : "final_score";
		return [...teams].sort((a, b) => (b[scoreKey] ?? 0) - (a[scoreKey] ?? 0));
	}, [gameState?.active_phase, teams]);

	const answeringTeam = leaderboard.find(
		(team) => team.id === gameState?.p1_buzzer_locked_by
	);
	const answeringBranding = answeringTeam
		? getTeamBranding(answeringTeam)
		: null;

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 500);
		return () => clearInterval(timer);
	}, []);

	const timerRemaining = useMemo(() => {
		if (gameState?.p1_timer_end) {
			const endMs = gameState.p1_timer_end.toDate().getTime();
			return Math.max(0, Math.ceil((endMs - now) / 1000));
		}
		return null;
	}, [gameState?.p1_timer_end, now]);

	const handleOpenImage = (url: string, alt: string) => {
		setActiveImageUrl(url);
		setActiveImageAlt(alt);
		setIsImageOpen(true);
	};

	const phase2Topics = useMemo(
		() =>
			teams
				.filter((team) => team.topic_phase2?.title)
				.map((team) => ({
					id: team.id,
					prodi: team.prodi,
					title: team.topic_phase2?.title ?? "",
					caseStudy: team.topic_phase2?.case_study ?? "",
				})),
		[teams]
	);

	const previewCase = (value: string, limit = 140) =>
		value.length > limit ? `${value.slice(0, limit)}...` : value;

	return (
		<main
			className='min-h-screen px-8 py-10 text-white transition-colors duration-500'
			style={
				answeringBranding?.color
					? {
							background: `linear-gradient(135deg, ${answeringBranding.color}55, #020617 70%)`,
					  }
					: { background: "linear-gradient(135deg, #020617, #0f172a 60%, #000000)" }
			}>
			<div className='mx-auto max-w-5xl space-y-8'>
				<header className='flex flex-col gap-3'>
					<p className='text-xs uppercase tracking-[0.3em] text-cyan-400'>
						Public Display
					</p>
					<div className='flex flex-wrap items-center justify-between gap-4'>
						<div className='flex flex-wrap items-center gap-3'>
							<h1 className='text-3xl font-semibold md:text-5xl'>
								{gameState?.active_phase === "PHASE_2" ? "Topik Fase 2" : "Soal Fase 1"}
							</h1>
							<span className='rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-200'>
								{getStatusText(gameState)}
							</span>
						</div>
						<div className='flex items-center gap-2 text-xs uppercase tracking-[0.3em]'>
							<Link
								href='/display/public'
								className='rounded-full border border-white/10 px-3 py-2 text-slate-300 hover:text-white'>
								Standings
							</Link>
							<Link
								href='/display/public/question'
								className='rounded-full border border-cyan-400/40 px-3 py-2 text-cyan-200'>
								Soal
							</Link>
						</div>
					</div>
					{answeringTeam?.prodi && (
						<div className='rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200'>
							PRODI {answeringTeam.prodi.toUpperCase()} sedang menjawab
						</div>
					)}
				</header>

				{gameState?.active_phase === "PHASE_2" ? (
					<section className='rounded-3xl border border-white/20 bg-black/30 p-8'>
						<p className='text-xs uppercase tracking-[0.2em] text-slate-300'>
							Daftar Topik per Prodi
						</p>
						<div className='mt-4 grid gap-4'>
							{phase2Topics.length ? (
								phase2Topics.map((topic) => (
									<div
										key={topic.id}
										className='rounded-2xl border border-white/20 bg-slate-950/40 p-4'>
										<p className='text-xs uppercase tracking-[0.2em] text-slate-400'>
											{topic.prodi}
										</p>
										<p className='mt-2 text-base font-semibold text-white'>
											{topic.title}
										</p>
										<p className='mt-2 text-xs text-slate-300'>
											{topic.caseStudy
												? previewCase(topic.caseStudy)
												: "Studi kasus belum diisi."}
										</p>
									</div>
								))
							) : (
								<p className='text-sm text-slate-300'>
									Topik belum ditentukan oleh tim.
								</p>
							)}
						</div>
					</section>
				) : (
					<>
						<section className='rounded-3xl border border-white/20 bg-black/30 p-8'>
							<div className='flex flex-col gap-4'>
								<div className='flex flex-wrap items-center justify-between gap-3'>
									<p className='text-xs uppercase tracking-[0.2em] text-slate-300'>
										Soal Aktif
									</p>
									{timerRemaining !== null && (
										<span className='rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200'>
											Sisa waktu: {timerRemaining}s
										</span>
									)}
								</div>
								<h2 className='text-2xl font-semibold text-white md:text-4xl'>
									{visibleQuestion?.text ?? "Menunggu soal berikutnya..."}
								</h2>
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

						<section className='rounded-3xl border border-white/20 bg-black/30 p-6'>
							<p className='text-xs uppercase tracking-[0.2em] text-slate-300'>
								Pilihan Jawaban
							</p>
							{visibleQuestion?.options?.length ? (
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
							) : shouldShowQuestion ? (
								<p className='mt-4 text-sm text-slate-300'>
									Soal ini tidak memiliki pilihan jawaban.
								</p>
							) : (
								<p className='mt-4 text-sm text-slate-300'>
									Soal akan ditampilkan setelah admin membuka soal.
								</p>
							)}
						</section>
					</>
				)}
			</div>
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
		</main>
	);
}
