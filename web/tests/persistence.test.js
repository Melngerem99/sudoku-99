const h = require('./helpers');

h.loadAllModules();
h.resetStorage();

h.describe('Persistence — save and load round-trip', function () {
  Persistence.clear();
  var state = {
    board: h.FIXTURE_PUZZLE,
    solution: h.FIXTURE_SOLUTION,
    givens: h.FIXTURE_PUZZLE,
    candidates: h.FIXTURE_PUZZLE.map(function (v) { return v === 0 ? new Set([1, 2, 3]) : new Set(); }),
    pencilMode: true,
    mistakes: 2,
    timerSeconds: 145,
    gameOver: false,
    gameWon: false,
    emptyMode: false,
    currentDifficulty: 'hard',
    hintsUsedThisGame: 3,
    history: [{ board: h.FIXTURE_PUZZLE, candidates: h.FIXTURE_PUZZLE.map(function () { return new Set([1]); }) }],
    future: []
  };
  
  Persistence.saveImmediate(state);
  var loaded = Persistence.load();
  h.assertNotNull(loaded, 'load returns data');
  h.assertArrayEqual(loaded.board, h.FIXTURE_PUZZLE, 'board preserved');
  h.assertEqual(loaded.mistakes, 2, 'mistakes preserved');
  h.assertEqual(loaded.timerSeconds, 145, 'timer preserved');
  h.assertEqual(loaded.pencilMode, true, 'pencilMode preserved');
  h.assertEqual(loaded.currentDifficulty, 'hard', 'difficulty preserved');
  h.assertEqual(loaded.hintsUsedThisGame, 3, 'hints preserved');
  h.assert(loaded.candidates[2] instanceof Set, 'candidates are Sets');
  h.assert(loaded.candidates[2].has(1), 'candidate values preserved');
  h.assertEqual(loaded.history.length, 1, 'history preserved');
});

h.describe('Persistence — corrupted data handled', function () {
  localStorage.setItem('sudoku-game-state', '{invalid json!!!');
  var loaded = Persistence.load();
  h.assertNull(loaded, 'corrupted JSON returns null');
  
  localStorage.setItem('sudoku-game-state', '{"v":1,"board":[1,2,3]}');
  loaded = Persistence.load();
  h.assertNull(loaded, 'wrong array length returns null');
});

h.describe('Persistence — clear removes data', function () {
  Persistence.saveImmediate({ board: h.FIXTURE_PUZZLE, solution: h.FIXTURE_SOLUTION, givens: h.FIXTURE_PUZZLE, candidates: h.FIXTURE_PUZZLE.map(function () { return new Set(); }), pencilMode: false, mistakes: 0, timerSeconds: 0, gameOver: false, gameWon: false, emptyMode: false, currentDifficulty: 'easy', hintsUsedThisGame: 0, history: [], future: [] });
  Persistence.clear();
  h.assertNull(Persistence.load(), 'cleared data returns null');
});

h.describe('Statistics — validation', function () {
  h.resetStorage();
  // Set corrupted stats
  localStorage.setItem('sudoku-statistics', '{"v":1,"perDifficulty":{"easy":{"started":-1}}}');
  // Reload bundle so Statistics module re-initializes from corrupted storage
  h.loadAllModules();
  var stats = Statistics.getStats();
  // Should return defaults (validation rejects negative numbers)
  h.assertEqual(stats.perDifficulty.easy.started, 0, 'corrupted stats reset to defaults');
});
