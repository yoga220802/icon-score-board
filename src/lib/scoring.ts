export type Phase2Scores = {
  analisis: number;
  inovasi: number;
  feasibility: number;
  admin: number;
};

export type Phase3Scores = {
  delivery: number;
  knowledge: number;
  ethics: number;
};

export const calculatePhase2Total = (scores: Phase2Scores) => {
  return (
    scores.analisis * 0.3 +
    scores.inovasi * 0.4 +
    scores.feasibility * 0.2 +
    scores.admin * 0.1
  );
};

export const calculatePhase3Total = (scores: Phase3Scores) => {
  return (
    scores.delivery * 0.2 +
    scores.knowledge * 0.5 +
    scores.ethics * 0.3
  );
};

export type PotState = {
  teamScore: number;
  potScore: number;
  buzzerOpen: boolean;
  lockedBy: string | null;
};

export type PotAction = "BENAR" | "SALAH" | "HANGUS";

export const applyPotAction = (state: PotState, action: PotAction): PotState => {
  switch (action) {
    case "BENAR":
      return {
        ...state,
        teamScore: state.teamScore + 10 + state.potScore,
        potScore: 0,
        buzzerOpen: false,
        lockedBy: null,
      };
    case "SALAH":
      return {
        ...state,
        teamScore: state.teamScore - 5,
        potScore: state.potScore + 5,
        buzzerOpen: false,
        lockedBy: null,
      };
    case "HANGUS":
      return {
        ...state,
        potScore: 0,
        buzzerOpen: false,
        lockedBy: null,
      };
    default:
      return state;
  }
};
