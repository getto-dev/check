#!/usr/bin/env node
/**
 * Generate precache-manifest.json from the Next.js static export output.
 * Scans the `out/` directory and lists all files that should be
 * pre-cached by the Service Worker for full offline support.
 *
 * Usage: node scripts/generate-precache.js
 * Env:   BASE_PATH=/check  (default for GitHub Pages)
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, '..', 'out');
const BASE_PATH = (process.env.BASE_PATH || '/check').replace(/\/$/, '');
const OUTPUT_FILE = path.join(OUT_DIR, 'precache-manifest.json');

function getAllFiles(dir, base = '') {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = base ? `${base}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, relativePath));
    } else {
      if (shouldInclude(relativePath)) {
        results.push(relativePath);
      }
    }
  }

  return results;
}

function shouldInclude(filepath) {
  // Normalize separators
  const normalized = filepath.replace(/\\/g, '/');

  // Skip source maps
  if (normalized.endsWith('.map')) return false;

  // Skip Next.js internal text files (not requested by browser)
  if (normalized.includes('__next.')) return false;

  // Skip the precache manifest itself
  if (normalized.endsWith('precache-manifest.json')) return false;

  // Skip 404 pages (not needed for offline)
  if (normalized.startsWith('404') || normalized.startsWith('404/')) return false;
  if (normalized.startsWith('_not-found')) return false;

  // Skip .txt files (Next.js route manifests)
  if (normalized.endsWith('.txt') && !normalized.includes('_next/')) return false;

  return true;
}

function main() {
  if (!fs.existsSync(OUT_DIR)) {
    console.error('Error: out/ directory not found. Run "next build" first.');
    process.exit(1);
  }

  const files = getAllFiles(OUT_DIR);

  // Convert file paths to URL paths
  const urls = files.map((file) => {
    const normalized = file.replace(/\\/g, '/');
    const url = `${BASE_PATH}/${normalized}`;
    return url;
  });

  // Add the root URL (so navigation to /check/ works offline)
  if (BASE_PATH) {
    urls.push(`${BASE_PATH}/`);
  } else {
    urls.push('./');
  }

  // Sort for consistent output
  urls.sort();

  // Remove duplicates
  const uniqueUrls = [...new Set(urls)];

  // Write the manifest
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueUrls, null, 2), 'utf-8');

  console.log(`Generated precache-manifest.json with ${uniqueUrls.length} files`);
  console.log(`Output: ${OUTPUT_FILE}`);

  // Show some stats
  const jsFiles = uniqueUrls.filter(u => u.endsWith('.js')).length;
  const cssFiles = uniqueUrls.filter(u => u.endsWith('.css')).length;
  const htmlFiles = uniqueUrls.filter(u => u.endsWith('.html') || u.endsWith('/')).length;
  const fontFiles = uniqueUrls.filter(u => u.endsWith('.ttf') || u.endsWith('.woff') || u.endsWith('.woff2')).length;
  const imageFiles = uniqueUrls.filter(u => u.endsWith('.png') || u.endsWith('.svg') || u.endsWith('.ico')).length;

  console.log(`JS: ${jsFiles}, CSS: ${cssFiles}, HTML: ${htmlFiles}, Fonts: ${fontFiles}, Images: ${imageFiles}`);
}

main();
