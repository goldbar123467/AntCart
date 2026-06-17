// Crumb Coin pickups — pure placement + collection state.
//
// No Three.js mesh logic here; the host (main.ts) turns each CoinState into a
// spinning gold disc and checks horizontal distance to the kart each frame.
// Up to MAX_COINS_PER_RACE coins are spread around the lap, alternating left
// and right of the centerline so collecting all 15 rewards varied driving lines.

export interface CoinPlacement {
  /** Progress along the track curve [0, 1). */
  progress: number;
  /** Lateral offset from centerline in meters (left positive, right negative). */
  lateralOffset: number;
}

export interface CoinState {
  placement: CoinPlacement;
  collected: boolean;
}

/** Maximum coins spawned per race. */
export const MAX_COINS_PER_RACE = 15;

/**
 * Generate `count` coin placements spread evenly around the lap.
 * Coins alternate sides and vary lateral offset so the driver weaves to grab
 * them all — a classic arcade-racer pickup rhythm.
 */
export function createCoinPlacements(count: number = MAX_COINS_PER_RACE): CoinPlacement[] {
  const placements: CoinPlacement[] = [];
  for (let i = 0; i < count; i += 1) {
    // Offset from the start/finish line so the first coin isn't on the grid.
    const progress = ((i + 0.5) / count) % 1;
    const side = i % 2 === 0 ? 1 : -1;
    const lateralOffset = side * (1.2 + (i % 3) * 0.7);
    placements.push({ progress, lateralOffset });
  }
  return placements;
}

/** Initialize fresh (uncollected) coin states from placements. */
export function createCoinStates(placements: CoinPlacement[]): CoinState[] {
  return placements.map((placement) => ({ placement, collected: false }));
}

/** Mark every coin as uncollected (used on race restart). */
export function resetCoinStates(states: CoinState[]): void {
  for (const state of states) {
    state.collected = false;
  }
}

/** How many coins have been collected so far. */
export function countCollected(states: CoinState[]): number {
  let n = 0;
  for (const state of states) {
    if (state.collected) n += 1;
  }
  return n;
}
