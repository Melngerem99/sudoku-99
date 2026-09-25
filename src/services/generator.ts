/**
 * generator.ts — Difficulty-aware puzzle generation with adaptive steering.
 */

import { generate as solverGenerate, countSolutions } from '../core/solver';
import { computePath } from '../core/step-solver';
import { analyze, type DifficultyResult } from '../core/difficulty';

type Board = number[];

export interface GenerationResult {
  puzzle: Board;
  solution: Board;
  actualDifficulty: string;
  difficultyResult: DifficultyResult | null;
  attempts: number;
  timeMs: number;
  clueCount: number;
  exact: boolean;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const CLUE_RANGES: Record<string, { min: number; max: number }> = {
  Easy:   { min: 36, max: 45 },
  Medium: { min: 25, max: 33 },
  Hard:   { min: 22, max: 28 },
  Expert: { min: 20, max: 26 },
  Master: { min: 18, max: 23 },
};

const MAX_ATTEMPTS: Record<string, number> = { Easy: 15, Medium: 30, Hard: 50, Expert: 60, Master: 30 };
const TIME_BUDGETS: Record<string, number> = { Easy: 1000, Medium: 2500, Hard: 3500, Expert: 4500, Master: 3000 };
const LABEL_ORDER: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2, Expert: 3, Master: 4 };

// ─── Adaptive steering ──────────────────────────────────────────────────────

function steer(currentClues: number, actualLabel: string, targetLabel: string, attempt: number, range: { min: number; max: number }): number {
  const actualOrder = LABEL_ORDER[actualLabel] || 0;
  const targetOrder = LABEL_ORDER[targetLabel] || 0;
  const diff = targetOrder - actualOrder;
  const step = Math.max(1, Math.min(3, 4 - Math.floor(attempt / 5)));

  let nextClues: number;
  if (diff > 0) nextClues = currentClues - step;
  else if (diff < 0) nextClues = currentClues + step;
  else nextClues = currentClues + (Math.random() > 0.5 ? 1 : -1);

  return Math.max(range.min, Math.min(range.max, nextClues));
}

function directionalDistance(actualLabel: string, targetLabel: string): number {
  const actualOrder = LABEL_ORDER[actualLabel] || 0;
  const targetOrder = LABEL_ORDER[targetLabel] || 0;
  const rawDiff = Math.abs(actualOrder - targetOrder);
  return actualOrder >= targetOrder ? rawDiff * 0.7 : rawDiff * 1.0;
}

// ─── Core generation ────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
}

function generateWithClues(targetClues: number): { puzzle: Board; solution: Board; clueCount: number } {
  let difficultyKey: string;
  if (targetClues >= 36) difficultyKey = "easy";
  else if (targetClues >= 30) difficultyKey = "medium";
  else if (targetClues >= 26) difficultyKey = "hard";
  else difficultyKey = "expert";

  const result = solverGenerate(difficultyKey);
  const puzzle = result.puzzle;
  const solution = result.solution;
  let currentClues = 0;
  for (let i = 0; i < 81; i++) { if (puzzle[i] !== 0) currentClues++; }

  if (currentClues > targetClues) {
    const positions: number[] = [];
    for (let i = 0; i < 81; i++) { if (puzzle[i] !== 0) positions.push(i); }
    shuffle(positions);
    for (let p = 0; p < positions.length && currentClues > targetClues; p++) {
      const pos = positions[p];
      const backup = puzzle[pos];
      puzzle[pos] = 0;
      if (countSolutions(puzzle, 2) === 1) { currentClues--; }
      else { puzzle[pos] = backup; }
    }
  }

  if (currentClues < targetClues) {
    const empties: number[] = [];
    for (let i = 0; i < 81; i++) { if (puzzle[i] === 0) empties.push(i); }
    shuffle(empties);
    for (let e = 0; e < empties.length && currentClues < targetClues; e++) {
      puzzle[empties[e]] = solution[empties[e]];
      currentClues++;
    }
  }

  return { puzzle, solution, clueCount: currentClues };
}

// ─── Synchronous generation ─────────────────────────────────────────────────

export function generateSync(targetDifficulty: string): GenerationResult {
  const range = CLUE_RANGES[targetDifficulty] || CLUE_RANGES.Medium;
  const maxAttempts = MAX_ATTEMPTS[targetDifficulty] || 30;
  const timeBudget = TIME_BUDGETS[targetDifficulty] || 3000;
  const startTime = performance.now();

  let clueCount = Math.round((range.min + range.max) / 2);
  let bestResult: GenerationResult | null = null;
  let bestDistance = 999;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (performance.now() - startTime > timeBudget) break;

    const generated = generateWithClues(clueCount);
    const path = computePath(generated.puzzle);
    const analysis = analyze(path);

    if (analysis.label === targetDifficulty) {
      return {
        puzzle: generated.puzzle,
        solution: generated.solution,
        actualDifficulty: analysis.label,
        difficultyResult: analysis,
        attempts: attempt,
        timeMs: Math.round(performance.now() - startTime),
        clueCount: generated.clueCount,
        exact: true,
      };
    }

    const dist = directionalDistance(analysis.label, targetDifficulty);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestResult = {
        puzzle: generated.puzzle,
        solution: generated.solution,
        actualDifficulty: analysis.label,
        difficultyResult: analysis,
        clueCount: generated.clueCount,
        attempts: 0,
        timeMs: 0,
        exact: false,
      };
    }

    clueCount = steer(clueCount, analysis.label, targetDifficulty, attempt, range);
  }

  const totalTime = Math.round(performance.now() - startTime);
  if (bestResult) {
    bestResult.attempts = maxAttempts;
    bestResult.timeMs = totalTime;
    return bestResult;
  }

  const fallback = solverGenerate("medium");
  return {
    puzzle: fallback.puzzle,
    solution: fallback.solution,
    actualDifficulty: "Medium",
    difficultyResult: null,
    attempts: maxAttempts,
    timeMs: totalTime,
    clueCount: 30,
    exact: false,
  };
}

// ─── Async generation ───────────────────────────────────────────────────────

export function generate(
  targetDifficulty: string,
  callback: (result: GenerationResult) => void,
  onProgress?: (progress: { attempt: number; maxAttempts: number }) => void,
): () => void {
  const range = CLUE_RANGES[targetDifficulty] || CLUE_RANGES.Medium;
  const maxAttempts = MAX_ATTEMPTS[targetDifficulty] || 30;
  const timeBudget = TIME_BUDGETS[targetDifficulty] || 3000;
  const startTime = performance.now();

  let clueCount = Math.round((range.min + range.max) / 2);
  let bestResult: GenerationResult | null = null;
  let bestDistance = 999;
  let attempt = 0;
  let cancelled = false;

  function runChunk() {
    if (cancelled) return;
    const chunkEnd = Math.min(attempt + 3, maxAttempts);
    while (attempt < chunkEnd) {
      if (performance.now() - startTime > timeBudget) { finish(); return; }
      attempt++;
      const generated = generateWithClues(clueCount);
      const path = computePath(generated.puzzle);
      const analysis = analyze(path);

      if (analysis.label === targetDifficulty) {
        callback({
          puzzle: generated.puzzle,
          solution: generated.solution,
          actualDifficulty: analysis.label,
          difficultyResult: analysis,
          attempts: attempt,
          timeMs: Math.round(performance.now() - startTime),
          clueCount: generated.clueCount,
          exact: true,
        });
        return;
      }

      const dist = directionalDistance(analysis.label, targetDifficulty);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestResult = {
          puzzle: generated.puzzle,
          solution: generated.solution,
          actualDifficulty: analysis.label,
          difficultyResult: analysis,
          clueCount: generated.clueCount,
          attempts: 0,
          timeMs: 0,
          exact: false,
        };
      }

      clueCount = steer(clueCount, analysis.label, targetDifficulty, attempt, range);
    }
    if (onProgress) onProgress({ attempt, maxAttempts });
    if (attempt >= maxAttempts) { finish(); }
    else { setTimeout(runChunk, 0); }
  }

  function finish() {
    if (cancelled) return;
    const totalTime = Math.round(performance.now() - startTime);
    if (bestResult) {
      bestResult.attempts = attempt;
      bestResult.timeMs = totalTime;
      callback(bestResult);
    } else {
      const fb = solverGenerate("medium");
      callback({
        puzzle: fb.puzzle, solution: fb.solution,
        actualDifficulty: "Medium", difficultyResult: null,
        attempts: attempt, timeMs: totalTime, clueCount: 30, exact: false,
      });
    }
  }

  setTimeout(runChunk, 0);
  return function cancel() { cancelled = true; };
}
