const h = require('./helpers');
const path = require('path');
const TEST_BUNDLE = path.join(__dirname, '..', 'dist', 'test-bundle.cjs');
const { assert, assertEqual } = h;

class MockElement {
  constructor(ownerDocument, tagName, id = '') {
    this.ownerDocument = ownerDocument;
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.parentElement = null;
    this.parentNode = null;
    this.hidden = false;
    this.inert = false;
    this.disabled = false;
    this.value = '';
    this.checked = false;
    this._attrs = {};
    this._listeners = {};
    this._classes = new Set();
    this.classList = {
      add: (...classes) => classes.forEach((value) => this._classes.add(value)),
      remove: (...classes) => classes.forEach((value) => this._classes.delete(value)),
      contains: (value) => this._classes.has(value),
      toggle: (value, force) => {
        if (force === undefined) force = !this._classes.has(value);
        if (force) this._classes.add(value);
        else this._classes.delete(value);
        return force;
      }
    };
    this.isConnected = true;
  }

  get className() { return [...this._classes].join(' '); }
  set className(value) { this._classes = new Set(String(value).split(/\s+/).filter(Boolean)); }
  get textContent() { return this._textContent || ''; }
  set textContent(value) { this._textContent = String(value); }
  get innerHTML() { return this._innerHTML || ''; }
  set innerHTML(value) { this._innerHTML = String(value); this.children = []; }

  setAttribute(name, value) {
    this._attrs[name] = String(value);
    if (name === 'class') this.className = value;
    if (name === 'hidden') this.hidden = true;
    if (name === 'inert') this.inert = true;
  }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null; }
  removeAttribute(name) {
    delete this._attrs[name];
    if (name === 'hidden') this.hidden = false;
    if (name === 'inert') this.inert = false;
  }
  addEventListener(type, handler) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(handler);
  }
  removeEventListener(type, handler) {
    this._listeners[type] = (this._listeners[type] || []).filter((item) => item !== handler);
  }
  appendChild(child) {
    child.parentElement = this;
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  replaceChild(next, previous) {
    const index = this.children.indexOf(previous);
    if (index >= 0) this.children[index] = next;
    next.parentElement = this;
    next.parentNode = this;
    previous.isConnected = false;
  }
  click() {
    this.focus();
    this.dispatchEvent({ type: 'click', target: this, preventDefault() { this.defaultPrevented = true; } });
  }
  focus() {
    if (this.disabled || this.hidden) return;
    for (let parent = this.parentElement; parent; parent = parent.parentElement) {
      if (parent.inert || parent.hidden) return;
    }
    this.ownerDocument.activeElement = this;
  }
  dispatchEvent(event) {
    event.target ||= this;
    for (let node = this; node; node = node.parentElement) {
      event.currentTarget = node;
      (node._listeners[event.type] || []).slice().forEach((handler) => handler(event));
    }
    this.ownerDocument.dispatchEvent(event);
    return !event.defaultPrevented;
  }
  querySelectorAll(selector) {
    const descendants = [];
    const visit = (node) => node.children.forEach((child) => { descendants.push(child); visit(child); });
    visit(this);
    if (selector.includes('[role="dialog"]')) return descendants.filter((node) => node.getAttribute('role') === 'dialog');
    if (selector.includes('button')) return descendants.filter((node) => node.tagName === 'BUTTON' && !node.disabled);
    if (selector.startsWith('.')) return descendants.filter((node) => node.classList.contains(selector.slice(1)));
    return [];
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest() { return null; }
}

class MockDocument {
  constructor() {
    this.elements = new Map();
    this.listeners = {};
    this.visibilityState = 'visible';
    this.body = new MockElement(this, 'body');
    this.documentElement = new MockElement(this, 'html');
    this.activeElement = this.body;
    this.register('app', 'main', this.body);
    this.register('toolbar', 'section', this.getElementById('app'));
    this.register('btn-pause', 'button', this.getElementById('toolbar'));
    const pause = this.register('pause-overlay', 'div', this.body);
    pause.setAttribute('inert', '');
    this.register('pause-title', 'h2', pause);
    this.register('pause-description', 'p', pause);
    this.register('btn-pause-resume', 'button', pause);
    this.register('sudoku-grid', 'section', this.getElementById('app'));
    this.register('numpad', 'section', this.getElementById('app'));
    this.register('daily-panel', 'aside', this.body);
    this.register('btn-daily-close', 'button', this.getElementById('daily-panel'));
    this.register('btn-daily-continue', 'button', this.getElementById('daily-panel'));
    this.register('btn-daily-play', 'button', this.getElementById('daily-panel'));
    this.register('library-panel', 'aside', this.body);
    this.register('btn-library-close', 'button', this.getElementById('library-panel'));
    this.register('modal-overlay', 'div', this.body);
    this.register('modal-footer', 'div', this.getElementById('modal-overlay'));
  }

  register(id, tagName, parent) {
    const element = new MockElement(this, tagName, id);
    this.elements.set(id, element);
    parent.appendChild(element);
    return element;
  }
  getElementById(id) {
    if (this.elements.has(id)) return this.elements.get(id);
    const tagName = /^(btn-|.*-close|.*-play|step-btn-)/.test(id) ? 'button' : 'div';
    let parent = this.getElementById('app');
    if (id.endsWith('-panel')) parent = this.body;
    else if (id === 'modal-title' || id === 'modal-body' || id === 'modal-footer') parent = this.getElementById('modal-overlay');
    else if (id.startsWith('pause-') || id === 'btn-pause-resume') parent = this.getElementById('pause-overlay');
    else if (id.startsWith('daily-') || id.startsWith('btn-daily-')) parent = this.getElementById('daily-panel');
    else if (id.startsWith('library-') || id.startsWith('btn-library-')) parent = this.getElementById('library-panel');
    else if (id.startsWith('btn-step-') || id.startsWith('step-')) parent = this.getElementById('step-solver-panel');
    else if (id.startsWith('btn-settings-')) parent = this.getElementById('settings-drawer');
    const element = new MockElement(this, tagName, id);
    this.elements.set(id, element);
    parent.appendChild(element);
    return element;
  }
  createElement(tagName) { return new MockElement(this, tagName); }
  createTextNode(value) {
    const node = new MockElement(this, '#text');
    node.textContent = value;
    return node;
  }
  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }
  dispatchEvent(event) {
    (this.listeners[event.type] || []).slice().forEach((handler) => handler(event));
    return !event.defaultPrevented;
  }
  querySelectorAll(selector) {
    return this.body.querySelectorAll(selector);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

function createIntervalClock() {
  let nextId = 0;
  const intervals = new Map();
  global.setInterval = (callback, delay) => {
    const id = ++nextId;
    intervals.set(id, { callback, delay });
    return id;
  };
  global.clearInterval = (id) => intervals.delete(id);
  global.setTimeout = () => ++nextId;
  global.clearTimeout = () => {};
  global.requestAnimationFrame = (callback) => { callback(); return 1; };
  return {
    intervals,
    tick(delay) { [...intervals.values()].filter((item) => item.delay === delay).forEach((item) => item.callback()); }
  };
}

function seedGame(Persistence, difficulty = 'medium', paused = false) {
  Persistence.saveImmediate({
    board: h.FIXTURE_PUZZLE,
    solution: h.FIXTURE_SOLUTION,
    givens: h.FIXTURE_PUZZLE,
    candidates: h.FIXTURE_PUZZLE.map(() => new Set()),
    pencilMode: false,
    mistakes: 0,
    timerSeconds: 20,
    paused,
    gameOver: false,
    gameWon: false,
    emptyMode: false,
    currentDifficulty: difficulty,
    hintsUsedThisGame: 0,
    history: [],
    future: []
  });
}

function loadApp(storage = h.createMockStorage(), difficulty = 'medium') {
  h.setupGlobals();
  global.localStorage = storage;
  global.location = { hash: '' };
  global.document = new MockDocument();
  global.__SUDOKU_SKIP_BOOTSTRAP__ = true;
  const clock = createIntervalClock();
  delete require.cache[require.resolve(TEST_BUNDLE)];
  const app = require(TEST_BUNDLE);
  seedGame(global.Persistence, difficulty);
  app.initGameController();
  return { app, clock, document: global.document, storage };
}

function dispatchKey(target, key) {
  target.dispatchEvent({ type: 'keydown', key, target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } });
}

h.describe('GameController — pause/resume and active-time accounting', function () {
  const { clock, document } = loadApp();
  const pauseButton = document.getElementById('btn-pause');
  const overlay = document.getElementById('pause-overlay');
  const resumeButton = document.getElementById('btn-pause-resume');

  assertEqual(clock.intervals.size, 2, 'running game owns one tick and one checkpoint interval');
  pauseButton.click();
  assertEqual(clock.intervals.size, 0, 'pause stops tick and checkpoint intervals');
  assertEqual(global.Persistence.load().paused, true, 'pause immediately persists paused state');
  assertEqual(document.activeElement, resumeButton, 'pause moves focus into the dialog');
  assertEqual(document.getElementById('app').getAttribute('aria-hidden'), 'true', 'pause hides game app from assistive technology');

  resumeButton.click();
  assertEqual(clock.intervals.size, 2, 'resume starts exactly one tick and checkpoint interval');
  assertEqual(pauseButton.hidden, false, 'pause trigger is visible before focus returns');
  assertEqual(document.activeElement, pauseButton, 'resume returns focus to the toolbar trigger');
  assertEqual(overlay.inert, true, 'dismissed dialog is inert');
  assertEqual(document.getElementById('app').getAttribute('aria-hidden'), 'false', 'resume restores the app accessibility state');

  clock.tick(1000);
  pauseButton.click();
  assertEqual(global.Persistence.load().timerSeconds, 21, 'pause saves only elapsed active timer ticks');
  assertEqual(clock.intervals.size, 0, 'second pause still stops all timer intervals');
});

h.describe('GameController — inactive pause dialog and Escape ownership', function () {
  const { document } = loadApp();
  const overlay = document.getElementById('pause-overlay');
  const resumeButton = document.getElementById('btn-pause-resume');
  resumeButton.focus();
  assert(document.activeElement !== resumeButton, 'inert inactive dialog cannot take focus');

  document.getElementById('btn-pause').click();
  dispatchKey(resumeButton, 'Escape');
  assertEqual(overlay.classList.contains('active'), false, 'Escape resumes and closes the active pause dialog');
  assertEqual(document.activeElement, document.getElementById('btn-pause'), 'Escape restores focus to Pause');
  assertEqual(document.getElementById('modal-overlay').classList.contains('active'), false, 'Escape does not trigger an unrelated modal close');
});

h.describe('GameController — paused input remains blocked', function () {
  const { document } = loadApp();
  const cell = UI.cells[2];
  cell.click();
  document.getElementById('btn-pause').click();
  dispatchKey(cell, '4');
  document.getElementById('btn-eraser').click();
  document.getElementById('btn-auto-candidates').click();
  assertEqual(cell.querySelector('.cell-digit').textContent, '', 'digit and erase actions cannot mutate the paused board');
  assertEqual(global.Persistence.load().paused, true, 'blocked actions do not clear the pause state');
});

h.describe('GameController — visibility pause preserves an open panel', function () {
  const { clock, document } = loadApp();
  const app = document.getElementById('app');
  const library = document.getElementById('library-panel');
  const libraryClose = document.getElementById('btn-library-close');
  LibraryController.open();
  assertEqual(document.activeElement, libraryClose, 'open panel owns focus before backgrounding');

  document.visibilityState = 'hidden';
  document.dispatchEvent({ type: 'visibilitychange' });
  assertEqual(clock.intervals.size, 0, 'background stops both timer intervals');
  assertEqual(global.Persistence.load().paused, true, 'background transition persists pause immediately');

  document.visibilityState = 'visible';
  document.dispatchEvent({ type: 'visibilitychange' });
  const resumeButton = document.getElementById('btn-pause-resume');
  assertEqual(document.activeElement, resumeButton, 'returning to foreground requires deliberate resume');
  resumeButton.click();
  assertEqual(library.classList.contains('open'), true, 'background resume preserves the open panel');
  assertEqual(app.getAttribute('aria-hidden'), 'true', 'resume preserves the panel’s app-hidden state');
  assertEqual(document.activeElement, libraryClose, 'resume restores focus to the covered panel');
  assertEqual(clock.intervals.size, 2, 'foreground resume restarts one interval of each kind');
});

h.describe('GameController — background during Step Solver remains paused after close', function () {
  const { clock, document } = loadApp();
  StepSolverController.open();
  assertEqual(clock.intervals.size, 0, 'Step Solver suspends active-time intervals');
  assertEqual(document.getElementById('pause-overlay').classList.contains('active'), false, 'Step Solver uses its own pause cause without the pause dialog');

  document.visibilityState = 'hidden';
  document.dispatchEvent({ type: 'visibilitychange' });
  StepSolverController.close();
  assertEqual(clock.intervals.size, 0, 'closing Step Solver does not release the background pause');

  document.visibilityState = 'visible';
  document.dispatchEvent({ type: 'visibilitychange' });
  assertEqual(document.activeElement, document.getElementById('btn-pause-resume'), 'return focus moves into the pause dialog');
  document.getElementById('btn-pause-resume').click();
  assertEqual(document.activeElement, document.getElementById('btn-step-solve'), 'resume returns focus to the remaining game toolbar');
  assertEqual(document.getElementById('app').getAttribute('aria-hidden'), 'false', 'closed Step Solver does not leave the app hidden');
  assertEqual(clock.intervals.size, 2, 'explicit resume restarts exactly one active timer pair');
});

h.describe('GameController — modal focus and Escape are preserved', function () {
  const { document } = loadApp();
  UI.showModal({ title: 'Keep open', buttons: [{ label: 'Stay', primary: true }] });
  const modalOverlay = document.getElementById('modal-overlay');
  modalOverlay.setAttribute('role', 'dialog');
  const modalButton = document.getElementById('modal-footer').children[0];

  document.visibilityState = 'hidden';
  document.dispatchEvent({ type: 'visibilitychange' });
  document.visibilityState = 'visible';
  document.dispatchEvent({ type: 'visibilitychange' });
  assertEqual(modalOverlay.getAttribute('aria-hidden'), 'true', 'covered modal is hidden from assistive technology');
  assertEqual(modalOverlay.inert, true, 'covered modal is inert while Pause is active');
  dispatchKey(document.getElementById('btn-pause-resume'), 'Escape');
  assertEqual(modalOverlay.classList.contains('active'), true, 'pause Escape does not close the covered modal');
  assertEqual(modalOverlay.getAttribute('aria-hidden'), 'false', 'covered modal ARIA state is restored on resume');
  assertEqual(modalOverlay.inert, false, 'covered modal interactivity is restored on resume');
  assertEqual(document.activeElement, modalButton, 'resume returns focus to the covered modal action');
});

h.describe('GameController — imported game pause restores', function () {
  const storage = h.createMockStorage();
  const { clock, document } = loadApp(storage, 'imported');
  assertEqual(global.Persistence.load().currentDifficulty, 'imported', 'imported game restores from standard save');
  document.getElementById('btn-pause').click();
  const saved = global.Persistence.load();
  assertEqual(saved.currentDifficulty, 'imported', 'pause keeps imported game discriminator');
  assertEqual(saved.paused, true, 'imported pause state is persisted');
  assertEqual(clock.intervals.size, 0, 'imported pause stops the timer');
});

h.describe('GameController — daily pause survives UTC rollover and reload', function () {
  const realDate = global.Date;
  let now = realDate.parse('2026-10-01T23:58:00Z');
  global.Date = class extends realDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
  try {
    const storage = h.createMockStorage();
    const first = loadApp(storage);
    first.document.getElementById('btn-daily-play').click();
    first.clock.tick(1000);
    first.document.getElementById('btn-pause').click();
    const previousKey = 'sudoku-daily-prog-2026-10-01';
    assertEqual(JSON.parse(storage.getItem(previousKey)).paused, true, 'daily pause persists under its captured UTC date');
    assertEqual(JSON.parse(storage.getItem(previousKey)).timerSeconds, 1, 'daily progress records elapsed active time');

    now = realDate.parse('2026-10-02T00:02:00Z');
    const restored = loadApp(storage);
    assertEqual(global.Persistence.load().currentDifficulty, 'medium', 'standard save remains intact alongside daily state');
    assertEqual(JSON.parse(storage.getItem(previousKey)).paused, true, 'reload does not rewrite the previous day as today');
    assertEqual(JSON.parse(storage.getItem(previousKey)).timerSeconds, 1, 'daily timer survives rollover restore');
    assertEqual(restored.document.getElementById('pause-overlay').classList.contains('active'), true, 'previous daily restores paused after UTC rollover');

    restored.document.getElementById('btn-pause-resume').click();
    restored.document.getElementById('btn-daily').click();
    const continueButton = restored.document.getElementById('btn-daily-continue');
    assertEqual(continueButton.hidden, false, 'daily panel offers the unfinished previous challenge');
    assertEqual(continueButton.dataset.dateKey, '2026-10-01', 'continue action retains the original challenge date');
    restored.document.getElementById('btn-daily-play').click();
    assert(storage.getItem('sudoku-daily-prog-2026-10-01'), 'starting today does not delete the previous challenge save');
    assert(storage.getItem('sudoku-daily-prog-2026-10-02'), 'today’s challenge receives its own progress key');

    restored.document.getElementById('btn-daily').click();
    restored.document.getElementById('btn-daily-continue').click();
    assertEqual(storage.getItem('sudoku-daily-active-date'), '2026-10-01', 'continue restores the previous daily session as active');
    assertEqual(restored.document.getElementById('pause-overlay').classList.contains('active'), false, 'continued running daily does not reopen pause dialog');
    assert(storage.getItem('sudoku-daily-prog-2026-10-02'), 'continuing a previous daily preserves today’s save');
  } finally {
    global.Date = realDate;
  }
});