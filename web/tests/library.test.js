const h = require('./helpers');

h.loadAllModules();
h.resetStorage();

h.describe('Library — save and retrieve', function () {
  Library.clear();
  var id = Library.save({ puzzleString: '123456789'.repeat(9), source: 'generated', generatedDifficulty: 'easy', actualDifficulty: 'Easy', score: 45, hardestTechnique: 'Naked Single' });
  h.assertEqual(Library.count(), 1, 'count is 1 after save');
  var entry = Library.getAll()[0];
  h.assertEqual(entry.source, 'generated', 'source preserved');
  h.assertEqual(entry.actualDifficulty, 'Easy', 'difficulty preserved');
  h.assert(entry.id.length > 0, 'ID generated');
  h.assert(!entry.completed, 'not completed by default');
  h.assert(!entry.favorite, 'not favorited by default');
});

h.describe('Library — deduplication', function () {
  Library.clear();
  Library.save({ puzzleString: 'AAA', source: 'generated', actualDifficulty: 'Easy' });
  Library.save({ puzzleString: 'AAA', source: 'generated', actualDifficulty: 'Medium' }); // dedup
  h.assertEqual(Library.count(), 1, 'duplicate not added');
});

h.describe('Library — has()', function () {
  Library.clear();
  Library.save({ puzzleString: 'TEST1', source: 'imported', actualDifficulty: 'Hard' });
  h.assert(Library.has('TEST1'), 'has existing puzzle');
  h.assert(!Library.has('TEST2'), 'does not have non-existent');
});

h.describe('Library — remove', function () {
  Library.clear();
  Library.save({ puzzleString: 'DEL1', source: 'generated', actualDifficulty: 'Easy' });
  var entries = Library.getAll();
  Library.remove(entries[0].id);
  h.assertEqual(Library.count(), 0, 'removed successfully');
});

h.describe('Library — toggleFavorite', function () {
  Library.clear();
  Library.save({ puzzleString: 'FAV1', source: 'daily', actualDifficulty: 'Medium' });
  var entries = Library.getAll();
  var result = Library.toggleFavorite(entries[0].id);
  h.assert(result, 'favorite toggled to true');
  result = Library.toggleFavorite(entries[0].id);
  h.assert(!result, 'favorite toggled back to false');
});

h.describe('Library — markCompleted', function () {
  Library.clear();
  Library.save({ puzzleString: 'COMP1', source: 'generated', actualDifficulty: 'Hard' });
  var entries = Library.getAll();
  Library.markCompleted(entries[0].id);
  var updated = Library.get(entries[0].id);
  h.assert(updated.completed, 'marked as completed');
});

h.describe('Library — filter by difficulty', function () {
  Library.clear();
  Library.save({ puzzleString: 'E1', source: 'generated', actualDifficulty: 'Easy' });
  Library.save({ puzzleString: 'H1', source: 'generated', actualDifficulty: 'Hard' });
  Library.save({ puzzleString: 'H2', source: 'imported', actualDifficulty: 'Hard' });
  var hard = Library.filter({ difficulty: 'Hard' });
  h.assertEqual(hard.length, 2, 'filters to 2 Hard entries');
  var easy = Library.filter({ difficulty: 'Easy' });
  h.assertEqual(easy.length, 1, 'filters to 1 Easy entry');
});

h.describe('Library — filter by source', function () {
  var imported = Library.filter({ source: 'imported' });
  h.assertEqual(imported.length, 1, 'filters to 1 imported');
});

h.describe('Library — sort', function () {
  Library.clear();
  Library.save({ puzzleString: 'S1', source: 'generated', actualDifficulty: 'Easy', savedAt: 100 });
  Library.save({ puzzleString: 'S2', source: 'generated', actualDifficulty: 'Hard', savedAt: 200 });
  Library.save({ puzzleString: 'S3', source: 'generated', actualDifficulty: 'Expert', savedAt: 50 });
  
  var newest = Library.filter({ sort: 'newest' });
  h.assertEqual(newest[0].puzzleString, 'S2', 'newest first');
  
  var oldest = Library.filter({ sort: 'oldest' });
  h.assertEqual(oldest[0].puzzleString, 'S3', 'oldest first');
  
  var hardest = Library.filter({ sort: 'hardest' });
  h.assertEqual(hardest[0].actualDifficulty, 'Expert', 'hardest first');
});

h.describe('Library — filter favorites', function () {
  Library.clear();
  Library.save({ puzzleString: 'F1', source: 'generated', actualDifficulty: 'Easy' });
  Library.save({ puzzleString: 'F2', source: 'generated', actualDifficulty: 'Easy' });
  var entries = Library.getAll();
  Library.toggleFavorite(entries[0].id);
  var favs = Library.filter({ favorite: true });
  h.assertEqual(favs.length, 1, 'only 1 favorite');
});
