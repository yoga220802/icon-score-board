import type { Team } from "@/lib/types";

type TeamBranding = {
  color: string;
  logo: string;
};

const BRANDING_MAP: Record<string, TeamBranding> = {
  sipil: { color: "#ef4444", logo: "/logos/sipil.svg" },
  si: { color: "#f8fafc", logo: "/logos/sisfo.svg" },
  sisfo: { color: "#f8fafc", logo: "/logos/sisfo.svg" },
  industri: { color: "#9ca3af", logo: "/logos/industri.svg" },
  inf: { color: "#f97316", logo: "/logos/infor.svg" },
  infor: { color: "#f97316", logo: "/logos/infor.svg" },
  informatika: { color: "#f97316", logo: "/logos/infor.svg" },
  arsi: { color: "#a16207", logo: "/logos/arsi.svg" },
};

const normalizeKey = (value?: string | null) => value?.trim().toLowerCase() ?? "";

export const getTeamBranding = (team?: Partial<Team> | null) => {
  if (!team) {
    return {
      color: "#0ea5e9",
      logo: "/logos/default.svg",
    };
  }

  const idKey = normalizeKey(team.id);
  const prodiKey = normalizeKey(team.prodi);
  const directMatch = BRANDING_MAP[idKey] ?? BRANDING_MAP[prodiKey];

  if (directMatch) {
    return directMatch;
  }

  const fuzzyMatch = Object.keys(BRANDING_MAP).find(
    (key) => prodiKey.includes(key) || idKey.includes(key)
  );
  if (fuzzyMatch) {
    return BRANDING_MAP[fuzzyMatch];
  }

  return {
    color: team.color || "#0ea5e9",
    logo: team.logo_url || "/logos/default.svg",
  };
};
