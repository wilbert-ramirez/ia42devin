#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define paths
const frontendDir = path.join(__dirname, '..', 'src', 'frontend');
const cssDir = path.join(frontendDir, 'assets', 'css');

const htmlFiles = [
  'dashboard.html',
  'index.html', 
  'lx-details.html',
  'lx-home.html',
  'lx-student.html',
  'lx.html',
  'payment.html'
];

// Ensure CSS directory exists
if (!fs.existsSync(cssDir)) {
  fs.mkdirSync(cssDir, { recursive: true });
}

let consolidatedCSS = `/* ================================================
   IA42 UNIFIED INLINE CSS - EXTRACTED FROM HTML FILES
   ================================================ */

`;

htmlFiles.forEach((filename) => {
  const htmlPath = path.join(frontendDir, filename);
  if (!fs.existsSync(htmlPath)) {
    console.warn(`File not found: ${filename}`);
    return;
  }
  
  let html = fs.readFileSync(htmlPath, 'utf8');
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  let hasStyles = false;
  
  while ((match = styleRegex.exec(html)) !== null) {
    hasStyles = true;
    const cssContent = match[1].trim();
    
    consolidatedCSS += `/* ================================================
   ${filename.toUpperCase()} STYLES
   ================================================ */

${cssContent}

`;
  }
  
  if (hasStyles) {
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    const linkTag = `    <link href="assets/css/unified-inline.css" rel="stylesheet" />`;
    html = html.replace(/<\/head>/i, `${linkTag}\n</head>`);
    
    // Write updated HTML back to file
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`✅ Processed ${filename}`);
  }
});

const unifiedCssPath = path.join(cssDir, 'unified-inline.css');
fs.writeFileSync(unifiedCssPath, consolidatedCSS, 'utf8');
console.log(`✅ Created unified CSS file: ${path.relative(process.cwd(), unifiedCssPath)}`);
console.log(`📁 Total CSS extracted from ${htmlFiles.length} HTML files`);
