/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  DEFAULT_PUMPKIN_PARAMS,
  DEFAULT_STEM_PARAMS,
  MATERIAL_PRESETS,
  LIGHTING_PRESETS,
  PumpkinSculptParams,
  StemSculptParams,
  MaterialPreset,
  LightingPreset,
} from './utils/pumpkinMath';
import { PumpkinViewport, CameraPresetId } from './components/PumpkinViewport';
import { BottomControlDock, StudioTabId } from './components/BottomControlDock';
import { ProceduralBreakdownModal } from './components/ProceduralBreakdownModal';

export default function App() {
  const [sculptParams, setSculptParams] = useState<PumpkinSculptParams>(
    DEFAULT_PUMPKIN_PARAMS
  );
  const [stemParams, setStemParams] =
    useState<StemSculptParams>(DEFAULT_STEM_PARAMS);
  const [materialPreset, setMaterialPreset] = useState<MaterialPreset>(
    MATERIAL_PRESETS[0]
  );
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>(
    LIGHTING_PRESETS[0]
  );

  const [candleIntensity, setCandleIntensity] = useState<number>(
    LIGHTING_PRESETS[0].candleBaseIntensity
  );
  const [flickerSpeed, setFlickerSpeed] = useState<number>(1.0);
  const [flickerAmount, setFlickerAmount] = useState<number>(0.38);

  const [subsurfaceStrength, setSubsurfaceStrength] = useState<number>(0.75);
  const [clearcoatStrength, setClearcoatStrength] = useState<number>(
    MATERIAL_PRESETS[0].clearcoat
  );
  const [roughnessOverride, setRoughnessOverride] = useState<number>(
    MATERIAL_PRESETS[0].roughness
  );

  const [autoRotateSpeed, setAutoRotateSpeed] = useState<number>(0.55);
  const [explodedAmount, setExplodedAmount] = useState<number>(0);
  const [cutawayMode, setCutawayMode] = useState<boolean>(false);
  const [wireframeOverlay, setWireframeOverlay] = useState<boolean>(false);

  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('hero');
  const [cameraTriggerCount, setCameraTriggerCount] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<StudioTabId>('sculpt');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(false);

  const candleTelemetryDomRef = useRef<HTMLSpanElement | null>(null);

  const handleSelectMaterialPreset = useCallback((preset: MaterialPreset) => {
    setMaterialPreset(preset);
    setClearcoatStrength(preset.clearcoat);
    setRoughnessOverride(preset.roughness);
  }, []);

  const handleSelectLightingPreset = useCallback((preset: LightingPreset) => {
    setLightingPreset(preset);
    setCandleIntensity(preset.candleBaseIntensity);
  }, []);

  const handleSelectCameraPreset = useCallback((id: CameraPresetId) => {
    setCameraPreset(id);
    setCameraTriggerCount((c) => c + 1);
    if (id === 'cutaway-core') {
      setCutawayMode(true);
    }
  }, []);

  const handleResetAll = useCallback(() => {
    setSculptParams(DEFAULT_PUMPKIN_PARAMS);
    setStemParams(DEFAULT_STEM_PARAMS);
    setMaterialPreset(MATERIAL_PRESETS[0]);
    setLightingPreset(LIGHTING_PRESETS[0]);
    setCandleIntensity(LIGHTING_PRESETS[0].candleBaseIntensity);
    setFlickerSpeed(1.0);
    setFlickerAmount(0.38);
    setSubsurfaceStrength(0.75);
    setClearcoatStrength(MATERIAL_PRESETS[0].clearcoat);
    setRoughnessOverride(MATERIAL_PRESETS[0].roughness);
    setAutoRotateSpeed(0.55);
    setExplodedAmount(0);
    setCutawayMode(false);
    setWireframeOverlay(false);
    setCameraPreset('hero');
    setCameraTriggerCount((c) => c + 1);
  }, []);

  // Keyboard shortcut 'H' to collapse/expand bottom control dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((prev) => !prev);
      } else if (e.key === 'Escape' && isBreakdownOpen) {
        setIsBreakdownOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isBreakdownOpen]);

  const navigateToStudioTab = (tab: StudioTabId) => {
    setActiveTab(tab);
    setIsDockCollapsed(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0e0704] text-stone-100 select-none">
      {/* 100% Full-Viewport Three.js Procedural Pumpkin Canvas */}
      <PumpkinViewport
        sculptParams={sculptParams}
        stemParams={stemParams}
        materialPreset={materialPreset}
        lightingPreset={lightingPreset}
        candleIntensity={candleIntensity}
        flickerSpeed={flickerSpeed}
        flickerAmount={flickerAmount}
        subsurfaceStrength={subsurfaceStrength}
        clearcoatStrength={clearcoatStrength}
        roughnessOverride={roughnessOverride}
        autoRotateSpeed={autoRotateSpeed}
        explodedAmount={explodedAmount}
        cutawayMode={cutawayMode}
        wireframeOverlay={wireframeOverlay}
        cameraPreset={cameraPreset}
        cameraTriggerCount={cameraTriggerCount}
        candleTelemetryDomRef={candleTelemetryDomRef}
      />

      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="relative z-20 flex items-center justify-between gap-8 px-6 py-3.5 border-b border-white/10 bg-[#110905]/90">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleSelectCameraPreset('hero');
          }}
          className="text-lg font-bold tracking-tight text-amber-50 whitespace-nowrap shrink-0"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Cucurbita Studio
        </a>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav
          aria-label="Studio Sections"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-300"
        >
          <a
            href="#sculpt"
            onClick={(e) => {
              e.preventDefault();
              navigateToStudioTab('sculpt');
            }}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'sculpt' ? 'text-amber-400 underline underline-offset-4' : ''
            }`}
          >
            Sculpting
          </a>
          <a
            href="#material"
            onClick={(e) => {
              e.preventDefault();
              navigateToStudioTab('material');
            }}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'material' ? 'text-amber-400 underline underline-offset-4' : ''
            }`}
          >
            Subsurface Skin
          </a>
          <a
            href="#lighting"
            onClick={(e) => {
              e.preventDefault();
              navigateToStudioTab('lighting');
            }}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'lighting' ? 'text-amber-400 underline underline-offset-4' : ''
            }`}
          >
            Candlelight
          </a>
          <a
            href="#camera"
            onClick={(e) => {
              e.preventDefault();
              navigateToStudioTab('camera');
            }}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'camera' ? 'text-amber-400 underline underline-offset-4' : ''
            }`}
          >
            Camera Views
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsBreakdownOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-stone-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Inspect Procedural Math
          </button>
        </div>
      </header>

      {/* Minimal Unobstructed Top-Left Spec Readout (Unboxed Typography with · Separators) */}
      <main className="pointer-events-none relative z-10 px-6 pt-4">
        <div className="max-w-md">
          <h1
            className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-100"
            style={{ fontFamily: "'Fraunces', serif", textWrap: 'balance' }}
          >
            {materialPreset.name} Gourd
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-400 font-mono tabular-nums">
            <span>{sculptParams.ribCount} Cosine Ribs</span>
            <span aria-hidden="true">·</span>
            <span>Squash {sculptParams.squashY.toFixed(2)}y</span>
            <span aria-hidden="true">·</span>
            <span>{lightingPreset.name}</span>
            <span aria-hidden="true">·</span>
            <span>
              Core Candle:{' '}
              <span ref={candleTelemetryDomRef} className="text-amber-400">
                {candleIntensity.toFixed(2)} cd
              </span>
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-400/90 hidden sm:block">
            Drag to orbit · Scroll to zoom · Pure procedural Sphere &amp; Tube
            vertex math
          </p>
        </div>
      </main>

      {/* Collapsible Bottom Control Dock */}
      <BottomControlDock
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isDockCollapsed}
        setIsCollapsed={setIsDockCollapsed}
        sculptParams={sculptParams}
        setSculptParams={setSculptParams}
        stemParams={stemParams}
        setStemParams={setStemParams}
        materialPreset={materialPreset}
        onSelectMaterialPreset={handleSelectMaterialPreset}
        lightingPreset={lightingPreset}
        onSelectLightingPreset={handleSelectLightingPreset}
        candleIntensity={candleIntensity}
        setCandleIntensity={setCandleIntensity}
        flickerSpeed={flickerSpeed}
        setFlickerSpeed={setFlickerSpeed}
        flickerAmount={flickerAmount}
        setFlickerAmount={setFlickerAmount}
        subsurfaceStrength={subsurfaceStrength}
        setSubsurfaceStrength={setSubsurfaceStrength}
        clearcoatStrength={clearcoatStrength}
        setClearcoatStrength={setClearcoatStrength}
        roughnessOverride={roughnessOverride}
        setRoughnessOverride={setRoughnessOverride}
        autoRotateSpeed={autoRotateSpeed}
        setAutoRotateSpeed={setAutoRotateSpeed}
        explodedAmount={explodedAmount}
        setExplodedAmount={setExplodedAmount}
        cutawayMode={cutawayMode}
        setCutawayMode={setCutawayMode}
        wireframeOverlay={wireframeOverlay}
        setWireframeOverlay={setWireframeOverlay}
        cameraPreset={cameraPreset}
        onSelectCameraPreset={handleSelectCameraPreset}
        onResetAll={handleResetAll}
      />

      {/* 6-Stage Procedural Math & Code Architecture Modal */}
      <ProceduralBreakdownModal
        isOpen={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        sculptParams={sculptParams}
        stemParams={stemParams}
        materialPreset={materialPreset}
        lightingPreset={lightingPreset}
        candleIntensity={candleIntensity}
        flickerSpeed={flickerSpeed}
        subsurfaceStrength={subsurfaceStrength}
        clearcoatStrength={clearcoatStrength}
      />
    </div>
  );
}
