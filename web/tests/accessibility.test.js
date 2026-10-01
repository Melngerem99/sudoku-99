const fs = require('fs');
const path = require('path');
const h = require('./helpers');

const stylesheet = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

function readBlock(selector) {
  const selectorIndex = stylesheet.indexOf(selector);
  const openBrace = stylesheet.indexOf('{', selectorIndex);
  const closeBrace = stylesheet.indexOf('}', openBrace);
  return stylesheet.slice(openBrace + 1, closeBrace);
}

function readColor(block, property) {
  const match = block.match(new RegExp(`${property}:\\s*(#[0-9a-fA-F]{6})`));
  return match ? match[1] : null;
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const lightBlock = readBlock(':root');
const darkBlock = readBlock('html.dark');
const lightPencil = readColor(lightBlock, '--cell-pencil');
const darkPencil = readColor(darkBlock, '--cell-pencil');
const backgroundProperties = [
  '--cell-bg', '--hl-selected', '--hl-peer', '--hl-same-digit',
  '--hint-blue-bg', '--hint-yellow-bg', '--hint-purple-bg',
];
const lightBackgrounds = backgroundProperties.map((property) => [property, readColor(lightBlock, property)]);
const darkBackgrounds = backgroundProperties.map((property) => [property, readColor(darkBlock, property)]);

h.describe('Accessibility — pencil mark contrast', function () {
  h.assert(lightPencil && lightBackgrounds.every(([, color]) => color), 'light theme pencil and background colors are defined');
  h.assert(darkPencil && darkBackgrounds.every(([, color]) => color), 'dark theme pencil and background colors are defined');

  if (lightPencil && lightBackgrounds.every(([, color]) => color)) {
    lightBackgrounds.forEach(([property, background]) => {
      h.assert(contrastRatio(lightPencil, background) >= 4.5,
        `light theme pencil marks meet 4.5:1 over ${property}`);
    });
  }

  if (darkPencil && darkBackgrounds.every(([, color]) => color)) {
    darkBackgrounds.forEach(([property, background]) => {
      h.assert(contrastRatio(darkPencil, background) >= 4.5,
        `dark theme pencil marks meet 4.5:1 over ${property}`);
    });
  }
});