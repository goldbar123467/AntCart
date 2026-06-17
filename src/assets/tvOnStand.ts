// TV on a TV stand — a modern flat-screen sitting on a wood-grain media console.
//
// The screen draws a procedural CNN-style "breaking news" broadcast on a 2D
// canvas and uses it as both the color map and emissive map, so the screen
// actually glows and throws light into the room. The console is a low cabinet
// with cabinet doors, legs, and a wood-grain top. Decor includes a game
// console, a stack of books, a potted plant, and a remote control.
//
// Factory: createTvOnStand(options?)
//
// Scale (1 unit = 1 arcade meter):
//   - Console: 6.0 wide x 1.8 tall x 2.0 deep
//   - TV:      5.2 wide x 3.0 tall x 0.15 deep (screen faces +Z)
//   - Total height ~5.0 (console 1.8 + neck 0.4 + TV 3.0 - overlap)
// Sized to read as giant human furniture next to the ant kart.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { AssetOptions, Rng, mat, addMesh, applyScale } from "./types";

export interface TvOnStandOptions extends AssetOptions {
  /** Bezel color. Default glossy near-black. */
  bezel?: number;
  /** Console wood color. Default warm walnut. */
  wood?: number;
  /** Cabinet door color (slightly different from top). Default lighter oak. */
  cabinet?: number;
  /** If true, screen shows static/snow instead of a broadcast. */
  static?: boolean;
  /** If true, the screen is "off" — just a dark glossy panel. */
  off?: boolean;
  /** Broadcast scene seed (controls studio layout / colors). */
  broadcastSeed?: number;
  /** Hide the potted plant decor when the TV is scaled very large. */
  hidePlant?: boolean;
}

// ---------------------------------------------------------------------------
// Procedural broadcast texture
// ---------------------------------------------------------------------------

/**
 * Draws a CNN-style "breaking news" studio broadcast onto a canvas.
 * Returns a CanvasTexture ready to be used as both map and emissiveMap.
 */
function drawBroadcastTexture(rng: Rng, opts: { off?: boolean; static?: boolean }): THREE.CanvasTexture {
  const W = 1024;
  const H = 576; // 16:9
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  if (opts.off) {
    // Off screen: deep near-black with a faint reflection gradient
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0a0a0c");
    g.addColorStop(0.5, "#050507");
    g.addColorStop(1, "#0c0c10");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  if (opts.static) {
    // TV snow
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 256);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // === Studio backdrop: dramatic gradient (deep blue -> purple -> sunset) ===
  const bg = ctx.createLinearGradient(0, 0, 0, H * 0.7);
  bg.addColorStop(0, "#0a1a3a");
  bg.addColorStop(0.4, "#1e2b5e");
  bg.addColorStop(0.75, "#4a2d6e");
  bg.addColorStop(1, "#8a3a5a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // === City skyline silhouette ===
  const skylineBase = H * 0.62;
  ctx.fillStyle = "#05060f";
  ctx.beginPath();
  ctx.moveTo(0, skylineBase);
  let x = 0;
  while (x < W) {
    const bw = 30 + Math.floor(rng.next() * 70);
    const bh = 40 + Math.floor(rng.next() * 180);
    ctx.lineTo(x, skylineBase - bh);
    ctx.lineTo(x + bw, skylineBase - bh);
    // Window lights — a few warm/cool dots
    x += bw;
  }
  ctx.lineTo(W, skylineBase);
  ctx.closePath();
  ctx.fill();

  // Window lights on the skyline
  for (let i = 0; i < 220; i++) {
    const wx = Math.floor(rng.next() * W);
    const wy = skylineBase - rng.range(20, 180);
    const warm = rng.next() > 0.4;
    ctx.fillStyle = warm ? "rgba(255,210,120,0.9)" : "rgba(150,200,255,0.7)";
    ctx.fillRect(wx, wy, 3, 3);
  }

  // Floor reflection gradient (studio floor)
  const floor = ctx.createLinearGradient(0, skylineBase, 0, H);
  floor.addColorStop(0, "#1a1830");
  floor.addColorStop(1, "#0a0815");
  ctx.fillStyle = floor;
  ctx.fillRect(0, skylineBase, W, H - skylineBase);

  // === Curved news desk ===
  const deskY = H * 0.78;
  const deskGrad = ctx.createLinearGradient(0, deskY, 0, H);
  deskGrad.addColorStop(0, "#2a4a8a");
  deskGrad.addColorStop(0.5, "#1e3568");
  deskGrad.addColorStop(1, "#0e1a3a");
  ctx.fillStyle = deskGrad;
  ctx.beginPath();
  ctx.moveTo(W * 0.15, deskY);
  ctx.quadraticCurveTo(W * 0.5, deskY - 25, W * 0.85, deskY);
  ctx.lineTo(W * 0.92, H);
  ctx.lineTo(W * 0.08, H);
  ctx.closePath();
  ctx.fill();
  // Desk edge highlight
  ctx.strokeStyle = "rgba(120,180,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W * 0.15, deskY);
  ctx.quadraticCurveTo(W * 0.5, deskY - 25, W * 0.85, deskY);
  ctx.stroke();

  // === Presenter silhouette (centered behind desk) ===
  const px = W * 0.5;
  const py = deskY - 10;
  ctx.fillStyle = "#0a0a18";
  // Shoulders
  ctx.beginPath();
  ctx.ellipse(px, py + 60, 90, 45, 0, 0, Math.PI);
  ctx.fill();
  // Head
  ctx.beginPath();
  ctx.arc(px, py - 5, 32, 0, Math.PI * 2);
  ctx.fill();
  // Hair / suit highlight rim
  ctx.strokeStyle = "rgba(180,200,255,0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px, py - 5, 32, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(px, py + 60, 90, 45, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();

  // === Top banner: "BREAKING NEWS" red bar ===
  const bannerH = 64;
  const banner = ctx.createLinearGradient(0, 0, 0, bannerH);
  banner.addColorStop(0, "#d01010");
  banner.addColorStop(1, "#8a0000");
  ctx.fillStyle = banner;
  ctx.fillRect(0, 0, W, bannerH);
  // Banner shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(0, bannerH, W, 4);

  // "BREAKING NEWS" text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("BREAKING NEWS", 28, bannerH / 2);

  // Live badge
  const lx = W - 180;
  ctx.fillStyle = "#000000";
  ctx.fillRect(lx, 14, 150, 36);
  ctx.fillStyle = "#ff3030";
  ctx.beginPath();
  ctx.arc(lx + 22, 32, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText("LIVE", lx + 40, 33);

  // === Lower-third headline graphic ===
  const ltY = H * 0.45;
  // Red accent bar
  ctx.fillStyle = "#cc0000";
  ctx.fillRect(0, ltY, 14, 70);
  // Dark panel
  const lt = ctx.createLinearGradient(0, ltY, 0, ltY + 70);
  lt.addColorStop(0, "rgba(10,20,50,0.92)");
  lt.addColorStop(1, "rgba(5,10,30,0.92)");
  ctx.fillStyle = lt;
  ctx.fillRect(14, ltY, W * 0.62, 70);
  // Headline text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("MARKETS RALLY AS RACE BEGINS", 30, ltY + 27);
  ctx.fillStyle = "#9fc0ff";
  ctx.font = "20px Arial, sans-serif";
  ctx.fillText("Ant Kart League · Live from the Living Room", 30, ltY + 52);

  // === Network logo block (top-right under banner) ===
  const logoX = W - 150;
  const logoY = bannerH + 18;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(logoX, logoY, 130, 50);
  ctx.fillStyle = "#cc0000";
  ctx.fillRect(logoX, logoY, 130, 8);
  ctx.fillStyle = "#0a0a2a";
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("ACN", logoX + 18, logoY + 32);
  ctx.fillStyle = "#666";
  ctx.font = "10px Arial, sans-serif";
  ctx.fillText("ANT CARTS NEWS", logoX + 70, logoY + 33);

  // === Bottom ticker bar ===
  const tickerY = H - 44;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, tickerY, W, 44);
  // Yellow "BREAKING" tab on the left of the ticker
  ctx.fillStyle = "#ffcc00";
  ctx.fillRect(0, tickerY, 130, 44);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 24px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("BREAKING", 12, tickerY + 22);
  // Ticker text — several headlines separated by bullet dots
  ctx.fillStyle = "#ffffff";
  ctx.font = "20px Arial, sans-serif";
  const headlines = [
    "LOCAL ANT WINS KART CHAMPIONSHIP",
    "MARKETS HIT RECORD HIGH",
    "WEATHER: 72 AND SUNNY",
    "GIANT HUMAN SPOTTED IN KITCHEN",
    "BREAKING: COUCH STILL COMFY",
  ];
  let tx = 145;
  for (const h of headlines) {
    ctx.fillText(h, tx, tickerY + 22);
    tx += ctx.measureText(h).width + 30;
    // Bullet
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(tx - 15, tickerY + 22, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
  }

  // === Time clock (top-left under banner) ===
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(20, bannerH + 18, 150, 40);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("7:06 PM ET", 32, bannerH + 39);

  // === Soft vignette ===
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// Procedural wood-grain texture for the console top
// ---------------------------------------------------------------------------

function drawWoodTexture(baseColor: number, rng: Rng): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const c = new THREE.Color(baseColor);
  const r = Math.floor(c.r * 255);
  const g = Math.floor(c.g * 255);
  const b = Math.floor(c.b * 255);

  // Base fill
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, W, H);

  // Long horizontal grain streaks
  for (let i = 0; i < 240; i++) {
    const y = rng.next() * H;
    const len = 60 + rng.next() * (W - 60);
    const x = rng.next() * (W - len);
    const darken = rng.range(-40, 20);
    const alpha = rng.range(0.05, 0.22);
    const rr = Math.max(0, Math.min(255, r + darken));
    const gg = Math.max(0, Math.min(255, g + darken));
    const bb = Math.max(0, Math.min(255, b + darken));
    ctx.strokeStyle = `rgba(${rr},${gg},${bb},${alpha})`;
    ctx.lineWidth = rng.range(0.5, 1.8);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Slight wavy grain
    const midY = y + rng.range(-3, 3);
    ctx.quadraticCurveTo(x + len / 2, midY, x + len, y + rng.range(-2, 2));
    ctx.stroke();
  }

  // A few darker knots
  for (let i = 0; i < 3; i++) {
    const kx = rng.next() * W;
    const ky = rng.next() * H;
    const kr = rng.range(6, 14);
    const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
    grad.addColorStop(0, `rgba(${Math.max(0, r - 60)},${Math.max(0, g - 50)},${Math.max(0, b - 40)},0.7)`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(kx, ky, kr, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

export function createTvOnStand(options?: TvOnStandOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = "TvOnStand";

  const rng = new Rng(options?.seed ?? 7);
  const broadcastRng = new Rng(options?.broadcastSeed ?? 99);

  const bezelColor = options?.bezel ?? 0x0a0a0c;
  const woodColor = options?.wood ?? 0x6b4423; // walnut
  const cabinetColor = options?.cabinet ?? 0x8a5a2b; // lighter oak

  // ---- Materials ----
  const bezelMat = new THREE.MeshStandardMaterial({
    color: bezelColor,
    roughness: 0.18,
    metalness: 0.6,
  });
  const screenBackMat = mat(0x080808, { roughness: 0.6, metalness: 0.4 });
  const ventMat = mat(0x1a1a1e, { roughness: 0.7 });

  // Wood top with procedural grain
  const woodTex = drawWoodTexture(woodColor, rng);
  const woodTopMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.5,
    metalness: 0.05,
  });
  const cabinetMat = mat(cabinetColor, { roughness: 0.6 });
  const cabinetDoorMat = mat(new THREE.Color(cabinetColor).multiplyScalar(0.92).getHex(), {
    roughness: 0.55,
  });
  const handleMat = mat(0xc8c8d0, { roughness: 0.3, metalness: 0.85 });
  const legMat = mat(0x2a1a10, { roughness: 0.5 });

  // ---- Dimensions ----
  // Console
  const CW = 6.0; // width
  const CH = 1.8; // height
  const CD = 2.0; // depth
  const LEG_H = 0.25;
  const LEG_R = 0.08;

  // TV
  const TW = 5.2; // total width incl. bezel
  const TH = 3.0; // total height incl. bezel
  const TD = 0.15; // depth (thin slab)
  const BEZEL = 0.12; // bezel thickness on each side
  const SW = TW - BEZEL * 2; // screen width
  const SH = TH - BEZEL * 2; // screen height
  const NECK_H = 0.45;
  const NECK_W = 1.1;
  const BASE_R = 0.9;
  const BASE_T = 0.08;

  // ---- TV group (built around origin at the center of the TV slab) ----
  const tvGroup = new THREE.Group();
  tvGroup.name = "Tv";
  group.add(tvGroup);

  // Bezel — rounded box, glossy black, very thin
  const bezelGeo = new RoundedBoxGeometry(TW, TH, TD, 4, 0.06);
  addMesh(tvGroup, bezelGeo, bezelMat, "tvBezel", [0, 0, 0]);

  // Screen — plane with broadcast texture, emissive
  const broadcastTex = drawBroadcastTexture(broadcastRng, {
    off: options?.off,
    static: options?.static,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    map: broadcastTex,
    emissive: 0xffffff,
    emissiveMap: broadcastTex,
    emissiveIntensity: options?.off ? 0.0 : 0.85,
    roughness: 0.12,
    metalness: 0.0,
  });
  // Plane faces +Z by default; place it just in front of the bezel front face
  const screen = addMesh(
    tvGroup,
    new THREE.PlaneGeometry(SW, SH),
    screenMat,
    "tvScreen",
    [0, 0, TD / 2 + 0.002]
  );
  screen.castShadow = false; // self-illuminated, no need

  // Glossy reflection layer — a very faint transparent panel just in front
  // of the screen to fake the glassy sheen of a flat panel.
  const glossMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.04,
    roughness: 0.05,
    metalness: 0.0,
  });
  const gloss = addMesh(
    tvGroup,
    new THREE.PlaneGeometry(SW, SH),
    glossMat,
    "tvGloss",
    [0, 0, TD / 2 + 0.006]
  );
  gloss.castShadow = false;

  // Back panel — slightly darker, recessed
  addMesh(tvGroup, new RoundedBoxGeometry(TW * 0.96, TH * 0.96, 0.04, 3, 0.04), screenBackMat, "tvBack", [
    0,
    0,
    -TD / 2 - 0.02,
  ]);

  // Vents on the back — a grid of thin slits
  const ventCols = 8;
  const ventRows = 4;
  const ventW = 0.18;
  const ventH = 0.04;
  const ventSpacingX = (TW * 0.7) / ventCols;
  const ventSpacingY = (TH * 0.5) / ventRows;
  for (let i = 0; i < ventCols; i++) {
    for (let j = 0; j < ventRows; j++) {
      const vx = -TW * 0.35 + i * ventSpacingX + ventSpacingX / 2;
      const vy = -TH * 0.25 + j * ventSpacingY + ventSpacingY / 2;
      addMesh(
        tvGroup,
        new THREE.BoxGeometry(ventW, ventH, 0.02),
        ventMat,
        `tvVent_${i}_${j}`,
        [vx, vy, -TD / 2 - 0.04],
      );
    }
  }

  // Power LED — tiny emissive dot at bottom bezel
  const ledColor = options?.off ? 0x110000 : 0x10ff10;
  const ledMat = new THREE.MeshStandardMaterial({
    color: ledColor,
    emissive: ledColor,
    emissiveIntensity: options?.off ? 0 : 2.0,
  });
  addMesh(tvGroup, new THREE.SphereGeometry(0.025, 12, 12), ledMat, "tvLed", [
    TW / 2 - 0.18,
    -TH / 2 + 0.08,
    TD / 2 + 0.005,
  ]);

  // Brand emboss — a thin silver strip on the bottom bezel
  addMesh(
    tvGroup,
    new THREE.BoxGeometry(0.5, 0.04, 0.01),
    mat(0x999999, { roughness: 0.3, metalness: 0.9 }),
    "tvBrand",
    [0, -TH / 2 + 0.08, TD / 2 + 0.005],
  );

  // ---- TV stand neck + base (the TV's own stand, sits on the console) ----
  addMesh(tvGroup, new THREE.BoxGeometry(NECK_W, NECK_H, 0.18), bezelMat, "tvNeck", [
    0,
    -TH / 2 - NECK_H / 2,
    0,
  ]);
  // Base — flat oval (squashed cylinder)
  const baseGeo = new THREE.CylinderGeometry(BASE_R, BASE_R, BASE_T, 32);
  const tvBase = addMesh(tvGroup, baseGeo, bezelMat, "tvBase", [
    0,
    -TH / 2 - NECK_H - BASE_T / 2,
    0,
  ]);
  tvBase.scale.z = 0.6; // oval

  // ---- Screen light — actually illuminates the room ----
  if (!options?.off) {
    const screenLight = new THREE.PointLight(0xfff0e0, 1.2, 14, 1.6);
    screenLight.position.set(0, 0, TD / 2 + 1.0);
    screenLight.name = "tvScreenLight";
    tvGroup.add(screenLight);
  }

  // ---- Position the TV on top of the console ----
  // Console top surface is at y = LEG_H + CH. TV base sits on console top.
  const consoleTopY = LEG_H + CH;
  // TV base bottom should rest on console top
  const tvBaseBottom = -TH / 2 - NECK_H - BASE_T;
  tvGroup.position.set(0, consoleTopY - tvBaseBottom, 0);

  // ---- Console group ----
  const consoleGroup = new THREE.Group();
  consoleGroup.name = "Console";
  group.add(consoleGroup);

  // Legs — 4 small cylinders
  const legInset = 0.3;
  const legPositions: Array<[number, number]> = [
    [CW / 2 - legInset, CD / 2 - legInset],
    [-CW / 2 + legInset, CD / 2 - legInset],
    [CW / 2 - legInset, -CD / 2 + legInset],
    [-CW / 2 + legInset, -CD / 2 + legInset],
  ];
  for (let i = 0; i < legPositions.length; i++) {
    addMesh(
      consoleGroup,
      new THREE.CylinderGeometry(LEG_R, LEG_R * 0.7, LEG_H, 12),
      legMat,
      `consoleLeg_${i}`,
      [legPositions[i][0], LEG_H / 2, legPositions[i][1]],
    );
  }

  // Cabinet body (the main box of the console, sitting on legs)
  addMesh(
    consoleGroup,
    new THREE.BoxGeometry(CW, CH, CD),
    cabinetMat,
    "consoleBody",
    [0, LEG_H + CH / 2, 0],
  );

  // Wood-grain top — slightly oversized lip overhanging the body
  addMesh(
    consoleGroup,
    new THREE.BoxGeometry(CW + 0.12, 0.1, CD + 0.12),
    woodTopMat,
    "consoleTop",
    [0, LEG_H + CH + 0.05, 0],
  );

  // Two cabinet doors on the front (+Z) face
  const doorW = CW / 2 - 0.15;
  const doorH = CH - 0.3;
  const doorT = 0.04;
  const doorY = LEG_H + CH / 2 + 0.02;
  const doorZ = CD / 2 + doorT / 2;
  // Left door
  addMesh(
    consoleGroup,
    new RoundedBoxGeometry(doorW, doorH, doorT, 3, 0.04),
    cabinetDoorMat,
    "consoleDoorLeft",
    [-CW / 4, doorY, doorZ],
  );
  // Right door
  addMesh(
    consoleGroup,
    new RoundedBoxGeometry(doorW, doorH, doorT, 3, 0.04),
    cabinetDoorMat,
    "consoleDoorRight",
    [CW / 4, doorY, doorZ],
  );
  // Door handles — thin horizontal metal bars
  const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 12);
  // Left door handle (near center gap)
  addMesh(consoleGroup, handleGeo, handleMat, "handleLeft", [-0.12, doorY, doorZ + 0.04], [
    Math.PI / 2,
    0,
    0,
  ]);
  addMesh(consoleGroup, handleGeo, handleMat, "handleRight", [0.12, doorY, doorZ + 0.04], [
    Math.PI / 2,
    0,
    0,
  ]);

  // Back panel of console (thin)
  addMesh(
    consoleGroup,
    new THREE.BoxGeometry(CW - 0.1, CH - 0.1, 0.04),
    mat(0x2a1a10, { roughness: 0.8 }),
    "consoleBack",
    [0, LEG_H + CH / 2, -CD / 2 - 0.02],
  );

  // ---- Decor on the console ----
  const decorGroup = new THREE.Group();
  decorGroup.name = "Decor";
  group.add(decorGroup);

  const decorY = LEG_H + CH + 0.1; // surface of wood top

  // Game console — small black box with blue LED strip, under the TV (in front)
  const gcW = 1.4;
  const gcH = 0.18;
  const gcD = 0.9;
  const gcMat = mat(0x0a0a0c, { roughness: 0.4, metalness: 0.3 });
  addMesh(
    decorGroup,
    new RoundedBoxGeometry(gcW, gcH, gcD, 3, 0.05),
    gcMat,
    "gameConsole",
    [0, decorY + gcH / 2, CD / 2 - gcD / 2 - 0.05],
  );
  // Blue LED strip on front of game console
  const ledStripMat = new THREE.MeshStandardMaterial({
    color: 0x2060ff,
    emissive: 0x2060ff,
    emissiveIntensity: 1.5,
  });
  addMesh(
    decorGroup,
    new THREE.BoxGeometry(gcW * 0.7, 0.02, 0.01),
    ledStripMat,
    "gameConsoleLed",
    [0, decorY + gcH / 2, CD / 2 + 0.01],
  );

  // Stack of 3 books — left side of console
  const bookColors = [0x8b2a2a, 0x2a4b8b, 0x2a8b4b];
  const bookW = 1.1;
  const bookD = 0.7;
  const bookH = 0.18;
  let bookY = decorY;
  for (let i = 0; i < 3; i++) {
    const jitter = rng.range(-0.05, 0.05);
    addMesh(
      decorGroup,
      new THREE.BoxGeometry(bookW + jitter, bookH, bookD + jitter),
      mat(bookColors[i], { roughness: 0.7 }),
      `book_${i}`,
      [-CW / 2 + bookW / 2 + 0.4, bookY + bookH / 2, 0.2],
      [0, rng.range(-0.08, 0.08), 0],
    );
    // Spine accent — a thin gold band
    addMesh(
      decorGroup,
      new THREE.BoxGeometry(bookW + jitter, 0.03, 0.04),
      mat(0xc9a84c, { roughness: 0.4, metalness: 0.6 }),
      `bookAccent_${i}`,
      [-CW / 2 + bookW / 2 + 0.4, bookY + bookH * 0.35, 0.2 + bookD / 2 - 0.05],
    );
    bookY += bookH;
  }

  if (!options?.hidePlant) {
    // Potted plant — right side of console
    const potH = 0.5;
    const potR = 0.28;
    const potMat = mat(0x6a4a3a, { roughness: 0.7 });
    const plantX = CW / 2 - potR - 0.4;
    const plantZ = 0.1;
    addMesh(
      decorGroup,
      new THREE.CylinderGeometry(potR * 0.9, potR, potH, 16),
      potMat,
      "plantPot",
      [plantX, decorY + potH / 2, plantZ],
    );
    // Pot rim
    addMesh(
      decorGroup,
      new THREE.CylinderGeometry(potR * 1.02, potR * 1.02, 0.06, 16),
      mat(0x5a3a2a, { roughness: 0.7 }),
      "plantPotRim",
      [plantX, decorY + potH - 0.03, plantZ],
    );
    // Foliage — cluster of icospheres in greens
    const leafColors = [0x2a6b2a, 0x3a8b3a, 0x2a8b4a, 0x4a9b3a];
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const rad = rng.range(0.05, 0.22);
      const lx = plantX + Math.cos(ang) * rad;
      const lz = plantZ + Math.sin(ang) * rad;
      const ly = decorY + potH + rng.range(0.1, 0.45);
      addMesh(
        decorGroup,
        new THREE.IcosahedronGeometry(rng.range(0.18, 0.3), 1),
        mat(leafColors[i % leafColors.length], { roughness: 0.8, flatShading: true }),
        `plantLeaf_${i}`,
        [lx, ly, lz],
      );
    }
  }

  // Remote control — small rounded box on the console, in front
  const remMat = mat(0x1a1a1e, { roughness: 0.5 });
  const remW = 0.25;
  const remH = 0.06;
  const remD = 0.7;
  const remote = addMesh(
    decorGroup,
    new RoundedBoxGeometry(remW, remH, remD, 3, 0.03),
    remMat,
    "remote",
    [0.9, decorY + remH / 2 + 0.005, CD / 2 - remD / 2 - 0.1],
    [0, rng.range(-0.2, 0.2), 0],
  );
  remote.castShadow = true;
  // Remote buttons — a grid of tiny cylinders
  const btnMat = mat(0x444448, { roughness: 0.6 });
  for (let row = 0; row < 4; row++) {
    const btnCount = row === 0 ? 2 : 3;
    for (let col = 0; col < btnCount; col++) {
      const bx = (col - (btnCount - 1) / 2) * 0.07;
      const by = decorY + remH + 0.005;
      const bz = CD / 2 - remD / 2 - 0.1 + (row - 1.5) * 0.12;
      addMesh(
        decorGroup,
        new THREE.CylinderGeometry(0.022, 0.022, 0.015, 8),
        btnMat,
        `remoteBtn_${row}_${col}`,
        [bx + 0.9, by, bz],
      );
    }
  }
  // Power button — red, top of remote
  const remPowerMat = new THREE.MeshStandardMaterial({
    color: 0xcc1010,
    emissive: 0xcc1010,
    emissiveIntensity: 0.5,
  });
  addMesh(
    decorGroup,
    new THREE.CylinderGeometry(0.025, 0.025, 0.015, 8),
    remPowerMat,
    "remotePowerBtn",
    [0.9, decorY + remH + 0.005, CD / 2 - remD / 2 - 0.1 - 0.27],
  );

  // ---- Power cable — a thin curve hanging off the back of the TV ----
  // Cable is a child of tvGroup, so all points are in TV-local space.
  // tvGroup.position.y = consoleTopY - tvBaseBottom, so the floor in local
  // space is at y = -(consoleTopY - tvBaseBottom) = tvBaseBottom - consoleTopY.
  const cablePts: THREE.Vector3[] = [];
  const cableStartZ = -TD / 2 - 0.05;
  const floorLocalY = tvBaseBottom - consoleTopY; // ≈ -4.08, the floor in TV-local space
  // Start at the back of the TV, exit through the back panel
  cablePts.push(new THREE.Vector3(TW * 0.3, -TH * 0.2, cableStartZ));
  cablePts.push(new THREE.Vector3(TW * 0.32, -TH * 0.4, cableStartZ - 0.15));
  // Curve down behind the TV
  cablePts.push(new THREE.Vector3(TW * 0.28, -TH * 0.7, -0.5));
  cablePts.push(new THREE.Vector3(TW * 0.22, -TH * 1.1, -0.8));
  // Drop behind the console toward the floor
  cablePts.push(new THREE.Vector3(TW * 0.18, floorLocalY * 0.55, -1.1));
  cablePts.push(new THREE.Vector3(TW * 0.12, floorLocalY * 0.85, -1.2));
  // Coil on the floor
  cablePts.push(new THREE.Vector3(TW * 0.08, floorLocalY + 0.03, -1.0));
  const cableCurve = new THREE.CatmullRomCurve3(cablePts);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 40, 0.025, 8, false);
  const cableMat = mat(0x0a0a0a, { roughness: 0.7 });
  // Cable is attached to the TV group so it moves with it
  const cable = addMesh(tvGroup, cableGeo, cableMat, "tvCable");
  cable.castShadow = true;

  return applyScale(group, options);
}
