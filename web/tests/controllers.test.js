/**
 * controllers.test.js
 * ────────────────────
 * Integration tests for extracted controllers.
 * Uses a lightweight DOM mock that supports the operations controllers need.
 */

const { setupGlobals, resetStorage, assert, assertEqual, describe, resetResults } = require('./helpers');
const path = require('path');
const TEST_BUNDLE = path.join(__dirname, '..', 'dist', 'test-bundle.cjs');

// ─── Enhanced DOM mock for controllers ──────────────────────────────────────

function createMockElement(tag, id) {
  const el = {
    tagName: tag.toUpperCase(),
    id: id || '',
    className: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    checked: false,
    value: '',
    style: { display: '' },
    dataset: {},
    children: [],
    _listeners: {},
    _classes: new Set(),
    classList: {
      add(cls) { el._classes.add(cls); },
      remove(cls) { el._classes.delete(cls); },
      toggle(cls, force) {
        if (force === undefined) { el._classes.has(cls) ? el._classes.delete(cls) : el._classes.add(cls); }
        else if (force) { el._classes.add(cls); }
        else { el._classes.delete(cls); }
      },
      contains(cls) { return el._classes.has(cls); },
    },
    setAttribute(name, val) { el['_attr_' + name] = val; },
    getAttribute(name) { return el['_attr_' + name] || null; },
    addEventListener(event, fn) {
      if (!el._listeners[event]) el._listeners[event] = [];
      el._listeners[event].push(fn);
    },
    removeEventListener() {},
    click() { (el._listeners.click || []).forEach(fn => fn({ target: el })); },
    focus() { el._focused = true; },
    closest(sel) { return null; },
    querySelector(sel) { return null; },
    querySelectorAll(sel) { return []; },
    appendChild(child) { el.children.push(child); },
    cloneNode() { return createMockElement(tag, id); },
    parentNode: { replaceChild() {} },
  };
  return el;
}

function setupControllerDOM() {
  const elements = {};

  function reg(tag, id) {
    const el = createMockElement(tag, id);
    elements[id] = el;
    return el;
  }

  // Statistics panel
  reg('div', 'stats-panel');
  reg('div', 'stats-scrim');
  reg('button', 'btn-stats');
  reg('button', 'btn-stats-close');
  reg('button', 'btn-stats-reset');
  reg('span', 'stats-easy-won');
  reg('span', 'stats-easy-lost');
  reg('span', 'stats-easy-best');
  reg('span', 'stats-easy-avg');
  reg('span', 'stats-medium-won');
  reg('span', 'stats-medium-lost');
  reg('span', 'stats-medium-best');
  reg('span', 'stats-medium-avg');
  reg('span', 'stats-hard-won');
  reg('span', 'stats-hard-lost');
  reg('span', 'stats-hard-best');
  reg('span', 'stats-hard-avg');
  reg('span', 'stats-expert-won');
  reg('span', 'stats-expert-lost');
  reg('span', 'stats-expert-best');
  reg('span', 'stats-expert-avg');
  reg('span', 'stats-total-games');
  reg('span', 'stats-win-pct');
  reg('span', 'stats-current-streak');
  reg('span', 'stats-longest-streak');
  reg('span', 'stats-total-time');
  reg('span', 'stats-hints-used');

  // Analysis panel
  reg('div', 'analysis-panel');
  reg('div', 'analysis-scrim');
  reg('button', 'btn-analyze');
  reg('button', 'btn-analysis-close');
  reg('span', 'analysis-generated');
  reg('span', 'analysis-actual');
  reg('div', 'analysis-mismatch');
  reg('span', 'analysis-score');
  reg('span', 'analysis-steps');
  reg('span', 'analysis-placements');
  reg('span', 'analysis-eliminations');
  reg('span', 'analysis-hardest');
  reg('span', 'analysis-first');
  reg('span', 'analysis-last');
  reg('span', 'analysis-complete');
  reg('span', 'analysis-guessing');
  reg('div', 'analysis-techniques');

  // Import panel
  reg('div', 'import-overlay');
  reg('input', 'import-input');
  reg('div', 'import-status');
  reg('button', 'import-btn-load');
  reg('button', 'btn-import');
  reg('button', 'import-btn-cancel');
  reg('button', 'import-btn-validate');
  reg('button', 'btn-export');
  reg('button', 'btn-share-url');

  // Library panel
  reg('div', 'library-panel');
  reg('div', 'library-scrim');
  reg('button', 'btn-library');
  reg('button', 'btn-library-close');
  reg('button', 'btn-save-puzzle');
  reg('span', 'library-count');
  reg('div', 'library-list');
  reg('select', 'library-filter-diff');
  reg('select', 'library-filter-source');
  reg('select', 'library-sort');
  reg('input', 'library-filter-fav');
  reg('input', 'library-filter-unsolved');

  // Daily panel
  reg('div', 'daily-panel');
  reg('div', 'daily-scrim');
  reg('button', 'btn-daily');
  reg('button', 'btn-daily-close');
  reg('button', 'btn-daily-play');
  reg('span', 'daily-day-number');
  reg('span', 'daily-difficulty');
  reg('span', 'daily-today-status');
  reg('span', 'daily-current-streak');
  reg('span', 'daily-longest-streak');
  reg('div', 'daily-calendar');
  reg('div', 'daily-status-badge');

  // Step solver panel
  reg('div', 'step-solver-panel');
  reg('div', 'step-solver-scrim');
  reg('button', 'btn-step-solve');
  reg('button', 'btn-step-close');
  reg('button', 'step-btn-first');
  reg('button', 'step-btn-prev');
  reg('button', 'step-btn-next');
  reg('button', 'step-btn-last');
  reg('button', 'step-btn-play');
  reg('span', 'step-current');
  reg('span', 'step-total');
  reg('span', 'step-technique-name');
  reg('div', 'step-explanation');
  reg('div', 'step-summary');
  reg('div', 'step-summary-content');

  // Override global document
  global.document = {
    getElementById(id) { return elements[id] || null; },
    querySelectorAll(sel) { return []; },
    addEventListener() {},
    createElement(tag) { return createMockElement(tag); },
    activeElement: null,
    readyState: 'complete',
  };

  return elements;
}

// ─── Load modules with controller DOM ────────────────────────────────────────

function loadControllerModules() {
  setupGlobals();
  setupControllerDOM();
  global.__SUDOKU_SKIP_BOOTSTRAP__ = true;
  delete require.cache[require.resolve(TEST_BUNDLE)];
  require(TEST_BUNDLE);

  // Mock UI (minimal for controller tests — overrides bundle's real UI)
  global.UI = {
    showModal() {},
    hideModal() {},
    hideHint() {},
    showHint() {},
    clearHintHighlights() {},
    renderBoard() {},
    setDigitCounts() {},
    setMistakes() {},
    setTimer() {},
    setActiveDigitButton() {},
    flashCell() {},
    on() {},
    init() {},
    cells: Array.from({ length: 81 }, () => createMockElement('div')),
    _closeSettingsDrawer() {},
  };
}

// ─── TESTS ──────────────────────────────────────────────────────────────────

// ─── StatisticsController ───────────────────────────────────────────────────

describe('StatisticsController — init and open', function () {
  loadControllerModules();
  resetStorage();

  StatisticsController.init();

  // Panel should be closed initially
  var panel = document.getElementById('stats-panel');
  assert(!panel._classes.has('open'), 'panel starts closed');

  // Open
  StatisticsController.open();
  assert(panel._classes.has('open'), 'panel opens on open()');
  assertEqual(panel.getAttribute('aria-hidden'), 'false', 'aria-hidden false when open');
});

describe('StatisticsController — close', function () {
  loadControllerModules();
  resetStorage();
  StatisticsController.init();
  StatisticsController.open();

  StatisticsController.close();
  var panel = document.getElementById('stats-panel');
  assert(!panel._classes.has('open'), 'panel closes');
  assertEqual(panel.getAttribute('aria-hidden'), 'true', 'aria-hidden true when closed');
});

describe('StatisticsController — refresh populates data', function () {
  loadControllerModules();
  resetStorage();
  Statistics.recordGameStart('easy');
  Statistics.recordWin('easy', 120, 0);
  StatisticsController.init();
  StatisticsController.refresh();

  var wonEl = document.getElementById('stats-easy-won');
  assertEqual(wonEl.textContent, '1', 'won count populated');
  var totalEl = document.getElementById('stats-total-games');
  assertEqual(totalEl.textContent, '1', 'total games populated');
});

// ─── AnalysisController ─────────────────────────────────────────────────────

describe('AnalysisController — open and close', function () {
  loadControllerModules();
  resetStorage();

  var givens = global.FIXTURE_PUZZLE || [5,3,0,0,7,0,0,0,0,6,0,0,1,9,5,0,0,0,0,9,8,0,0,0,0,6,0,8,0,0,0,6,0,0,0,3,4,0,0,8,0,3,0,0,1,7,0,0,0,2,0,0,0,6,0,6,0,0,0,0,2,8,0,0,0,0,4,1,9,0,0,5,0,0,0,0,8,0,0,7,9];

  AnalysisController.init({
    getGivens: function () { return givens; },
    getCurrentDifficulty: function () { return 'medium'; },
    getPuzzleSource: function () { return 'generated'; }
  });

  var panel = document.getElementById('analysis-panel');
  assert(!panel._classes.has('open'), 'panel starts closed');

  AnalysisController.open();
  assert(panel._classes.has('open'), 'panel opens');

  // Check some populated field
  var scoreEl = document.getElementById('analysis-score');
  assert(scoreEl.textContent !== '', 'score populated');

  AnalysisController.close();
  assert(!panel._classes.has('open'), 'panel closes');
});

describe('AnalysisController — cache invalidation', function () {
  loadControllerModules();
  resetStorage();

  var givens = [5,3,0,0,7,0,0,0,0,6,0,0,1,9,5,0,0,0,0,9,8,0,0,0,0,6,0,8,0,0,0,6,0,0,0,3,4,0,0,8,0,3,0,0,1,7,0,0,0,2,0,0,0,6,0,6,0,0,0,0,2,8,0,0,0,0,4,1,9,0,0,5,0,0,0,0,8,0,0,7,9];

  AnalysisController.init({
    getGivens: function () { return givens; },
    getCurrentDifficulty: function () { return 'medium'; },
    getPuzzleSource: function () { return 'generated'; }
  });

  AnalysisController.open();
  var scoreEl = document.getElementById('analysis-score');
  var firstScore = scoreEl.textContent;
  assert(firstScore !== '', 'first open computes score');

  AnalysisController.close();
  AnalysisController.open(); // should use cache — same score
  assertEqual(scoreEl.textContent, firstScore, 'second open uses cache (same score)');

  AnalysisController.close();
  AnalysisController.invalidate();
  AnalysisController.open(); // should recompute — still same givens so same score
  assertEqual(scoreEl.textContent, firstScore, 'invalidate forces recompute (same givens = same result)');
});

// ─── ImportController ───────────────────────────────────────────────────────

describe('ImportController — validate valid puzzle', function () {
  loadControllerModules();
  resetStorage();

  var imported = null;
  ImportController.init({
    importPuzzle: function (b) { imported = b; },
    getGivens: function () { return new Array(81).fill(0); }
  });

  var input = document.getElementById('import-input');
  var status = document.getElementById('import-status');
  var btnLoad = document.getElementById('import-btn-load');

  // Set a valid puzzle string
  input.value = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

  // Trigger validate
  var validateBtn = document.getElementById('import-btn-validate');
  validateBtn.click();

  assert(status.textContent.indexOf('Valid') !== -1 || status.textContent.indexOf('✓') !== -1, 'valid status shown');
  assertEqual(btnLoad.disabled, false, 'load button enabled');
});

describe('ImportController — validate invalid puzzle', function () {
  loadControllerModules();
  resetStorage();

  ImportController.init({
    importPuzzle: function () {},
    getGivens: function () { return new Array(81).fill(0); }
  });

  var input = document.getElementById('import-input');
  var status = document.getElementById('import-status');
  var btnLoad = document.getElementById('import-btn-load');

  input.value = '123'; // too short
  var validateBtn = document.getElementById('import-btn-validate');
  validateBtn.click();

  assert(status.textContent.indexOf('81') !== -1 || status.className.indexOf('error') !== -1, 'error shown for invalid');
  assertEqual(btnLoad.disabled, true, 'load button stays disabled');
});

describe('ImportController — load puzzle callback', function () {
  loadControllerModules();
  resetStorage();

  var imported = null;
  ImportController.init({
    importPuzzle: function (b) { imported = b; },
    getGivens: function () { return new Array(81).fill(0); }
  });

  var input = document.getElementById('import-input');
  input.value = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

  // Validate then load
  document.getElementById('import-btn-validate').click();
  document.getElementById('import-btn-load').click();

  assert(imported !== null, 'importPuzzle callback called');
  assertEqual(imported.length, 81, 'board has 81 cells');
  assertEqual(imported[0], 5, 'first cell is 5');
});

describe('ImportController — open and close', function () {
  loadControllerModules();
  resetStorage();

  ImportController.init({
    importPuzzle: function () {},
    getGivens: function () { return new Array(81).fill(0); }
  });

  var overlay = document.getElementById('import-overlay');
  ImportController.open();
  assert(overlay._classes.has('active'), 'overlay active on open');

  ImportController.close();
  assert(!overlay._classes.has('active'), 'overlay inactive on close');
});

// ─── LibraryController ──────────────────────────────────────────────────────

describe('LibraryController — open and close', function () {
  loadControllerModules();
  resetStorage();

  LibraryController.init({
    getGivens: function () { return new Array(81).fill(0); },
    getPuzzleSource: function () { return 'generated'; },
    getCurrentDifficulty: function () { return 'medium'; },
    isGameCompleted: function () { return false; },
    loadPuzzle: function () {}
  });

  var panel = document.getElementById('library-panel');
  LibraryController.open();
  assert(panel._classes.has('open'), 'panel opens');

  LibraryController.close();
  assert(!panel._classes.has('open'), 'panel closes');
});

describe('LibraryController — save and list puzzle', function () {
  loadControllerModules();
  resetStorage();

  var givens = [5,3,0,0,7,0,0,0,0,6,0,0,1,9,5,0,0,0,0,9,8,0,0,0,0,6,0,8,0,0,0,6,0,0,0,3,4,0,0,8,0,3,0,0,1,7,0,0,0,2,0,0,0,6,0,6,0,0,0,0,2,8,0,0,0,0,4,1,9,0,0,5,0,0,0,0,8,0,0,7,9];

  LibraryController.init({
    getGivens: function () { return givens; },
    getPuzzleSource: function () { return 'generated'; },
    getCurrentDifficulty: function () { return 'medium'; },
    isGameCompleted: function () { return true; },
    loadPuzzle: function () {}
  });

  // Save
  document.getElementById('btn-save-puzzle').click();
  assertEqual(Library.count(), 1, 'library has 1 entry after save');

  // Refresh and check count
  LibraryController.open();
  var countEl = document.getElementById('library-count');
  assert(countEl.textContent.indexOf('1') !== -1, 'count shows 1 puzzle');
});

describe('LibraryController — favorites toggle', function () {
  loadControllerModules();
  resetStorage();

  var givens = [5,3,0,0,7,0,0,0,0,6,0,0,1,9,5,0,0,0,0,9,8,0,0,0,0,6,0,8,0,0,0,6,0,0,0,3,4,0,0,8,0,3,0,0,1,7,0,0,0,2,0,0,0,6,0,6,0,0,0,0,2,8,0,0,0,0,4,1,9,0,0,5,0,0,0,0,8,0,0,7,9];

  LibraryController.init({
    getGivens: function () { return givens; },
    getPuzzleSource: function () { return 'generated'; },
    getCurrentDifficulty: function () { return 'medium'; },
    isGameCompleted: function () { return false; },
    loadPuzzle: function () {}
  });

  // Save a puzzle
  document.getElementById('btn-save-puzzle').click();

  // Get the entry
  var entries = Library.filter({});
  var entry = entries[0];
  assert(!entry.favorite, 'not favorited initially');

  // Toggle favorite via Library API
  Library.toggleFavorite(entry.id);
  var updated = Library.get(entry.id);
  assert(updated.favorite, 'favorited after toggle');
});

// ─── DailyController ────────────────────────────────────────────────────────

describe('DailyController — init and updateBadge', function () {
  loadControllerModules();
  resetStorage();

  var startCalled = false;
  DailyController.init({ startDaily: function () { startCalled = true; } });

  var badge = document.getElementById('daily-status-badge');
  // Badge should reflect "not_started" since we haven't played
  assert(badge.textContent === '' || badge.className.indexOf('not_started') !== -1, 'badge shows not started');

  DailyController.updateBadge();
  assert(badge.className.indexOf('not_started') !== -1, 'badge class contains status');
});

describe('DailyController — open and close', function () {
  loadControllerModules();
  resetStorage();

  DailyController.init({ startDaily: function () {} });

  var panel = document.getElementById('daily-panel');
  DailyController.open();
  assert(panel._classes.has('open'), 'panel opens');

  DailyController.close();
  assert(!panel._classes.has('open'), 'panel closes');
});

describe('DailyController — startDaily callback', function () {
  loadControllerModules();
  resetStorage();

  var startCalled = false;
  DailyController.init({ startDaily: function () { startCalled = true; } });

  // Simulate clicking play button
  var playBtn = document.getElementById('btn-daily-play');
  playBtn.click();

  assert(startCalled, 'startDaily callback invoked');
});

// ─── StepSolverController ───────────────────────────────────────────────────

describe('StepSolverController — open with puzzle', function () {
  loadControllerModules();
  resetStorage();

  var board = [5,3,0,0,7,0,0,0,0,6,0,0,1,9,5,0,0,0,0,9,8,0,0,0,0,6,0,8,0,0,0,6,0,0,0,3,4,0,0,8,0,3,0,0,1,7,0,0,0,2,0,0,0,6,0,6,0,0,0,0,2,8,0,0,0,0,4,1,9,0,0,5,0,0,0,0,8,0,0,7,9];
  var candidates = Array.from({ length: 81 }, () => new Set());

  StepSolverController.init({
    getBoard: function () { return board; },
    getCandidates: function () { return candidates; },
    getGivens: function () { return board; },
    restoreState: function () {},
    render: function () {},
    computeConflicts: function () { return new Set(); }
  });

  assert(!StepSolverController.isActive(), 'not active initially');

  StepSolverController.open();
  assert(StepSolverController.isActive(), 'active after open');

  var panel = document.getElementById('step-solver-panel');
  assert(panel._classes.has('open'), 'panel opens');

  var totalEl = document.getElementById('step-total');
  assert(totalEl.textContent !== '' && totalEl.textContent !== '0', 'step total populated');
});

describe('StepSolverController — close restores state', function () {
  loadControllerModules();
  resetStorage();

  var board = [5,3,0,0,7,0,0,0,0,6,0,0,1,9,5,0,0,0,0,9,8,0,0,0,0,6,0,8,0,0,0,6,0,0,0,3,4,0,0,8,0,3,0,0,1,7,0,0,0,2,0,0,0,6,0,6,0,0,0,0,2,8,0,0,0,0,4,1,9,0,0,5,0,0,0,0,8,0,0,7,9];
  var candidates = Array.from({ length: 81 }, () => new Set());
  var restored = false;

  StepSolverController.init({
    getBoard: function () { return board; },
    getCandidates: function () { return candidates; },
    getGivens: function () { return board; },
    restoreState: function (b, c) { restored = true; },
    render: function () {},
    computeConflicts: function () { return new Set(); }
  });

  StepSolverController.open();
  StepSolverController.close();

  assert(restored, 'restoreState callback called on close');
  assert(!StepSolverController.isActive(), 'not active after close');
});

describe('StepSolverController — navigation (next/prev)', function () {
  loadControllerModules();
  resetStorage();

  var board = [5,3,0,0,7,0,0,0,0,6,0,0,1,9,5,0,0,0,0,9,8,0,0,0,0,6,0,8,0,0,0,6,0,0,0,3,4,0,0,8,0,3,0,0,1,7,0,0,0,2,0,0,0,6,0,6,0,0,0,0,2,8,0,0,0,0,4,1,9,0,0,5,0,0,0,0,8,0,0,7,9];
  var candidates = Array.from({ length: 81 }, () => new Set());

  StepSolverController.init({
    getBoard: function () { return board; },
    getCandidates: function () { return candidates; },
    getGivens: function () { return board; },
    restoreState: function () {},
    render: function () {},
    computeConflicts: function () { return new Set(); }
  });

  StepSolverController.open();

  var currentEl = document.getElementById('step-current');
  assertEqual(currentEl.textContent, '0', 'starts at step 0');

  // Click next
  document.getElementById('step-btn-next').click();
  assert(currentEl.textContent === '1' || currentEl.textContent === 1, 'advances to step 1');

  // Click prev
  document.getElementById('step-btn-prev').click();
  assertEqual(currentEl.textContent, '0', 'back to step 0');

  StepSolverController.close();
});

describe('StepSolverController — first/last navigation', function () {
  loadControllerModules();
  resetStorage();

  var board = [5,3,0,0,7,0,0,0,0,6,0,0,1,9,5,0,0,0,0,9,8,0,0,0,0,6,0,8,0,0,0,6,0,0,0,3,4,0,0,8,0,3,0,0,1,7,0,0,0,2,0,0,0,6,0,6,0,0,0,0,2,8,0,0,0,0,4,1,9,0,0,5,0,0,0,0,8,0,0,7,9];
  var candidates = Array.from({ length: 81 }, () => new Set());

  StepSolverController.init({
    getBoard: function () { return board; },
    getCandidates: function () { return candidates; },
    getGivens: function () { return board; },
    restoreState: function () {},
    render: function () {},
    computeConflicts: function () { return new Set(); }
  });

  StepSolverController.open();

  // Jump to last
  document.getElementById('step-btn-last').click();
  var currentEl = document.getElementById('step-current');
  var totalEl = document.getElementById('step-total');
  assertEqual(currentEl.textContent, totalEl.textContent, 'last step matches total');

  // Jump to first
  document.getElementById('step-btn-first').click();
  assertEqual(currentEl.textContent, '0', 'first jumps to step 0');

  StepSolverController.close();
});
