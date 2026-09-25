/**
 * difficulty.ts — Difficulty classification via weighted technique scoring.
 */

export interface DifficultyResult {
  label: string;
  score: number;
  hardestTier: number;
  hardestTechnique: string;
  stepCount: number;
  techniqueCounts: Record<string, number>;
  stuck: boolean;
}

const TECHNIQUE_TIERS: Record<string, number> = {
  "Naked Single": 1, "Hidden Single": 1,
  "Locked Candidates (Pointing)": 2, "Locked Candidates (Claiming)": 2,
  "Naked Pair": 3, "Hidden Pair": 3, "Naked Triple": 3, "Hidden Triple": 3,
  "X-Wing": 4, "Finned X-Wing": 4, "Sashimi Finned X-Wing": 4,
  "Swordfish": 5, "Jellyfish": 5, "XY-Wing": 5, "XYZ-Wing": 5,
  "W-Wing": 6, "Two-String Kite": 6, "Skyscraper": 6,
  "Simple Coloring (Wrap)": 7, "Simple Coloring (Trap)": 7,
  "Empty Rectangle": 7, "Unique Rectangle (Type 1)": 7, "BUG +1": 7,
  "ALS-XZ": 8,
};

const TIER_POINTS: Record<number, number> = { 1: 1, 2: 3, 3: 5, 4: 10, 5: 15, 6: 20, 7: 30, 8: 50 };

export const LABELS = ["Easy", "Medium", "Hard", "Expert", "Master"];

function classify(score: number, hardestTier: number, stuck: boolean): string {
  if (stuck) return "Master";
  let minLabel = "Easy";
  if (hardestTier >= 8) minLabel = "Master";
  else if (hardestTier >= 7) minLabel = "Expert";
  else if (hardestTier >= 6) minLabel = "Hard";
  else if (hardestTier >= 4) minLabel = "Medium";

  let scoreLabel: string;
  if (score <= 80) scoreLabel = "Easy";
  else if (score <= 200) scoreLabel = "Medium";
  else if (score <= 500) scoreLabel = "Hard";
  else if (score <= 900) scoreLabel = "Expert";
  else scoreLabel = "Master";

  const labelOrder: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2, Expert: 3, Master: 4 };
  return (labelOrder[minLabel] || 0) >= (labelOrder[scoreLabel] || 0) ? minLabel : scoreLabel;
}

export function analyze(pathResult: any): DifficultyResult {
  if (!pathResult) {
    return { label: "Unknown", score: 0, hardestTier: 0, hardestTechnique: "None", stepCount: 0, techniqueCounts: {}, stuck: false };
  }

  const techniqueCounts: Record<string, number> = pathResult.techniqueCounts || {};
  const stepCount: number = pathResult.steps ? pathResult.steps.length : 0;
  const stuck: boolean = !pathResult.complete;

  let totalScore = 0;
  let hardestTier = 0;
  let hardestTechnique = "None";

  const techniques = Object.keys(techniqueCounts);
  for (const name of techniques) {
    const count = techniqueCounts[name];
    const tier = TECHNIQUE_TIERS[name] || 8;
    const points = TIER_POINTS[tier] || 50;
    totalScore += count * points;
    if (tier > hardestTier) { hardestTier = tier; hardestTechnique = name; }
  }

  if (stuck) totalScore += 1000;

  return {
    label: classify(totalScore, hardestTier, stuck),
    score: totalScore,
    hardestTier,
    hardestTechnique,
    stepCount,
    techniqueCounts,
    stuck,
  };
}
