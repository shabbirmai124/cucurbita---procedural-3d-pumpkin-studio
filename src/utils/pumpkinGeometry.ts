import * as THREE from 'three';
import {
  PumpkinSculptParams,
  StemSculptParams,
  MaterialPreset,
  deformPumpkinVertex,
  deformStemVertex,
} from './pumpkinMath';
import { PumpkinTextureSet } from './proceduralTextures';

export interface PumpkinSceneObjects {
  rootGroup: THREE.Group;
  pumpkinGroup: THREE.Group;
  bodyMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>;
  innerRindMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  stemGroup: THREE.Group;
  stemMesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial>;
  calyxMesh: THREE.Mesh<THREE.ConeGeometry, THREE.MeshStandardMaterial>;
  tendrilsGroup: THREE.Group;
  candleGroup: THREE.Group;
  flameOuterMesh: THREE.Mesh<THREE.LatheGeometry, THREE.MeshBasicMaterial>;
  flameInnerMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  pedestalGroup: THREE.Group;
  contactShadowMesh: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  embersPoints: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  emberInitialPositions: Float32Array;
  baseSpherePositions: Float32Array;
}

const _colorPrimary = new THREE.Color();
const _colorGroove = new THREE.Color();
const _colorSubsurface = new THREE.Color();
const _colorStemBase = new THREE.Color();
const _colorStemTip = new THREE.Color();
const _vertexColor = new THREE.Color();

/**
 * Builds the complete composite 3D Pumpkin Studio scene graph (8 distinct procedural parts).
 */
export function buildPumpkinAssembly(
  sculptParams: PumpkinSculptParams,
  stemParams: StemSculptParams,
  preset: MaterialPreset,
  textures: PumpkinTextureSet,
  isSoftwareGl: boolean
): PumpkinSceneObjects {
  const rootGroup = new THREE.Group();
  const pumpkinGroup = new THREE.Group();
  rootGroup.add(pumpkinGroup);

  // 1. Primary Silhouette: High-resolution SphereGeometry for the Pumpkin Body
  const widthSegments = isSoftwareGl ? 96 : 128;
  const heightSegments = isSoftwareGl ? 72 : 96;
  const bodyGeo = new THREE.SphereGeometry(
    sculptParams.baseRadius,
    widthSegments,
    heightSegments
  );

  // Save pristine undeformed sphere vertex coordinates for fast re-sculpting
  const posAttr = bodyGeo.attributes.position as THREE.BufferAttribute;
  const baseSpherePositions = new Float32Array(posAttr.array.length);
  baseSpherePositions.set(posAttr.array);

  // Allocate vertex color attribute
  const colorArray = new Float32Array(posAttr.count * 3);
  bodyGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

  // Skin Material: MeshPhysicalMaterial with waxy clearcoat, subsurface transmission & warm internal emissive bleed
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'), // modulated by albedoMap + vertexColors
    map: textures.albedoMap,
    vertexColors: true,
    roughness: preset.roughness,
    roughnessMap: textures.roughnessMap,
    metalness: 0.02,
    bumpMap: textures.bumpMap,
    bumpScale: 0.032,
    clearcoat: preset.clearcoat,
    clearcoatRoughness: preset.clearcoatRoughness,
    sheen: 0.28,
    sheenRoughness: 0.48,
    sheenColor: new THREE.Color(preset.subsurfaceColor),
    envMapIntensity: 0.5,
    // Subsurface Scattering / Translucency
    transmission: isSoftwareGl ? 0 : preset.transmission,
    thickness: preset.thickness,
    ior: 1.42,
    attenuationColor: new THREE.Color(preset.subsurfaceColor),
    attenuationDistance: 1.35,
    // Internal candle subsurface glow bleed (works on both hardware GPU and software WebGL)
    emissive: new THREE.Color(preset.subsurfaceColor),
    emissiveMap: textures.subsurfaceMap,
    emissiveIntensity: 0.46,
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = !isSoftwareGl;
  bodyMesh.receiveShadow = !isSoftwareGl;
  pumpkinGroup.add(bodyMesh);

  // Inner glowing flesh cavity shell (visible when Cutaway mode is active)
  const innerGeo = new THREE.SphereGeometry(
    sculptParams.baseRadius * 0.82,
    48,
    36
  );
  innerGeo.scale(1, sculptParams.squashY * 0.92, 1);
  const innerMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ff8c24'),
    emissive: new THREE.Color('#ff4500'),
    emissiveIntensity: 0.55,
    roughness: 0.75,
    metalness: 0.0,
    envMapIntensity: 0.2,
    side: THREE.BackSide,
    visible: false,
  });
  const innerRindMesh = new THREE.Mesh(innerGeo, innerMat);
  pumpkinGroup.add(innerRindMesh);

  // 2. Secondary Read: Twisted Organic Stem + Flared Botanical Calyx Crown
  const stemGroup = new THREE.Group();
  pumpkinGroup.add(stemGroup);

  const stemMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ffffff'),
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.02,
    bumpMap: textures.stemBumpMap,
    bumpScale: 0.048,
    envMapIntensity: 0.25,
  });

  const { stemGeo, calyxGeo } = createStemAndCalyxGeometries(
    stemParams,
    preset
  );
  const stemMesh = new THREE.Mesh(stemGeo, stemMat);
  stemMesh.castShadow = !isSoftwareGl;
  stemMesh.receiveShadow = !isSoftwareGl;
  stemGroup.add(stemMesh);

  const calyxMesh = new THREE.Mesh(calyxGeo, stemMat);
  calyxMesh.castShadow = !isSoftwareGl;
  calyxMesh.receiveShadow = !isSoftwareGl;
  stemGroup.add(calyxMesh);

  // 3. Secondary Read: Coiled Botanical Vine Tendrils
  const tendrilsGroup = createCoiledTendrils(stemMat, isSoftwareGl);
  stemGroup.add(tendrilsGroup);

  // 4. Accent Detail: Internal Candle & Flickering Flame Core at (0, 0, 0)
  const { candleGroup, flameOuterMesh, flameInnerMesh } = createInternalCandleCore();
  pumpkinGroup.add(candleGroup);

  // Apply initial vertex deformation to pumpkin body and position stem at crown dimple
  applyPumpkinBodyDeformation(
    bodyMesh,
    baseSpherePositions,
    sculptParams,
    preset,
    false
  );

  const crownY = computeCrownAttachmentY(sculptParams);
  stemGroup.position.set(0, crownY, 0);

  // Calculate lowest Y point of the deformed pumpkin so it rests flush on the pedestal
  bodyGeo.computeBoundingBox();
  const minY = bodyGeo.boundingBox ? bodyGeo.boundingBox.min.y : -1.1;
  const floorY = minY;

  // 5. Grounded Rustic Charred-Oak Harvest Plinth & Contact Shadow
  const { pedestalGroup, contactShadowMesh } = createHarvestPedestal(
    floorY,
    textures,
    isSoftwareGl
  );
  rootGroup.add(pedestalGroup);

  // 6. Atmospheric Floating Harvest Ember Motes
  const { embersPoints, emberInitialPositions } = createFloatingEmbers(
    textures.emberParticleMap
  );
  rootGroup.add(embersPoints);

  return {
    rootGroup,
    pumpkinGroup,
    bodyMesh,
    innerRindMesh,
    stemGroup,
    stemMesh,
    calyxMesh,
    tendrilsGroup,
    candleGroup,
    flameOuterMesh,
    flameInnerMesh,
    pedestalGroup,
    contactShadowMesh,
    embersPoints,
    emberInitialPositions,
    baseSpherePositions,
  };
}

/**
 * Re-sculpts the pumpkin SphereGeometry in place using `deformPumpkinVertex`
 * and updates per-vertex colors for rib grooves, lobe crests, and subsurface warmth.
 */
export function applyPumpkinBodyDeformation(
  bodyMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>,
  basePositions: Float32Array,
  params: PumpkinSculptParams,
  preset: MaterialPreset,
  cutawayMode: boolean
): number {
  const geo = bodyMesh.geometry;
  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const colorAttr = geo.attributes.color as THREE.BufferAttribute;

  _colorPrimary.set(preset.primaryColor);
  _colorGroove.set(preset.grooveColor);
  _colorSubsurface.set(preset.subsurfaceColor);

  const count = posAttr.count;
  let minY = Infinity;

  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const bx = basePositions[ix];
    const by = basePositions[ix + 1];
    const bz = basePositions[ix + 2];

    const deformed = deformPumpkinVertex(bx, by, bz, params);

    // If cutaway mode is enabled, part the front-facing ribs cleanly around +Z (angle near PI/2)
    // so the internal candle and flame core at (0,0,0) are unobstructed
    let finalX = deformed.x;
    let finalY = deformed.y;
    let finalZ = deformed.z;

    if (cutawayMode && finalZ > 0.15 && Math.abs(deformed.normalizedY) < 0.68) {
      const horizFactor = Math.max(0, 1 - Math.abs(finalX) / 0.85);
      const vertFactor = Math.max(0, 1 - Math.abs(deformed.normalizedY) / 0.68);
      const opening = horizFactor * vertFactor;
      if (opening > 0.15) {
        // Part the vertices outward to the left/right edges of the inspection window and tuck inward
        const signX = finalX >= 0 ? 1 : -1;
        finalX += signX * opening * 0.72;
        finalZ *= Math.max(0.05, 1 - opening * 1.15);
      }
    }

    posAttr.setXYZ(i, finalX, finalY, finalZ);
    if (finalY < minY) minY = finalY;

    // Vertex color: blend between deep roasted groove color and warm primary lobe color
    const gf = deformed.grooveFactor;
    const smoothGf = gf * gf * (3 - 2 * gf);
    _vertexColor.copy(_colorGroove).lerp(_colorPrimary, 0.22 + smoothGf * 0.78);

    // Add warm subsurface highlight on upper-mid lobes
    const equatorWarmth = Math.max(0, 1 - Math.abs(deformed.normalizedY) * 1.35);
    _vertexColor.lerp(_colorSubsurface, equatorWarmth * smoothGf * 0.24);

    // Darken deep inside the top/bottom polar dimple
    const poleDarken = Math.pow(Math.abs(deformed.normalizedY), 3.6) * 0.52;
    _vertexColor.lerp(_colorGroove, poleDarken);

    colorAttr.setXYZ(i, _vertexColor.r, _vertexColor.g, _vertexColor.b);
  }

  posAttr.needsUpdate = true;
  colorAttr.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  return minY;
}

export function computeCrownAttachmentY(params: PumpkinSculptParams): number {
  const poleTop = deformPumpkinVertex(0, params.baseRadius, 0, params);
  return poleTop.y - 0.11;
}

/**
 * Creates the twisted organic stem geometry (`CatmullRomCurve3` + `TubeGeometry`)
 * and flared star-shaped calyx base.
 */
export function createStemAndCalyxGeometries(
  stemParams: StemSculptParams,
  preset: MaterialPreset
): { stemGeo: THREE.TubeGeometry; calyxGeo: THREE.ConeGeometry } {
  const { stemLength, stemBend } = stemParams;

  // 1. Define curving, slightly bent path sprouting from the top of the pumpkin
  const h = 0.95 * stemLength;
  const b = 0.38 * stemBend;

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.0, 0),
    new THREE.Vector3(b * 0.22, h * 0.28, -b * 0.12),
    new THREE.Vector3(b * 0.65, h * 0.62, -b * 0.28),
    new THREE.Vector3(b * 1.05, h * 0.88, -b * 0.1),
    new THREE.Vector3(b * 1.22, h * 1.0, b * 0.12),
  ]);

  const tubularSegments = 48;
  const radialSegments = 28;
  const baseRadius = 0.22;

  const stemGeo = new THREE.TubeGeometry(
    curve,
    tubularSegments,
    baseRadius,
    radialSegments,
    false
  );

  const posAttr = stemGeo.attributes.position as THREE.BufferAttribute;
  const uvAttr = stemGeo.attributes.uv as THREE.BufferAttribute;
  const colorArray = new Float32Array(posAttr.count * 3);

  _colorStemBase.set(preset.stemBaseColor);
  _colorStemTip.set(preset.stemTipColor);
  _colorGroove.set(preset.grooveColor);

  const centerPoint = new THREE.Vector3();
  const vertexPos = new THREE.Vector3();
  const offsetVec = new THREE.Vector3();

  for (let i = 0; i < posAttr.count; i++) {
    // TubeGeometry UV.x is progress along curve t in [0, 1], UV.y is circumferential in [0, 1]
    const t = Math.max(0, Math.min(1, uvAttr.getX(i)));
    const v = uvAttr.getY(i);
    const theta = v * Math.PI * 2;

    curve.getPointAt(t, centerPoint);
    vertexPos.fromBufferAttribute(posAttr, i);
    offsetVec.subVectors(vertexPos, centerPoint);

    const { radiusMultiplier, barkRoughnessOffset } = deformStemVertex(
      baseRadius,
      theta,
      t,
      stemParams
    );

    offsetVec.multiplyScalar(radiusMultiplier);
    vertexPos.copy(centerPoint).add(offsetVec);
    vertexPos.y += barkRoughnessOffset * 0.35;

    // Close the very top tip of the stem into a gnarled woody scar
    if (t > 0.96) {
      const capFactor = 1 - (t - 0.96) / 0.04;
      vertexPos.lerp(centerPoint, (1 - capFactor) * 0.82);
    }

    posAttr.setXYZ(i, vertexPos.x, vertexPos.y, vertexPos.z);

    // Stem vertex color: olive-moss green at the base blending into dark woody umber at the tip
    const ridgeShade =
      (Math.cos((theta + t * stemParams.stemTwist) * stemParams.stemRidges) + 1) *
      0.5;
    _vertexColor.copy(_colorStemBase).lerp(_colorStemTip, Math.pow(t, 0.85));
    // Deepen color in stem crevices
    _vertexColor.multiplyScalar(0.72 + ridgeShade * 0.38);
    // Warm transition right where stem meets pumpkin skin
    if (t < 0.15) {
      _vertexColor.lerp(_colorGroove, (1 - t / 0.15) * 0.35);
    }

    colorArray[i * 3] = _vertexColor.r;
    colorArray[i * 3 + 1] = _vertexColor.g;
    colorArray[i * 3 + 2] = _vertexColor.b;
  }

  stemGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
  posAttr.needsUpdate = true;
  stemGeo.computeVertexNormals();

  // 2. Flared 5-Pointed Calyx Peduncle Base hugging the pumpkin crown
  const calyxGeo = new THREE.ConeGeometry(0.46, 0.22, 35, 6, true);
  const cPos = calyxGeo.attributes.position as THREE.BufferAttribute;
  const cColors = new Float32Array(cPos.count * 3);

  for (let i = 0; i < cPos.count; i++) {
    const x = cPos.getX(i);
    const y = cPos.getY(i);
    const z = cPos.getZ(i);
    const angle = Math.atan2(z, x);
    // Normalized height from 0 (bottom rim on pumpkin) to 1 (top merging into stem)
    const ny = (y + 0.11) / 0.22;
    const starPoints = Math.cos(angle * 5) * 0.28 + Math.sin(angle * 10) * 0.08;
    const flare = (1 - ny) * (1 + starPoints);

    cPos.setXYZ(
      i,
      x * (0.55 + flare * 0.65),
      y * 0.7 - (1 - ny) * Math.max(0, starPoints) * 0.06,
      z * (0.55 + flare * 0.65)
    );

    _vertexColor.copy(_colorStemBase).lerp(_colorGroove, (1 - ny) * 0.45);
    cColors[i * 3] = _vertexColor.r;
    cColors[i * 3 + 1] = _vertexColor.g;
    cColors[i * 3 + 2] = _vertexColor.b;
  }

  calyxGeo.setAttribute('color', new THREE.BufferAttribute(cColors, 3));
  cPos.needsUpdate = true;
  calyxGeo.computeVertexNormals();

  return { stemGeo, calyxGeo };
}

/**
 * Creates two coiled botanical vine tendrils sprouting from the stem base.
 */
function createCoiledTendrils(
  stemMat: THREE.MeshStandardMaterial,
  isSoftwareGl: boolean
): THREE.Group {
  const group = new THREE.Group();

  for (let side = 0; side < 2; side++) {
    const dir = side === 0 ? 1 : -1;
    const points: THREE.Vector3[] = [];
    const steps = 42;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const coilAngle = t * Math.PI * 5.5 * dir;
      const coilRadius = (0.04 + Math.sin(t * Math.PI) * 0.085) * (1 - t * 0.35);
      const reachX = dir * (0.14 + t * 0.68) + Math.cos(coilAngle) * coilRadius;
      const reachY = 0.08 + Math.sin(t * Math.PI * 0.8) * 0.14 - t * t * 0.22;
      const reachZ =
        (side === 0 ? 0.12 : -0.18) * (1 + t * 1.6) +
        Math.sin(coilAngle) * coilRadius;

      points.push(new THREE.Vector3(reachX, reachY, reachZ));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.022, 8, false);
    const posAttr = tubeGeo.attributes.position as THREE.BufferAttribute;
    const uvAttr = tubeGeo.attributes.uv as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);

    const center = new THREE.Vector3();
    const vPos = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      const t = Math.max(0, Math.min(1, uvAttr.getX(i)));
      curve.getPointAt(t, center);
      vPos.fromBufferAttribute(posAttr, i);
      // Taper tendril toward the tip
      vPos.sub(center).multiplyScalar(1 - t * 0.78).add(center);
      posAttr.setXYZ(i, vPos.x, vPos.y, vPos.z);

      colors[i * 3] = 0.32 - t * 0.1;
      colors[i * 3 + 1] = 0.36 - t * 0.12;
      colors[i * 3 + 2] = 0.18 - t * 0.06;
    }

    tubeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    posAttr.needsUpdate = true;
    tubeGeo.computeVertexNormals();

    const mesh = new THREE.Mesh(tubeGeo, stemMat);
    mesh.castShadow = !isSoftwareGl;
    group.add(mesh);
  }

  return group;
}

/**
 * Builds the internal wax candle and multi-layered flame core positioned at (0, 0, 0)
 * inside the pumpkin so it matches the internal PointLight origin.
 */
function createInternalCandleCore(): {
  candleGroup: THREE.Group;
  flameOuterMesh: THREE.Mesh<THREE.LatheGeometry, THREE.MeshBasicMaterial>;
  flameInnerMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
} {
  const candleGroup = new THREE.Group();

  // Melted beeswax pillar base below (0,0,0)
  const waxGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.65, 24);
  const waxMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#fff1d0'),
    emissive: new THREE.Color('#ff7b1a'),
    emissiveIntensity: 0.45,
    roughness: 0.35,
    metalness: 0.0,
  });
  const waxMesh = new THREE.Mesh(waxGeo, waxMat);
  waxMesh.position.set(0, -0.38, 0);
  candleGroup.add(waxMesh);

  // Charred cotton wick
  const wickGeo = new THREE.CylinderGeometry(0.014, 0.018, 0.1, 8);
  const wickMat = new THREE.MeshBasicMaterial({ color: 0x1a0d05 });
  const wickMesh = new THREE.Mesh(wickGeo, wickMat);
  wickMesh.position.set(0, -0.03, 0);
  candleGroup.add(wickMesh);

  // Teardrop outer flame profile via LatheGeometry centered at (0, 0.06, 0)
  const flamePoints = [
    new THREE.Vector2(0.001, -0.06),
    new THREE.Vector2(0.055, -0.02),
    new THREE.Vector2(0.072, 0.03),
    new THREE.Vector2(0.048, 0.1),
    new THREE.Vector2(0.018, 0.17),
    new THREE.Vector2(0.001, 0.22),
  ];
  const flameOuterGeo = new THREE.LatheGeometry(flamePoints, 20);
  const flameOuterMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff8811'),
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const flameOuterMesh = new THREE.Mesh(flameOuterGeo, flameOuterMat);
  flameOuterMesh.position.set(0, 0.02, 0);
  candleGroup.add(flameOuterMesh);

  // White-hot inner flame core
  const flameInnerGeo = new THREE.SphereGeometry(0.038, 16, 16);
  flameInnerGeo.scale(1, 1.8, 1);
  const flameInnerMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#fffbe6'),
  });
  const flameInnerMesh = new THREE.Mesh(flameInnerGeo, flameInnerMat);
  flameInnerMesh.position.set(0, 0.04, 0);
  candleGroup.add(flameInnerMesh);

  return { candleGroup, flameOuterMesh, flameInnerMesh };
}

/**
 * Creates a grounded charred-oak harvest pedestal, soft radial contact shadow,
 * and procedural autumn oak leaves around the base of the pumpkin.
 */
function createHarvestPedestal(
  floorY: number,
  textures: PumpkinTextureSet,
  isSoftwareGl: boolean
): {
  pedestalGroup: THREE.Group;
  contactShadowMesh: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
} {
  const pedestalGroup = new THREE.Group();
  pedestalGroup.position.set(0, floorY, 0);

  // 1. Soft radial contact shadow plane at y = +0.012 above pedestal top
  const shadowGeo = new THREE.CircleGeometry(2.15, 48);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowMap,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const contactShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadowMesh.position.y = 0.012;
  pedestalGroup.add(contactShadowMesh);

  // 2. Charred-oak dark circular studio tabletop slab
  const slabGeo = new THREE.CylinderGeometry(3.4, 3.6, 0.24, 64);
  const slabMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#160c06'),
    roughness: 0.78,
    metalness: 0.04,
    envMapIntensity: 0.18,
    bumpMap: textures.stemBumpMap,
    bumpScale: 0.015,
  });
  const slabMesh = new THREE.Mesh(slabGeo, slabMat);
  slabMesh.position.y = -0.12;
  slabMesh.receiveShadow = !isSoftwareGl;
  pedestalGroup.add(slabMesh);

  // 3. Subtle brushed-bronze rim trim around the pedestal slab (metallic contrast)
  const rimGeo = new THREE.TorusGeometry(3.48, 0.025, 12, 64);
  rimGeo.rotateX(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8a5a2b'),
    roughness: 0.32,
    metalness: 0.78,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = -0.04;
  pedestalGroup.add(rimMesh);

  // 4. Scattered procedural autumn leaves on the pedestal around the pumpkin
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(0.12, 0.08, 0.16, 0.22);
  leafShape.quadraticCurveTo(0.08, 0.26, 0.18, 0.36);
  leafShape.quadraticCurveTo(0.06, 0.42, 0, 0.52);
  leafShape.quadraticCurveTo(-0.06, 0.42, -0.18, 0.36);
  leafShape.quadraticCurveTo(-0.08, 0.26, -0.16, 0.22);
  leafShape.quadraticCurveTo(-0.12, 0.08, 0, 0);

  const leafGeo = new THREE.ExtrudeGeometry(leafShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
  });
  leafGeo.rotateX(-Math.PI / 2);

  const leafColors = ['#9e2f0b', '#b84a14', '#7a2207', '#c4691b', '#633212'];
  const leafPlacements = [
    { x: 1.55, z: 0.85, rotY: 0.6, scale: 0.85 },
    { x: -1.42, z: 1.05, rotY: 2.1, scale: 0.95 },
    { x: 1.18, z: -1.35, rotY: -1.2, scale: 0.75 },
    { x: -1.65, z: -0.68, rotY: 3.8, scale: 0.9 },
    { x: 0.45, z: 1.68, rotY: -0.4, scale: 0.7 },
  ];

  leafPlacements.forEach((p, idx) => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(leafColors[idx % leafColors.length]),
      roughness: 0.62,
      metalness: 0.05,
    });
    const leaf = new THREE.Mesh(leafGeo, mat);
    leaf.position.set(p.x, 0.02 + idx * 0.002, p.z);
    leaf.rotation.set(0.04, p.rotY, -0.03);
    leaf.scale.setScalar(p.scale);
    leaf.castShadow = !isSoftwareGl;
    leaf.receiveShadow = !isSoftwareGl;
    pedestalGroup.add(leaf);
  });

  return { pedestalGroup, contactShadowMesh };
}

/**
 * Creates warm atmospheric floating ember motes around the pumpkin.
 */
function createFloatingEmbers(
  particleMap: THREE.CanvasTexture
): {
  embersPoints: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  emberInitialPositions: Float32Array;
} {
  const count = 48;
  const positions = new Float32Array(count * 3);
  const initialPositions = new Float32Array(count * 3);

  let seed = 777;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 1.65 + rand() * 2.4;
    const x = Math.cos(angle) * radius;
    const y = -0.9 + rand() * 3.2;
    const z = Math.sin(angle) * radius;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    initialPositions[i * 3] = x;
    initialPositions[i * 3 + 1] = y;
    initialPositions[i * 3 + 2] = z;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    map: particleMap,
    color: new THREE.Color('#ff9d42'),
    size: 0.11,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const embersPoints = new THREE.Points(geo, mat);
  return { embersPoints, emberInitialPositions: initialPositions };
}
