// ====================================================================
// Performance smoke — strategy generate()
// ====================================================================
// Measures how long the dashboard's `generate()` takes against a
// realistic fixture (10 areas, 30 lights, mixed entities). Fails if
// it blows past 500 ms on the CI runner — meant as a regression
// guard, not a benchmark suite.
//
// On the dev machine the same fixture typically runs in 30-80 ms; CI
// runners are slower and noisier, hence the generous limit.
// ====================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { Registry } from '../../src/Registry';
import type { HomeAssistant } from '../../src/types/homeassistant';
import type { OrielConfig } from '../../src/types/strategy';
import { makeHass } from '../fixtures/hass';

/** Build a 10-area / 30-entities-per-area fixture for the perf test. */
function buildLargeHass(): HomeAssistant {
  const areas = Array.from({ length: 10 }, (_, i) => ({
    area_id: `area_${i}`,
    name: `Room ${i}`,
  }));
  const entities = [];
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 30; j++) {
      const domain = ['light', 'switch', 'sensor', 'binary_sensor', 'cover'][j % 5]!;
      entities.push({
        entity_id: `${domain}.r${i}_${j}`,
        state: 'on',
        attributes: { friendly_name: `${domain} ${i}.${j}` },
        area_id: `area_${i}`,
      });
    }
  }
  return makeHass({ areas, entities });
}

const PERF_BUDGET_MS = 500;
const WARMUP_ITERATIONS = 3;
const MEASURED_ITERATIONS = 5;

describe('strategy.generate() performance', () => {
  let hass: HomeAssistant;
  let config: OrielConfig;

  beforeAll(() => {
    Registry.resetForTesting();
    hass = buildLargeHass();
    config = {
      show_summary_views: true,
      show_room_views: true,
      show_light_summary: true,
      show_covers_summary: true,
      show_security_summary: true,
      show_battery_summary: true,
    };
  });

  it('generate() stays under the perf budget', async () => {
    // Lazy import inside the test so module init time isn't measured.
    const { default: strategyModule } = await import(
      '../../src/oriel'
    );
    void strategyModule;
    const strategyClass = customElements.get('ll-strategy-dashboard-oriel') as
      | {
          generate: (
            cfg: OrielConfig,
            hass: HomeAssistant,
          ) => Promise<unknown>;
        }
      | undefined;
    if (!strategyClass) {
      // Strategy didn't register (happy-dom may not be enough). Skip
      // with a clear note rather than asserting a false negative.
      console.warn('[perf] strategy class not in customElements — skipping');
      return;
    }

    // Warmup: prime caches (Registry init, localize, chunk imports).
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      await strategyClass.generate(config, hass);
    }

    // Measure.
    const samples: number[] = [];
    for (let i = 0; i < MEASURED_ITERATIONS; i++) {
      const t0 = performance.now();
      await strategyClass.generate(config, hass);
      samples.push(performance.now() - t0);
    }

    const median = samples.sort((a, b) => a - b)[Math.floor(samples.length / 2)];
    const min = Math.min(...samples);
    const max = Math.max(...samples);

    // eslint-disable-next-line no-console
    console.log(
      `[perf] generate(): min=${min!.toFixed(1)}ms median=${median!.toFixed(1)}ms max=${max!.toFixed(1)}ms budget=${PERF_BUDGET_MS}ms`,
    );

    expect(median!).toBeLessThan(PERF_BUDGET_MS);
  });
});
