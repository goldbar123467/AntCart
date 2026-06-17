// Store / shop overlay for AntCarts — Wave 3.
//
// Ant + house themed using the race-track palette (CSS vars from style.css).
// Shows the SUGAR STORE: a Crumb Coin balance badge, a sectioned grid of
// catalog items (Cosmetics + Powerups), and a Back button. Owned cosmetics show
// "Owned"/"Equip" instead of Buy; the equipped cosmetic shows "Equipped".
// Insufficient funds disable Buy and paint the price red.
//
// Built programmatically (createElement + appendChild) so `refresh()` can
// re-render the grid from wallet + inventory state, and so the module is
// unit-testable with a tiny document stub (no jsdom). No Three.js.

import {
  STORE_CATALOG,
  getCosmetics,
  getPowerups,
  type StoreItem,
} from "../../game/economy/storeCatalog";
import { getWallet } from "../../game/economy/currency";
import {
  loadInventory,
  buyItem,
  equipCosmetic,
  type Inventory,
} from "../../game/economy/inventory";

export interface StoreScreenOptions {
  /** Called when the player taps Back — caller decides the destination phase. */
  onBack: () => void;
}

export interface StoreScreen extends HTMLDivElement {
  /** Re-read wallet + inventory and re-render the grid. Call after every buy. */
  refresh(): void;
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

export function createStoreScreen(options: StoreScreenOptions): StoreScreen {
  const overlay = makeEl<HTMLDivElement>("div", "ac-screen ac-store");
  const backdrop = makeEl<HTMLDivElement>("div", "ac-store__backdrop");
  const card = makeEl<HTMLDivElement>("div", "ac-store__card");

  // --- header ---
  const header = makeEl<HTMLDivElement>("div", "ac-store__header");
  const eyebrow = makeEl<HTMLParagraphElement>("p", "ac-store__eyebrow", "ANTHILL CIRCUIT");
  const title = makeEl<HTMLHeadingElement>("h1", "ac-store__title", "SUGAR STORE");

  // coin balance badge
  const coinBadge = makeEl<HTMLDivElement>("div", "ac-coin-badge");
  const coinIcon = makeEl<HTMLSpanElement>("span", "ac-coin", "◆");
  const coinValue = makeEl<HTMLSpanElement>("span", "ac-coin-badge__value", "0");
  coinBadge.appendChild(coinIcon);
  coinBadge.appendChild(coinValue);

  header.appendChild(eyebrow);
  header.appendChild(title);
  header.appendChild(coinBadge);

  // --- scrollable grid area ---
  const gridWrap = makeEl<HTMLDivElement>("div", "ac-store__grid-wrap");

  // --- footer / back ---
  const footer = makeEl<HTMLDivElement>("div", "ac-store__footer");
  const backButton = makeEl<HTMLButtonElement>("button", "ac-btn ac-btn--secondary", "Back");
  backButton.type = "button";
  backButton.dataset.action = "back";
  footer.appendChild(backButton);
  backButton.addEventListener("click", options.onBack);

  // --- assemble static frame ---
  card.appendChild(header);
  card.appendChild(gridWrap);
  card.appendChild(footer);
  overlay.appendChild(backdrop);
  overlay.appendChild(card);

  // --- render a single store card ---
  function renderCard(item: StoreItem, inv: Inventory, coins: number): HTMLDivElement {
    const cardEl = makeEl<HTMLDivElement>("div", "ac-store-card");
    cardEl.style.setProperty("--ac-card-accent", item.accent);

    const iconWrap = makeEl<HTMLDivElement>("div", "ac-store-card__icon");
    const icon = makeEl<HTMLSpanElement>("span", "ac-store-card__icon-glyph", item.icon);
    iconWrap.appendChild(icon);

    const body = makeEl<HTMLDivElement>("div", "ac-store-card__body");
    const name = makeEl<HTMLHeadingElement>("h3", "ac-store-card__name", item.name);
    const desc = makeEl<HTMLParagraphElement>("p", "ac-store-card__desc", item.desc);
    body.appendChild(name);
    body.appendChild(desc);

    // stock count for powerups
    if (item.kind === "powerup") {
      const have = inv.powerupStock[item.id] ?? 0;
      if (have > 0) {
        const stock = makeEl<HTMLSpanElement>(
          "span",
          "ac-store-card__stock",
          `In stock: ${have}`,
        );
        body.appendChild(stock);
      }
    }

    // action area: price + button
    const action = makeEl<HTMLDivElement>("div", "ac-store-card__action");
    const priceEl = makeEl<HTMLSpanElement>(
      "span",
      "ac-store-card__price",
      `${item.price}`,
    );
    const priceCoin = makeEl<HTMLSpanElement>("span", "ac-coin", "◆");
    action.appendChild(priceCoin);
    action.appendChild(priceEl);

    if (item.kind === "cosmetic") {
      const owned = inv.ownedCosmetics.includes(item.id);
      const equipped = inv.equippedCosmetic === item.id;
      if (equipped) {
        const equippedBtn = makeEl<HTMLButtonElement>(
          "button",
          "ac-btn ac-btn--secondary ac-store-card__btn ac-store-card__btn--equipped",
          "Equipped",
        );
        equippedBtn.type = "button";
        equippedBtn.disabled = true;
        action.appendChild(equippedBtn);
      } else if (owned) {
        const equipBtn = makeEl<HTMLButtonElement>(
          "button",
          "ac-btn ac-btn--secondary ac-store-card__btn ac-store-card__btn--equip",
          "Equip",
        );
        equipBtn.type = "button";
        equipBtn.dataset.action = "equip";
        equipBtn.dataset.itemId = item.id;
        equipBtn.addEventListener("click", () => {
          equipCosmetic(item.id);
          refresh();
        });
        action.appendChild(equipBtn);
        const ownedTag = makeEl<HTMLSpanElement>(
          "span",
          "ac-store-card__owned-tag",
          "Owned",
        );
        action.appendChild(ownedTag);
      } else {
        const buyBtn = makeEl<HTMLButtonElement>(
          "button",
          "ac-btn ac-btn--primary ac-store-card__btn ac-store-card__btn--buy",
          "Buy",
        );
        buyBtn.type = "button";
        buyBtn.dataset.action = "buy";
        buyBtn.dataset.itemId = item.id;
        if (coins < item.price) {
          buyBtn.disabled = true;
          buyBtn.classList.add("ac-store-card__btn--disabled");
          priceEl.classList.add("ac-store-card__price--insufficient");
        }
        buyBtn.addEventListener("click", () => {
          buyItem(item.id);
          refresh();
        });
        action.appendChild(buyBtn);
      }
    } else {
      // powerup — always buyable if affordable
      const buyBtn = makeEl<HTMLButtonElement>(
        "button",
        "ac-btn ac-btn--primary ac-store-card__btn ac-store-card__btn--buy",
        "Buy",
      );
      buyBtn.type = "button";
      buyBtn.dataset.action = "buy";
      buyBtn.dataset.itemId = item.id;
      if (coins < item.price) {
        buyBtn.disabled = true;
        buyBtn.classList.add("ac-store-card__btn--disabled");
        priceEl.classList.add("ac-store-card__price--insufficient");
      }
      buyBtn.addEventListener("click", () => {
        buyItem(item.id);
        refresh();
      });
      action.appendChild(buyBtn);
    }

    cardEl.appendChild(iconWrap);
    cardEl.appendChild(body);
    cardEl.appendChild(action);
    return cardEl;
  }

  function renderSection(titleText: string, items: StoreItem[], inv: Inventory, coins: number): HTMLDivElement {
    const section = makeEl<HTMLDivElement>("div", "ac-store__section");
    const heading = makeEl<HTMLHeadingElement>("h2", "ac-store__section-title", titleText);
    const grid = makeEl<HTMLDivElement>("div", "ac-store-grid");
    section.appendChild(heading);
    for (const item of items) {
      grid.appendChild(renderCard(item, inv, coins));
    }
    section.appendChild(grid);
    return section;
  }

  // --- refresh: re-read state + re-render grid ---
  function refresh(): void {
    const inv = loadInventory();
    const coins = getWallet().coins;
    coinValue.textContent = `${coins}`;

    // clear previous grid content
    while (gridWrap.firstChild) {
      gridWrap.removeChild(gridWrap.firstChild);
    }
    gridWrap.appendChild(renderSection("Cosmetics", getCosmetics(), inv, coins));
    gridWrap.appendChild(renderSection("Powerups", getPowerups(), inv, coins));
  }

  const screen = overlay as StoreScreen;
  screen.refresh = refresh;
  // Initial render.
  refresh();

  // Expose catalog length on the overlay for lightweight tests/inspection.
  (screen as StoreScreen & { catalogCount?: number }).catalogCount = STORE_CATALOG.length;

  return screen;
}
