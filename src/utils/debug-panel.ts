// ====================================================================
// Debug panel overlay (v3.4.2)
// ====================================================================
// When the URL contains `?oriel_debug=1`, mount a small floating panel
// in document.body showing:
//   - generate() execution time
//   - section/area decisions logged via debugLog()
//   - performance measures captured via timeStart/timeEnd
//
// Mount is idempotent: calling installDebugPanel() multiple times is
// a no-op if the panel is already present.
//
// **Palette is intentionally hardcoded** (white panel chrome, light-grey
// text, custom border colors) regardless of the active HA theme — the
// panel is a developer-debug surface that must be visually identical
// across themes so screenshots in bug reports are recognisable. Don't
// migrate to `--ha-*` design tokens; it stays in the hardcoded-hex
// allowlist defined in the v4.7.0 design-token migration.
// ====================================================================

import { isDebugActive } from './debug';

interface LogEntry {
  ts: number;
  message: string;
}

const MAX_LOGS = 80;
let installed = false;
const buffer: LogEntry[] = [];

/**
 * Buffer a debug message for display. Called from debugLog() — keeps
 * a rolling window so the panel can show recent activity without
 * unbounded growth.
 */
export function pushLog(message: string): void {
  buffer.push({ ts: performance.now(), message });
  if (buffer.length > MAX_LOGS) buffer.shift();
  if (installed) refresh();
}

/**
 * Mount the panel into document.body if debug mode is active. Safe to
 * call multiple times; only the first call creates the panel.
 */
export function installDebugPanel(): void {
  if (installed || !isDebugActive() || typeof document === 'undefined') return;
  installed = true;
  const root = document.createElement('div');
  root.id = 'oriel-debug-panel';
  root.style.cssText = [
    'position: fixed',
    'bottom: 16px',
    'right: 16px',
    'width: 360px',
    'max-height: 50vh',
    'overflow: auto',
    'background: rgba(20, 20, 24, 0.94)',
    'color: #e0e0e0',
    'border: 1px solid #444',
    'border-radius: 10px',
    'padding: 10px',
    'font-family: ui-monospace, monospace',
    'font-size: 11px',
    'z-index: 99999',
    'box-shadow: 0 8px 24px rgba(0,0,0,0.6)',
  ].join(';');
  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <strong style="color:#ffb74d;">s42 debug</strong>
      <button id="oriel-debug-clear" style="background:#333;color:#ddd;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:10px;">clear</button>
      <button id="oriel-debug-close" style="background:#333;color:#ddd;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:10px;">×</button>
    </div>
    <div id="oriel-debug-summary" style="margin-bottom:6px;color:#80cbc4;"></div>
    <div id="oriel-debug-log"></div>
  `;
  document.body.appendChild(root);
  root.querySelector('#oriel-debug-clear')?.addEventListener('click', () => {
    buffer.length = 0;
    refresh();
  });
  root.querySelector('#oriel-debug-close')?.addEventListener('click', () => {
    root.remove();
    installed = false;
  });
  refresh();
}

function refresh(): void {
  const root = document.getElementById('oriel-debug-panel');
  if (!root) return;
  // Summary: count oriel-perf measures + show the slowest 3.
  const measures = performance.getEntriesByType('measure')
    .filter((e) => e.name.startsWith('oriel-'))
    .sort((a, b) => b.duration - a.duration);
  const slowest = measures.slice(0, 3)
    .map((m) => `${m.name.replace('oriel-', '')}: ${m.duration.toFixed(1)}ms`)
    .join(' · ');
  const summary = root.querySelector('#oriel-debug-summary');
  if (summary) {
    const total = measures.reduce((s, m) => s + m.duration, 0);
    summary.textContent = measures.length > 0
      ? `${measures.length} measures · total ${total.toFixed(1)}ms · slowest: ${slowest}`
      : 'no measures recorded yet';
  }
  const logEl = root.querySelector('#oriel-debug-log');
  if (logEl) {
    // Use DOM APIs + textContent rather than partial-escape + innerHTML.
    // Earlier impl escaped only `<` and `>`; missed `&`, `"`, `'`, and
    // — more importantly — was fragile to future debugLog() callers
    // passing user-controlled strings (config values, entity friendly
    // names). textContent handles every escape automatically.
    // Closes review §S-5.
    logEl.replaceChildren(
      ...buffer
        .slice()
        .reverse()
        .map((entry) => {
          const row = document.createElement('div');
          row.style.cssText = 'border-bottom:1px solid #2c2c30;padding:3px 0;';
          const ts = document.createElement('span');
          ts.style.color = '#888';
          ts.textContent = `[${(entry.ts / 1000).toFixed(2)}s] `;
          row.appendChild(ts);
          row.appendChild(document.createTextNode(entry.message));
          return row;
        }),
    );
  }
}
