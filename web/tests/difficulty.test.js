const h = require('./helpers');

h.loadAllModules();

h.describe('Difficulty.analyze — Easy classification', function () {
  var r = Solver.generate('easy');
  var path = StepSolver.computePath(r.puzzle);
  var result = Difficulty.analyze(path);
  h.assertEqual(result.label, 'Easy', 'Easy puzzle classified as Easy');
  h.assert(result.hardestTier <= 1, 'Easy has tier <= 1');
  h.assert(result.score <= 80, 'Easy has score <= 80');
});

h.describe('Difficulty.analyze — stuck = Master', function () {
  var stuckPath = { steps: [{}, {}, {}], complete: false, stuckAt: 30, hardestTechnique: 'Naked Single', techniqueCounts: { 'Naked Single': 3 } };
  var result = Difficulty.analyze(stuckPath);
  h.assertEqual(result.label, 'Master', 'stuck puzzle is Master');
  h.assert(result.stuck, 'stuck flag is true');
});

h.describe('Difficulty.analyze — tier overrides', function () {
  // Tier 7 technique should be minimum Expert
  var path = { steps: new Array(10), complete: true, stuckAt: null, hardestTechnique: 'Unique Rectangle (Type 1)', techniqueCounts: { 'Naked Single': 8, 'Unique Rectangle (Type 1)': 2 } };
  var result = Difficulty.analyze(path);
  h.assert(result.label === 'Expert' || result.label === 'Master', 'Tier 7 is minimum Expert: ' + result.label);
  
  // Tier 4 should be minimum Medium
  var path2 = { steps: new Array(5), complete: true, stuckAt: null, hardestTechnique: 'X-Wing', techniqueCounts: { 'Naked Single': 4, 'X-Wing': 1 } };
  var result2 = Difficulty.analyze(path2);
  h.assert(result2.label !== 'Easy', 'Tier 4 cannot be Easy: ' + result2.label);
});

h.describe('Difficulty.analyze — null/empty input', function () {
  var result = Difficulty.analyze(null);
  h.assertEqual(result.label, 'Unknown', 'null input returns Unknown');
  h.assertEqual(result.score, 0, 'null input has 0 score');
});

h.describe('Difficulty.LABELS', function () {
  h.assertEqual(Difficulty.LABELS.length, 5, '5 difficulty labels');
  h.assertEqual(Difficulty.LABELS[0], 'Easy', 'first is Easy');
  h.assertEqual(Difficulty.LABELS[4], 'Master', 'last is Master');
});
