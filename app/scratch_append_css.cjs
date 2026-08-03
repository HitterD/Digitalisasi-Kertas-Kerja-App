const fs = require('fs');
const path = require('path');

const planPath = path.resolve(__dirname, '../docs/superpowers/plans/2026-06-24-app3-guided-upload-redesign.md');
const cssPath = path.resolve(__dirname, 'src/styles/pages.css');

const planContent = fs.readFileSync(planPath, 'utf-8');

// Extract .umd-* styles (Task 2)
const umdMatch = planContent.match(/```css\n\/\* App3\/App4 Unified Master Data shell \*\/[\s\S]*?```/);
// Extract .app3-* styles (Task 3 / 4)
const app3Match = planContent.match(/```css\n\/\* App3 Guided Upload \*\/[\s\S]*?```/);
// Extract .app4-* styles (Task 4)
const app4Match = planContent.match(/```css\n\.app4-page-lite[\s\S]*?```/);

let cssToAppend = '\n\n';

if (umdMatch) {
  cssToAppend += umdMatch[0].replace(/```css\n/, '').replace(/```$/, '') + '\n\n';
}
if (app3Match) {
  cssToAppend += app3Match[0].replace(/```css\n/, '').replace(/```$/, '') + '\n\n';
}
if (app4Match) {
  cssToAppend += app4Match[0].replace(/```css\n/, '').replace(/```$/, '') + '\n\n';
}

fs.appendFileSync(cssPath, cssToAppend);
console.log('CSS appended successfully');
