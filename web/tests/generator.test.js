const h = require('./helpers');

h.loadAllModules();

h.describe('Generator.generateSync — unique solutions', function () {
  var targets = ['Easy', 'Medium', 'Hard', 'Master'];
  for (var i = 0; i < targets.length; i++) {
    var result = Generator.generateSync(targets[i]);
    h.assertNotNull(result.puzzle, targets[i] + ' returns puzzle');
    h.assertEqual(result.puzzle.length, 81, targets[i] + ' puzzle is 81 cells');
    h.assertEqual(Solver.countSolutions(result.puzzle, 2), 1, targets[i] + ' has unique solution');
    h.assert(Solver.isValid(result.puzzle), targets[i] + ' puzzle is valid');
  }
});

h.describe('Generator.generateSync — Easy always matches', function () {
  for (var i = 0; i < 3; i++) {
    var result = Generator.generateSync('Easy');
    h.assert(result.exact, 'Easy attempt ' + (i + 1) + ' is exact match');
    h.assertEqual(result.actualDifficulty, 'Easy', 'Easy result labeled Easy');
  }
});

h.describe('Generator.generateSync — returns result structure', function () {
  var result = Generator.generateSync('Medium');
  h.assertNotNull(result.puzzle, 'has puzzle');
  h.assertNotNull(result.solution, 'has solution');
  h.assert(typeof result.actualDifficulty === 'string', 'has actualDifficulty');
  h.assert(typeof result.attempts === 'number', 'has attempts count');
  h.assert(typeof result.timeMs === 'number', 'has timeMs');
  h.assert(typeof result.clueCount === 'number', 'has clueCount');
  h.assert(typeof result.exact === 'boolean', 'has exact flag');
});

h.describe('Generator.generateSync — adaptive steering', function () {
  // Hard should try fewer clues than Easy
  var easy = Generator.generateSync('Easy');
  var hard = Generator.generateSync('Hard');
  h.assert(hard.clueCount <= easy.clueCount, 'Hard has fewer/equal clues than Easy');
});
