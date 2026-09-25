#!/usr/bin/env node
/**
 * generate-icons.js
 * ─────────────────
 * Generates PNG icon files for PWA using pure Node.js (no dependencies).
 * Creates solid-color icons with a centered "9" rendered as pixel art.
 *
 * Run: node generate-icons.js
 *
 * This creates placeholder icons that are valid PNGs and sufficient for
 * PWA installation. Replace with properly designed icons for production.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Brand color from the app
const BG_R = 0x43, BG_G = 0x61, BG_B = 0xEE; // #4361ee
const FG_R = 0xFF, FG_G = 0xFF, FG_B = 0xFF; // white

/**
 * Create a minimal valid PNG file.
 * Draws a solid background with a simple "9" glyph in the center.
 */
function createPNG(size) {
  // Simple 9 glyph as a 5x7 bitmap (scalable)
  const glyph9 = [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,1],
    [0,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ];

  // Scale glyph to fit ~40% of icon size
  const glyphPixelSize = Math.floor(size * 0.08);
  const glyphW = 5 * glyphPixelSize;
  const glyphH = 7 * glyphPixelSize;
  const offsetX = Math.floor((size - glyphW) / 2);
  const offsetY = Math.floor((size - glyphH) / 2);

  // Build raw pixel data (RGBA, with filter byte per row)
  const rawData = Buffer.alloc((size * 4 + 1) * size);

  for (let y = 0; y < size; y++) {
    const rowOffset = y * (size * 4 + 1);
    rawData[rowOffset] = 0; // PNG filter: None

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Check if this pixel is part of the glyph
      const gx = x - offsetX;
      const gy = y - offsetY;
      let isGlyph = false;

      if (gx >= 0 && gx < glyphW && gy >= 0 && gy < glyphH) {
        const charX = Math.floor(gx / glyphPixelSize);
        const charY = Math.floor(gy / glyphPixelSize);
        if (charX < 5 && charY < 7 && glyph9[charY][charX]) {
          isGlyph = true;
        }
      }

      // Check if in rounded-corner exclusion zone (for standard icon)
      const radius = Math.floor(size * 0.15);
      let inCorner = false;
      const corners = [[0,0],[size-1,0],[0,size-1],[size-1,size-1]];
      for (const [cx, cy] of corners) {
        const cornerX = cx < size/2 ? radius : size - 1 - radius;
        const cornerY = cy < size/2 ? radius : size - 1 - radius;
        if ((cx < size/2 ? x < radius : x > size-1-radius) &&
            (cy < size/2 ? y < radius : y > size-1-radius)) {
          const dx = x - cornerX;
          const dy = y - cornerY;
          if (dx*dx + dy*dy > radius*radius) {
            inCorner = true;
          }
        }
      }

      if (inCorner) {
        // Transparent corner
        rawData[pixelOffset]     = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      } else if (isGlyph) {
        rawData[pixelOffset]     = FG_R;
        rawData[pixelOffset + 1] = FG_G;
        rawData[pixelOffset + 2] = FG_B;
        rawData[pixelOffset + 3] = 255;
      } else {
        rawData[pixelOffset]     = BG_R;
        rawData[pixelOffset + 1] = BG_G;
        rawData[pixelOffset + 2] = BG_B;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  // Compress pixel data
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);  // width
  ihdrData.writeUInt32BE(size, 4);  // height
  ihdrData[8] = 8;   // bit depth
  ihdrData[9] = 6;   // color type (RGBA)
  ihdrData[10] = 0;  // compression
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idat = makeChunk('IDAT', compressed);

  // IEND chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createMaskablePNG(size) {
  // Same as createPNG but without rounded corners (full bleed)
  const glyph9 = [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,1],
    [0,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ];

  // Maskable safe zone is 80% center — scale glyph to 30% of total
  const glyphPixelSize = Math.floor(size * 0.06);
  const glyphW = 5 * glyphPixelSize;
  const glyphH = 7 * glyphPixelSize;
  const offsetX = Math.floor((size - glyphW) / 2);
  const offsetY = Math.floor((size - glyphH) / 2);

  const rawData = Buffer.alloc((size * 4 + 1) * size);

  for (let y = 0; y < size; y++) {
    const rowOffset = y * (size * 4 + 1);
    rawData[rowOffset] = 0;

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      const gx = x - offsetX;
      const gy = y - offsetY;
      let isGlyph = false;

      if (gx >= 0 && gx < glyphW && gy >= 0 && gy < glyphH) {
        const charX = Math.floor(gx / glyphPixelSize);
        const charY = Math.floor(gy / glyphPixelSize);
        if (charX < 5 && charY < 7 && glyph9[charY][charX]) {
          isGlyph = true;
        }
      }

      if (isGlyph) {
        rawData[pixelOffset]     = FG_R;
        rawData[pixelOffset + 1] = FG_G;
        rawData[pixelOffset + 2] = FG_B;
        rawData[pixelOffset + 3] = 255;
      } else {
        rawData[pixelOffset]     = BG_R;
        rawData[pixelOffset + 1] = BG_G;
        rawData[pixelOffset + 2] = BG_B;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ─── Generate all sizes ─────────────────────────────────────────────────────

const dir = __dirname;
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('Generating PWA icons...');

for (const size of sizes) {
  const png = createPNG(size);
  const filePath = path.join(dir, `icon-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`  ✓ icon-${size}.png (${png.length} bytes)`);
}

// Maskable icons (no rounded corners, content in safe zone)
for (const size of [192, 512]) {
  const png = createMaskablePNG(size);
  const filePath = path.join(dir, `icon-maskable-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`  ✓ icon-maskable-${size}.png (${png.length} bytes)`);
}

console.log('Done! All icons generated.');
