// Between-Races overlay for AntCarts.
//
// Ant + house themed using the race-track palette (CSS vars from style.css).
// Shows a brief standings/bracket card with ant-named racers, the current
// Crumb Coin balance, and Continue / Store buttons. Built programmatically so
// `setStandings` can update cached row elements and the module is unit-testable
// with a tiny document stub (no jsdom).

import { getWallet } from "../../game/economy/currency";
import { formatPlacement, formatRaceTime } from "./resultsScreen";

export interface StandingRow {
  name: string;
  placement: number;
  time: number;
}

export interface BetweenRacesScreenOptions {
  onContinue: () => void;
  onStore: () => void;
}

export interface BetweenRacesScreen extends HTMLDivElement {
  setStandings(rows: StandingRow[]): void;
}

const ROW_COUNT = 8;

/** Default placeholder ant racer names (house-side toy bracket flavor). */
const PLACEHOLDER_NAMES: string[] = [
  "Worker-7",
  "Scout-3",
  "Forager-1",
  "Soldier-9",
  "Drone-4",
  "Nurse-2",
  "Replete-6",
  "Major-5",
];

const PHEROMONE_DIVIDER_SVG = `
<svg class="ac-between__divider-svg" viewBox="0 0 320 16" role="presentation" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <defs>
    <linearGradient id="ac-phero" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2d6bbf" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#5dfdff"/>
      <stop offset="1" stop-color="#2d6bbf" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <path d="M0 8 Q40 2 80 8 T160 8 T240 8 T320 8" fill="none" stroke="url(#ac-phero)" stroke-width="2.4" stroke-dasharray="3 5"/>
  <circle cx="40" cy="8" r="1.6" fill="#e9ff80"/>
  <circle cx="120" cy="8" r="1.6" fill="#ff73bb"/>
  <circle cx="200" cy="8" r="1.6" fill="#f4d150"/>
  <circle cx="280" cy="8" r="1.6" fill="#e9ff80"/>
</svg>`.trim();

const ANTHILL_PROGRESS_SVG = `
<svg class="ac-between__hill-svg" viewBox="0 0 200 56" role="presentation" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ac-hill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c98b4a"/>
      <stop offset="1" stop-color="#6f4a26"/>
    </linearGradient>
  </defs>
  <rect x="0" y="50" width="200" height="3" fill="#f4d150"/>
  <path d="M10 52 Q60 12 100 10 Q140 12 190 52 Z" fill="url(#ac-hill)" stroke="#3c2812" stroke-width="1.5"/>
  <ellipse cx="100" cy="44" rx="8" ry="6" fill="#101418"/>
  <g fill="#101418">
    <circle cx="100" cy="14" r="2.2"/>
  </g>
  <circle cx="60" cy="22" r="1.6" fill="#5dfdff"/>
  <circle cx="140" cy="22" r="1.6" fill="#5dfdff"/>
</svg>`.trim();

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

interface StandingSlots {
  row: HTMLDivElement;
  place: HTMLSpanElement;
  name: HTMLSpanElement;
  time: HTMLSpanElement;
}

function makeStandingRow(initial: { name: string; placement: number; time: number }): StandingSlots {
  const row = makeEl<HTMLDivElement>("div", "ac-between__row");
  const place = makeEl<HTMLSpanElement>("span", "ac-between__row-place", formatPlacement(initial.placement));
  const name = makeEl<HTMLSpanElement>("span", "ac-between__row-name", initial.name);
  const time = makeEl<HTMLSpanElement>("span", "ac-between__row-time", formatRaceTime(initial.time));
  row.appendChild(place);
  row.appendChild(name);
  row.appendChild(time);
  return { row, place, name, time };
}

export function createBetweenRacesScreen(options: BetweenRacesScreenOptions): BetweenRacesScreen {
  const overlay = makeEl<HTMLDivElement>("div", "ac-screen ac-between");
  const backdrop = makeEl<HTMLDivElement>("div", "ac-between__backdrop");
  const card = makeEl<HTMLDivElement>("div", "ac-between__card");

  // --- header ---
  const eyebrow = makeEl<HTMLParagraphElement>("p", "ac-between__eyebrow", "ANTHILL CIRCUIT");
  const title = makeEl<HTMLHeadingElement>("h1", "ac-between__title", "NEXT RACE");

  // pheromone trail divider (static decoration)
  const divider = makeEl<HTMLDivElement>("div", "ac-between__divider");
  divider.innerHTML = PHEROMONE_DIVIDER_SVG;

  // --- standings list ---
  const standingsHead = makeEl<HTMLDivElement>("div", "ac-between__standings-head");
  standingsHead.appendChild(makeEl<HTMLSpanElement>("span", "ac-between__head-place", "POS"));
  standingsHead.appendChild(makeEl<HTMLSpanElement>("span", "ac-between__head-name", "RACER"));
  standingsHead.appendChild(makeEl<HTMLSpanElement>("span", "ac-between__head-time", "TIME"));
  const standings = makeEl<HTMLDivElement>("div", "ac-between__standings");
  const slots: StandingSlots[] = [];
  for (let i = 0; i < ROW_COUNT; i += 1) {
    const slot = makeStandingRow({
      name: PLACEHOLDER_NAMES[i] ?? `Ant-${i + 1}`,
      placement: i + 1,
      time: 120 + i * 9,
    });
    slots.push(slot);
    standings.appendChild(slot.row);
  }

  // anthill progress motif (static decoration)
  const hillWrap = makeEl<HTMLDivElement>("div", "ac-between__hill");
  hillWrap.innerHTML = ANTHILL_PROGRESS_SVG;

  // --- wallet balance ---
  const walletRow = makeEl<HTMLDivElement>("div", "ac-between__wallet");
  const walletLabel = makeEl<HTMLSpanElement>("span", "ac-between__wallet-label", "WALLET");
  const coinBadge = makeEl<HTMLSpanElement>("span", "ac-coin", "◆");
  const walletValue = makeEl<HTMLSpanElement>("span", "ac-between__wallet-value", "0");
  walletRow.appendChild(walletLabel);
  walletRow.appendChild(coinBadge);
  walletRow.appendChild(walletValue);

  // --- buttons ---
  const buttons = makeEl<HTMLDivElement>("div", "ac-between__buttons");
  const continueButton = makeEl<HTMLButtonElement>("button", "ac-btn ac-btn--primary", "Continue");
  continueButton.type = "button";
  continueButton.dataset.action = "continue";
  const storeButton = makeEl<HTMLButtonElement>("button", "ac-btn ac-btn--secondary", "Store");
  storeButton.type = "button";
  storeButton.dataset.action = "store";
  buttons.appendChild(continueButton);
  buttons.appendChild(storeButton);

  continueButton.addEventListener("click", options.onContinue);
  storeButton.addEventListener("click", options.onStore);

  // --- assemble ---
  card.appendChild(eyebrow);
  card.appendChild(title);
  card.appendChild(divider);
  card.appendChild(standingsHead);
  card.appendChild(standings);
  card.appendChild(hillWrap);
  card.appendChild(walletRow);
  card.appendChild(buttons);
  overlay.appendChild(backdrop);
  overlay.appendChild(card);

  const screen = overlay as BetweenRacesScreen;
  screen.setStandings = (rows: StandingRow[]): void => {
    for (let i = 0; i < slots.length; i += 1) {
      const row = rows[i];
      if (!row) {
        // No data for this slot — restore the placeholder.
        const fallbackName = PLACEHOLDER_NAMES[i] ?? `Ant-${i + 1}`;
        slots[i].place.textContent = formatPlacement(i + 1);
        slots[i].name.textContent = fallbackName;
        slots[i].time.textContent = formatRaceTime(120 + i * 9);
        continue;
      }
      slots[i].place.textContent = formatPlacement(row.placement);
      slots[i].name.textContent = row.name;
      slots[i].time.textContent = formatRaceTime(row.time);
    }
  };

  // Initialize the wallet display from the current balance.
  walletValue.textContent = `${getWallet().coins}`;

  return screen;
}
