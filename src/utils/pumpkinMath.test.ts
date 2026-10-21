import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PUMPKIN_PARAMS,
  DEFAULT_STEM_PARAMS,
  deformPumpkinVertex,
  deformStemVertex,
  computeCandleFlicker,
} from './pumpkinMath';

test('deformPumpkinVertex squashes vertical axis and indents poles', () => {
  const poleTop = deformPumpkinVertex(0, 1.5, 0, DEFAULT_PUMPKIN_PARAMS);
  const poleBottom = deformPumpkinVertex(0, -1.5, 0, DEFAULT_PUMPKIN_PARAMS);

  // Squash + crown indent must reduce vertical height well below original 1.5 radius
  assert.ok(poleTop.y < 1.5 * DEFAULT_PUMPKIN_PARAMS.squashY);
  assert.ok(poleTop.y > 0.4);
  assert.ok(poleBottom.y > -1.5 * DEFAULT_PUMPKIN_PARAMS.squashY);
  assert.equal(poleTop.normalizedY, 1);
  assert.equal(poleBottom.normalizedY, -1);
});

test('deformPumpkinVertex creates distinct outward rib crests and inward grooves along equator', () => {
  const params = {
    ...DEFAULT_PUMPKIN_PARAMS,
    ribCount: 10,
    ribDepth: 0.14,
    organicVariance: 0, // isolate pure cosine rib effect
  };

  // Angle = 0 -> cos(0) = 1 (rib crest)
  const crest = deformPumpkinVertex(1.5, 0, 0, params);
  // Angle = PI / ribCount -> cos(PI) = -1 (rib groove valley)
  const valleyAngle = Math.PI / params.ribCount;
  const valley = deformPumpkinVertex(
    1.5 * Math.cos(valleyAngle),
    0,
    1.5 * Math.sin(valleyAngle),
    params
  );

  const crestRadius = Math.hypot(crest.x, crest.z);
  const valleyRadius = Math.hypot(valley.x, valley.z);

  assert.ok(
    crestRadius > valleyRadius + 0.25,
    `Expected crest radius (${crestRadius}) to be significantly larger than valley radius (${valleyRadius})`
  );
  assert.equal(crest.grooveFactor, 1);
  assert.ok(valley.grooveFactor < 0.001);
});

test('deformStemVertex flares at base (t=0) and twists progressively toward tip (t=1)', () => {
  const base = deformStemVertex(0.2, 0, 0, DEFAULT_STEM_PARAMS);
  const tip = deformStemVertex(0.2, 0, 1, DEFAULT_STEM_PARAMS);

  assert.ok(
    base.radiusMultiplier > tip.radiusMultiplier,
    `Stem base (${base.radiusMultiplier}) should flare wider than tip (${tip.radiusMultiplier})`
  );
  assert.equal(base.twistAngle, 0);
  assert.equal(tip.twistAngle, DEFAULT_STEM_PARAMS.stemTwist);
});

test('computeCandleFlicker produces positive organic fluctuations and respects zero intensity', () => {
  const offState = computeCandleFlicker(2.5, 0, 1.0, 0.4);
  assert.equal(offState.intensity, 0);

  const samples = [0.1, 0.27, 0.63, 1.15, 2.04].map((t) =>
    computeCandleFlicker(t, 6.5, 1.2, 0.4).intensity
  );

  // All intensities should be positive and vary over time
  for (const val of samples) {
    assert.ok(val > 1.5 && val < 14, `Intensity ${val} out of expected realistic range`);
  }
  const uniqueSamples = new Set(samples.map((s) => s.toFixed(4)));
  assert.ok(uniqueSamples.size > 3, 'Candle flicker should vary across timestamps');
});
