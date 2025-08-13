#!/usr/bin/env node

/**
 * Script to extract <style> blocks from login.html and dashboard.html
 * and write them to external CSS files, then update HTML files to link them.
 */
const fs = require('fs');
const path = require('path');

// Define paths
const frontendDir = path.join(__dirname, '..', 'src', 'frontend');
const cssDir = path.join(frontendDir, 'assets', 'css');

// Ensure CSS directory exists
fs.mkdirSync(cssDir, { recursive: true });

['login', 'dashboard'].forEach((page) => {
  const htmlPath = path.join(frontendDir, `${page}.html`);
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Match the first <style>...</style> block (case-insensitive)
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/i;
  const match = html.match(styleRegex);
  if (!match) {
    console.warn(`No <style> tag found in ${page}.html`);
    return;
  }

  const cssContent = match[1].trim();
  const cssPath = path.join(cssDir, `${page}.css`);

  // Write extracted CSS to file
  fs.writeFileSync(cssPath, cssContent, 'utf8');
  console.log(`Extracted CSS to ${path.relative(process.cwd(), cssPath)}`);

  // Remove the <style> block from HTML
  html = html.replace(styleRegex, '');

  // Inject <link> tag before closing </head>
  const linkTag = `<link rel="stylesheet" href="assets/css/${page}.css">`;
  html = html.replace(/<\/head>/i, `    ${linkTag}\r\n</head>`);

  // Write updated HTML back to file
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`Updated ${path.relative(process.cwd(), htmlPath)}`);
});