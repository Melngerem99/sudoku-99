#!/usr/bin/env node
/**
 * Test Runner — executes all test suites and reports results.
 * Usage: node web/tests/run.js
 */

const path = require('path');
const fs = require('fs');

console.log('═══════════════════════════════════════════════════');
console.log('  Sudoku-99 Test Suite');
console.log('═══════════════════════════════════════════════════\n');

const startTime = Date.now();

// Test files in execution order
const testFiles = [
  'solver.test.js',
  'techniques.test.js',
  'step-solver.test.js',
  'difficulty.test.js',
  'generator.test.js',
  'import-export.test.js',
  'library.test.js',
  'persistence.test.js',
  'controllers.test.js'
];

let totalPassed = 0;
let totalFailed = 0;

for (const file of testFiles) {
  const filepath = path.join(__dirname, file);
  if (!fs.existsSync(filepath)) {
    console.log('⚠ Skipped: ' + file + ' (not found)');
    continue;
  }
  
  console.log('─── ' + file + ' ───');
  
  // Reset helpers state for each file
  const h = require('./helpers');
  h.resetResults();
  
  // Clear module cache to get fresh state
  delete require.cache[require.resolve('./helpers')];
  
  try {
    // Run test file in isolated context
    require('./' + file);
    const results = require('./helpers').getResults();
    totalPassed += results.passed;
    totalFailed += results.failed;
  } catch (e) {
    console.log('  ERROR: ' + e.message);
    console.log('  ' + e.stack.split('\n')[1]);
    totalFailed++;
  }
  
  // Clear cache for next file
  delete require.cache[require.resolve('./' + file)];
  delete require.cache[require.resolve('./helpers')];
  
  console.log('');
}

const elapsed = Date.now() - startTime;

console.log('═══════════════════════════════════════════════════');
console.log('  Results: ' + totalPassed + ' passed, ' + totalFailed + ' failed');
console.log('  Time:    ' + elapsed + 'ms');
console.log('═══════════════════════════════════════════════════');

process.exit(totalFailed > 0 ? 1 : 0);
