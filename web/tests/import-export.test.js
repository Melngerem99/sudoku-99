const h = require('./helpers');

h.loadAllModules();

const VALID_STRING = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

h.describe('ImportExport.parse — valid input', function () {
  var result = ImportExport.parse(VALID_STRING);
  h.assert(!result.error, 'no error on valid input');
  h.assertEqual(result.board.length, 81, 'returns 81-cell board');
  h.assertEqual(result.board[0], 5, 'first cell is 5');
  h.assertEqual(result.board[2], 0, 'third cell is 0 (empty)');
});

h.describe('ImportExport.parse — dots for empty', function () {
  var dotString = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
  var result = ImportExport.parse(dotString);
  h.assert(!result.error, 'dots accepted');
  h.assertEqual(result.board[2], 0, 'dot converted to 0');
  h.assertEqual(result.board[0], 5, 'digits preserved');
});

h.describe('ImportExport.parse — whitespace handling', function () {
  var spaced = '530 070 000\n600 195 000\n098 000 060\n800 060 003\n400 803 001\n700 020 006\n060 000 280\n000 419 005\n000 080 079';
  var result = ImportExport.parse(spaced);
  h.assert(!result.error, 'whitespace stripped successfully');
  h.assertEqual(result.board.length, 81, 'correct length after stripping');
});

h.describe('ImportExport.parse — invalid input', function () {
  h.assert(ImportExport.parse('').error, 'empty string rejected');
  h.assert(ImportExport.parse(null).error, 'null rejected');
  h.assert(ImportExport.parse('123').error, 'too short rejected');
  h.assert(ImportExport.parse('x'.repeat(81)).error, 'invalid chars rejected');
  h.assert(ImportExport.parse('1'.repeat(82)).error, 'too long rejected');
});

h.describe('ImportExport.validate', function () {
  var parsed = ImportExport.parse(VALID_STRING);
  var result = ImportExport.validate(parsed.board);
  h.assert(result.valid, 'valid board passes');
  h.assert(result.solvable, 'solvable');
  h.assert(result.unique, 'unique solution');
  h.assertEqual(result.solutions, 1, '1 solution');
  h.assertNull(result.error, 'no error');
  
  // Conflict board
  var conflict = ImportExport.validate(h.FIXTURE_CONFLICT_BOARD);
  h.assert(!conflict.valid, 'conflicting board fails validation');
});

h.describe('ImportExport.export round-trip', function () {
  var exported = ImportExport.exportGivens(h.FIXTURE_PUZZLE);
  h.assertEqual(exported.length, 81, 'export is 81 chars');
  var reimported = ImportExport.parse(exported);
  h.assert(!reimported.error, 'reimport succeeds');
  h.assertArrayEqual(reimported.board, h.FIXTURE_PUZZLE, 'round-trip preserves data');
});

h.describe('ImportExport.generateURL', function () {
  // Mock location
  global.window.location = { origin: 'https://example.com', pathname: '/', hash: '', search: '' };
  var url = ImportExport.generateURL(h.FIXTURE_PUZZLE);
  h.assert(url.indexOf('#puzzle=') !== -1, 'URL contains #puzzle= hash');
  h.assert(url.indexOf('530070000') !== -1, 'URL contains puzzle digits');
});
