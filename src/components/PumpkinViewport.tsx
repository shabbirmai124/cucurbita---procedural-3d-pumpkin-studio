import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  PumpkinSculptParams,
  StemSculptParams,
  MaterialPreset,
  LightingPreset,
  computeCandleFlicker,
} from '../utils/pumpkinMath';
import {
  createPumpkinTextures,
  updateAlbedoTextureForPreset,
  PumpkinTextureSet,
} from '../utils/proceduralTextures';
import {
  buildPumpkinAssembly,
  applyPumpkinBodyDeformation,
  createStemAndCalyxGeometries,
  computeCrownAttachmentY,
  PumpkinSceneObjects,
} from '../utils/pumpkinGeometry';

export type CameraPresetId = 'hero' | 'crown' | 'low-angle' | 'cutaway-core';

export interface CameraPresetConfig {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_PRESETS: CameraPresetConfig[] = [
  {
    id: 'hero',
    label: 'Hero Three-Quarter',
    position: [0.45, 1.35, 5.65],
    target: [0, 0.05, 0],
  },
  {
    id: 'crown',
    label: 'Crown & Twisted Stem',
    position: [-1.75, 2.95, 3.45],
    target: [0.08, 0.55, 0],
  },
  {
    id: 'low-angle',
    label: 'Harvest Pedestal',
    position: [2.15, 0.15, 5.15],
    target: [0, 0.05, 0],
  },
  {
    id: 'cutaway-core',
    label: 'Core Candle Chamber',
    position: [0.25, 0.55, 4.45],
    target: [0, -0.02, 0],
  },
];

export interface PumpkinViewportProps {
  sculptParams: PumpkinSculptParams;
  stemParams: StemSculptParams;
  materialPreset: MaterialPreset;
  lightingPreset: LightingPreset;
  candleIntensity: number;
  flickerSpeed: number;
  flickerAmount: number;
  subsurfaceStrength: number;
  clearcoatStrength: number;
  roughnessOverride: number;
  autoRotateSpeed: number;
  explodedAmount: number;
  cutawayMode: boolean;
  wireframeOverlay: boolean;
  cameraPreset: CameraPresetId;
  cameraTriggerCount: number;
  candleTelemetryDomRef: React.RefObject<HTMLSpanElement | null>;
}

const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _candleColor = new THREE.Color();

export const PumpkinViewport: React.FC<PumpkinViewportProps> = ({
  sculptParams,
  stemParams,
  materialPreset,
  lightingPreset,
  candleIntensity,
  flickerSpeed,
  flickerAmount,
  subsurfaceStrength,
  clearcoatStrength,
  roughnessOverride,
  autoRotateSpeed,
  explodedAmount,
  cutawayMode,
  wireframeOverlay,
  cameraPreset,
  cameraTriggerCount,
  candleTelemetryDomRef,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Store mutable settings in a ref so the WebGL render loop always reads fresh state without tearing down the canvas
  const livePropsRef = useRef({
    sculptParams,
    stemParams,
    materialPreset,
    lightingPreset,
    candleIntensity,
    flickerSpeed,
    flickerAmount,
    subsurfaceStrength,
    clearcoatStrength,
    roughnessOverride,
    autoRotateSpeed,
    explodedAmount,
    cutawayMode,
    wireframeOverlay,
  });
  livePropsRef.current = {
    sculptParams,
    stemParams,
    materialPreset,
    lightingPreset,
    candleIntensity,
    flickerSpeed,
    flickerAmount,
    subsurfaceStrength,
    clearcoatStrength,
    roughnessOverride,
    autoRotateSpeed,
    explodedAmount,
    cutawayMode,
    wireframeOverlay,
  };

  const sceneContextRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    textures: PumpkinTextureSet;
    objects: PumpkinSceneObjects;
    ambientLight: THREE.AmbientLight;
    hemiLight: THREE.HemisphereLight;
    keyLight: THREE.DirectionalLight;
    rimLight: THREE.DirectionalLight;
    corePointLight: THREE.PointLight;
    isSoftwareGl: boolean;
    activeCamTransition: boolean;
    desiredCamPos: THREE.Vector3;
    desiredTarget: THREE.Vector3;
    currentExploded: number;
    baseCrownY: number;
  } | null>(null);

  // Initialize WebGLRenderer & Scene once on mount
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initialLight = livePropsRef.current.lightingPreset;
    scene.background = new THREE.Color(initialLight.fogColor);
    scene.fog = new THREE.FogExp2(initialLight.fogColor, 0.075);

    // Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    const computeResponsiveFov = (aspect: number) =>
      aspect < 1 ? Math.min(66, 40 / Math.pow(aspect, 0.52)) : 40;

    const initialAspect = width / height;
    const camera = new THREE.PerspectiveCamera(
      computeResponsiveFov(initialAspect),
      initialAspect,
      0.1,
      60
    );
    camera.position.set(0.45, 1.35, 5.65);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.05, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.4;
    controls.maxDistance = 10.5;
    controls.maxPolarAngle = Math.PI * 0.54; // prevent going underneath pedestal
    controls.update();

    // --- 4. Layered Atmospheric Lighting Design ---
    // 4a. Ambient Light (dim, warm dark-brown fill so shadows are never pitch black)
    const ambientLight = new THREE.AmbientLight(
      initialLight.ambientColor,
      initialLight.ambientIntensity
    );
    scene.add(ambientLight);

    // Subtle warm/cool HemisphereLight fill for natural studio falloff
    const hemiLight = new THREE.HemisphereLight(
      '#ff9d5c',
      '#1a0f2e',
      0.45
    );
    hemiLight.position.set(0, 8, 0);
    scene.add(hemiLight);

    // 4b. Key Light (Strong, warm orange directional light hitting front-left to highlight ribs)
    const keyLight = new THREE.DirectionalLight(
      initialLight.keyColor,
      initialLight.keyIntensity
    );
    keyLight.position.set(-4.2, 4.6, 3.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    const d = 3.2;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // 4c. Rim Light (Cool blue directional backlight to separate pumpkin from dark background)
    const rimLight = new THREE.DirectionalLight(
      initialLight.rimColor,
      initialLight.rimIntensity
    );
    rimLight.position.set(3.8, 3.4, -4.6);
    scene.add(rimLight);

    // 4d. The Core Light (PointLight placed directly at (0,0,0) center of the pumpkin)
    const corePointLight = new THREE.PointLight(
      initialLight.candleColor,
      livePropsRef.current.candleIntensity,
      8.5,
      1.6
    );
    corePointLight.position.set(0, 0, 0);
    scene.add(corePointLight);

    // Build Procedural Textures & 3D Pumpkin Assembly
    const textures = createPumpkinTextures(
      renderer,
      livePropsRef.current.materialPreset,
      livePropsRef.current.sculptParams.ribCount
    );

    const objects = buildPumpkinAssembly(
      livePropsRef.current.sculptParams,
      livePropsRef.current.stemParams,
      livePropsRef.current.materialPreset,
      textures,
      isSoftwareGl
    );
    scene.add(objects.rootGroup);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const desiredCamPos = camera.position.clone();
    const desiredTarget = controls.target.clone();

    const ctx = {
      scene,
      camera,
      renderer,
      controls,
      textures,
      objects,
      ambientLight,
      hemiLight,
      keyLight,
      rimLight,
      corePointLight,
      isSoftwareGl,
      activeCamTransition: false,
      desiredCamPos,
      desiredTarget,
      currentExploded: livePropsRef.current.explodedAmount,
      baseCrownY: computeCrownAttachmentY(livePropsRef.current.sculptParams),
    };
    sceneContextRef.current = ctx;

    // Cancel scripted camera transition when user grabs OrbitControls
    const onControlStart = () => {
      ctx.activeCamTransition = false;
    };
    controls.addEventListener('start', onControlStart);

    // Resize listener with responsive portrait FOV scaling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const aspect = w / h;
      camera.aspect = aspect;
      camera.fov = computeResponsiveFov(aspect);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation & Flicker Loop (with software-WebGL fenceSync guard)
    const clock = new THREE.Clock();
    let frameId = 0;
    let lastTelemetryUpdate = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const props = livePropsRef.current;

      // 1. Breathing Rotation on Y-axis (or face front window when cutawayMode is open)
      if (props.cutawayMode) {
        objects.pumpkinGroup.rotation.y = THREE.MathUtils.damp(
          objects.pumpkinGroup.rotation.y % (Math.PI * 2),
          0,
          8,
          dt
        );
        objects.pumpkinGroup.rotation.z = THREE.MathUtils.damp(
          objects.pumpkinGroup.rotation.z,
          0,
          8,
          dt
        );
      } else if (props.autoRotateSpeed > 0) {
        objects.pumpkinGroup.rotation.y += dt * props.autoRotateSpeed * 0.35;
        // Subtle organic breathing bob on rotation speed
        objects.pumpkinGroup.rotation.z =
          Math.sin(elapsed * 0.9) * 0.012 * Math.min(1, props.autoRotateSpeed);
      }

      // 2. Smooth exponential damping for Exploded Anatomy separation (stem & candle lift)
      ctx.currentExploded = THREE.MathUtils.damp(
        ctx.currentExploded,
        props.explodedAmount,
        6,
        dt
      );
      objects.stemGroup.position.y =
        ctx.baseCrownY + ctx.currentExploded * 0.65;
      objects.bodyMesh.position.y = -ctx.currentExploded * 0.08;

      // 3. Candle Flicker Math (Overlapping sine + cosine waves + micro-noise)
      const flicker = computeCandleFlicker(
        elapsed,
        props.candleIntensity,
        props.flickerSpeed,
        props.flickerAmount
      );

      corePointLight.intensity = flicker.intensity;
      corePointLight.position.set(
        flicker.horizontalSway,
        flicker.verticalOffset,
        flicker.horizontalSway * 0.7
      );

      // Modulate subsurface scattering / internal glow bleed on the pumpkin skin
      // so the candle flame visibly pulses through the ribs and flesh
      const normalizedCandle = flicker.intensity / 6.5;
      objects.bodyMesh.material.emissiveIntensity =
        normalizedCandle * props.subsurfaceStrength * 0.68;

      // Animate internal physical candle flame mesh
      const flameScaleY =
        0.85 + Math.max(0, normalizedCandle) * 0.25 + flicker.verticalOffset * 3.5;
      const flameScaleXZ = 0.9 + Math.max(0, normalizedCandle) * 0.12;
      objects.flameOuterMesh.scale.set(
        flameScaleXZ,
        Math.max(0.2, flameScaleY),
        flameScaleXZ
      );
      objects.flameOuterMesh.position.x = flicker.horizontalSway * 0.6;
      objects.flameOuterMesh.visible = props.candleIntensity > 0.05;
      objects.flameInnerMesh.visible = props.candleIntensity > 0.05;

      // Shift candle light color temperature subtly with flame turbulence
      _candleColor.set(props.lightingPreset.candleColor);
      _candleColor.offsetHSL(flicker.warmthShift * 0.015, 0, flicker.warmthShift * 0.04);
      corePointLight.color.copy(_candleColor);

      // 4. Animate rising warm ember particles
      const emberPos = objects.embersPoints.geometry.attributes
        .position as THREE.BufferAttribute;
      const initPos = objects.emberInitialPositions;
      for (let i = 0; i < emberPos.count; i++) {
        const ix = i * 3;
        const baseX = initPos[ix];
        const baseY = initPos[ix + 1];
        const baseZ = initPos[ix + 2];
        const cycle = (elapsed * 0.22 + i * 0.17) % 1;
        const y = -0.95 + cycle * 3.3;
        const swayX = Math.sin(elapsed * 1.2 + i) * 0.08;
        const swayZ = Math.cos(elapsed * 1.1 + i * 1.3) * 0.08;
        emberPos.setXYZ(i, baseX + swayX, y + (baseY * 0.05), baseZ + swayZ);
      }
      emberPos.needsUpdate = true;

      // 5. Smooth camera preset transitions via exponential damping
      if (ctx.activeCamTransition) {
        camera.position.lerp(
          ctx.desiredCamPos,
          1 - Math.exp(-6.5 * dt)
        );
        controls.target.lerp(
          ctx.desiredTarget,
          1 - Math.exp(-6.5 * dt)
        );
        if (
          camera.position.distanceToSquared(ctx.desiredCamPos) < 0.0005 &&
          controls.target.distanceToSquared(ctx.desiredTarget) < 0.0005
        ) {
          ctx.activeCamTransition = false;
        }
      }

      if (controls.enableDamping) {
        controls.update();
      }

      // Update live telemetry DOM node at <= 10Hz (zero React re-renders)
      if (
        candleTelemetryDomRef.current &&
        elapsed - lastTelemetryUpdate > 0.12
      ) {
        lastTelemetryUpdate = elapsed;
        candleTelemetryDomRef.current.textContent = `${flicker.intensity.toFixed(
          2
        )} cd`;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Re-sculpt Pumpkin Body & Grounding when sculptParams, materialPreset, or cutawayMode change
  useEffect(() => {
    const ctx = sceneContextRef.current;
    if (!ctx) return;

    updateAlbedoTextureForPreset(
      ctx.textures.albedoMap,
      materialPreset,
      sculptParams.ribCount
    );

    const minY = applyPumpkinBodyDeformation(
      ctx.objects.bodyMesh,
      ctx.objects.baseSpherePositions,
      sculptParams,
      materialPreset,
      cutawayMode
    );

    ctx.objects.innerRindMesh.visible = cutawayMode || explodedAmount > 0.15;
    if (cutawayMode) {
      ctx.objects.pumpkinGroup.rotation.set(0, 0, 0);
    }
    ctx.baseCrownY = computeCrownAttachmentY(sculptParams);
    ctx.objects.pedestalGroup.position.y = minY - 0.02;
  }, [sculptParams, materialPreset, cutawayMode, explodedAmount]);

  // Re-sculpt Twisted Stem & Calyx when stemParams or materialPreset change
  useEffect(() => {
    const ctx = sceneContextRef.current;
    if (!ctx) return;

    const { stemGeo, calyxGeo } = createStemAndCalyxGeometries(
      stemParams,
      materialPreset
    );
    ctx.objects.stemMesh.geometry.dispose();
    ctx.objects.stemMesh.geometry = stemGeo;

    ctx.objects.calyxMesh.geometry.dispose();
    ctx.objects.calyxMesh.geometry = calyxGeo;
  }, [stemParams, materialPreset]);

  // Update PBR Material properties (Roughness, Clearcoat, Subsurface Transmission, Wireframe)
  useEffect(() => {
    const ctx = sceneContextRef.current;
    if (!ctx) return;

    const mat = ctx.objects.bodyMesh.material;
    mat.roughness = roughnessOverride;
    mat.clearcoat = clearcoatStrength;
    mat.clearcoatRoughness = materialPreset.clearcoatRoughness;
    mat.transmission = ctx.isSoftwareGl
      ? 0
      : Math.min(0.65, subsurfaceStrength * 0.45);
    mat.thickness = materialPreset.thickness;
    mat.attenuationColor.set(materialPreset.subsurfaceColor);
    mat.emissive.set(materialPreset.subsurfaceColor);
    mat.sheenColor.set(materialPreset.subsurfaceColor);
    mat.wireframe = wireframeOverlay;
    mat.needsUpdate = true;
  }, [
    materialPreset,
    roughnessOverride,
    clearcoatStrength,
    subsurfaceStrength,
    wireframeOverlay,
  ]);

  // Update Lighting Rig when lightingPreset changes
  useEffect(() => {
    const ctx = sceneContextRef.current;
    if (!ctx) return;

    ctx.ambientLight.color.set(lightingPreset.ambientColor);
    ctx.ambientLight.intensity = lightingPreset.ambientIntensity;
    ctx.keyLight.color.set(lightingPreset.keyColor);
    ctx.keyLight.intensity = lightingPreset.keyIntensity;
    ctx.rimLight.color.set(lightingPreset.rimColor);
    ctx.rimLight.intensity = lightingPreset.rimIntensity;
    ctx.corePointLight.color.set(lightingPreset.candleColor);

    ctx.scene.background = new THREE.Color(lightingPreset.fogColor);
    if (ctx.scene.fog instanceof THREE.FogExp2) {
      ctx.scene.fog.color.set(lightingPreset.fogColor);
    }
  }, [lightingPreset]);

  // Trigger smooth camera preset glide
  useEffect(() => {
    const ctx = sceneContextRef.current;
    if (!ctx) return;

    const found =
      CAMERA_PRESETS.find((c) => c.id === cameraPreset) || CAMERA_PRESETS[0];
    _targetCamPos.set(...found.position);
    _targetLookAt.set(...found.target);

    ctx.desiredCamPos.copy(_targetCamPos);
    ctx.desiredTarget.copy(_targetLookAt);

    if (ctx.isSoftwareGl) {
      ctx.camera.position.copy(_targetCamPos);
      ctx.controls.target.copy(_targetLookAt);
      ctx.controls.update();
    } else {
      ctx.activeCamTransition = true;
    }
  }, [cameraPreset, cameraTriggerCount]);

  return (
    <div
      ref={canvasMountRef}
      data-testid="pumpkin-webgl-canvas"
      className="fixed inset-0 w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D Procedural Pumpkin Viewport"
    />
  );
};
