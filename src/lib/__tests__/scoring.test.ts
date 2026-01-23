import { describe, expect, it } from "vitest";
import {
  applyPotAction,
  calculatePhase2Total,
  calculatePhase3Total,
  type PotState,
} from "@/lib/scoring";

describe("calculatePhase2Total", () => {
  it("computes weighted total", () => {
    const total = calculatePhase2Total({
      analisis: 80,
      inovasi: 90,
      feasibility: 70,
      admin: 60,
    });

    expect(total).toBeCloseTo(80 * 0.3 + 90 * 0.4 + 70 * 0.2 + 60 * 0.1);
  });
});

describe("calculatePhase3Total", () => {
  it("computes weighted total", () => {
    const total = calculatePhase3Total({
      delivery: 85,
      knowledge: 95,
      ethics: 75,
    });

    expect(total).toBeCloseTo(85 * 0.2 + 95 * 0.5 + 75 * 0.3);
  });
});

describe("applyPotAction", () => {
  it("handles BENAR", () => {
    const state: PotState = {
      teamScore: 50,
      potScore: 10,
      buzzerOpen: true,
      lockedBy: "inf",
    };

    expect(applyPotAction(state, "BENAR")).toEqual({
      teamScore: 70,
      potScore: 0,
      buzzerOpen: false,
      lockedBy: null,
    });
  });

  it("handles SALAH", () => {
    const state: PotState = {
      teamScore: 50,
      potScore: 10,
      buzzerOpen: false,
      lockedBy: "inf",
    };

    expect(applyPotAction(state, "SALAH")).toEqual({
      teamScore: 45,
      potScore: 15,
      buzzerOpen: false,
      lockedBy: null,
    });
  });

  it("handles HANGUS", () => {
    const state: PotState = {
      teamScore: 50,
      potScore: 10,
      buzzerOpen: true,
      lockedBy: "inf",
    };

    expect(applyPotAction(state, "HANGUS")).toEqual({
      teamScore: 50,
      potScore: 0,
      buzzerOpen: false,
      lockedBy: null,
    });
  });
});
