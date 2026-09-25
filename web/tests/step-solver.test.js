const h = require('./helpers');

h.loadAllModules();

h.describe('StepSolver.computePath — does not mutate input', function () {
  var original = h.FIXTURE_PUZZLE.slice();
  var copy = h.FIXTURE_PUZZLE.slice();
  StepSolver.computePath(copy);
  h.assertArrayEqual(copy, original, 'input board unchanged after computePath');
});

h.describe('StepSolver.computePath — Easy puzzle', function () {
  var r = Solver.generate('easy');
  var path = StepSolver.computePath(r.puzzle);
  h.assert(path.steps.length > 0, 'produces steps');
  h.assert(path.complete, 'Easy puzzle completes logically');
  // Final board matches solution
  var final = path.steps[path.steps.length - 1].boardAfter;
  h.assertArrayEqual(final, r.solution, 'final board matches solution');
});

h.describe('StepSolver.computePath — board snapshots', function () {
  var r = Solver.generate('medium');
  var path = StepSolver.computePath(r.puzzle);
  if (path.steps.length > 0) {
    // First step's boardAfter should differ from puzzle by at most 1 cell (if placement)
    var step0 = path.steps[0];
    var diffs = 0;
    for (var i = 0; i < 81; i++) {
      if (step0.boardAfter[i] !== r.puzzle[i]) diffs++;
    }
    if (step0.placement) {
      h.assertEqual(diffs, 1, 'placement step changes exactly 1 cell');
      h.assertEqual(step0.boardAfter[step0.placement.idx], step0.placement.digit, 'placed digit in correct cell');
    } else {
      h.assertEqual(diffs, 0, 'elimination-only step changes 0 cells');
    }
  }
});

h.describe('StepSolver.computePath — candidate snapshots', function () {
  var r = Solver.generate('medium');
  var path = StepSolver.computePath(r.puzzle);
  if (path.steps.length > 0 && path.steps[0].placement) {
    var step = path.steps[0];
    // Placed cell should have empty candidates
    h.assertEqual(step.candidatesAfter[step.placement.idx].size, 0, 'placed cell has 0 candidates');
    // Peers should not contain the placed digit
    var peers = Solver.PEERS[step.placement.idx];
    var violation = false;
    for (var p = 0; p < peers.length; p++) {
      if (step.candidatesAfter[peers[p]].has(step.placement.digit)) { violation = true; break; }
    }
    h.assert(!violation, 'placed digit removed from peer candidates');
  }
});

h.describe('StepSolver.computePath — hardestTechnique', function () {
  var r = Solver.generate('easy');
  var path = StepSolver.computePath(r.puzzle);
  h.assert(typeof path.hardestTechnique === 'string', 'hardestTechnique is a string');
  h.assert(path.hardestTechnique.length > 0, 'hardestTechnique is non-empty');
  // Easy should only use singles
  var validEasy = ['Naked Single', 'Hidden Single'];
  h.assert(validEasy.indexOf(path.hardestTechnique) !== -1, 'Easy uses only singles: ' + path.hardestTechnique);
});

h.describe('StepSolver.computePath — stuck detection', function () {
  // Create a board that requires guessing by using very few clues
  var board = new Array(81).fill(0);
  board[0] = 1; board[10] = 2;
  var path = StepSolver.computePath(board);
  // With only 2 clues, technique detection likely gets stuck
  h.assert(!path.complete || path.steps.length > 0, 'path handles sparse board without crash');
});
