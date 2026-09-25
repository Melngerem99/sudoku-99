/**
 * helpers.js — Test utilities, mocks, and assertion helpers.
 */

const path = require('path');

// ─── Mock environment ───────────────────────────────────────────────────────

function setupGlobals() {
  global.window = global;
  global.performance = { now: () => Date.now() };
  global.document = { addEventListener: () => {}, getElementById: () => null, querySelectorAll: () => [], createElement: () => ({}), readyState: 'complete' };
  global.navigator = { clipboard: null, serviceWorker: null };
  global.localStorage = createMockStorage();
  global.addEventListener = () => {};  // window.addEventListener
  global.setTimeout = global.setTimeout || ((fn) => fn());
  global.clearTimeout = global.clearTimeout || (() => {});
  global.setInterval = global.setInterval || (() => 0);
  global.clearInterval = global.clearInterval || (() => {});
  global.matchMedia = () => ({ matches: false });
}

function createMockStorage() {
  let store = {};
  return {
    getItem(k) { return store[k] || null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    clear() { store = {}; },
    _data() { return store; }
  };
}

function resetStorage() {
  global.localStorage.clear();
}

// ─── Module loader ──────────────────────────────────────────────────────────

const TEST_BUNDLE = path.join(__dirname, '..', 'dist', 'test-bundle.cjs');

function loadAllModules() {
  setupGlobals();
  global.__SUDOKU_SKIP_BOOTSTRAP__ = true;
  delete require.cache[require.resolve(TEST_BUNDLE)];
  require(TEST_BUNDLE);
}

// ─── Assertions ─────────────────────────────────────────────────────────────

let _passed = 0;
let _failed = 0;
let _errors = [];

function assert(condition, message) {
  if (condition) {
    _passed++;
  } else {
    _failed++;
    _errors.push('  FAIL: ' + message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    _passed++;
  } else {
    _failed++;
    _errors.push('  FAIL: ' + message + ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
  }
}

function assertNotNull(value, message) {
  assert(value !== null && value !== undefined, message);
}

function assertNull(value, message) {
  assert(value === null || value === undefined, message + ' (got ' + JSON.stringify(value) + ')');
}

function assertArrayEqual(actual, expected, message) {
  const eq = actual.length === expected.length && actual.every((v, i) => v === expected[i]);
  if (eq) { _passed++; } else { _failed++; _errors.push('  FAIL: ' + message + ' (arrays differ)'); }
}

// ─── Test suite runner ──────────────────────────────────────────────────────

function describe(name, fn) {
  const prevPassed = _passed;
  const prevFailed = _failed;
  const prevErrors = _errors.length;
  
  try {
    fn();
  } catch (e) {
    _failed++;
    _errors.push('  ERROR in "' + name + '": ' + e.message);
  }
  
  const suitePassed = _passed - prevPassed;
  const suiteFailed = _failed - prevFailed;
  const status = suiteFailed === 0 ? '✓' : '✗';
  console.log(status + ' ' + name + ' (' + suitePassed + ' passed' + (suiteFailed ? ', ' + suiteFailed + ' failed' : '') + ')');
  
  // Print errors for this suite
  for (let i = prevErrors; i < _errors.length; i++) {
    console.log(_errors[i]);
  }
}

function getResults() {
  return { passed: _passed, failed: _failed, errors: _errors };
}

function resetResults() {
  _passed = 0;
  _failed = 0;
  _errors = [];
}

// ─── Test fixtures ──────────────────────────────────────────────────────────

// A known valid puzzle with unique solution
const FIXTURE_PUZZLE = [
  5,3,0,0,7,0,0,0,0,
  6,0,0,1,9,5,0,0,0,
  0,9,8,0,0,0,0,6,0,
  8,0,0,0,6,0,0,0,3,
  4,0,0,8,0,3,0,0,1,
  7,0,0,0,2,0,0,0,6,
  0,6,0,0,0,0,2,8,0,
  0,0,0,4,1,9,0,0,5,
  0,0,0,0,8,0,0,7,9
];

const FIXTURE_SOLUTION = [
  5,3,4,6,7,8,9,1,2,
  6,7,2,1,9,5,3,4,8,
  1,9,8,3,4,2,5,6,7,
  8,5,9,7,6,1,4,2,3,
  4,2,6,8,5,3,7,9,1,
  7,1,3,9,2,4,8,5,6,
  9,6,1,5,3,7,2,8,4,
  2,8,7,4,1,9,6,3,5,
  3,4,5,2,8,6,1,7,9
];

// An empty board
const FIXTURE_EMPTY = new Array(81).fill(0);

// A board with conflicts (two 5s in row 0)
const FIXTURE_CONFLICT = FIXTURE_PUZZLE.slice();
// Cell 2 (row 0, col 2) set to 5 — conflicts with cell 0 which is also 5
const FIXTURE_CONFLICT_BOARD = (function() {
  var b = FIXTURE_PUZZLE.slice();
  b[2] = 5; // duplicate 5 in row 0
  return b;
})();

module.exports = {
  setupGlobals,
  createMockStorage,
  resetStorage,
  loadAllModules,
  assert,
  assertEqual,
  assertNotNull,
  assertNull,
  assertArrayEqual,
  describe,
  getResults,
  resetResults,
  FIXTURE_PUZZLE,
  FIXTURE_SOLUTION,
  FIXTURE_EMPTY,
  FIXTURE_CONFLICT_BOARD
};
