// Track Select overlay for AntCarts — Wave 5.
//
// Ant + house themed using the race-track palette (CSS vars from style.css).
// Shows a "CHOOSE TRACK" header and a grid of track-variant cards. Each card
// shows the variant name, a tiny inline-SVG pheromone-trail preview silhouette
// of the track shape (derived from a `kind` hint), and a "Race" button.
// Selecting a card calls `onSelect(variantId)`.
//
// `setVariants(list)` populates the grid from `trackTemplates` exported
// variants. Built programmatically (createElement + appendChild + textContent)
// so it's unit-testable with a tiny document stub (no jsdom). No Three.js.

export interface TrackVariantInfo {
  /** Stable variant id (matches trackTemplates variant ids). */
  id: string;
  /** Display name for the card. */
  name: string;
  /** Silhouette kind used to pick the inline-SVG preview path. */
  kind: TrackPreviewKind;
}

export type TrackPreviewKind =
  | "loop"
  | "dogleg"
  | "kidney"
  | "switchback"
  | "wide-S";

export interface TrackSelectScreenOptions {
  onSelect: (variantId: string) => void;
  onBack: () => void;
}

export interface TrackSelectScreen extends HTMLDivElement {
  /** Replace the grid with a new list of variant cards. */
  setVariants(list: TrackVariantInfo[]): void;
}

// --- inline-SVG preview paths (pheromone-trail silhouettes per kind) ---

const PREVIEW_PATHS: Record<TrackPreviewKind, string> = {
  // closed loop, roughly oval
  loop: "M30 18 Q12 18 12 32 Q12 46 30 46 Q48 46 48 32 Q48 18 30 18 Z",
  // dogleg: bent loop
  dogleg:
    "M22 14 Q10 14 10 26 Q10 36 20 38 Q22 46 34 46 Q48 46 48 34 Q48 22 36 20 Q34 14 22 14 Z",
  // kidney: indented bean
  kidney:
    "M28 14 Q12 14 12 30 Q12 44 26 46 Q34 46 36 38 Q38 46 46 44 Q50 38 48 30 Q48 14 32 14 Q30 14 28 14 Z",
  // switchback: zig-zag-ish loop
  switchback:
    "M16 16 Q14 28 24 30 Q14 34 18 46 Q22 50 30 46 Q40 40 36 30 Q48 26 44 16 Q38 10 30 16 Q22 20 16 16 Z",
  // wide-S: sweeping S-curve loop
  "wide-S":
    "M12 18 Q26 12 30 24 Q34 36 48 30 Q52 44 40 46 Q26 50 22 38 Q18 26 12 32 Q8 26 12 18 Z",
};

function previewSvg(kind: TrackPreviewKind): string {
  const path = PREVIEW_PATHS[kind] ?? PREVIEW_PATHS.loop;
  return `<svg class="ac-track-preview__svg" viewBox="0 0 60 60" role="img" aria-label="Track preview" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ac-track-grad-${kind}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5dfdff"/>
      <stop offset="1" stop-color="#ff73bb"/>
    </linearGradient>
  </defs>
  <path d="${path}" fill="none" stroke="url(#ac-track-grad-${kind})" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.95"/>
  <circle cx="30" cy="30" r="2" fill="#f4d150"/>
</svg>`.trim();
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

function makeCard(
  variant: TrackVariantInfo,
  onSelect: (variantId: string) => void,
): HTMLDivElement {
  const card = makeEl<HTMLDivElement>("div", "ac-track-card");
  card.dataset.variantId = variant.id;
  card.style.setProperty("--ac-track-accent", "var(--hud-cyan)");

  const previewWrap = makeEl<HTMLDivElement>("div", "ac-track-preview");
  previewWrap.innerHTML = previewSvg(variant.kind);

  const body = makeEl<HTMLDivElement>("div", "ac-track-card__body");
  const name = makeEl<HTMLHeadingElement>("h3", "ac-track-card__name", variant.name);
  const kindLabel = makeEl<HTMLSpanElement>(
    "span",
    "ac-track-card__kind",
    variant.kind.replace("-", " ").toUpperCase(),
  );
  body.appendChild(name);
  body.appendChild(kindLabel);

  const raceBtn = makeEl<HTMLButtonElement>("button", "ac-btn ac-btn--primary ac-track-card__btn", "Race");
  raceBtn.type = "button";
  raceBtn.dataset.action = "race";
  raceBtn.dataset.variantId = variant.id;
  raceBtn.addEventListener("click", () => onSelect(variant.id));

  // Clicking anywhere on the card also selects (except on the button itself).
  card.addEventListener("click", (event) => {
    if (event.target === raceBtn) {
      return;
    }
    onSelect(variant.id);
  });

  card.appendChild(previewWrap);
  card.appendChild(body);
  card.appendChild(raceBtn);
  return card;
}

export function createTrackSelectScreen(options: TrackSelectScreenOptions): TrackSelectScreen {
  const overlay = makeEl<HTMLDivElement>("div", "ac-screen ac-track-select");
  const backdrop = makeEl<HTMLDivElement>("div", "ac-track-select__backdrop");
  const card = makeEl<HTMLDivElement>("div", "ac-track-select__card");

  // --- header ---
  const header = makeEl<HTMLDivElement>("div", "ac-track-select__header");
  const eyebrow = makeEl<HTMLParagraphElement>("p", "ac-track-select__eyebrow", "ANTHILL CIRCUIT");
  const title = makeEl<HTMLHeadingElement>("h1", "ac-track-select__title", "CHOOSE TRACK");
  header.appendChild(eyebrow);
  header.appendChild(title);

  // --- grid ---
  const grid = makeEl<HTMLDivElement>("div", "ac-track-select__grid");

  // --- footer / back ---
  const footer = makeEl<HTMLDivElement>("div", "ac-track-select__footer");
  const backBtn = makeEl<HTMLButtonElement>("button", "ac-btn ac-btn--secondary", "Back");
  backBtn.type = "button";
  backBtn.dataset.action = "back";
  backBtn.addEventListener("click", options.onBack);
  footer.appendChild(backBtn);

  card.appendChild(header);
  card.appendChild(grid);
  card.appendChild(footer);
  overlay.appendChild(backdrop);
  overlay.appendChild(card);

  const screen = overlay as TrackSelectScreen;
  screen.setVariants = (list: TrackVariantInfo[]): void => {
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }
    for (const variant of list) {
      grid.appendChild(makeCard(variant, options.onSelect));
    }
  };
  return screen;
}
