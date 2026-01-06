"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardBody, CardFooter, Image, Skeleton } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";

interface Team {
	id: string;
	name: string;
	score: number;
	color: string;
	logoUrl?: string;
}

export default function ScoreboardPage() {
	const [teams, setTeams] = useState<Team[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Query teams diurutkan berdasarkan skor tertinggi
		const q = query(collection(db, "teams"), orderBy("score", "desc"));

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const teamsData = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			})) as Team[];
			setTeams(teamsData);
			setLoading(false);
		});

		return () => unsubscribe();
	}, []);

	return (
		<main className='flex min-h-screen flex-col items-center justify-center p-8 bg-black'>
			<h1 className='text-4xl md:text-6xl font-bold mb-12 text-white tracking-widest uppercase'>
				Papan Skor Langsung
			</h1>

			{loading ? (
				// Tampilan Skeleton saat loading
				<div className='flex gap-6 w-full justify-center flex-wrap'>
					{[...Array(5)].map((_, i) => (
						<Skeleton key={i} className='rounded-lg w-64 h-80 opacity-20' />
					))}
				</div>
			) : (
				// Grid Kartu Tim
				<div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 w-full max-w-[1600px]'>
					<AnimatePresence>
						{teams.map((team, index) => (
							<motion.div
								key={team.id}
								layout // Magic animation saat posisi bertukar
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.5 }}>
								<Card
									className='h-full border-none shadow-2xl'
									style={{ backgroundColor: team.color }} // Warna dinamis dari DB
								>
									<CardBody className='overflow-visible py-8 items-center justify-center'>
										<div className='w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-4 overflow-hidden p-2'>
											{/* Gunakan Logo jika ada, atau inisial jika tidak */}
											{team.logoUrl ? (
												<Image
													alt={team.name}
													className='object-cover w-full h-full'
													src={team.logoUrl}
													width={120}
												/>
											) : (
												<span className='text-4xl font-bold text-white/80'>
													{team.name.charAt(0)}
												</span>
											)}
										</div>
										<h2 className='text-2xl font-bold text-center text-white drop-shadow-md mb-2'>
											{team.name}
										</h2>
										{index === 0 && (
											<span className='bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2'>
												Memimpin
											</span>
										)}
									</CardBody>
									<CardFooter className='justify-center bg-black/20 py-6'>
										<p className='text-6xl font-black text-white drop-shadow-xl tracking-tighter'>
											{team.score}
										</p>
									</CardFooter>
								</Card>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			)}
		</main>
	);
}
