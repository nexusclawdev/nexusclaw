/**
 * Script to convert multi-language translations to English-only
 * Converts: t({ ko: "...", en: "English text", ja: "...", zh: "..." })
 * To: "English text"
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ui-src', 'src', 'components', 'SettingsPanel.tsx');

console.log('Reading file:', filePath);
let content = fs.readFileSync(filePath, 'utf8');

// Regex to match t({ ko: "...", en: "...", ja: "...", zh: "..." })
// Captures the English text
const translationRegex = /t\(\{\s*ko:\s*"[^"]*"\s*,\s*en:\s*"([^"]*)"\s*,\s*ja:\s*"[^"]*"\s*,\s*zh:\s*"[^"]*"\s*\}\)/g;

let matchCount = 0;
content = content.replace(translationRegex, (match, englishText) => {
  matchCount++;
  return `"${englishText}"`;
});

console.log(`Replaced ${matchCount} translation calls with English-only strings`);

// Also remove the useI18n hook usage since we don't need it anymore
// Keep the line but comment it out for reference
content = content.replace(
  /const \{ t, localeTag \} = useI18n\(form\.language\);/,
  '// const { t, localeTag } = useI18n(form.language); // Removed: English-only UI'
);

// Write the modified content back
fs.writeFileSync(filePath, content, 'utf8');
console.log('File updated successfully!');
console.log('✓ Converted to English-only UI');
