"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import type { UserRole } from "@/lib/types";

export const ProtectedRoute = ({
  children,
  allowedRoles,
  redirectTo = "/login",
}: {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}) => {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push(redirectTo);
      return;
    }
    if (!role || !allowedRoles.includes(role)) {
      router.push("/");
    }
  }, [allowedRoles, loading, role, router, user, redirectTo]);

  if (loading || !user || !role || !allowedRoles.includes(role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p>Memuat akses...</p>
      </div>
    );
  }

  return <>{children}</>;
};
