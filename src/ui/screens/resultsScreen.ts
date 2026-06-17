// Race Results overlay for AntCarts.
//
// Ant + house themed using the race-track palette (CSS vars from style.css).
// All decoration is inline SVG / CSS shapes — no external assets. The returned
// element is a full-viewport `.ac-screen` overlay the ScreenManager toggles.
//
// Built programmatically (createElement + appendChild) rather than innerHTML so
// the dynamic stat fields can be cached and updated by `setResults`, and so the
// module is unit-testable with a tiny document stub (no jsdom).

import { getWallet } from "../../game/economy/currency";

export interface ResultsData {
  /** Race time, in seconds (elapsed). */
  time: number;
  /** Final score. */
  score: number;
  /** Finishing placement, 1-based (1 = winner). */
  placement: number;
  /** Laps completed. */
  laps: number;
}

export interface ResultsScreenOptions {
  onContinue: () => void;
  onStore: () => void;
  onRetry: () => void;
}

export interface ResultsScreen extends HTMLDivElement {
  setResults(data: ResultsData): void;
}

// --- pure helpers (unit-testable without a DOM) ---

/** Format seconds as `m:ss`. */
export function formatRaceTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(s / 60);
  const remainder = s % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", etc. */
export function formatPlacement(placement: number): string {
  const n = Math.max(1, Math.floor(placement));
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${n}th`;
  }
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Crumb Coins earned for a race: score crumbs + a time-survival bonus + a
 * placement bonus. Pure function so main.ts and the screen agree on the amount.
 */
export function computeCoinsEarned(data: ResultsData): number {
  const scoreCoins = Math.floor(Math.max(0, data.score) / 100);
  const timeBonus = Math.floor(Math.max(0, data.time) / 10);
  let placementBonus = 20;
  if (data.placement === 1) {
    placementBonus = 250;
  } else if (data.placement === 2) {
    placementBonus = 120;
  } else if (data.placement === 3) {
    placementBonus = 60;
  }
  return Math.max(0, scoreCoins + timeBonus + placementBonus);
}

// --- inline decoration: sugar-cube + thumbtack trophy ---

const TROPHY_SVG = `
<svg class="ac-results__trophy-svg" viewBox="0 0 160 140" role="img" aria-label="Sugar cube and thumbtack trophy" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ac-cube" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbf6e6"/>
      <stop offset="1" stop-color="#d9cfb4"/>
    </linearGradient>
    <linearGradient id="ac-cup" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4d150"/>
      <stop offset="1" stop-color="#c79a23"/>
    </linearGradient>
  </defs>

  <!-- confetti crumbs -->
  <g opacity="0.92">
    <rect x="14" y="20" width="5" height="5" fill="#5dfdff" transform="rotate(18 16 22)"/>
    <rect x="138" y="30" width="4" height="4" fill="#ff73bb" transform="rotate(-12 140 32)"/>
    <rect x="22" y="104" width="5" height="5" fill="#e9ff80" transform="rotate(34 24 106)"/>
    <rect x="128" y="108" width="4" height="4" fill="#c73128" transform="rotate(-24 130 110)"/>
    <rect x="74" y="6" width="4" height="4" fill="#ffbd3f" transform="rotate(8 76 8)"/>
  </g>

  <!-- trophy cup (pressed sugar cube) -->
  <path d="M52 44 H108 L102 86 Q80 96 58 86 Z" fill="url(#ac-cup)" stroke="#7c5e10" stroke-width="2"/>
  <rect x="70" y="86" width="20" height="12" fill="#b9974a" stroke="#7c5e10" stroke-width="1.5"/>
  <rect x="54" y="98" width="52" height="8" rx="2" fill="#b9974a" stroke="#7c5e10" stroke-width="1.5"/>

  <!-- sugar cube stack pedestal -->
  <g transform="translate(48 106)">
    <rect x="0" y="0" width="28" height="20" fill="url(#ac-cube)" stroke="#c7bfa8" stroke-width="1.5"/>
    <rect x="20" y="-18" width="26" height="20" fill="url(#ac-cube)" stroke="#c7bfa8" stroke-width="1.5"/>
  </g>

  <!-- thumbtack finial on top -->
  <g transform="translate(72 16)">
    <circle cx="8" cy="8" r="8" fill="#c73128" stroke="#7c1d16" stroke-width="1.5"/>
    <circle cx="5.5" cy="5.5" r="2.4" fill="#ff9a8f"/>
    <polygon points="8,16 6,30 10,30" fill="#b9b2a0"/>
  </g>

  <!-- number 1 on the cup -->
  <text x="80" y="74" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-size="26" font-weight="900" fill="#101418">1</text>
</svg>`.trim();

// --- element helpers ---

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

function statRow(label: string, valueClassName: string, initialValue: string): {
  row: HTMLDivElement;
  value: HTMLSpanElement;
} {
  const row = makeEl<HTMLDivElement>("div", "ac-results__stat");
  const labelEl = makeEl<HTMLSpanElement>("span", "ac-results__stat-label", label);
  const value = makeEl<HTMLSpanElement>("span", `ac-results__stat-value ${valueClassName}`, initialValue);
  row.appendChild(labelEl);
  row.appendChild(value);
  return { row, value };
}

export function createResultsScreen(options: ResultsScreenOptions): ResultsScreen {
  const overlay = makeEl<HTMLDivElement>("div", "ac-screen ac-results");
  const backdrop = makeEl<HTMLDivElement>("div", "ac-results__backdrop");
  const card = makeEl<HTMLDivElement>("div", "ac-results__card");

  // --- header / trophy decoration (static) ---
  const trophyWrap = makeEl<HTMLDivElement>("div", "ac-results__trophy");
  trophyWrap.innerHTML = TROPHY_SVG;
  const eyebrow = makeEl<HTMLParagraphElement>("p", "ac-results__eyebrow", "ANTHILL CIRCUIT");
  const title = makeEl<HTMLHeadingElement>("h1", "ac-results__title", "RACE COMPLETE");

  // --- dynamic stat fields (cached for setResults) ---
  const stats = makeEl<HTMLDivElement>("div", "ac-results__stats");
  const timeRow = statRow("TIME", "ac-results__time", "0:00");
  const lapsRow = statRow("LAPS", "ac-results__laps", "0");
  const scoreRow = statRow("SCORE", "ac-results__score", "0");
  const placeRow = statRow("PLACE", "ac-results__place", "—");
  const earnedRow = statRow("CRUMBS EARNED", "ac-results__earned", "+0");
  stats.appendChild(timeRow.row);
  stats.appendChild(lapsRow.row);
  stats.appendChild(scoreRow.row);
  stats.appendChild(placeRow.row);
  stats.appendChild(earnedRow.row);

  // --- wallet balance line ---
  const walletRow = makeEl<HTMLDivElement>("div", "ac-results__wallet");
  const walletLabel = makeEl<HTMLSpanElement>("span", "ac-results__wallet-label", "WALLET");
  const coinBadge = makeEl<HTMLSpanElement>("span", "ac-coin", "◆");
  const walletValue = makeEl<HTMLSpanElement>("span", "ac-results__wallet-value", "0");
  walletRow.appendChild(walletLabel);
  walletRow.appendChild(coinBadge);
  walletRow.appendChild(walletValue);

  // --- buttons ---
  const buttons = makeEl<HTMLDivElement>("div", "ac-results__buttons");
  const nextButton = makeEl<HTMLButtonElement>("button", "ac-btn ac-btn--primary", "Next Race");
  nextButton.type = "button";
  nextButton.dataset.action = "continue";
  const retryButton = makeEl<HTMLButtonElement>("button", "ac-btn ac-btn--secondary", "Retry");
  retryButton.type = "button";
  retryButton.dataset.action = "retry";
  const storeButton = makeEl<HTMLButtonElement>("button", "ac-btn ac-btn--secondary", "Store");
  storeButton.type = "button";
  storeButton.dataset.action = "store";
  buttons.appendChild(nextButton);
  buttons.appendChild(retryButton);
  buttons.appendChild(storeButton);

  nextButton.addEventListener("click", options.onContinue);
  retryButton.addEventListener("click", options.onRetry);
  storeButton.addEventListener("click", options.onStore);

  // --- assemble ---
  card.appendChild(trophyWrap);
  card.appendChild(eyebrow);
  card.appendChild(title);
  card.appendChild(stats);
  card.appendChild(walletRow);
  card.appendChild(buttons);
  overlay.appendChild(backdrop);
  overlay.appendChild(card);

  const screen = overlay as ResultsScreen;
  screen.setResults = (data: ResultsData): void => {
    const earned = computeCoinsEarned(data);
    timeRow.value.textContent = formatRaceTime(data.time);
    lapsRow.value.textContent = `${Math.max(0, Math.floor(data.laps))}`;
    scoreRow.value.textContent = `${Math.max(0, Math.floor(data.score))}`;
    placeRow.value.textContent = formatPlacement(data.placement);
    earnedRow.value.textContent = `+${earned}`;
    walletValue.textContent = `${getWallet().coins}`;
  };
  // Initialize the wallet display from the current balance.
  walletValue.textContent = `${getWallet().coins}`;

  return screen;
}
