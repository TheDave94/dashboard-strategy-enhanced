// ====================================================================
// PERFORMANCE DEBUG — Activated via ?oriel_debug=true query parameter
// ====================================================================
// Logs timing data to browser console. Playwright reads console messages
// to analyze performance without modifying production behavior.
// ====================================================================

const DEBUG_PARAM = 'oriel_debug';

/** Check if debug mode is active (cached after first check) */
let _debugActive: boolean | null = null;

export function isDebugActive(): boolean {
  if (_debugActive !== null) return _debugActive;
  try {
    _debugActive = new URLSearchParams(window.location.search).has(DEBUG_PARAM);
  } catch {
    _debugActive = false;
  }
  return _debugActive;
}

/** Start a named performance timer */
export function timeStart(label: string): void {
  if (!isDebugActive()) return;
  performance.mark(`oriel-start-${label}`);
}

/** End a named timer and log the duration */
export function timeEnd(label: string): void {
  if (!isDebugActive()) return;
  const startMark = `oriel-start-${label}`;
  const endMark = `oriel-end-${label}`;
  performance.mark(endMark);
  try {
    const measure = performance.measure(`oriel-${label}`, startMark, endMark);
    console.log(`[oriel-perf] ${label}: ${measure.duration.toFixed(2)}ms`);
  } catch {
    // Start mark missing — timer was never started
  }
}

/** Log a debug message (only when debug active) */
export function debugLog(message: string, ...args: unknown[]): void {
  if (!isDebugActive()) return;
  console.log(`[oriel-debug] ${message}`, ...args);
  // Also feed the floating debug panel — lazy-imported so the panel
  // module isn't part of the main chunk in production.
  void import('./debug-panel').then(({ pushLog, installDebugPanel }) => {
    installDebugPanel();
    pushLog(
      args.length > 0
        ? `${message} ${args.map((a) => JSON.stringify(a)).join(' ')}`
        : message,
    );
  });
}

/** Track how often set hass() is called on a component */
const _hassCallCounts = new Map<string, number>();
let _hassLogInterval: ReturnType<typeof setInterval> | null = null;

export function trackHassUpdate(componentName: string): void {
  if (!isDebugActive()) return;
  _hassCallCounts.set(componentName, (_hassCallCounts.get(componentName) || 0) + 1);

  // Log aggregated counts every 5 seconds
  if (!_hassLogInterval) {
    _hassLogInterval = setInterval(() => {
      if (_hassCallCounts.size === 0) return;
      const entries = Array.from(_hassCallCounts.entries())
        .map(([name, count]) => `${name}=${count}`)
        .join(', ');
      console.log(`[oriel-perf] hass-updates/5s: ${entries}`);
      _hassCallCounts.clear();
    }, 5000);
  }
}

/** Dump all s42 performance measures to console as sorted table */
function dumpAllMeasures(): void {
  const entries = performance
    .getEntriesByType('measure')
    .filter((e) => e.name.startsWith('oriel-'))
    .sort((a, b) => a.startTime - b.startTime);

  if (entries.length === 0) {
    console.log('[oriel-perf] No measures recorded. Load page with ?oriel_debug=true');
    return;
  }

  console.table(
    entries.map((e) => ({
      name: e.name.replace('oriel-', ''),
      start: `${e.startTime.toFixed(1)}ms`,
      duration: `${e.duration.toFixed(2)}ms`,
    }))
  );

  const total = entries.reduce((sum, e) => sum + e.duration, 0);
  console.log(`[oriel-perf] Total measured: ${total.toFixed(2)}ms across ${entries.length} measures`);
}

// Expose globally for console access
if (typeof window !== 'undefined') {
  (window as any).__s42_dump = dumpAllMeasures;
}
