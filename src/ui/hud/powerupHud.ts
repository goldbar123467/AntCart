// Powerup HUD slot for AntCarts — Wave 4.
//
// A fixed-position DOM overlay (same pattern as the speed-gauge / audio-button
// factories in main.ts) showing the player's currently selected powerup: an
// icon, name, a count badge (from `getPowerupStock()`), an activate-key hint,
// and a row of small timer chips for active effects (e.g. "SHIELD 3.2s").
//
// Ant + house themed using the track palette (CSS vars from style.css). Built
// programmatically (createElement + textContent) so it's unit-testable with a
// tiny document stub — no jsdom. No Three.js.

import { POWERUPS, getPowerup, type PowerupId } from "../../game/powerups/powerupCatalog";
import type { ActiveEffect } from "../../game/powerups/powerupRunner";
import { getPowerupStock } from "../../game/economy/inventory";

export interface PowerupHud {
  /** The root DOM element (append to document.body). */
  element: HTMLDivElement;
  /** Set the currently selected powerup id (or null for "empty slot"). */
  setSelected(id: PowerupId | null): void;
  /** Set the count badge value. */
  setCount(n: number): void;
  /** Re-render the active-effect timer chips from a snapshot + current time. */
  setActiveEffects(effects: ActiveEffect[], now: number): void;
  /** Show the HUD (during the race phase). */
  show(): void;
  /** Hide the HUD (outside the race phase). */
  hide(): void;
}

function makeEl<T extends HTMLElement = HTMLDivElement>(
  tag: string,
  className?: string,
  textContent?: string,
): T {
  const node = document.createElement(tag) as T;
  if (className) {
    node.className = className;
  }
  if (textContent !== undefined) {
    node.textContent = textContent;
  }
  return node;
}

export function createPowerupHud(): PowerupHud {
  const element = makeEl<HTMLDivElement>("div", "ac-powerup-hud");
  element.setAttribute("aria-label", "Powerup slot");

  // --- Slot: icon + name + count + key hint ---
  const slot = makeEl<HTMLDivElement>("div", "ac-powerup-slot");

  const iconWrap = makeEl<HTMLDivElement>("div", "ac-powerup-slot__icon");
  const icon = makeEl<HTMLSpanElement>("span", "ac-powerup-slot__glyph", "·");
  iconWrap.appendChild(icon);

  const meta = makeEl<HTMLDivElement>("div", "ac-powerup-slot__meta");
  const name = makeEl<HTMLSpanElement>("span", "ac-powerup-slot__name", "No powerup");
  const count = makeEl<HTMLSpanElement>("span", "ac-powerup-slot__count", "0");
  const hint = makeEl<HTMLSpanElement>("span", "ac-powerup-slot__hint", "Q cycle · SPACE use");
  meta.appendChild(name);
  meta.appendChild(count);
  meta.appendChild(hint);

  slot.appendChild(iconWrap);
  slot.appendChild(meta);
  element.appendChild(slot);

  // --- Active-effect chips ---
  const chips = makeEl<HTMLDivElement>("div", "ac-powerup-chips");
  element.appendChild(chips);

  function setSelected(id: PowerupId | null): void {
    if (id === null) {
      icon.textContent = "·";
      name.textContent = "No powerup";
      element.style.setProperty("--ac-powerup-accent", "var(--hud-cyan)");
      return;
    }
    const def = getPowerup(id);
    if (!def) {
      icon.textContent = "?";
      name.textContent = "Unknown";
      return;
    }
    icon.textContent = def.icon;
    name.textContent = def.name;
    element.style.setProperty("--ac-powerup-accent", def.accent);
  }

  function setCount(n: number): void {
    count.textContent = String(Math.max(0, Math.floor(n)));
    slot.classList.toggle("is-empty", n <= 0);
  }

  function setActiveEffects(effects: ActiveEffect[], now: number): void {
    // Clear existing chips (real-DOM-safe; mirrors storeScreen's refresh path).
    while (chips.firstChild) {
      chips.removeChild(chips.firstChild);
    }
    for (const effect of effects) {
      const def = POWERUPS[effect.id];
      const remainingMs = Math.max(0, effect.endsAt - now);
      const remainingSec = (remainingMs / 1000).toFixed(1);
      const chip = makeEl<HTMLSpanElement>("span", "ac-effect-chip");
      chip.style.setProperty("--ac-chip-accent", def ? def.accent : "var(--hud-cyan)");
      const label = def ? def.chip.toUpperCase() : effect.id;
      chip.textContent = `${label} ${remainingSec}s`;
      chips.appendChild(chip);
    }
    chips.classList.toggle("has-chips", effects.length > 0);
  }

  function show(): void {
    element.classList.add("is-visible");
  }

  function hide(): void {
    element.classList.remove("is-visible");
  }

  // Initial render: empty slot, zero stock.
  setSelected(null);
  setCount(0);
  // Sync the count from persistent inventory on build (best-effort; no-op if
  // localStorage is unavailable, e.g. in tests without a storage stub).
  try {
    const stock = getPowerupStock();
    const total = Object.values(stock).reduce((sum, n) => sum + n, 0);
    setCount(total);
  } catch {
    // ignore — host will refresh via setCount on race start.
  }

  return { element, setSelected, setCount, setActiveEffects, show, hide };
}
