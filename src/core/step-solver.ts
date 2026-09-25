/**
 * step-solver.ts — Computes a full logical solution path using technique detectors.
 */

import { PEERS } from './solver';
import { buildCandidates, getHint, type HintResult } from './techniques';

type Board = number[];
type CandidateGrid = Set<number>[];

export interface PathResult {
  steps: SolutionStep[];
  complete: boolean;
  stuckAt: number | null;
  hardestTechnique: string;
  techniqueCounts: Record<string, number>;
  durationMs: number;
}

export interface SolutionStep {
  stepNumber: number;
  technique: string;
  description: string;
  highlights: { cause: number[]; affected: number[]; result: number[] };
  eliminations: { idx: number; digit: number }[];
  placement: { idx: number; digit: number } | null;
  boardAfter: Board;
  candidatesAfter: CandidateGrid;
}

// ─── Technique ordering ─────────────────────────────────────────────────────

const TECHNIQUE_ORDER = [
  "Naked Single", "Hidden Single",
  "Locked Candidates (Pointing)", "Locked Candidates (Claiming)",
  "Naked Pair", "Naked Triple", "Hidden Pair", "Hidden Triple",
  "X-Wing", "Finned X-Wing", "Sashimi Finned X-Wing",
  "Swordfish", "Jellyfish", "XY-Wing", "XYZ-Wing", "W-Wing",
  "Two-String Kite", "Skyscraper",
  "Simple Coloring (Wrap)", "Simple Coloring (Trap)",
  "Empty Rectangle", "Unique Rectangle (Type 1)", "BUG +1", "ALS-XZ",
];

function getTechniqueIndex(name: string): number {
  const idx = TECHNIQUE_ORDER.indexOf(name);
  return idx >= 0 ? idx : TECHNIQUE_ORDER.length;
}

function getHardestName(idx: number): string {
  if (idx < 0) return "None";
  if (idx < TECHNIQUE_ORDER.length) return TECHNIQUE_ORDER[idx];
  return "Advanced";
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function computePath(inputBoard: Board): PathResult {
  const startTime = performance.now();

  const board = inputBoard.slice();
  const candidates = buildCandidates(board);
  const steps: SolutionStep[] = [];
  const techniqueCounts: Record<string, number> = {};
  let hardestTechniqueIdx = -1;
  const maxIterations = 500;

  for (let iter = 0; iter < maxIterations; iter++) {
    let emptyCount = 0;
    for (let i = 0; i < 81; i++) { if (board[i] === 0) emptyCount++; }
    if (emptyCount === 0) break;

    const hint = getHint(board, candidates);
    if (!hint) {
      return {
        steps,
        complete: false,
        stuckAt: emptyCount,
        hardestTechnique: getHardestName(hardestTechniqueIdx),
        techniqueCounts,
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    const techIdx = getTechniqueIndex(hint.technique);
    if (techIdx > hardestTechniqueIdx) hardestTechniqueIdx = techIdx;

    if (!techniqueCounts[hint.technique]) techniqueCounts[hint.technique] = 0;
    techniqueCounts[hint.technique]++;

    if (hint.placement) {
      board[hint.placement.idx] = hint.placement.digit;
      candidates[hint.placement.idx] = new Set();
      const peers = PEERS[hint.placement.idx];
      for (let p = 0; p < peers.length; p++) {
        candidates[peers[p]].delete(hint.placement!.digit);
      }
    }

    if (hint.eliminations && hint.eliminations.length > 0) {
      for (const elim of hint.eliminations) {
        candidates[elim.idx].delete(elim.digit);
      }
    }

    steps.push({
      stepNumber: steps.length + 1,
      technique: hint.technique,
      description: hint.description,
      highlights: hint.highlights as { cause: number[]; affected: number[]; result: number[] },
      eliminations: (hint.eliminations || []) as { idx: number; digit: number }[],
      placement: hint.placement || null,
      boardAfter: board.slice(),
      candidatesAfter: candidates.map((s: Set<number>) => new Set(s)),
    });
  }

  let finalEmpty = 0;
  for (let j = 0; j < 81; j++) { if (board[j] === 0) finalEmpty++; }

  return {
    steps,
    complete: finalEmpty === 0,
    stuckAt: finalEmpty === 0 ? null : finalEmpty,
    hardestTechnique: getHardestName(hardestTechniqueIdx),
    techniqueCounts,
    durationMs: Math.round(performance.now() - startTime),
  };
}

export function assessDifficulty(hardestTechniqueIdx: number): string {
  if (hardestTechniqueIdx <= 1) return "Easy";
  if (hardestTechniqueIdx <= 6) return "Medium";
  if (hardestTechniqueIdx <= 12) return "Hard";
  return "Expert";
}
