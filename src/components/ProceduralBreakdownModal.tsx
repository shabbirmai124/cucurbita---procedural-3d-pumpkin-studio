import React from 'react';
import { X, Code2, Sparkles, Flame, Layers, Compass, Cpu } from 'lucide-react';
import {
  PumpkinSculptParams,
  StemSculptParams,
  MaterialPreset,
  LightingPreset,
} from '../utils/pumpkinMath';

interface ProceduralBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  sculptParams: PumpkinSculptParams;
  stemParams: StemSculptParams;
  materialPreset: MaterialPreset;
  lightingPreset: LightingPreset;
  candleIntensity: number;
  flickerSpeed: number;
  subsurfaceStrength: number;
  clearcoatStrength: number;
}

export const ProceduralBreakdownModal: React.FC<ProceduralBreakdownModalProps> = ({
  isOpen,
  onClose,
  sculptParams,
  stemParams,
  materialPreset,
  lightingPreset,
  candleIntensity,
  flickerSpeed,
  subsurfaceStrength,
  clearcoatStrength,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      number: '01',
      title: 'Scene Setup & ACES Filmic Environment',
      icon: Compass,
      summary:
        'Configured with ACESFilmicToneMapping (exposure 1.18), PCFSoftShadowMap, RoomEnvironment PMREM reflections, and damped OrbitControls.',
      code: `renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.fog = new THREE.FogExp2('${lightingPreset.fogColor}', 0.075);`,
    },
    {
      number: '02',
      title: 'Sculpting the Pumpkin (Procedural Cosine Geometry)',
      icon: Cpu,
      summary: `Every vertex on a 128×96 SphereGeometry (r = ${sculptParams.baseRadius.toFixed(
        2
      )}) is squashed vertically by ${sculptParams.squashY.toFixed(
        2
      )}, tapered toward the poles, and displaced radially by a ${
        sculptParams.ribCount
      }-lobe cosine wave.`,
      code: `const angle = Math.atan2(z, x);
const verticalTaper = Math.pow(Math.sin(Math.acos(ny)), 0.75);
const rawCos = Math.cos(angle * ${sculptParams.ribCount});
const shapedRibWave = rawCos - 0.18 * (1 - rawCos * rawCos);
const radialDisp = 1 + (shapedRibWave * ${sculptParams.ribDepth.toFixed(3)}) * verticalTaper;
const squashedY = y * ${sculptParams.squashY.toFixed(2)} - Math.sign(ny) * poleIndent;`,
    },
    {
      number: '03',
      title: 'The Skin (MeshPhysicalMaterial & Subsurface Scattering)',
      icon: Layers,
      summary: `Waxy gourd cuticle simulated via clearcoat (${clearcoatStrength.toFixed(
        2
      )}) and calibrated roughness, paired with elevated transmission & subsurface emissive bleed (${subsurfaceStrength.toFixed(
        2
      )}).`,
      code: `const skinMaterial = new THREE.MeshPhysicalMaterial({
  color: '${materialPreset.primaryColor}',
  roughness: ${materialPreset.roughness.toFixed(2)},
  clearcoat: ${clearcoatStrength.toFixed(2)},
  clearcoatRoughness: ${materialPreset.clearcoatRoughness.toFixed(2)},
  transmission: ${(subsurfaceStrength * 0.45).toFixed(2)},
  thickness: ${materialPreset.thickness.toFixed(1)},
  attenuationColor: new THREE.Color('${materialPreset.subsurfaceColor}'),
});`,
    },
    {
      number: '04',
      title: 'The Warm Glow (4-Layer Studio & Core Lighting)',
      icon: Flame,
      summary: `Combines dim warm-brown ambient fill (${lightingPreset.ambientColor}), warm orange key light (${lightingPreset.keyColor}), cool blue rim separation (${lightingPreset.rimColor}), and an internal candle PointLight at (0, 0, 0).`,
      code: `const ambient = new THREE.AmbientLight('${lightingPreset.ambientColor}', ${lightingPreset.ambientIntensity});
const keyLight = new THREE.DirectionalLight('${lightingPreset.keyColor}', ${lightingPreset.keyIntensity});
keyLight.position.set(-4.2, 4.6, 3.8);
const rimLight = new THREE.DirectionalLight('${lightingPreset.rimColor}', ${lightingPreset.rimIntensity});
const coreCandle = new THREE.PointLight('${lightingPreset.candleColor}', ${candleIntensity.toFixed(1)}, 8.5, 1.6);
coreCandle.position.set(0, 0, 0);`,
    },
    {
      number: '05',
      title: 'Growing the Stem (CatmullRomCurve3 & TubeGeometry)',
      icon: Sparkles,
      summary: `A 5-point CatmullRomCurve3 sprouts from the sunken crown dimple, wrapped in a ${stemParams.stemRidges}-ridged TubeGeometry with ${stemParams.stemTwist.toFixed(
        2
      )} rad axial twist and organic bark noise.`,
      code: `const stemCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.08, 0.27, -0.05),
  new THREE.Vector3(0.25, 0.59, -0.11),
  new THREE.Vector3(0.46, 0.95 * ${stemParams.stemLength.toFixed(2)}, 0.05),
]);
const stemGeo = new THREE.TubeGeometry(stemCurve, 48, 0.22, 28, false);`,
    },
    {
      number: '06',
      title: 'Bringing It to Life (Breathing Rotation & Candle Flicker)',
      icon: Code2,
      summary: `Overlapping sine and cosine harmonics at ${flickerSpeed.toFixed(
        1
      )}× speed plus deterministic micro-noise drive the internal PointLight intensity and subsurface glow.`,
      code: `const t = elapsedTime * ${flickerSpeed.toFixed(2)};
const slowBreath = Math.sin(t * 2.3) * 0.35 + Math.cos(t * 1.7 + 0.8) * 0.25;
const midFlutter = Math.sin(t * 7.9 + 1.4) * 0.25 + Math.cos(t * 11.3) * 0.18;
const rapidSputter = Math.sin(t * 23.1) * Math.cos(t * 17.7) * 0.15;
coreCandle.intensity = ${candleIntensity.toFixed(1)} * (1 + (slowBreath + midFlutter + rapidSputter) * 0.35);`,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-procedural-title"
    >
      <div className="relative w-full max-w-4xl max-h-[86vh] overflow-y-auto rounded-2xl bg-[#140d09] border border-amber-500/20 text-stone-100 shadow-2xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <p className="text-xs font-mono text-amber-400/90 tracking-wide">
              Raw Three.js Mathematical Architecture · Zero External 3D Assets
            </p>
            <h2
              id="modal-procedural-title"
              className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-stone-50"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              6-Stage Procedural Pumpkin Synthesis
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Procedural Breakdown Modal"
            className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="rounded-xl bg-[#1c120c] border border-white/10 p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-amber-400/90 font-mono">
                    <span>
                      {step.number}. {step.title}
                    </span>
                    <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                  </div>
                  <p className="mt-2 text-xs sm:text-sm text-stone-300 leading-relaxed">
                    {step.summary}
                  </p>
                </div>
                <pre className="mt-2 p-3 rounded-lg bg-[#0d0704] border border-white/5 text-[11px] font-mono text-amber-200/90 overflow-x-auto leading-relaxed">
                  <code>{step.code}</code>
                </pre>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400">
          <span>
            All parameters above update dynamically as you sculpt ribs, skin
            translucency, and candle flicker in the bottom studio dock.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            Return to 3D Studio
          </button>
        </div>
      </div>
    </div>
  );
};
