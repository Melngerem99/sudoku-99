/**
 * main.ts — ES Module entry point for Sudoku-99.
 *
 * Imports converted modules and attaches backward-compatible window shims
 * so that legacy IIFE scripts (controllers, script.js) continue to work.
 */

// ─── Core ───────────────────────────────────────────────────────────────────

import * as SolverModule from './core/solver';
import * as DifficultyModule from './core/difficulty';
import * as StepSolverModule from './core/step-solver';
import * as TechniquesModule from './core/techniques';

// ─── Services ───────────────────────────────────────────────────────────────

import * as LibraryModule from './services/library';
import * as PersistenceModule from './services/persistence';
import * as StatisticsModule from './services/statistics';
import * as ImportExportModule from './services/import-export';
import * as GeneratorModule from './services/generator';

// ─── UI Helpers ─────────────────────────────────────────────────────────────

import * as DOMModule from './ui/dom-helpers';
import * as UIModule from './ui/ui';

// ─── Controllers ────────────────────────────────────────────────────────────

import * as StatisticsControllerModule from './controllers/statistics-controller';
import * as AnalysisControllerModule from './controllers/analysis-controller';
import * as ImportControllerModule from './controllers/import-controller';
import * as LibraryControllerModule from './controllers/library-controller';
import * as DailyControllerModule from './controllers/daily-controller';
import * as StepSolverControllerModule from './controllers/step-solver-controller';

// ─── Game Controller ────────────────────────────────────────────────────────

import { init as initGame } from './game-controller';

// ─── Window Shims (backward compatibility) ──────────────────────────────────

export const VERSION = '1.0.0';

if (typeof window !== 'undefined') {
  // These shims allow existing IIFE-based controllers and script.js
  // to continue using window.Solver, window.Library, etc.
  // They will be removed in Phase 4.6 when all code is modularized.

  (window as any).Solver = {
    isValid: SolverModule.isValid,
    solve: SolverModule.solve,
    countSolutions: SolverModule.countSolutions,
    generate: SolverModule.generate,
    PEERS: SolverModule.PEERS,
  };

  (window as any).Library = {
    save: LibraryModule.save,
    remove: LibraryModule.remove,
    get: LibraryModule.get,
    getAll: LibraryModule.getAll,
    filter: LibraryModule.filter,
    toggleFavorite: LibraryModule.toggleFavorite,
    markCompleted: LibraryModule.markCompleted,
    markPlayed: LibraryModule.markPlayed,
    has: LibraryModule.has,
    count: LibraryModule.count,
    clear: LibraryModule.clear,
  };

  (window as any).Persistence = {
    scheduleSave: PersistenceModule.scheduleSave,
    saveImmediate: PersistenceModule.saveImmediate,
    load: PersistenceModule.load,
    clear: PersistenceModule.clear,
  };

  (window as any).Statistics = {
    recordGameStart: StatisticsModule.recordGameStart,
    recordWin: StatisticsModule.recordWin,
    recordLoss: StatisticsModule.recordLoss,
    getStats: StatisticsModule.getStats,
    reset: StatisticsModule.reset,
    formatTime: StatisticsModule.formatTime,
    winRate: StatisticsModule.winRate,
    avgTime: StatisticsModule.avgTime,
  };

  (window as any).DOM = {
    $el: DOMModule.$el,
    $btn: DOMModule.$btn,
    $input: DOMModule.$input,
    $select: DOMModule.$select,
    setText: DOMModule.setText,
    show: DOMModule.show,
    hide: DOMModule.hide,
    enable: DOMModule.enable,
    disable: DOMModule.disable,
  };

  (window as any).UI = {
    init: UIModule.init,
    renderBoard: UIModule.renderBoard,
    updateCell: UIModule.updateCell,
    setTimer: UIModule.setTimer,
    setMistakes: UIModule.setMistakes,
    setDigitCounts: UIModule.setDigitCounts,
    showHint: UIModule.showHint,
    hideHint: UIModule.hideHint,
    clearHintHighlights: UIModule.clearHintHighlights,
    showModal: UIModule.showModal,
    hideModal: UIModule.hideModal,
    setActiveDigitButton: UIModule.setActiveDigitButton,
    flashCell: UIModule.flashCell,
    toggleDarkMode: UIModule.toggleDarkMode,
    isDarkMode: UIModule.isDarkMode,
    on: UIModule.on,
    cells: UIModule.cells,
    get _closeSettingsDrawer() { return UIModule._closeSettingsDrawer; },
  };

  (window as any).ImportExport = {
    parse: ImportExportModule.parse,
    validate: ImportExportModule.validate,
    exportGivens: ImportExportModule.exportGivens,
    exportBoard: ImportExportModule.exportBoard,
    generateURL: ImportExportModule.generateURL,
    getHashPuzzle: ImportExportModule.getHashPuzzle,
    clearHash: ImportExportModule.clearHash,
    copyToClipboard: ImportExportModule.copyToClipboard,
  };

  (window as any).Difficulty = {
    analyze: DifficultyModule.analyze,
    LABELS: DifficultyModule.LABELS,
  };

  (window as any).StepSolver = {
    computePath: StepSolverModule.computePath,
    assessDifficulty: StepSolverModule.assessDifficulty,
  };

  (window as any).Techniques = {
    TECHNIQUES: TechniquesModule.TECHNIQUES,
    getHint: TechniquesModule.getHint,
    detectAll: TechniquesModule.detectAll,
    buildCandidates: TechniquesModule.buildCandidates,
  };

  (window as any).Generator = {
    generate: GeneratorModule.generate,
    generateSync: GeneratorModule.generateSync,
  };

  (window as any).StatisticsController = {
    init: StatisticsControllerModule.init,
    open: StatisticsControllerModule.open,
    close: StatisticsControllerModule.close,
    refresh: StatisticsControllerModule.refresh,
  };

  (window as any).AnalysisController = {
    init: AnalysisControllerModule.init,
    open: AnalysisControllerModule.open,
    close: AnalysisControllerModule.close,
    invalidate: AnalysisControllerModule.invalidate,
  };

  (window as any).ImportController = {
    init: ImportControllerModule.init,
    open: ImportControllerModule.open,
    close: ImportControllerModule.close,
  };

  (window as any).LibraryController = {
    init: LibraryControllerModule.init,
    open: LibraryControllerModule.open,
    close: LibraryControllerModule.close,
    refresh: LibraryControllerModule.refresh,
  };

  (window as any).DailyController = {
    init: DailyControllerModule.init,
    open: DailyControllerModule.open,
    close: DailyControllerModule.close,
    refresh: DailyControllerModule.refresh,
    updateBadge: DailyControllerModule.updateBadge,
  };

  (window as any).StepSolverController = {
    init: StepSolverControllerModule.init,
    open: StepSolverControllerModule.open,
    close: StepSolverControllerModule.close,
    isActive: StepSolverControllerModule.isActive,
  };

  console.debug(`[Sudoku-99] ES module bundle loaded (v${VERSION})`);

  // ─── Bootstrap (skipped in test mode) ────────────────────────────────────
  if (!(globalThis as any).__SUDOKU_SKIP_BOOTSTRAP__) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initGame);
    } else {
      initGame();
    }
  }
}
