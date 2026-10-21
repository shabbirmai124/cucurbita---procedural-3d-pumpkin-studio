/**
 * Pure mathematical functions for procedural 3D pumpkin sculpting,
 * stem organic noise, and candle flicker synthesis.
 * Decoupled from Three.js DOM/WebGL context for deterministic unit testing.
 */

export interface PumpkinSculptParams {
  /** Number of vertical ribs/lobes around circumference (e.g., 10 to 20) */
  ribCount: number;
  /** Depth of the primary cosine rib grooves (e.g., 0.04 to 0.18) */
  ribDepth: number;
  /** Vertical squash multiplier on Y axis (e.g., 0.65 to 0.95) */
  squashY: number;
  /** Top & bottom dimple/indent depth at poles (e.g., 0.08 to 0.28) */
  poleIndent: number;
  /** Secondary organic asymmetry / secondary harmonic strength (0 to 0.08) */
  organicVariance: number;
  /** Base sphere radius */
  baseRadius: number;
}

export interface StemSculptParams {
  /** Stem height multiplier (0.7 to 1.5) */
  stemLength: number;
  /** Curvature bend intensity (0.2 to 1.4) */
  stemBend: number;
  /** Twist angle along the stem in radians (0 to 3.5) */
  stemTwist: number;
  /** Number of woody ridges along the stem circumference */
  stemRidges: number;
}

export interface MaterialPreset {
  id: string;
  name: string;
  subtitle: string;
  primaryColor: string;
  grooveColor: string;
  subsurfaceColor: string;
  stemBaseColor: string;
  stemTipColor: string;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  transmission: number;
  thickness: number;
}

export interface LightingPreset {
  id: string;
  name: string;
  ambientColor: string;
  ambientIntensity: number;
  keyColor: string;
  keyIntensity: number;
  rimColor: string;
  rimIntensity: number;
  candleColor: string;
  candleBaseIntensity: number;
  fogColor: string;
}

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: 'heirloom-amber',
    name: 'Heirloom Amber',
    subtitle: 'Classic warm orange gourd with waxy clearcoat & amber translucency',
    primaryColor: '#e85d12',
    grooveColor: '#8f2804',
    subsurfaceColor: '#ff7b00',
    stemBaseColor: '#4a5228',
    stemTipColor: '#2d2618',
    roughness: 0.28,
    clearcoat: 0.42,
    clearcoatRoughness: 0.22,
    transmission: 0.24,
    thickness: 2.2,
  },
  {
    id: 'deep-harvest',
    name: 'Deep Cinder Harvest',
    subtitle: 'Rich roasted terracotta skin with deep mahogany rib crevices',
    primaryColor: '#c83e0b',
    grooveColor: '#5c1602',
    subsurfaceColor: '#ff5500',
    stemBaseColor: '#3d4222',
    stemTipColor: '#221c12',
    roughness: 0.34,
    clearcoat: 0.32,
    clearcoatRoughness: 0.28,
    transmission: 0.20,
    thickness: 2.5,
  },
  {
    id: 'ghost-lumina',
    name: 'Lumina Ghost',
    subtitle: 'Pale cream-parchment skin with high subsurface candle bleed',
    primaryColor: '#f2dfc4',
    grooveColor: '#b88f5e',
    subsurfaceColor: '#ff9d3b',
    stemBaseColor: '#575e38',
    stemTipColor: '#363022',
    roughness: 0.25,
    clearcoat: 0.48,
    clearcoatRoughness: 0.18,
    transmission: 0.34,
    thickness: 1.8,
  },
  {
    id: 'jarson-sage',
    name: 'Jarrahdale Sage & Gold',
    subtitle: 'Heirloom muted celadon-slate rind warmed by internal golden ember',
    primaryColor: '#6d7b63',
    grooveColor: '#36402f',
    subsurfaceColor: '#ff8811',
    stemBaseColor: '#4c462a',
    stemTipColor: '#282315',
    roughness: 0.38,
    clearcoat: 0.25,
    clearcoatRoughness: 0.3,
    transmission: 0.18,
    thickness: 2.6,
  },
];

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'warm-hearth',
    name: 'Warm Hearth',
    ambientColor: '#2a1205',
    ambientIntensity: 0.85,
    keyColor: '#ff9442',
    keyIntensity: 3.2,
    rimColor: '#4a7aff',
    rimIntensity: 1.5,
    candleColor: '#ff6a00',
    candleBaseIntensity: 6.5,
    fogColor: '#0e0704',
  },
  {
    id: 'moonlit-harvest',
    name: 'Moonlit Harvest',
    ambientColor: '#141829',
    ambientIntensity: 0.75,
    keyColor: '#ff8533',
    keyIntensity: 2.4,
    rimColor: '#6096ff',
    rimIntensity: 2.6,
    candleColor: '#ff5e00',
    candleBaseIntensity: 7.5,
    fogColor: '#080b12',
  },
  {
    id: 'ember-sanctuary',
    name: 'Ember Sanctuary',
    ambientColor: '#240b02',
    ambientIntensity: 0.6,
    keyColor: '#ff6d1f',
    keyIntensity: 2.1,
    rimColor: '#3859b8',
    rimIntensity: 1.1,
    candleColor: '#ff4800',
    candleBaseIntensity: 9.2,
    fogColor: '#0a0402',
  },
];

export const DEFAULT_PUMPKIN_PARAMS: PumpkinSculptParams = {
  ribCount: 12,
  ribDepth: 0.11,
  squashY: 0.78,
  poleIndent: 0.19,
  organicVariance: 0.035,
  baseRadius: 1.5,
};

export const DEFAULT_STEM_PARAMS: StemSculptParams = {
  stemLength: 1.05,
  stemBend: 0.75,
  stemTwist: 1.85,
  stemRidges: 7,
};

/**
 * Deterministic pseudo-random value in [-1, 1] from 3D coordinates
 */
export function pseudoNoise3D(x: number, y: number, z: number): number {
  const dot = x * 12.9898 + y * 78.233 + z * 37.719;
  const s = Math.sin(dot) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/**
 * Deforms a single vertex (x, y, z) on a sphere of radius `baseRadius` into a realistic
 * pumpkin coordinate with cosine-wave ribs, polar tapering, crown/base dimple indents,
 * and subtle organic secondary harmonics.
 *
 * Also returns a `grooveFactor` in [0, 1] where 0 = deep rib crease and 1 = outer rib crest,
 * useful for vertex color / subsurface thickness modulation.
 */
export function deformPumpkinVertex(
  x: number,
  y: number,
  z: number,
  params: PumpkinSculptParams
): { x: number; y: number; z: number; grooveFactor: number; normalizedY: number } {
  const { ribCount, ribDepth, squashY, poleIndent, organicVariance, baseRadius } = params;

  const r = Math.sqrt(x * x + y * y + z * z) || 1;
  // Normalized vertical coordinate in [-1, 1]
  const ny = Math.max(-1, Math.min(1, y / r));
  // Horizontal distance from Y axis, normalized in [0, 1]
  const radialDist = Math.sqrt(x * x + z * z) / r;

  // Angle around Y axis in [-PI, PI]
  const angle = Math.atan2(z, x);

  // Vertical taper so ribs smooth out gracefully near the top and bottom poles
  const verticalTaper = Math.sin(Math.acos(ny)); // equals radialDist, peaks at equator (1.0) and 0 at poles
  const smoothTaper = Math.pow(verticalTaper, 0.75);

  // Primary cosine wave for the distinct pumpkin ribs (lobes)
  // Using a slightly sharpened cosine wave: cos(N * angle) with harmonic so creases are sharper than lobes
  const rawCos = Math.cos(angle * ribCount);
  // Sharpen valleys (creases) while keeping lobes plump and rounded:
  // When rawCos is -1 (valley), we pull inward more sharply; when +1 (ridge), broad rounded bulge
  const shapedRibWave = rawCos - 0.22 * Math.sin(angle * ribCount * 0.5 + 0.4) * 0.15 - 0.18 * (1 - rawCos * rawCos);

  // Secondary organic asymmetry (real pumpkins aren't machine-lathed)
  const secondaryLobe =
    Math.cos(angle * 3 + 0.7) * organicVariance +
    Math.sin(angle * 5 - 1.1) * (organicVariance * 0.6) +
    pseudoNoise3D(x * 1.5, y * 1.5, z * 1.5) * (organicVariance * 0.25);

  // Total radial displacement multiplier
  const radialDisplacement = 1 + (shapedRibWave * ribDepth + secondaryLobe) * smoothTaper;

  // Apply radial displacement to X and Z
  // Also add a slight pear/heavy-bottom gravity sag so the lower half is slightly wider than the upper half
  const gravityBelly = 1 - ny * 0.055;
  const outX = x * radialDisplacement * gravityBelly;
  const outZ = z * radialDisplacement * gravityBelly;

  // Apply vertical squash (e.g., 0.78) plus polar dimple indents at the very top (stem crown) and bottom (blossom end)
  const poleProximity = Math.pow(Math.abs(ny), 3.2);
  const topCrownFactor = ny > 0 ? poleProximity * poleIndent * 1.35 : poleProximity * poleIndent * 0.85;
  const ribVerticalPull = (1 - radialDist) * (rawCos * 0.015 * ribDepth);

  const squashedY = y * squashY - Math.sign(ny) * (baseRadius * topCrownFactor) + ribVerticalPull;

  // Normalize grooveFactor in [0, 1] (0 = deep crease, 1 = outer lobe peak)
  const grooveFactor = Math.max(0, Math.min(1, (rawCos + 1) * 0.5));

  return {
    x: outX,
    y: squashedY,
    z: outZ,
    grooveFactor,
    normalizedY: ny,
  };
}

/**
 * Deforms a vertex along a stem TubeGeometry given its normalized progress `t` in [0, 1]
 * (0 = base attached to pumpkin crown, 1 = cut woody tip) and circumferential angle `theta`.
 */
export function deformStemVertex(
  localRadius: number,
  theta: number,
  t: number,
  params: StemSculptParams
): { radiusMultiplier: number; twistAngle: number; barkRoughnessOffset: number } {
  const { stemTwist, stemRidges } = params;

  // Base flares out wide into a star-like calyx where it meets the pumpkin crown (t near 0),
  // then tapers and slightly gnarls at the cut tip (t near 1)
  const baseFlare = Math.pow(1 - t, 2.6) * 0.85;
  const midTaper = 1 - t * 0.42;
  const tipKnob = t > 0.85 ? Math.sin(((t - 0.85) / 0.15) * Math.PI) * 0.12 : 0;

  // Twist increases with height t
  const twistAngle = t * stemTwist;
  const twistedTheta = theta + twistAngle;

  // Star-shaped woody ridges along the stem
  const ridgeWave = Math.cos(twistedTheta * stemRidges);
  const sharpRidge = Math.pow((ridgeWave + 1) * 0.5, 1.6) * 2 - 1;
  const ridgeStrength = (0.18 + (1 - t) * 0.14) * sharpRidge;

  // Organic bark gnarl noise on upper vertices
  const barkNoise =
    (Math.sin(twistedTheta * 3 + t * 14) * 0.04 +
      Math.cos(twistedTheta * 5 - t * 9) * 0.03) *
    (0.3 + t * 0.7);

  const radiusMultiplier = Math.max(0.2, (midTaper + baseFlare + tipKnob) * (1 + ridgeStrength + barkNoise));

  return {
    radiusMultiplier,
    twistAngle,
    barkRoughnessOffset: barkNoise * localRadius,
  };
}

/**
 * Computes realistic internal candle flame flicker intensity at elapsed time `timeSec`.
 * Combines overlapping sine and cosine waves with deterministic high-frequency micro-turbulence
 * so the flame breathes and dances like a real candle struggling for oxygen inside a gourd.
 */
export function computeCandleFlicker(
  timeSec: number,
  baseIntensity: number,
  flickerSpeed: number = 1.0,
  flickerAmount: number = 0.35
): { intensity: number; verticalOffset: number; horizontalSway: number; warmthShift: number } {
  if (baseIntensity <= 0) {
    return { intensity: 0, verticalOffset: 0, horizontalSway: 0, warmthShift: 0 };
  }

  const t = timeSec * Math.max(0.1, flickerSpeed);

  // Overlapping low, mid, and high-frequency harmonic waves (Math.sin + Math.cos)
  const slowBreath = Math.sin(t * 2.3) * 0.35 + Math.cos(t * 1.7 + 0.8) * 0.25;
  const midFlutter = Math.sin(t * 7.9 + 1.4) * 0.25 + Math.cos(t * 11.3) * 0.18;
  const rapidSputter = Math.sin(t * 23.1) * Math.cos(t * 17.7) * 0.15;

  // Deterministic pseudo-noise jitter
  const microNoise = (Math.sin(t * 43.7) * 43758.5453 - Math.floor(Math.sin(t * 43.7) * 43758.5453) - 0.5) * 0.14;

  const combinedWave = slowBreath + midFlutter + rapidSputter + microNoise;
  const clampedFactor = Math.max(-0.65, Math.min(0.75, combinedWave * flickerAmount));

  const intensity = Math.max(0.1, baseIntensity * (1 + clampedWaveToScale(clampedFactor)));
  const verticalOffset = (slowBreath * 0.03 + midFlutter * 0.015) * flickerAmount;
  const horizontalSway = (Math.cos(t * 3.1) * 0.025 + Math.sin(t * 8.4) * 0.01) * flickerAmount;
  const warmthShift = Math.max(-1, Math.min(1, combinedWave));

  return {
    intensity,
    verticalOffset,
    horizontalSway,
    warmthShift,
  };
}

function clampedWaveToScale(val: number): number {
  return val;
}
