#!/usr/bin/env node
/**
 * build-sw.js — Generates web/sw.js from scripts/sw.template.js.
 *
 * Replaces the __CACHE_VERSION__ placeholder with:
 *   sudoku-v<package.json version>
 *
 * web/sw.js is gitignored (build artifact).
 * Edit scripts/sw.template.js to change service worker behaviour.
 *
 * Run automatically as part of `npm run build`.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const root         = path.resolve(__dirname, '..');
const pkgPath      = path.join(root, 'package.json');
const templatePath = path.join(root, 'scripts', 'sw.template.js');
const outPath      = path.join(root, 'web', 'sw.js');

const version  = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
const cacheKey = `sudoku-v${version}`;

const template = fs.readFileSync(templatePath, 'utf8');
const output   = template.replace('__CACHE_VERSION__', cacheKey);

fs.writeFileSync(outPath, output, 'utf8');
console.log(`[build-sw] Generated web/sw.js with CACHE_VERSION='${cacheKey}'.`);
