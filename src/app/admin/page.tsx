"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
import { Button, Input, Card, CardBody, User, Chip } from "@heroui/react";

// Tipe data tim
interface Team {
	id: string;
	name: string;
	score: number;
	color: string;
	logoUrl?: string;
}

export default function AdminPage() {
	const [user, setUser] = useState<any>(null);
	const [teams, setTeams] = useState<Team[]>([]);
	const [permissionError, setPermissionError] = useState<string | null>(null);
	const router = useRouter();

	const recommendedRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /teams/{teamId} {
      allow read, write: if request.auth != null;
    }
  }
}`;

	const maxScore = Math.max(0, ...teams.map((t) => t.score));
	const totalScore = teams.reduce((a, b) => a + b.score, 0);

	// Cek Auth User
	useEffect(() => {
		const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
			if (!currentUser) {
				router.push("/login");
			} else {
				setUser(currentUser);
			}
		});
		return () => unsubAuth();
	}, [router]);

	// Fetch Data Tim
	useEffect(() => {
		if (!user) return;
		setPermissionError(null);

		// Di admin kita urutkan by ID saja biar posisinya statis tidak lompat-lompat
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
					setPermissionError("Akses ditolak (permission-denied). Periksa rules Firestore.");
				} else {
					setPermissionError(err.message);
				}
			}
		);

		return () => unsubData();
	}, [user]);

	// Fungsi Update Skor
	const handleUpdateScore = async (id: string, increment: number) => {
		if (permissionError) return;

		// Cari tim saat ini untuk mendapatkan skor terakhir (prevent race condition sederhana)
		// Di production yang padat, gunakan transaction. Tapi untuk ini, direct update oke.
		const currentTeam = teams.find((t) => t.id === id);
		if (currentTeam) {
			try {
				await updateDoc(doc(db, "teams", id), { score: currentTeam.score + increment });
			} catch (e: any) {
				if (e.code === "permission-denied")
					setPermissionError("Tidak boleh update skor: permission-denied.");
			}
		}
	};

	// Fungsi Reset / Inisialisasi Data Awal (Helper Dev)
	const initializeTeams = async () => {
		if (permissionError) return;

		const defaultTeams = [
			{ id: "team_1", name: "Tim Merah", color: "#E11D48", score: 0 },
			{ id: "team_2", name: "Tim Biru", color: "#2563EB", score: 0 },
			{ id: "team_3", name: "Tim Hijau", color: "#16A34A", score: 0 },
			{ id: "team_4", name: "Tim Kuning", color: "#CA8A04", score: 0 },
			{ id: "team_5", name: "Tim Ungu", color: "#9333EA", score: 0 },
		];

		if (confirm("Ini akan mereset semua skor dan nama tim ke default. Lanjut?")) {
			try {
				for (const team of defaultTeams) {
					await setDoc(doc(db, "teams", team.id), team);
				}
			} catch (e: any) {
				if (e.code === "permission-denied")
					setPermissionError("Reset gagal: permission-denied.");
			}
		}
	};

	if (!user)
		return <div className='p-10 text-center'>Memuat autentikasi...</div>;

	return (
		<div className='min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-950 p-4 md:p-8'>
			{/* User Overview */}
			<div className='mb-3 flex flex-wrap gap-2 items-center text-xs text-gray-400'>
				<Chip size='sm' variant='flat' className='bg-blue-600/30 text-blue-200'>
					UID: {user?.uid}
				</Chip>
				<Chip size='sm' variant='flat' className='bg-indigo-600/30 text-indigo-200'>
					{user?.email}
				</Chip>
				{maxScore > 0 && (
					<Chip size='sm' variant='flat' className='bg-emerald-600/30 text-emerald-200'>
						Max: {maxScore}
					</Chip>
				)}
				<Chip size='sm' variant='flat' className='bg-pink-600/30 text-pink-200'>
					Total: {totalScore}
				</Chip>
			</div>
			{/* Enhanced Header */}
			<div className='relative flex justify-between items-center mb-8 bg-gradient-to-r from-gray-800/80 to-gray-900/80 p-5 rounded-2xl shadow-xl shadow-black/50 border border-gray-700/60 overflow-hidden'>
				<div className='absolute -top-10 -left-10 w-40 h-40 bg-blue-600/20 rounded-full blur-2xl pointer-events-none' />
				<div className='absolute -bottom-16 -right-16 w-56 h-56 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none' />
				<div>
					<h1 className='text-2xl font-bold text-white'>Panel Kontrol Juri</h1>
					<p className='text-gray-400 text-sm'>
						Atur skor cerdas cermat secara realtime
					</p>
				</div>
				<div className='flex gap-3'>
					<Button size='sm' color='warning' variant='flat' onPress={initializeTeams}>
						Reset Lomba
					</Button>
					<Button
						size='sm'
						color='danger'
						variant='solid'
						onPress={() => signOut(auth)}>
						Logout
					</Button>
				</div>
			</div>

			{/* Error Message */}
			{permissionError && (
				<div className='max-w-4xl mx-auto mb-4 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 text-sm'>
					{permissionError}
					{permissionError.includes("permission-denied") && (
						<div className='mt-2'>
							<p className='text-xs mb-1'>Contoh aturan Firestore:</p>
							<pre className='text-[11px] whitespace-pre-wrap bg-black/30 p-2 rounded border border-red-500/20 text-red-300'>
								{recommendedRules}
							</pre>
						</div>
					)}
				</div>
			)}

			{/* List Tim */}
			<div className='grid gap-5 max-w-5xl mx-auto'>
				{teams.map((team) => {
					const pct = maxScore ? Math.round((team.score / maxScore) * 100) : 0;
					return (
						<Card
							key={team.id}
							className='bg-gradient-to-br from-gray-900/80 to-black/80 border border-gray-700 hover:border-gray-500 transition-colors shadow-lg shadow-black/40'>
							<CardBody>
								<div className='flex flex-col md:flex-row items-center justify-between gap-4'>
									{/* Info Tim */}
									<div className='flex items-center gap-4 flex-1 w-full md:w-auto'>
										<div
											className='w-4 h-16 rounded-full'
											style={{ backgroundColor: team.color }}></div>
										<div className='flex-1'>
											<h3 className='text-xl font-bold text-white'>{team.name}</h3>
											<Chip size='sm' variant='flat' color='default'>
												ID: {team.id}
											</Chip>
										</div>
									</div>

									{/* Kontrol Skor */}
									<div className='flex items-center gap-6 bg-black/40 p-3 rounded-lg'>
										<Button
											isIconOnly
											radius='full'
											color='danger'
											variant='faded'
											className='w-12 h-12'
											isDisabled={!!permissionError}
											onPress={() => handleUpdateScore(team.id, -10)}>
											<span className='text-2xl font-bold'>-10</span>
										</Button>

										<div className='text-center min-w-[80px]'>
											<span className='text-3xl font-mono font-bold text-white'>
												{team.score}
											</span>
											<p className='text-xs text-gray-500'>POIN</p>
										</div>

										<Button
											isIconOnly
											radius='full'
											color='success'
											variant='shadow'
											className='w-12 h-12'
											isDisabled={!!permissionError}
											onPress={() => handleUpdateScore(team.id, 10)}>
											<span className='text-2xl font-bold'>+10</span>
										</Button>
									</div>

									{/* Edit Sederhana (Opsional: Input Nama Tim) */}
									<div className='w-full md:w-48'>
										<div className="flex w-full flex-wrap md:flex-nowrap gap-4">
											<Input
												size='sm'
												label='Ubah Nama'
												variant='bordered'
												className='w-full'
												placeholder={team.name}
												onBlur={(e) => {
													if (permissionError) return;
													const val = e.target.value;
													if (val) {
														updateDoc(doc(db, "teams", team.id), { name: val }).catch((err: any) => {
															if (err.code === "permission-denied")
																setPermissionError("Tidak boleh ubah nama: permission-denied.");
														});
													}
												}}
											/>
										</div>
									</div>
								</div>
								<div className='mt-4 space-y-1'>
									<div className='h-2 w-full rounded-full bg-gray-700/40 overflow-hidden'>
										<div
											className='h-full transition-all duration-500'
											style={{
												width: `${pct}%`,
												background: `linear-gradient(90deg, ${team.color}, ${team.color}AA)`,
											}}
										/>
									</div>
									<p className='text-[10px] text-gray-400 font-mono'>
										{pct}% dari skor tertinggi
									</p>
								</div>
							</CardBody>
						</Card>
					);
				})}

				{teams.length === 0 && !permissionError && (
					<div className='text-center py-10'>
						<p className='text-gray-500 mb-4'>Belum ada data tim.</p>
						<Button color='primary' onPress={initializeTeams}>
							Buat 5 Tim Default
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
