"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export const ParticipantRoute = ({
  children,
  teamId,
  redirectTo = "/participant/login",
}: {
  children: React.ReactNode;
  teamId: string;
  redirectTo?: string;
}) => {
  const { user, role, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push(redirectTo);
      return;
    }
    if (role !== "participant" || profile?.team_id !== teamId) {
      router.push("/");
    }
  }, [loading, profile?.team_id, redirectTo, role, router, teamId, user]);

  if (loading || !user || role !== "participant" || profile?.team_id !== teamId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p>Memuat akses peserta...</p>
      </div>
    );
  }

  return <>{children}</>;
};
