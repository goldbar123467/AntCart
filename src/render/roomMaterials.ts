import * as THREE from "three";

export interface RoomMaterials {
  carpet: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  ceiling: THREE.MeshStandardMaterial;
}

interface TextureDrawOptions {
  size: number;
  repeatX: number;
  repeatY: number;
  colorSpace?: THREE.ColorSpace;
  draw: (ctx: CanvasRenderingContext2D, size: number) => void;
}

interface SurfaceShaderOptions {
  cacheKey: string;
  fiberStrength: number;
  surfaceScale: number;
}

export function createRoomMaterials(renderer: THREE.WebGLRenderer): RoomMaterials {
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const carpetMap = createProceduralTexture({
    size: 512,
    repeatX: 46,
    repeatY: 32,
    colorSpace: THREE.SRGBColorSpace,
    draw: drawCarpetColor,
  });
  const carpetBump = createProceduralTexture({
    size: 512,
    repeatX: 46,
    repeatY: 32,
    draw: drawCarpetHeight,
  });
  const carpetRoughness = createProceduralTexture({
    size: 256,
    repeatX: 46,
    repeatY: 32,
    draw: drawSoftRoughness,
  });

  const wallMap = createProceduralTexture({
    size: 512,
    repeatX: 28,
    repeatY: 3,
    colorSpace: THREE.SRGBColorSpace,
    draw: drawPaintedWallColor,
  });
  const wallBump = createProceduralTexture({
    size: 512,
    repeatX: 28,
    repeatY: 3,
    draw: drawPaintedWallHeight,
  });
  const wallRoughness = createProceduralTexture({
    size: 256,
    repeatX: 28,
    repeatY: 3,
    draw: drawSoftRoughness,
  });

  const ceilingMap = createProceduralTexture({
    size: 512,
    repeatX: 36,
    repeatY: 24,
    colorSpace: THREE.SRGBColorSpace,
    draw: drawCeilingColor,
  });
  const ceilingBump = createProceduralTexture({
    size: 512,
    repeatX: 36,
    repeatY: 24,
    draw: drawCeilingHeight,
  });
  const ceilingRoughness = createProceduralTexture({
    size: 256,
    repeatX: 36,
    repeatY: 24,
    draw: drawSoftRoughness,
  });

  for (const texture of [
    carpetMap,
    carpetBump,
    carpetRoughness,
    wallMap,
    wallBump,
    wallRoughness,
    ceilingMap,
    ceilingBump,
    ceilingRoughness,
  ]) {
    texture.anisotropy = maxAnisotropy;
  }

  const carpet = new THREE.MeshStandardMaterial({
    map: carpetMap,
    bumpMap: carpetBump,
    bumpScale: 0.035,
    roughnessMap: carpetRoughness,
    roughness: 0.96,
    metalness: 0,
  });
  applyProceduralSurfaceShader(carpet, {
    cacheKey: "antcarts-carpet-fiber",
    fiberStrength: 0.085,
    surfaceScale: 1.8,
  });

  const wall = new THREE.MeshStandardMaterial({
    map: wallMap,
    bumpMap: wallBump,
    bumpScale: 0.018,
    roughnessMap: wallRoughness,
    roughness: 0.86,
    metalness: 0,
  });
  applyProceduralSurfaceShader(wall, {
    cacheKey: "antcarts-wall-plaster",
    fiberStrength: 0.045,
    surfaceScale: 1.2,
  });

  const ceiling = new THREE.MeshStandardMaterial({
    map: ceilingMap,
    bumpMap: ceilingBump,
    bumpScale: 0.014,
    roughnessMap: ceilingRoughness,
    roughness: 0.92,
    metalness: 0,
  });
  applyProceduralSurfaceShader(ceiling, {
    cacheKey: "antcarts-ceiling-plaster",
    fiberStrength: 0.038,
    surfaceScale: 1.45,
  });

  return { carpet, wall, ceiling };
}

function createProceduralTexture(options: TextureDrawOptions): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = options.size;
  canvas.height = options.size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create 2D canvas context for room material.");
  }

  options.draw(ctx, options.size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(options.repeatX, options.repeatY);
  texture.colorSpace = options.colorSpace ?? THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function applyProceduralSurfaceShader(
  material: THREE.MeshStandardMaterial,
  options: SurfaceShaderOptions,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFiberStrength = { value: options.fiberStrength };
    shader.uniforms.uSurfaceScale = { value: options.surfaceScale };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `
#include <common>
uniform float uFiberStrength;
uniform float uSurfaceScale;

float antcartsHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
        `,
      )
      .replace(
        "#include <color_fragment>",
        `
#include <color_fragment>
#ifdef USE_MAP
  vec2 antcartsUv = vMapUv * uSurfaceScale;
  float antcartsGrain = antcartsHash(floor(antcartsUv * 96.0)) - 0.5;
  float antcartsThread = sin(antcartsUv.x * 138.0) * sin(antcartsUv.y * 71.0);
  diffuseColor.rgb *= 1.0 + antcartsGrain * uFiberStrength + antcartsThread * uFiberStrength * 0.18;
#endif
        `,
      );
  };
  material.customProgramCacheKey = () => options.cacheKey;
}

function drawCarpetColor(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = "#5f666c";
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const noise = deterministicNoise(x * 17 + y * 31);
      const shade = 88 + Math.floor(noise * 38);
      ctx.fillStyle = `rgb(${shade - 8}, ${shade - 2}, ${shade + 6})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#d8dde4";
  for (let x = -size; x < size * 2; x += 11) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + size * 0.4, size);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawCarpetHeight(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = "#777";
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 3) {
    const wave = Math.sin(y * 0.17) * 14;
    ctx.fillStyle = y % 6 === 0 ? "#9a9a9a" : "#696969";
    ctx.fillRect(0, y, size, 1);

    for (let x = 0; x < size; x += 9) {
      const value = 105 + Math.floor(deterministicNoise(x * 13 + y * 19) * 75);
      ctx.fillStyle = `rgb(${value},${value},${value})`;
      ctx.fillRect((x + wave + size) % size, y, 4, 1);
    }
  }
}

function drawPaintedWallColor(ctx: CanvasRenderingContext2D, size: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "#c7d2cf");
  gradient.addColorStop(0.52, "#b5c5c2");
  gradient.addColorStop(1, "#9fb5b1");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.globalAlpha = 0.12;
  for (let x = 0; x < size; x += 128) {
    ctx.fillStyle = "#e2ebe7";
    ctx.fillRect(x, 0, 2, size);
    ctx.fillStyle = "#748d8a";
    ctx.fillRect(x + 3, 0, 1, size);
  }

  for (let i = 0; i < 900; i += 1) {
    const x = Math.floor(deterministicNoise(i * 17) * size);
    const y = Math.floor(deterministicNoise(i * 29) * size);
    const alpha = 0.08 + deterministicNoise(i * 37) * 0.06;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawPaintedWallHeight(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.28;

  for (let x = 0; x < size; x += 128) {
    ctx.fillStyle = "#b8b8b8";
    ctx.fillRect(x, 0, 2, size);
    ctx.fillStyle = "#555";
    ctx.fillRect(x + 4, 0, 1, size);
  }

  for (let i = 0; i < 1300; i += 1) {
    const value = 96 + Math.floor(deterministicNoise(i * 23) * 60);
    ctx.fillStyle = `rgb(${value},${value},${value})`;
    ctx.fillRect(
      Math.floor(deterministicNoise(i * 41) * size),
      Math.floor(deterministicNoise(i * 53) * size),
      1,
      1,
    );
  }
  ctx.globalAlpha = 1;
}

function drawCeilingColor(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = "#cfc4af";
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const noise = deterministicNoise(x * 11 + y * 17);
      const shade = 188 + Math.floor(noise * 28);
      ctx.fillStyle = `rgb(${shade}, ${shade - 5}, ${shade - 18})`;
      ctx.fillRect(x, y, 4, 4);
    }
  }
}

function drawCeilingHeight(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = "#7e7e7e";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 3800; i += 1) {
    const value = 88 + Math.floor(deterministicNoise(i * 13) * 90);
    ctx.fillStyle = `rgb(${value},${value},${value})`;
    const x = Math.floor(deterministicNoise(i * 19) * size);
    const y = Math.floor(deterministicNoise(i * 31) * size);
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawSoftRoughness(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = "#d8d8d8";
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const value = 190 + Math.floor(deterministicNoise(x * 7 + y * 13) * 58);
      ctx.fillStyle = `rgb(${value},${value},${value})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
}

function deterministicNoise(value: number): number {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
