// Barrel index for all procedural house-interior assets.
// Each asset is also importable directly from its own file.

export * from "./types";
export * from "./couch";
export * from "./coffeeTable";
export * from "./woodenChair";
export * from "./bookStack";
export * from "./shoe";
export * from "./toyBlock";
export * from "./pencil";
export * from "./cardboardBox";
export * from "./floorLamp";
export * from "./rug";
export * from "./baseboard";
export * from "./cerealCrumbs";
export * from "./tvOnStand";

import * as THREE from "three";
import { AssetOptions } from "./types";
import { createCouch } from "./couch";
import { createCoffeeTable } from "./coffeeTable";
import { createWoodenChair } from "./woodenChair";
import { createBookStack } from "./bookStack";
import { createShoe } from "./shoe";
import { createToyBlock } from "./toyBlock";
import { createPencil } from "./pencil";
import { createCardboardBox } from "./cardboardBox";
import { createFloorLamp } from "./floorLamp";
import { createRug } from "./rug";
import { createBaseboard } from "./baseboard";
import { createCerealCrumbs } from "./cerealCrumbs";
import { createTvOnStand } from "./tvOnStand";

export type AssetFactory = (options?: AssetOptions) => THREE.Group;

/**
 * Registry of every asset factory in this package, keyed by a stable string id.
 * Useful for editors, runtime spawning, and tests.
 */
export const ASSET_FACTORIES: Record<string, AssetFactory> = {
  couch: createCouch as AssetFactory,
  coffeeTable: createCoffeeTable as AssetFactory,
  woodenChair: createWoodenChair as AssetFactory,
  bookStack: createBookStack as AssetFactory,
  shoe: createShoe as AssetFactory,
  toyBlock: createToyBlock as AssetFactory,
  pencil: createPencil as AssetFactory,
  cardboardBox: createCardboardBox as AssetFactory,
  floorLamp: createFloorLamp as AssetFactory,
  rug: createRug as AssetFactory,
  baseboard: createBaseboard as AssetFactory,
  cerealCrumbs: createCerealCrumbs as AssetFactory,
  tvOnStand: createTvOnStand as AssetFactory,
};
