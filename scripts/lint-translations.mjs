#!/usr/bin/env node
/* eslint-disable security/detect-non-literal-fs-filename, security/detect-object-injection
 *  -- this script runs only in CI against translation files committed
 *     to this repo. There is no user-controlled input. File paths come
 *     from a readdir of the locked translations directory; object
 *     accesses are over the resulting parsed JSON.
 */
// Translation file linter — catches these classes of bug:
//   1. Invalid JSON
//   2. Duplicate keys in any object (JSON.parse silently keeps the last value)
//   3. Key-parity drift between en.json and every other locale (missing keys
//      in either direction)
//   4. HTML in keys that aren't on the explicit allowlist (review §F-3)
//   5. Hostile substrings anywhere — <script>, <iframe>, javascript:, on*=
//      event handlers, data:text/html. Belt-and-braces over the
//      safe-localize.ts runtime guard.
//
// JSON.parse drops duplicate keys without raising, so for (2) we re-tokenize
// the raw text and walk the object structure ourselves.
//
// (4) + (5) close the supply-chain XSS vector: even though renderLocalized()
// only allows <strong> and <em> at render time, this PR-time gate stops
// hostile translation content from being merged in the first place.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Default to the real translations dir; tests pass a fixture path via argv.
const TRANSLATIONS_DIR = process.argv[2] || 'src/translations';
const REFERENCE_LANG = 'en';
const REFERENCE_PATH = path.join(TRANSLATIONS_DIR, `${REFERENCE_LANG}.json`);

// Keys that may legitimately contain HTML formatting (<strong>, <em> only).
// Allowlist is dot-paths matching `collectKeys()` output. Adding a new
// HTML-bearing key requires an explicit entry here, which makes hostile
// HTML in a "just translations" PR stand out in review.
const HTML_ALLOWLIST = new Set([
  'editor.show_search_card_missing',
  'editor.room_pins_desc',
]);

// Tags allowed in allowlisted keys. Anything else — including allowed
// tags with attributes — is rejected.
const ALLOWED_TAG_RE = /<(?:strong|em)>[\s\S]*?<\/(?:strong|em)>/g;

// Patterns that are NEVER allowed, anywhere — including inside otherwise
// allowlisted keys. Matches the active mitigation in safe-localize.ts.
const HOSTILE_PATTERNS = [
  { re: /<script\b/i, label: '<script> tag' },
  { re: /<\/script>/i, label: '</script> tag' },
  { re: /<iframe\b/i, label: '<iframe> tag' },
  { re: /<object\b/i, label: '<object> tag' },
  { re: /<embed\b/i, label: '<embed> tag' },
  { re: /<svg\b/i, label: '<svg> tag (can carry inline scripts)' },
  { re: /javascript:/i, label: 'javascript: URL' },
  { re: /data:text\/html/i, label: 'data:text/html URL' },
  // Event-handler attribute pattern: ` onfoo=` or `\tonfoo=` etc.
  // Requires a leading non-word char so we don't false-positive on
  // "comparison" or "constellation" containing literal "on…".
  { re: /(?:^|[\s/'"])on\w+\s*=/i, label: 'event-handler attribute' },
];

// Discover every JSON file in the translations directory. New locales
// require nothing more than dropping a file alongside en.json.
const localeFiles = readdirSync(TRANSLATIONS_DIR)
  .filter((name) => name.endsWith('.json'))
  .map((name) => path.join(TRANSLATIONS_DIR, name))
  .sort();

if (!localeFiles.includes(REFERENCE_PATH)) {
  console.error(`[lint-translations] ${REFERENCE_PATH} missing — that's the reference locale.`);
  process.exit(1);
}

let problems = 0;

function report(file, msg) {
  console.error(`[lint-translations] ${file}: ${msg}`);
  problems++;
}

// Walk a JSON.parse-able text and report duplicate keys.
function findDuplicateKeys(file, text) {
  const stack = [new Set()]; // each frame = keys seen so far in the current object
  let i = 0;
  let line = 1;
  const len = text.length;
  while (i < len) {
    const c = text[i];
    if (c === '\n') line++;
    if (c === '{') { stack.push(new Set()); i++; continue; }
    if (c === '}') { stack.pop(); i++; continue; }
    if (c === '[') { stack.push(null); i++; continue; } // sentinel: skip dup-tracking inside arrays
    if (c === ']') { stack.pop(); i++; continue; }
    if (c === '"') {
      const start = i;
      const startLine = line;
      i++;
      while (i < len && text[i] !== '"') {
        if (text[i] === '\\') i++;
        if (text[i] === '\n') line++;
        i++;
      }
      const value = text.slice(start + 1, i);
      i++;
      while (i < len && /\s/.test(text[i])) { if (text[i] === '\n') line++; i++; }
      if (text[i] === ':') {
        const frame = stack[stack.length - 1];
        if (frame instanceof Set) {
          if (frame.has(value)) {
            report(file, `duplicate key '${value}' near line ${startLine}`);
          }
          frame.add(value);
        }
      }
      continue;
    }
    i++;
  }
}

function collectKeys(obj, prefix = '') {
  const out = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const k of Object.keys(obj)) {
      const next = prefix ? `${prefix}.${k}` : k;
      const v = obj[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out.push(...collectKeys(v, next));
      } else {
        out.push(next);
      }
    }
  }
  return out;
}

/**
 * Walk every leaf string in the translation JSON and check:
 *   - Hostile patterns (script tags, javascript: URLs, event handlers,
 *     etc.) trip everywhere.
 *   - Any HTML-looking content (anything matching `<[a-z…]`) outside
 *     the HTML_ALLOWLIST trips.
 *   - Allowlisted keys may contain ONLY bare <strong>…</strong> and
 *     <em>…</em>. Stripping those out and finding any remaining `<`
 *     trips too.
 */
function checkHtmlSafety(file, obj, prefix = '') {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  for (const k of Object.keys(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      checkHtmlSafety(file, v, next);
      continue;
    }
    if (typeof v !== 'string') continue;

    // Hostile patterns trip regardless of allowlist
    for (const { re, label } of HOSTILE_PATTERNS) {
      if (re.test(v)) {
        report(file, `key '${next}' contains forbidden pattern (${label})`);
      }
    }

    // Check for any HTML-looking tag (< followed by ascii letter or /)
    const looksLikeHtml = /<\s*\/?[a-z]/i.test(v);
    if (!looksLikeHtml) continue;

    if (!HTML_ALLOWLIST.has(next)) {
      report(file, `key '${next}' contains HTML but is not on HTML_ALLOWLIST in scripts/lint-translations.mjs`);
      continue;
    }

    // Allowlisted — strip the allowed bare tags and check what's left.
    const stripped = v.replace(ALLOWED_TAG_RE, '');
    if (/<\s*\/?[a-z]/i.test(stripped)) {
      report(
        file,
        `key '${next}' is HTML-allowlisted but contains tags other than bare <strong>/<em>: ${JSON.stringify(stripped.slice(0, 80))}`,
      );
    }
  }
}

// Parse each locale file. Track raw text so we can run the duplicate-key
// detector against it (JSON.parse drops dupes silently).
const parsed = {};
for (const file of localeFiles) {
  const text = readFileSync(file, 'utf8');
  try {
    parsed[file] = { json: JSON.parse(text), text };
  } catch (e) {
    report(file, `invalid JSON: ${e.message}`);
    parsed[file] = null;
  }
}

for (const file of localeFiles) {
  if (parsed[file]) findDuplicateKeys(file, parsed[file].text);
}

// Run HTML safety checks on every locale's parsed JSON.
for (const file of localeFiles) {
  if (parsed[file]) checkHtmlSafety(file, parsed[file].json);
}

// Parity check: every locale must have the same keys as the reference.
const reference = parsed[REFERENCE_PATH];
if (reference) {
  const refKeys = new Set(collectKeys(reference.json));
  for (const file of localeFiles) {
    if (file === REFERENCE_PATH) continue;
    if (!parsed[file]) continue;
    const localeKeys = new Set(collectKeys(parsed[file].json));
    for (const k of refKeys) {
      if (!localeKeys.has(k)) report(file, `missing key '${k}' (present in ${REFERENCE_PATH})`);
    }
    for (const k of localeKeys) {
      if (!refKeys.has(k)) report(REFERENCE_PATH, `missing key '${k}' (present in ${file})`);
    }
  }
}

if (problems > 0) {
  console.error(`\n[lint-translations] ${problems} problem(s) found.`);
  process.exit(1);
}
console.log(`[lint-translations] OK (${localeFiles.length} locale(s))`);
