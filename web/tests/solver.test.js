const h = require('./helpers');

h.loadAllModules();

h.describe('Solver.isValid', function () {
  h.assert(Solver.isValid(h.FIXTURE_PUZZLE), 'valid puzzle passes');
  h.assert(!Solver.isValid(h.FIXTURE_CONFLICT_BOARD), 'conflicting board fails');
  h.assert(Solver.isValid(h.FIXTURE_EMPTY), 'empty board is valid');
  h.assert(Solver.isValid(h.FIXTURE_SOLUTION), 'complete solution is valid');
});

h.describe('Solver.solve', function () {
  var solved = Solver.solve(h.FIXTURE_PUZZLE);
  h.assertNotNull(solved, 'solve returns a result');
  h.assert(Solver.isValid(solved), 'solved board is valid');
  h.assertArrayEqual(solved, h.FIXTURE_SOLUTION, 'matches known solution');
  
  var fromEmpty = Solver.solve(h.FIXTURE_EMPTY);
  h.assertNotNull(fromEmpty, 'can solve empty board');
  h.assert(Solver.isValid(fromEmpty), 'empty solve result is valid');
  h.assertEqual(fromEmpty.filter(v => v === 0).length, 0, 'all cells filled');
});

h.describe('Solver.countSolutions', function () {
  h.assertEqual(Solver.countSolutions(h.FIXTURE_PUZZLE, 2), 1, 'unique puzzle has 1 solution');
  h.assertEqual(Solver.countSolutions(h.FIXTURE_SOLUTION, 2), 1, 'complete board has 1 solution');
  
  // Multi-solution: remove a clue from a minimal puzzle
  var multi = h.FIXTURE_PUZZLE.slice();
  multi[0] = 0; multi[1] = 0; // Remove two clues
  var count = Solver.countSolutions(multi, 2);
  h.assert(count >= 1, 'modified puzzle still solvable');
});

h.describe('Solver.generate', function () {
  var difficulties = ['easy', 'medium', 'hard', 'expert'];
  for (var i = 0; i < difficulties.length; i++) {
    var d = difficulties[i];
    var result = Solver.generate(d);
    h.assertNotNull(result.puzzle, d + ' generates puzzle');
    h.assertNotNull(result.solution, d + ' generates solution');
    h.assertEqual(result.puzzle.length, 81, d + ' puzzle is 81 cells');
    h.assert(Solver.isValid(result.puzzle), d + ' puzzle is valid');
    h.assertEqual(Solver.countSolutions(result.puzzle, 2), 1, d + ' has unique solution');
    var solved = Solver.solve(result.puzzle);
    h.assertArrayEqual(solved, result.solution, d + ' solve matches solution');
  }
});

h.describe('Solver.PEERS', function () {
  h.assertEqual(Solver.PEERS.length, 81, 'PEERS has 81 entries');
  h.assertEqual(Solver.PEERS[0].length, 20, 'cell 0 has 20 peers');
  h.assert(!Solver.PEERS[0].includes(0), 'cell 0 is not its own peer');
});
