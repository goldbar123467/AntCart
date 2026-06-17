import * as THREE from "three";
import { createTvOnStand } from "../src/assets/tvOnStand.ts";

const tv = createTvOnStand({ seed: 42 });
tv.updateMatrixWorld(true);

console.log("=== TV on Stand — Structural Verification ===\n");

// Top-level groups
const tvGroup = tv.getObjectByName("Tv");
const consoleGroup = tv.getObjectByName("Console");
const decorGroup = tv.getObjectByName("Decor");

console.log(`Top-level groups:`);
console.log(`  Tv:       ${tvGroup ? "OK" : "MISSING"}`);
console.log(`  Console:  ${consoleGroup ? "OK" : "MISSING"}`);
console.log(`  Decor:    ${decorGroup ? "OK" : "MISSING"}`);

// Key named parts
const parts = [
  "tvBezel", "tvScreen", "tvGloss", "tvBack", "tvLed", "tvBrand",
  "tvNeck", "tvBase", "tvCable", "tvScreenLight",
  "consoleBody", "consoleTop", "consoleDoorLeft", "consoleDoorRight",
  "handleLeft", "handleRight", "consoleBack",
  "gameConsole", "gameConsoleLed", "plantPot",
  "remote", "remotePowerBtn",
];
let missing = 0;
console.log(`\nKey parts:`);
for (const name of parts) {
  const found = tv.getObjectByName(name);
  if (!found) { console.log(`  MISSING: ${name}`); missing++; }
}
if (missing === 0) console.log(`  All ${parts.length} key parts present ✓`);

// Count books, plant leaves, remote buttons, vents, legs
const counts = {
  books: 0, bookAccents: 0, plantLeaves: 0,
  remoteBtns: 0, vents: 0, legs: 0,
};
tv.traverse((o) => {
  if (o.name.startsWith("book_")) counts.books++;
  if (o.name.startsWith("bookAccent_")) counts.bookAccents++;
  if (o.name.startsWith("plantLeaf_")) counts.plantLeaves++;
  if (o.name.startsWith("remoteBtn_")) counts.remoteBtns++;
  if (o.name.startsWith("tvVent_")) counts.vents++;
  if (o.name.startsWith("consoleLeg_")) counts.legs++;
});
console.log(`\nDecor counts:`);
console.log(`  Books:        ${counts.books} (expect 3)`);
console.log(`  Book accents: ${counts.bookAccents} (expect 3)`);
console.log(`  Plant leaves: ${counts.plantLeaves} (expect 7)`);
console.log(`  Remote btns:  ${counts.remoteBtns} (expect 11)`);
console.log(`  Vents:        ${counts.vents} (expect 32)`);
console.log(`  Legs:         ${counts.legs} (expect 4)`);

// Screen material — should be emissive
const screen = tv.getObjectByName("tvScreen") as THREE.Mesh;
if (screen && screen.material) {
  const mat = screen.material as THREE.MeshStandardMaterial;
  console.log(`\nScreen material:`);
  console.log(`  emissive:      #${mat.emissive?.getHexString?.() ?? "n/a"}`);
  console.log(`  emissiveIntensity: ${mat.emissiveIntensity}`);
  console.log(`  has emissiveMap: ${!!mat.emissiveMap}`);
  console.log(`  has map:        ${!!mat.map}`);
  console.log(`  roughness:     ${mat.roughness}`);
}

// Bounding box — should sit on floor (min.y ≈ 0) and be reasonably tall
const bbox = new THREE.Box3().setFromObject(tv);
console.log(`\nOverall bounding box (unscaled):`);
console.log(`  min: (${bbox.min.x.toFixed(2)}, ${bbox.min.y.toFixed(2)}, ${bbox.min.z.toFixed(2)})`);
console.log(`  max: (${bbox.max.x.toFixed(2)}, ${bbox.max.y.toFixed(2)}, ${bbox.max.z.toFixed(2)})`);
console.log(`  size: W=${(bbox.max.x-bbox.min.x).toFixed(2)} H=${(bbox.max.y-bbox.min.y).toFixed(2)} D=${(bbox.max.z-bbox.min.z).toFixed(2)}`);
console.log(`  sits on floor: min.y=${bbox.min.y.toFixed(3)} (should be ~0)`);

// Scaled to game size (3.5x)
const scaled = bbox.clone().applyMatrix4(new THREE.Matrix4().makeScale(3.5, 3.5, 3.5));
console.log(`\nScaled (3.5x) bounding box:`);
console.log(`  size: W=${(scaled.max.x-scaled.min.x).toFixed(1)} H=${(scaled.max.y-scaled.min.y).toFixed(1)} D=${(scaled.max.z-scaled.min.z).toFixed(1)}`);
console.log(`  (kart is 1.4w x 2.2l x 1.2h — TV should tower over it)`);

// Screen light
const light = tv.getObjectByName("tvScreenLight") as THREE.PointLight;
if (light) {
  console.log(`\nScreen light: intensity=${light.intensity} distance=${light.distance} color=#${light.color.getHexString()}`);
}

// Total mesh count
let meshCount = 0;
tv.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshCount++; });
console.log(`\nTotal meshes: ${meshCount}`);

console.log(`\n=== DONE ===`);
