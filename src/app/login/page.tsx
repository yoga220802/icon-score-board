"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "firebase/auth";
import {
	collection,
	onSnapshot,
	query,
	orderBy,
	updateDoc,
	doc,
	setDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
	Button,
	Input,
	Card,
	CardBody,
	Chip,
	Tooltip,
	Avatar,
} from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";

interface Team {
	id: string;
	name: string;
	score: number;
	color: string;
	logoUrl?: string;
}

export default function LoginPage() {
	const [user, setUser] = useState<any>(null);
	const [teams, setTeams] = useState<Team[]>([]);
	const [permissionError, setPermissionError] = useState<string | null>(null);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loginLoading, setLoginLoading] = useState(false);
	const [loginError, setLoginError] = useState<string | null>(null);
	const router = useRouter();

	const recommendedRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /teams/{teamId} {
      allow read, write: if request.auth != null;
      // Option stricter:
      // allow update: if request.auth != null
      //   && request.resource.data.keys().hasOnly(['name','score','color','logoUrl'])
      //   && request.resource.data.score is number;
    }
  }
}`;

	useEffect(() => {
		const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
			if (currentUser) {
				setUser(currentUser);
				router.push("/admin");
			} else {
				setUser(null);
			}
		});
		return () => unsubAuth();
	}, [router]);

	useEffect(() => {
		if (!user) return;
		setPermissionError(null);
		const q = query(collection(db, "teams"), orderBy("id", "asc"));
		const unsubData = onSnapshot(
			q,
			(snapshot) => {
				const teamsData = snapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data(),
				})) as Team[];
				setTeams(teamsData);
			},
			(err) => {
				if (err.code === "permission-denied") {
					setPermissionError("Akses database ditolak (permission-denied). Periksa aturan Firestore.");
				} else {
					setPermissionError(err.message);
				}
			}
		);
		return () => unsubData();
	}, [user]);

	const handleLogin = async () => {
		setLoginError(null);
		setLoginLoading(true);
		try {
			await signInWithEmailAndPassword(auth, email.trim(), password);
		} catch (e: any) {
			setLoginError(e.message || "Login gagal.");
		} finally {
			setLoginLoading(false);
		}
	};

	const handleUpdateScore = async (id: string, increment: number) => {
		if (permissionError) return;
		const currentTeam = teams.find((t) => t.id === id);
		if (currentTeam) {
			try {
				await updateDoc(doc(db, "teams", id), {
					score: currentTeam.score + increment,
				});
			} catch (e: any) {
				if (e.code === "permission-denied")
					setPermissionError("Tidak boleh update: permission-denied.");
			}
		}
	};

	const initializeTeams = async () => {
		if (permissionError) return;
		const defaultTeams = [
			{ id: "team_1", name: "Tim Merah", color: "#F43F5E", score: 0 },
			{ id: "team_2", name: "Tim Biru", color: "#3B82F6", score: 0 },
			{ id: "team_3", name: "Tim Hijau", color: "#22C55E", score: 0 },
			{ id: "team_4", name: "Tim Kuning", color: "#EAB308", score: 0 },
			{ id: "team_5", name: "Tim Ungu", color: "#A855F7", score: 0 },
		];
		if (confirm("Reset pertandingan ke skor 0?")) {
			try {
				for (const team of defaultTeams) {
					await setDoc(doc(db, "teams", team.id), team);
				}
			} catch (e: any) {
				if (e.code === "permission-denied")
					setPermissionError("Inisialisasi gagal: permission-denied.");
			}
		}
	};

	if (!user) {
		return (
			<div className='min-h-screen relative overflow-hidden bg-black flex items-center justify-center px-4'>
				{/* Animated background layers */}
				<div className='absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#1e3a8a40,#000)] pointer-events-none' />
				<div className='absolute inset-0 animate-pulse bg-[linear-gradient(115deg,#0a0a0a_0%,#111827_40%,#000_100%)] opacity-40' />
				{/* Login Card */}
				<Card className='w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-blue-900/20'>
					<CardBody className='space-y-5'>
						<div className='flex flex-col items-center gap-2'>
							<div className='w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-700/40'>
								<span className='font-bold text-white text-lg'>CC</span>
							</div>
							<h1 className='text-xl font-semibold tracking-wide text-white'>
								Command Center Login
							</h1>
							<p className='text-xs text-gray-400 text-center'>
								Masukkan kredensial untuk mengakses panel skor realtime.
							</p>
						</div>
						{loginError && (
							<div className='text-xs text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-2 rounded'>
								{loginError}
							</div>
						)}
						<div className="flex w-full flex-wrap md:flex-nowrap gap-4">
							<Input
								type='email'
								label='Email'
								variant='bordered'
								value={email}
								onValueChange={setEmail}
								className="flex-1 min-w-[220px]"
								classNames={{
									label: "text-xs text-gray-300",
									input: "text-white",
									inputWrapper: "bg-white/10 border-white/20",
								}}
								startContent={<span className='text-gray-400 text-xs font-mono px-1'>@</span>}
							/>
							<Input
								type={showPassword ? "text" : "password"}
								label='Password'
								variant='bordered'
								value={password}
								onValueChange={setPassword}
								className="flex-1 min-w-[220px]"
								classNames={{
									label: "text-xs text-gray-300",
									input: "text-white tracking-wider",
									inputWrapper: "bg-white/10 border-white/20",
								}}
								endContent={
									<button
										type='button'
										onClick={() => setShowPassword((v) => !v)}
										className='text-[10px] text-blue-300 hover:text-blue-200 transition'>
										{showPassword ? "Sembunyikan" : "Lihat"}
									</button>
								}
							/>
						</div>
						<div className='flex flex-wrap gap-2'>
							<Chip size='sm' className='bg-blue-600/30 text-blue-200'>Realtime</Chip>
							<Chip size='sm' className='bg-indigo-600/30 text-indigo-200'>Sync</Chip>
							<Chip size='sm' className='bg-emerald-600/30 text-emerald-200'>Secure</Chip>
						</div>
						<Button
							fullWidth
							color='primary'
							variant='shadow'
							isLoading={loginLoading}
							isDisabled={!email || !password}
							className='font-semibold tracking-wide'
							onPress={handleLogin}>
							Masuk
						</Button>
						<p className='text-[10px] text-gray-500 text-center'>
							Hubungi admin apabila akun belum tersedia.
						</p>
					</CardBody>
				</Card>
			</div>
		);
	}

	const maxScore = Math.max(0, ...teams.map((t) => t.score));

	return (
		<div className='min-h-screen bg-black text-white p-4 md:p-8 font-sans selection:bg-blue-500/30'>
			{/* Debug auth info */}
			<div className='text-xs mb-2 text-gray-400'>
				UID: {user?.uid} • Email: {user?.email}
			</div>
			{/* Background Ambience */}
			<div className='fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black -z-10' />

			<div className='max-w-5xl mx-auto'>
				{/* Header */}
				<header className='relative overflow-hidden flex flex-col md:flex-row justify-between items-center mb-10 gap-4 bg-gradient-to-br from-blue-900/60 via-gray-900/50 to-black/70 p-6 rounded-2xl border border-white/10 backdrop-blur-md'>
					<div className='flex items-center gap-4'>
						<div className='p-3 bg-blue-600/20 rounded-xl border border-blue-500/30'>
							<svg
								className='w-6 h-6 text-blue-400'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2'
									d='M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4'></path>
							</svg>
						</div>
						<div>
							<h1 className='text-2xl font-bold tracking-tight text-white'>
								Command Center
							</h1>
							<div className='flex items-center gap-2 mt-1'>
								<span className='w-2 h-2 rounded-full bg-green-500 animate-pulse'></span>
								<p className='text-xs text-green-400 font-mono uppercase'>
									System Online • Live Sync
								</p>
							</div>
						</div>
					</div>

					<div className='flex gap-3'>
						<Button
							size='sm'
							className='bg-white/5 text-gray-300 border border-white/10'
							onPress={initializeTeams}>
							Reset System
						</Button>
						<Button
							size='sm'
							color='danger'
							variant='flat'
							onPress={() => signOut(auth)}>
							Log Out
						</Button>
					</div>
					{/* Added subtle animated aura */}
					<div className='absolute -top-16 -right-16 w-52 h-52 rounded-full bg-blue-600/20 blur-3xl pointer-events-none' />
				</header>

				{/* Permission Error Message */}
				{permissionError && (
					<div className='mb-4 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm'>
						{permissionError}
						{permissionError.includes("permission-denied") && (
							<div className='mt-2'>
								<p className='text-xs mb-1 text-red-400'>Contoh aturan Firestore yang diperlukan:</p>
								<pre className='text-[10px] whitespace-pre-wrap bg-black/40 p-2 rounded border border-red-500/20'>
									{recommendedRules}
								</pre>
							</div>
						)}
						<div className='mt-1 text-xs text-red-400'>
							Pastikan aturan Firestore mengizinkan read/write untuk user yang login.
						</div>
					</div>
				)}

				{/* Control Grid */}
				<div className='grid gap-5'>
					<AnimatePresence>
						{teams.map((team) => {
							const pct = maxScore ? Math.round((team.score / maxScore) * 100) : 0;
							return (
								<motion.div
									key={team.id}
									layout
									initial={{ opacity: 0, y: 24 }}
									animate={{ opacity: 1, y: 0 }}>
									<Card className='group w-full bg-gradient-to-br from-gray-900/70 to-black/70 border border-white/10 hover:border-white/20 transition-colors shadow-lg shadow-black/40'>
										{/* Colored Status Bar Left */}
										<div
											className='absolute left-0 top-0 bottom-0 w-1.5'
											style={{
												backgroundColor: team.color,
												boxShadow: `0 0 15px ${team.color}`,
											}}
										/>
										<CardBody className='p-5 md:p-6 space-y-4'>
											<div className='flex flex-col md:flex-row items-center gap-6'>
												{/* Identity Module */}
												<div className='flex items-center gap-4 flex-1 w-full md:w-auto pl-2'>
													<Avatar
														name={team.name.charAt(0)}
														src={team.logoUrl}
														className='w-14 h-14 text-lg font-bold'
														style={{ backgroundColor: team.color, color: "#fff" }}
													/>
													<div className='flex-1 min-w-0'>
														<div className="flex w-full flex-wrap md:flex-nowrap gap-4">
															<Input
																label='Nama Tim'
																variant='underlined'
																value={team.name}
																className='w-full'
																classNames={{
																	input: "text-lg font-bold text-white",
																	inputWrapper: "after:bg-white/20",
																}}
																onValueChange={(val) => {
																	if (permissionError) return;
																	if (val) {
																		updateDoc(doc(db, "teams", team.id), { name: val }).catch((e: any) => {
																			if (e.code === "permission-denied")
																				setPermissionError("Tidak boleh ubah nama: permission-denied.");
																		});
																	}
																}}
															/>
														</div>
														<p className='text-xs text-gray-500 font-mono mt-1'>
															ID: {team.id}
														</p>
													</div>
												</div>

												{/* Score Control Module */}
												<div className='flex items-center gap-2 bg-black/60 p-2 rounded-2xl border border-white/5 shadow-inner'>
													<div className='flex gap-1'>
														<Button
															isIconOnly
															size='sm'
															className='bg-red-500/10 text-red-500 border border-red-500/20'
															isDisabled={!!permissionError}
															onPress={() => handleUpdateScore(team.id, -10)}>
															-10
														</Button>
														<Button
															isIconOnly
															size='sm'
															className='bg-red-500/10 text-red-500 border border-red-500/20'
															isDisabled={!!permissionError}
															onPress={() => handleUpdateScore(team.id, -1)}>
															-1
														</Button>
													</div>

													<div className='w-28 text-center px-2'>
														<span
															className='text-4xl font-mono font-black tracking-tighter'
															style={{
																color: team.score > 0 ? team.color : "#555",
																textShadow: team.score > 0 ? `0 0 20px ${team.color}40` : "none",
															}}>
															{team.score}
														</span>
													</div>

													<div className='flex gap-1'>
														<Button
															isIconOnly
															size='sm'
															className='bg-green-500/10 text-green-500 border border-green-500/20'
															isDisabled={!!permissionError}
															onPress={() => handleUpdateScore(team.id, 1)}>
															+1
														</Button>
														<Button
															isIconOnly
															size='sm'
															className='bg-green-500/10 text-green-500 border border-green-500/20'
															isDisabled={!!permissionError}
															onPress={() => handleUpdateScore(team.id, 10)}>
															+10
														</Button>
													</div>
												</div>
											</div>
											<div className='mt-3 space-y-1'>
												<div className='h-2 w-full rounded-full bg-white/10 overflow-hidden'>
													<div
														className='h-full transition-all duration-500'
														style={{
															width: `${pct}%`,
															background: `linear-gradient(90deg, ${team.color}, ${team.color}AA)`,
														}}
													/>
												</div>
												<p className='text-[10px] tracking-wide text-gray-400 font-mono'>
													{pct}% kapasitas skor relatif
												</p>
											</div>
										</CardBody>
									</Card>
								</motion.div>
							);
						})}
					</AnimatePresence>

					{teams.length === 0 && !permissionError && (
						<div className='text-center py-20 border border-dashed border-gray-700 rounded-2xl bg-gray-900/30'>
							<p className='text-gray-500 mb-4'>Database kosong / offline</p>
							<Button color='primary' variant='shadow' onPress={initializeTeams}>
								Inisialisasi Sistem
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
