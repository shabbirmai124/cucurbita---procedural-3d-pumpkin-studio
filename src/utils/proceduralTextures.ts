import * as THREE from 'three';
import { MaterialPreset } from './pumpkinMath';

export interface PumpkinTextureSet {
  albedoMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  subsurfaceMap: THREE.CanvasTexture;
  stemBumpMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  emberParticleMap: THREE.CanvasTexture;
}

/**
 * Generates all 100% procedural CanvasTextures required for the pumpkin skin,
 * subsurface glow transmission/emissive bleed, woody stem bark, and contact shadows.
 */
export function createPumpkinTextures(
  renderer: THREE.WebGLRenderer,
  preset: MaterialPreset,
  ribCount: number
): PumpkinTextureSet {
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  const albedoMap = generateAlbedoTexture(preset, ribCount, maxAnisotropy);
  const bumpMap = generateBumpTexture(ribCount, maxAnisotropy);
  const roughnessMap = generateRoughnessTexture(ribCount, maxAnisotropy);
  const subsurfaceMap = generateSubsurfaceTexture(ribCount, maxAnisotropy);
  const stemBumpMap = generateStemBarkTexture(maxAnisotropy);
  const contactShadowMap = generateContactShadowTexture();
  const emberParticleMap = generateEmberParticleTexture();

  return {
    albedoMap,
    bumpMap,
    roughnessMap,
    subsurfaceMap,
    stemBumpMap,
    contactShadowMap,
    emberParticleMap,
  };
}

export function updateAlbedoTextureForPreset(
  texture: THREE.CanvasTexture,
  preset: MaterialPreset,
  ribCount: number
): void {
  const canvas = texture.image as HTMLCanvasElement;
  drawAlbedoCanvas(canvas, preset, ribCount);
  texture.needsUpdate = true;
}

function drawAlbedoCanvas(
  canvas: HTMLCanvasElement,
  preset: MaterialPreset,
  ribCount: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Base gradient from crown to equator to bottom
  const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
  baseGrad.addColorStop(0,preset.grooveColor);
  baseGrad.addColorStop(0.14, preset.primaryColor);
  baseGrad.addColorStop(0.5, preset.primaryColor);
  baseGrad.addColorStop(0.86, preset.primaryColor);
  baseGrad.addColorStop(1, preset.grooveColor);

  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  // Vertical rib striations matching ribCount around UV.x
  for (let x = 0; x < w; x++) {
    const u = x / w;
    const angle = u * Math.PI * 2;
    const ribWave = Math.cos(angle * ribCount);
    // Crease darkening when ribWave < 0
    const creaseIntensity = Math.pow(Math.max(0, -ribWave), 1.8);
    if (creaseIntensity > 0.02) {
      ctx.fillStyle = hexToRgba(preset.grooveColor, creaseIntensity * 0.65);
      ctx.fillRect(x, 0, 1, h);
    }
    // Warm highlight along lobe crest when ribWave > 0.5
    const crestIntensity = Math.pow(Math.max(0, ribWave), 2.2);
    if (crestIntensity > 0.05) {
      ctx.fillStyle = hexToRgba(preset.subsurfaceColor, crestIntensity * 0.18);
      ctx.fillRect(x, 0, 1, h);
    }
  }

  // Organic mottled skin cells & speckles (deterministic seed)
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Soft organic mottling blotches
  for (let i = 0; i < 420; i++) {
    const cx = rand() * w;
    const cy = rand() * h;
    const rx = 6 + rand() * 28;
    const ry = 12 + rand() * 45;
    const isLight = rand() > 0.45;
    const color = isLight ? preset.subsurfaceColor : preset.grooveColor;
    const alpha = isLight ? 0.045 : 0.055;

    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, Math.max(rx, ry));
    grad.addColorStop(0, hexToRgba(color, alpha));
    grad.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine natural rind pores and tiny sugar-wart freckles
  for (let i = 0; i < 1200; i++) {
    const cx = rand() * w;
    const cy = rand() * h;
    const r = 0.8 + rand() * 2.2;
    ctx.fillStyle =
      rand() > 0.35
        ? hexToRgba(preset.grooveColor, 0.18)
        : hexToRgba('#fff3d6', 0.12);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function generateAlbedoTexture(
  preset: MaterialPreset,
  ribCount: number,
  anisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  drawAlbedoCanvas(canvas, preset, ribCount);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}

function generateBumpTexture(
  ribCount: number,
  anisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    // Fine vertical vascular ridges & micro-creases
    for (let x = 0; x < 512; x++) {
      const u = x / 512;
      const micro =
        Math.sin(u * Math.PI * 2 * ribCount * 4) * 18 +
        Math.cos(u * Math.PI * 2 * 67) * 9;
      const val = Math.max(0, Math.min(255, Math.round(128 + micro)));
      ctx.fillStyle = `rgb(${val},${val},${val})`;
      ctx.fillRect(x, 0, 1, 512);
    }

    // Organic dimples and pores
    let seed = 4242;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 1600; i++) {
      const cx = rand() * 512;
      const cy = rand() * 512;
      const r = 1 + rand() * 3.5;
      const bright = rand() > 0.65 ? 175 : 85;
      ctx.fillStyle = `rgba(${bright},${bright},${bright},0.22)`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}

function generateRoughnessTexture(
  ribCount: number,
  anisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Creases are rougher/earthier (higher value); outer lobe crests are waxier/smoother (lower value)
    for (let x = 0; x < 256; x++) {
      const u = x / 256;
      const ribWave = Math.cos(u * Math.PI * 2 * ribCount);
      // ribWave = 1 (crest) -> smoother (85); ribWave = -1 (crease) -> rougher (195)
      const baseRough = Math.round(140 - ribWave * 55);
      ctx.fillStyle = `rgb(${baseRough},${baseRough},${baseRough})`;
      ctx.fillRect(x, 0, 1, 256);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}

/**
 * Generates an internal subsurface glow map:
 * Thinner rib valleys and equatorial wall zones transmit more warm internal candle light,
 * while thick polar rinds block more light.
 */
function generateSubsurfaceTexture(
  ribCount: number,
  anisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 512);

    for (let x = 0; x < 512; x++) {
      const u = x / 512;
      const ribWave = Math.cos(u * Math.PI * 2 * ribCount);
      // Thin valleys (-1) and mid-walls glow warmly; thick outer lobe centers attenuate slightly
      const thinness = 0.65 + (1 - ribWave) * 0.175;
      const r = Math.min(255, Math.round(255 * thinness));
      const g = Math.min(255, Math.round(115 * thinness));
      const b = Math.min(255, Math.round(18 * thinness));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, 0, 1, 512);
    }

    // Attenuate top and bottom poles where pumpkin flesh is thickest
    const poleMask = ctx.createLinearGradient(0, 0, 0, 512);
    poleMask.addColorStop(0, 'rgba(0,0,0,0.85)');
    poleMask.addColorStop(0.18, 'rgba(0,0,0,0.15)');
    poleMask.addColorStop(0.5, 'rgba(0,0,0,0)');
    poleMask.addColorStop(0.82, 'rgba(0,0,0,0.15)');
    poleMask.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = poleMask;
    ctx.fillRect(0, 0, 512, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}

function generateStemBarkTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    let seed = 9001;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Fibrous woody striations along the stem
    for (let i = 0; i < 380; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      const len = 20 + rand() * 60;
      const shade = rand() > 0.5 ? 200 : 55;
      ctx.strokeStyle = `rgba(${shade},${shade},${shade},0.35)`;
      ctx.lineWidth = 1 + rand() * 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 8, y + len);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}

function generateContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
    grad.addColorStop(0, 'rgba(5, 2, 0, 0.92)');
    grad.addColorStop(0.45, 'rgba(8, 3, 0, 0.65)');
    grad.addColorStop(0.75, 'rgba(12, 4, 0, 0.22)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function generateEmberParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 240, 190, 1)');
    grad.addColorStop(0.35, 'rgba(255, 145, 40, 0.8)');
    grad.addColorStop(0.7, 'rgba(255, 70, 10, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
