"use client";

import { useEffect, useMemo, useState } from "react";
import { setDoc, doc } from "firebase/firestore";
import { addToast } from "@heroui/react";
import { db, auth } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/hooks/useAuth";
import { useTeams } from "@/lib/hooks/useTeams";
import { useAssessment } from "@/lib/hooks/useAssessment";
import {
  calculatePhase2Total,
  calculatePhase3Total,
  type Phase2Scores,
  type Phase3Scores,
} from "@/lib/scoring";
import type { AssessmentPhase } from "@/lib/types";
import { signOut } from "firebase/auth";

const PHASE_2_FIELDS: Array<keyof Phase2Scores> = [
  "analisis",
  "inovasi",
  "feasibility",
  "admin",
];
const PHASE_3_FIELDS: Array<keyof Phase3Scores> = ["delivery", "knowledge", "ethics"];

const LABELS: Record<string, string> = {
  analisis: "Analisis (30%)",
  inovasi: "Inovasi (40%)",
  feasibility: "Feasibility (20%)",
  admin: "Administrasi (10%)",
  delivery: "Delivery (20%)",
  knowledge: "Knowledge (50%)",
  ethics: "Ethics (30%)",
};

export default function JudgePage() {
  const { user } = useAuth();
  const { teams } = useTeams("name");
  const [phase, setPhase] = useState<AssessmentPhase>("PHASE_2");
  const [teamId, setTeamId] = useState<string>("");
  const { assessment } = useAssessment(teamId, user?.uid, phase);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const notify = (message: string, color: "success" | "warning" | "danger" | "default" = "success") => {
    addToast({
      title: message,
      color,
      variant: "flat",
      timeout: 2000,
      shouldShowTimeoutProgress: true,
    });
  };

  useEffect(() => {
    if (teams.length && !teamId) {
      setTeamId(teams[0].id);
    }
  }, [teamId, teams]);

  useEffect(() => {
    if (assessment) {
      setScores(assessment.raw_scores);
    } else {
      setScores({});
    }
  }, [assessment, phase, teamId]);

  const totalScore = useMemo(() => {
    if (phase === "PHASE_2") {
      return calculatePhase2Total({
        analisis: scores.analisis ?? 0,
        inovasi: scores.inovasi ?? 0,
        feasibility: scores.feasibility ?? 0,
        admin: scores.admin ?? 0,
      });
    }
    return calculatePhase3Total({
      delivery: scores.delivery ?? 0,
      knowledge: scores.knowledge ?? 0,
      ethics: scores.ethics ?? 0,
    });
  }, [phase, scores]);

  const fields = phase === "PHASE_2" ? PHASE_2_FIELDS : PHASE_3_FIELDS;
  const locked = Boolean(assessment);

  const handleSubmit = async () => {
    if (!user || !teamId) return;
    setSubmitting(true);
    setStatus(null);

    const docId = `${user.uid}_${phase}`;
    const rawScores = fields.reduce<Record<string, number>>((acc, field) => {
      acc[field] = scores[field] ?? 0;
      return acc;
    }, {});

    await setDoc(doc(db, "teams", teamId, "assessments", docId), {
      judge_id: user.uid,
      phase,
      raw_scores: rawScores,
      final_value: totalScore,
    });

    setStatus("Skor berhasil dikunci.");
    notify("Skor berhasil dikunci.");
    setSubmitting(false);
  };

  return (
    <ProtectedRoute allowedRoles={["judge"]}>
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Judge Dashboard</p>
            <div className="mt-2 flex items-center justify-between">
              <h1 className="text-2xl font-semibold">Penilaian ICON</h1>
              <button
                className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-200"
                onClick={() => {
                  notify("Logout berhasil.", "default");
                  signOut(auth);
                }}>
                Logout
              </button>
            </div>
            <p className="text-sm text-slate-400">
              Isi skor per kriteria, total otomatis terhitung. Setelah submit tidak bisa diubah.
            </p>
          </header>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-300">
                Pilih Team
                <select
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  value={teamId}
                  onChange={(event) => {
                    setTeamId(event.target.value);
                    notify("Tim penilaian diperbarui.", "default");
                  }}>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-300">
                Phase
                <select
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  value={phase}
                  onChange={(event) => {
                    setPhase(event.target.value as AssessmentPhase);
                    notify("Phase penilaian diperbarui.", "default");
                  }}>
                  <option value="PHASE_2">Phase 2 — Innovation Lab</option>
                  <option value="PHASE_3">Phase 3 — Defense</option>
                </select>
              </label>
            </div>

            <div className="mt-6 grid gap-4">
              {fields.map((field) => (
                <label key={field} className="flex flex-col gap-2 text-sm text-slate-200">
                  {LABELS[field]}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={scores[field] ?? ""}
                    disabled={locked}
                    onChange={(event) =>
                      setScores((prev) => ({
                        ...prev,
                        [field]: Number(event.target.value),
                      }))
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-70"
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
              <span className="text-sm text-slate-300">Total Skor</span>
              <span className="text-lg font-semibold text-cyan-300">
                {totalScore.toFixed(2)}
              </span>
            </div>

            {status && (
              <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                {status}
              </div>
            )}

            <button
              className="mt-6 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-900 disabled:opacity-60"
              onClick={handleSubmit}
              disabled={submitting || locked}>
              {locked ? "Skor Terkunci" : submitting ? "Menyimpan..." : "Submit & Lock"}
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
