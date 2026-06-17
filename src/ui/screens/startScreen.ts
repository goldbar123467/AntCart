// Start / landing page overlay for AntCarts.
//
// Ant + house themed using the race-track palette (CSS vars from style.css).
// All decoration is inline SVG / CSS shapes — no external assets. Returned
// element is a full-viewport `.ac-screen` overlay the ScreenManager toggles.

export interface StartScreenOptions {
  onStart: () => void;
  onStore: () => void;
  onOptions: () => void;
  /** Wave 5: open the track-select screen. Optional for backward compat. */
  onTracks?: () => void;
}

const ANTHILL_CREST_SVG = `
<svg class="ac-start__crest" viewBox="0 0 220 120" role="img" aria-label="Anthill with ant and thumbtack" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ac-mound" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c98b4a"/>
      <stop offset="1" stop-color="#6f4a26"/>
    </linearGradient>
    <linearGradient id="ac-stripe" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f4d150"/>
      <stop offset="1" stop-color="#e9ff80"/>
    </linearGradient>
  </defs>

  <!-- ground line / track stripe -->
  <rect x="0" y="104" width="220" height="6" fill="url(#ac-stripe)"/>
  <rect x="0" y="110" width="220" height="3" fill="#2d6bbf"/>

  <!-- anthill mound -->
  <path d="M30 104 Q60 36 110 30 Q160 36 190 104 Z" fill="url(#ac-mound)" stroke="#3c2812" stroke-width="2"/>
  <!-- mound entrance -->
  <ellipse cx="110" cy="92" rx="11" ry="8" fill="#101418"/>

  <!-- sugar cube stack by the mound -->
  <g transform="translate(150 84)">
    <rect x="0" y="0" width="16" height="16" fill="#f8f4e9" stroke="#c7bfa8" stroke-width="1.5"/>
    <rect x="14" y="6" width="14" height="14" fill="#f8f4e9" stroke="#c7bfa8" stroke-width="1.5"/>
  </g>

  <!-- thumbtack (house-side motif) -->
  <g transform="translate(40 78)">
    <circle cx="8" cy="8" r="8" fill="#c73128" stroke="#7c1d16" stroke-width="1.5"/>
    <circle cx="5.5" cy="5.5" r="2.4" fill="#ff9a8f"/>
    <polygon points="8,16 6,26 10,26" fill="#b9b2a0"/>
  </g>

  <!-- ant driver on top of the mound -->
  <g transform="translate(96 30)">
    <g fill="#101418">
      <ellipse cx="22" cy="6" rx="7" ry="5.5"/>
      <ellipse cx="11" cy="8" rx="5.5" ry="4.5"/>
      <ellipse cx="2" cy="9.5" rx="4" ry="3.5"/>
      <line x1="11" y1="6" x2="6" y2="-3" stroke="#101418" stroke-width="1.4"/>
      <line x1="11" y1="6" x2="2" y2="-1" stroke="#101418" stroke-width="1.4"/>
    </g>
    <!-- kart wheels -->
    <g fill="#1a1a1a">
      <rect x="-2" y="13" width="5" height="3.5" rx="1.5"/>
      <rect x="16" y="13" width="5" height="3.5" rx="1.5"/>
    </g>
  </g>
</svg>`.trim();

export function createStartScreen(options: StartScreenOptions): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.className = "ac-screen ac-start";

  overlay.innerHTML = `
    <div class="ac-start__backdrop"></div>
    <div class="ac-start__card">
      <div class="ac-start__crest-wrap">${ANTHILL_CREST_SVG}</div>
      <p class="ac-start__eyebrow">ANTHILL CIRCUIT</p>
      <h1 class="ac-start__title">ANT<span>CARTS</span></h1>
      <p class="ac-start__tagline">Tiny drivers. Big sugar rushes. Hold the line or feed the formic acid.</p>
      <div class="ac-start__buttons">
        <button class="ac-btn ac-btn--primary" type="button" data-action="start">Start Race</button>
        <div class="ac-start__secondary">
          <button class="ac-btn ac-btn--secondary" type="button" data-action="tracks">Tracks</button>
          <button class="ac-btn ac-btn--secondary" type="button" data-action="store">Store</button>
          <button class="ac-btn ac-btn--secondary" type="button" data-action="options">Options</button>
        </div>
      </div>
      <footer class="ac-start__footer">
        <span class="ac-start__footer-key">WASD</span> / <span class="ac-start__footer-key">Arrows</span> to steer
        &nbsp;·&nbsp; Boost pads hit 42 m/s
        &nbsp;·&nbsp; Collect <span class="ac-start__crumb">Crumb Coins</span>
      </footer>
    </div>
  `.trim();

  const startButton = overlay.querySelector<HTMLButtonElement>('[data-action="start"]');
  const tracksButton = overlay.querySelector<HTMLButtonElement>('[data-action="tracks"]');
  const storeButton = overlay.querySelector<HTMLButtonElement>('[data-action="store"]');
  const optionsButton = overlay.querySelector<HTMLButtonElement>('[data-action="options"]');

  startButton?.addEventListener("click", options.onStart);
  storeButton?.addEventListener("click", options.onStore);
  optionsButton?.addEventListener("click", options.onOptions);
  if (options.onTracks) {
    tracksButton?.addEventListener("click", options.onTracks);
  } else {
    tracksButton?.remove();
  }

  return overlay;
}
