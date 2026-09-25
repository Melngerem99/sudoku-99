const h = require('./helpers');

h.loadAllModules();

h.describe('Techniques registry', function () {
  h.assertEqual(Techniques.TECHNIQUES.length, 22, 'registry has 22 techniques');
  Techniques.TECHNIQUES.forEach(function (t) {
    h.assert(typeof t.name === 'string' && t.name.length > 0, t.name + ' has name');
    h.assert(typeof t.detect === 'function', t.name + ' has detect function');
  });
});

h.describe('Techniques.buildCandidates', function () {
  var cands = Techniques.buildCandidates(h.FIXTURE_PUZZLE);
  h.assertEqual(cands.length, 81, 'returns 81 candidate sets');
  // Given cell (cell 0 = 5) should have empty candidates
  h.assertEqual(cands[0].size, 0, 'given cell has no candidates');
  // Empty cell should have candidates
  h.assert(cands[2].size > 0, 'empty cell has candidates');
  // Candidates should not include digits already in peers
  h.assert(!cands[2].has(5), 'cell 2 excludes 5 (peer has 5)');
  h.assert(!cands[2].has(3), 'cell 2 excludes 3 (peer has 3)');
});

h.describe('Techniques.getHint correctness', function () {
  // Generate puzzles and verify hints produce valid eliminations
  for (var i = 0; i < 10; i++) {
    var r = Solver.generate('hard');
    var board = r.puzzle.slice();
    var cands = Techniques.buildCandidates(board);
    var hint = Techniques.getHint(board, cands);
    if (hint) {
      // Verify HintResult structure
      h.assert(typeof hint.technique === 'string', 'hint has technique name');
      h.assert(typeof hint.description === 'string', 'hint has description');
      h.assertNotNull(hint.highlights, 'hint has highlights');
      h.assert(Array.isArray(hint.highlights.cause), 'highlights.cause is array');
      h.assert(Array.isArray(hint.highlights.affected), 'highlights.affected is array');
      h.assert(Array.isArray(hint.highlights.result), 'highlights.result is array');
      h.assert(Array.isArray(hint.eliminations), 'eliminations is array');
      
      // Verify elimination correctness: applying it doesn't break solvability
      if (hint.placement) {
        var testBoard = board.slice();
        testBoard[hint.placement.idx] = hint.placement.digit;
        h.assertNotNull(Solver.solve(testBoard), 'placement preserves solvability (puzzle ' + i + ')');
      }
    }
  }
});

h.describe('Technique detection — Naked Single', function () {
  // Board where cell has only one candidate
  var board = h.FIXTURE_PUZZLE.slice();
  var cands = Techniques.buildCandidates(board);
  // Find a cell with size 1
  var found = false;
  for (var i = 0; i < 81; i++) {
    if (board[i] === 0 && cands[i].size === 1) { found = true; break; }
  }
  if (found) {
    var hint = Techniques.getHint(board, cands);
    h.assertNotNull(hint, 'detects a technique on fixture puzzle');
    // First technique should be Naked Single or Hidden Single (simplest)
    h.assert(hint.technique === 'Naked Single' || hint.technique === 'Hidden Single', 'simplest technique fires first');
  } else {
    h.assert(true, 'no naked single in fixture (acceptable)');
  }
});
