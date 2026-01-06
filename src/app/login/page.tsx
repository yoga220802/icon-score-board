"use client";

import { useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { role, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user && role === "admin") {
      router.push("/admin");
    }
    if (user && role === "judge") {
      router.push("/judge");
    }
  }, [loading, role, router, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError((err as Error).message || "Login gagal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black px-6 py-16">
      <div className="mx-auto max-w-md space-y-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">ICON Access</p>
          <h1 className="text-2xl font-semibold text-white">Masuk Dashboard</h1>
          <p className="text-sm text-slate-400">
            Gunakan akun admin atau juri untuk mengakses panel.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400 disabled:opacity-60">
            {submitting ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}
