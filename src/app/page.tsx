import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Smart Society Innovation Challenge
          </p>
          <h1 className="text-4xl font-semibold text-white md:text-6xl">
            ICON Score Board System
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Platform terpadu untuk manajemen kompetisi, mulai dari cerdas cermat, lab
            inovasi, hingga sesi defense. Semua sinkron real-time.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/display/public"
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left transition hover:border-cyan-500/60 hover:bg-slate-900">
            <h2 className="text-xl font-semibold text-white">Public Display</h2>
            <p className="mt-2 text-sm text-slate-400">
              Tampilan publik untuk proyektor dengan leaderboard live.
            </p>
          </Link>
          <Link
            href="/display/public/question"
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left transition hover:border-amber-400/60 hover:bg-slate-900">
            <h2 className="text-xl font-semibold text-white">Public Display (Soal)</h2>
            <p className="mt-2 text-sm text-slate-400">
              Tampilan publik khusus soal fase 1 beserta opsi jawabannya.
            </p>
          </Link>
          <Link
            href="/login"
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left transition hover:border-indigo-500/60 hover:bg-slate-900">
            <h2 className="text-xl font-semibold text-white">Login Admin / Juri</h2>
            <p className="mt-2 text-sm text-slate-400">
              Akses panel kontrol admin dan dashboard penilaian juri.
            </p>
          </Link>
          <Link
            href="/participant/login"
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left transition hover:border-emerald-500/60 hover:bg-slate-900">
            <h2 className="text-xl font-semibold text-white">Login Peserta</h2>
            <p className="mt-2 text-sm text-slate-400">
              Akses dashboard peserta untuk buzzer dan jawab soal.
            </p>
          </Link>
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-300">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span className="text-white">Shortcut akses cepat</span>
            <div className="flex flex-wrap gap-3">
              <Link className="text-cyan-300 hover:text-cyan-200" href="/admin">
                /admin
              </Link>
              <Link className="text-cyan-300 hover:text-cyan-200" href="/judge">
                /judge
              </Link>
              <Link className="text-cyan-300 hover:text-cyan-200" href="/display/public">
                /display/public
              </Link>
              <Link
                className="text-cyan-300 hover:text-cyan-200"
                href="/display/public/question">
                /display/public/question
              </Link>
              <Link className="text-cyan-300 hover:text-cyan-200" href="/participant/login">
                /participant/login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
