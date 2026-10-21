import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sliders,
  Sparkles,
  Flame,
  Camera,
  Eye,
  Grid,
  Pause,
  Play,
} from 'lucide-react';
import {
  PumpkinSculptParams,
  StemSculptParams,
  MaterialPreset,
  LightingPreset,
  MATERIAL_PRESETS,
  LIGHTING_PRESETS,
} from '../utils/pumpkinMath';
import { CAMERA_PRESETS, CameraPresetId } from './PumpkinViewport';

export type StudioTabId = 'sculpt' | 'material' | 'lighting' | 'camera';

interface BottomControlDockProps {
  activeTab: StudioTabId;
  setActiveTab: (tab: StudioTabId) => void;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  sculptParams: PumpkinSculptParams;
  setSculptParams: React.Dispatch<React.SetStateAction<PumpkinSculptParams>>;
  stemParams: StemSculptParams;
  setStemParams: React.Dispatch<React.SetStateAction<StemSculptParams>>;
  materialPreset: MaterialPreset;
  onSelectMaterialPreset: (preset: MaterialPreset) => void;
  lightingPreset: LightingPreset;
  onSelectLightingPreset: (preset: LightingPreset) => void;
  candleIntensity: number;
  setCandleIntensity: (val: number) => void;
  flickerSpeed: number;
  setFlickerSpeed: (val: number) => void;
  flickerAmount: number;
  setFlickerAmount: (val: number) => void;
  subsurfaceStrength: number;
  setSubsurfaceStrength: (val: number) => void;
  clearcoatStrength: number;
  setClearcoatStrength: (val: number) => void;
  roughnessOverride: number;
  setRoughnessOverride: (val: number) => void;
  autoRotateSpeed: number;
  setAutoRotateSpeed: (val: number) => void;
  explodedAmount: number;
  setExplodedAmount: (val: number) => void;
  cutawayMode: boolean;
  setCutawayMode: React.Dispatch<React.SetStateAction<boolean>>;
  wireframeOverlay: boolean;
  setWireframeOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  cameraPreset: CameraPresetId;
  onSelectCameraPreset: (id: CameraPresetId) => void;
  onResetAll: () => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  sculptParams,
  setSculptParams,
  stemParams,
  setStemParams,
  materialPreset,
  onSelectMaterialPreset,
  lightingPreset,
  onSelectLightingPreset,
  candleIntensity,
  setCandleIntensity,
  flickerSpeed,
  setFlickerSpeed,
  flickerAmount,
  setFlickerAmount,
  subsurfaceStrength,
  setSubsurfaceStrength,
  clearcoatStrength,
  setClearcoatStrength,
  roughnessOverride,
  setRoughnessOverride,
  autoRotateSpeed,
  setAutoRotateSpeed,
  explodedAmount,
  setExplodedAmount,
  cutawayMode,
  setCutawayMode,
  wireframeOverlay,
  setWireframeOverlay,
  cameraPreset,
  onSelectCameraPreset,
  onResetAll,
}) => {
  const tabs: { id: StudioTabId; label: string; icon: React.ElementType }[] = [
    { id: 'sculpt', label: 'Sculpt & Ribs', icon: Sliders },
    { id: 'material', label: 'Skin & Subsurface', icon: Sparkles },
    { id: 'lighting', label: 'Candle & Glow', icon: Flame },
    { id: 'camera', label: 'Camera & Anatomy', icon: Camera },
  ];

  return (
    <section
      aria-label="3D Pumpkin Studio Controls"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[94vw] max-w-[920px] pointer-events-none flex flex-col items-center"
    >
      {/* Collapse / Expand Cinema Toggle Handle */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-1.5 max-w-full">
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-[#160d08] border border-amber-500/25 text-[11px] sm:text-xs font-medium text-stone-200 hover:text-amber-300 hover:border-amber-400/40 transition-colors shadow-lg cursor-pointer whitespace-nowrap shrink-0"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setAutoRotateSpeed(autoRotateSpeed > 0 ? 0 : 0.6)}
          aria-label={
            autoRotateSpeed > 0
              ? 'Pause Breathing Rotation'
              : 'Resume Breathing Rotation'
          }
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#160d08] border border-white/10 text-[11px] sm:text-xs font-medium text-stone-300 hover:text-white hover:border-white/25 transition-colors shadow-lg cursor-pointer whitespace-nowrap shrink-0"
        >
          {autoRotateSpeed > 0 ? (
            <>
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              <span>Pause Orbit</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span>Resume Orbit</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setCutawayMode((prev) => !prev)}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-[11px] sm:text-xs font-medium transition-colors shadow-lg cursor-pointer whitespace-nowrap shrink-0 ${
            cutawayMode
              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
              : 'bg-[#160d08] border-white/10 text-stone-300 hover:text-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>{cutawayMode ? 'Close Rind Window' : 'Inspect Core Candle'}</span>
        </button>
      </div>

      {/* Main Dock Panel */}
      {!isCollapsed && (
        <div className="pointer-events-auto w-full rounded-2xl bg-[#140c08] border border-amber-500/20 shadow-2xl p-3.5 sm:p-4 text-stone-100">
          {/* Top Bar inside Dock: Segmented Tab Bar + Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div
              role="tablist"
              aria-label="Studio Parameter Categories"
              className="flex items-center gap-1 p-1 rounded-xl bg-[#0b0604] border border-white/5 overflow-x-auto max-w-full"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-amber-600 text-stone-950 font-semibold shadow-sm'
                        : 'text-stone-400 hover:text-stone-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWireframeOverlay((w) => !w)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  wireframeOverlay
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-[#1c120c] border-white/10 text-stone-300 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Wireframe</span>
              </button>

              <button
                type="button"
                onClick={onResetAll}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1c120c] border border-white/10 text-xs font-medium text-stone-300 hover:text-amber-300 hover:border-amber-500/30 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Sculpt & Ribs (Procedural Sphere + Cosine Wave + Catmull-Rom Stem) */}
          {activeTab === 'sculpt' && (
            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-center">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-rib-count" className="text-stone-300 font-medium">
                    Cosine Ribs (Lobes)
                  </label>
                  <span className="font-mono tabular-nums text-amber-400">
                    {sculptParams.ribCount}
                  </span>
                </div>
                <input
                  id="slider-rib-count"
                  type="range"
                  min={6}
                  max={20}
                  step={1}
                  value={sculptParams.ribCount}
                  onChange={(e) =>
                    setSculptParams((p) => ({
                      ...p,
                      ribCount: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-rib-depth" className="text-stone-300 font-medium">
                    Rib Crease Depth
                  </label>
                  <span className="font-mono tabular-nums text-amber-400">
                    {(sculptParams.ribDepth * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  id="slider-rib-depth"
                  type="range"
                  min={0.03}
                  max={0.2}
                  step={0.005}
                  value={sculptParams.ribDepth}
                  onChange={(e) =>
                    setSculptParams((p) => ({
                      ...p,
                      ribDepth: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-squash-y" className="text-stone-300 font-medium">
                    Vertical Squash (Y)
                  </label>
                  <span className="font-mono tabular-nums text-amber-400">
                    {sculptParams.squashY.toFixed(2)}×
                  </span>
                </div>
                <input
                  id="slider-squash-y"
                  type="range"
                  min={0.62}
                  max={0.96}
                  step={0.01}
                  value={sculptParams.squashY}
                  onChange={(e) =>
                    setSculptParams((p) => ({
                      ...p,
                      squashY: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-pole-indent" className="text-stone-300 font-medium">
                    Crown Dimple Taper
                  </label>
                  <span className="font-mono tabular-nums text-amber-400">
                    {(sculptParams.poleIndent * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  id="slider-pole-indent"
                  type="range"
                  min={0.06}
                  max={0.3}
                  step={0.01}
                  value={sculptParams.poleIndent}
                  onChange={(e) =>
                    setSculptParams((p) => ({
                      ...p,
                      poleIndent: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-stem-twist" className="text-stone-300 font-medium">
                    Stem Curve & Twist
                  </label>
                  <span className="font-mono tabular-nums text-amber-400">
                    {stemParams.stemTwist.toFixed(1)} rad
                  </span>
                </div>
                <input
                  id="slider-stem-twist"
                  type="range"
                  min={0.3}
                  max={3.4}
                  step={0.1}
                  value={stemParams.stemTwist}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStemParams((s) => ({
                      ...s,
                      stemTwist: val,
                      stemBend: 0.4 + (val / 3.4) * 0.7,
                    }));
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Skin & Subsurface (MeshPhysicalMaterial Finishes & Translucency) */}
          {activeTab === 'material' && (
            <div className="pt-3 flex flex-col gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MATERIAL_PRESETS.map((preset) => {
                  const selected = materialPreset.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectMaterialPreset(preset)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                        selected
                          ? 'bg-amber-500/15 border-amber-400 text-stone-50'
                          : 'bg-[#1c120c] border-white/10 text-stone-300 hover:border-white/25'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-md shrink-0 border border-white/20"
                        style={{
                          background: `linear-gradient(135deg, ${preset.primaryColor}, ${preset.grooveColor})`,
                        }}
                      />
                      <span className="text-xs font-medium truncate">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor="slider-subsurface"
                      className="text-stone-300 font-medium"
                    >
                      Subsurface Scattering Bleed
                    </label>
                    <span className="font-mono tabular-nums text-amber-400">
                      {(subsurfaceStrength * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    id="slider-subsurface"
                    type="range"
                    min={0}
                    max={1.4}
                    step={0.05}
                    value={subsurfaceStrength}
                    onChange={(e) =>
                      setSubsurfaceStrength(Number(e.target.value))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor="slider-clearcoat"
                      className="text-stone-300 font-medium"
                    >
                      Waxy Rind Clearcoat
                    </label>
                    <span className="font-mono tabular-nums text-amber-400">
                      {(clearcoatStrength * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    id="slider-clearcoat"
                    type="range"
                    min={0}
                    max={1}
                    step={0.04}
                    value={clearcoatStrength}
                    onChange={(e) =>
                      setClearcoatStrength(Number(e.target.value))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor="slider-roughness"
                      className="text-stone-300 font-medium"
                    >
                      Surface Micro-Roughness
                    </label>
                    <span className="font-mono tabular-nums text-amber-400">
                      {roughnessOverride.toFixed(2)}
                    </span>
                  </div>
                  <input
                    id="slider-roughness"
                    type="range"
                    min={0.08}
                    max={0.85}
                    step={0.02}
                    value={roughnessOverride}
                    onChange={(e) =>
                      setRoughnessOverride(Number(e.target.value))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Candle & Lighting (Core PointLight at (0,0,0) & Studio Rig) */}
          {activeTab === 'lighting' && (
            <div className="pt-3 flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {LIGHTING_PRESETS.map((lPreset) => {
                  const selected = lightingPreset.id === lPreset.id;
                  return (
                    <button
                      key={lPreset.id}
                      type="button"
                      onClick={() => onSelectLightingPreset(lPreset)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                        selected
                          ? 'bg-amber-500/15 border-amber-400 text-stone-50'
                          : 'bg-[#1c120c] border-white/10 text-stone-300 hover:border-white/25'
                      }`}
                    >
                      <span className="truncate">{lPreset.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className="w-3 h-3 rounded-sm border border-white/20"
                          style={{ backgroundColor: lPreset.keyColor }}
                          title="Key Light"
                        />
                        <span
                          className="w-3 h-3 rounded-sm border border-white/20"
                          style={{ backgroundColor: lPreset.rimColor }}
                          title="Rim Light"
                        />
                        <span
                          className="w-3 h-3 rounded-sm border border-white/20"
                          style={{ backgroundColor: lPreset.candleColor }}
                          title="Core Candle Light"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor="slider-candle-intensity"
                      className="text-stone-300 font-medium"
                    >
                      Core PointLight (0,0,0)
                    </label>
                    <span className="font-mono tabular-nums text-amber-400">
                      {candleIntensity.toFixed(1)} cd
                    </span>
                  </div>
                  <input
                    id="slider-candle-intensity"
                    type="range"
                    min={0}
                    max={12}
                    step={0.3}
                    value={candleIntensity}
                    onChange={(e) => setCandleIntensity(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor="slider-flicker-speed"
                      className="text-stone-300 font-medium"
                    >
                      Sine/Cosine Flicker Speed
                    </label>
                    <span className="font-mono tabular-nums text-amber-400">
                      {flickerSpeed.toFixed(1)}×
                    </span>
                  </div>
                  <input
                    id="slider-flicker-speed"
                    type="range"
                    min={0.2}
                    max={2.5}
                    step={0.1}
                    value={flickerSpeed}
                    onChange={(e) => setFlickerSpeed(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor="slider-flicker-amount"
                      className="text-stone-300 font-medium"
                    >
                      Flame Oxygen Turbulence
                    </label>
                    <span className="font-mono tabular-nums text-amber-400">
                      {(flickerAmount * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    id="slider-flicker-amount"
                    type="range"
                    min={0}
                    max={0.75}
                    step={0.05}
                    value={flickerAmount}
                    onChange={(e) => setFlickerAmount(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Camera Presets & Anatomy Inspection */}
          {activeTab === 'camera' && (
            <div className="pt-3 flex flex-col gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CAMERA_PRESETS.map((cam) => {
                  const selected = cameraPreset === cam.id;
                  return (
                    <button
                      key={cam.id}
                      type="button"
                      onClick={() => onSelectCameraPreset(cam.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap truncate ${
                        selected
                          ? 'bg-amber-500/15 border-amber-400 text-stone-50'
                          : 'bg-[#1c120c] border-white/10 text-stone-300 hover:border-white/25'
                      }`}
                    >
                      {cam.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor="slider-exploded"
                      className="text-stone-300 font-medium"
                    >
                      Exploded Stem & Crown Lift
                    </label>
                    <span className="font-mono tabular-nums text-amber-400">
                      {(explodedAmount * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    id="slider-exploded"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={explodedAmount}
                    onChange={(e) => setExplodedAmount(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <label
                      htmlFor="slider-rotation-speed"
                      className="text-stone-300 font-medium"
                    >
                      Breathing Y-Axis Rotation
                    </label>
                    <span className="font-mono tabular-nums text-amber-400">
                      {autoRotateSpeed.toFixed(1)}×
                    </span>
                  </div>
                  <input
                    id="slider-rotation-speed"
                    type="range"
                    min={0}
                    max={2.0}
                    step={0.1}
                    value={autoRotateSpeed}
                    onChange={(e) => setAutoRotateSpeed(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
