// Pause / Options overlay for AntCarts — Wave 5.
//
// Ant + house themed using the race-track palette (CSS vars from style.css).
// Shows a "PAUSED" header with a resting-ant motif and "ANT NAP" subtitle, a
// pheromone-trail divider, a small Options panel (toggles persisted to the
// "antcarts:settings" key via the settings module accessors), and Resume /
// Restart Race / Quit to Menu buttons.
//
// Built programmatically (createElement + appendChild + textContent) so it's
// unit-testable with a tiny document stub (no jsdom). No Three.js.

import type { GameSettings } from "../../game/settings";

export interface PauseScreenOptions {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  /** Read the current settings (called to populate the toggles). */
  options: () => GameSettings;
  /** Apply a settings patch (called when a toggle changes). */
  setOptions: (patch: Partial<GameSettings>) => void;
}

export interface PauseScreen extends HTMLDivElement {
  /** Re-read settings via `options()` and refresh the toggle states. */
  refresh(): void;
}

const RESTING_ANT_SVG = `
<svg class="ac-pause__ant" viewBox="0 0 140 60" role="img" aria-label="Resting ant" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ac-pause-stripe" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2d6bbf" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#5dfdff"/>
      <stop offset="1" stop-color="#2d6bbf" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- pheromone trail (resting line) -->
  <path d="M6 46 Q40 40 70 44 T134 42" fill="none" stroke="url(#ac-pause-stripe)" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
  <!-- resting ant body (curled) -->
  <g fill="#101418">
    <ellipse cx="70" cy="30" rx="13" ry="8"/>
    <ellipse cx="56" cy="32" rx="9" ry="6.5"/>
    <ellipse cx="86" cy="30" rx="7" ry="5.5"/>
    <line x1="56" y1="30" x2="48" y2="22" stroke="#101418" stroke-width="1.6" stroke-linecap="round"/>
    <line x1="56" y1="30" x2="48" y2="26" stroke="#101418" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  <!-- tucked legs -->
  <g stroke="#101418" stroke-width="1.6" stroke-linecap="round" opacity="0.85">
    <path d="M62 36 Q60 42 64 44"/>
    <path d="M76 36 Q78 42 74 44"/>
  </g>
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

interface ToggleRow {
  row: HTMLDivElement;
  input: HTMLInputElement;
}

function makeToggle(
  key: keyof GameSettings,
  label: string,
  initial: boolean,
  onChange: (checked: boolean) => void,
): ToggleRow {
  const row = makeEl<HTMLDivElement>("div", "ac-options-toggle");
  const labelEl = makeEl<HTMLLabelElement>("label", "ac-options-toggle__label", label);
  labelEl.htmlFor = `ac-toggle-${key}`;
  const input = makeEl<HTMLInputElement>("input", "ac-options-toggle__input");
  input.type = "checkbox";
  input.id = `ac-toggle-${key}`;
  input.checked = initial;
  input.dataset.setting = key;
  input.addEventListener("change", () => {
    onChange(input.checked);
  });
  // Visual switch housing wraps the native checkbox.
  const switchEl = makeEl<HTMLSpanElement>("span", "ac-options-toggle__switch");
  const knob = makeEl<HTMLSpanElement>("span", "ac-options-toggle__knob");
  switchEl.appendChild(knob);
  labelEl.appendChild(input);
  labelEl.appendChild(switchEl);
  row.appendChild(labelEl);
  return { row, input };
}

export function createPauseScreen(options: PauseScreenOptions): PauseScreen {
  const overlay = makeEl<HTMLDivElement>("div", "ac-screen ac-pause");
  const backdrop = makeEl<HTMLDivElement>("div", "ac-pause__backdrop");
  const card = makeEl<HTMLDivElement>("div", "ac-pause__card");

  // --- header: resting ant + PAUSED + ANT NAP subtitle ---
  const antWrap = makeEl<HTMLDivElement>("div", "ac-pause__ant-wrap");
  antWrap.innerHTML = RESTING_ANT_SVG;
  const eyebrow = makeEl<HTMLParagraphElement>("p", "ac-pause__eyebrow", "ANTHILL CIRCUIT");
  const title = makeEl<HTMLHeadingElement>("h1", "ac-pause__title", "PAUSED");
  const subtitle = makeEl<HTMLParagraphElement>("p", "ac-pause__subtitle", "ANT NAP");

  // --- pheromone-trail divider ---
  const divider = makeEl<HTMLDivElement>("div", "ac-pause__divider");

  // --- options panel ---
  const panel = makeEl<HTMLDivElement>("div", "ac-options-panel");
  const panelTitle = makeEl<HTMLHeadingElement>("h2", "ac-options-panel__title", "OPTIONS");
  const togglesWrap = makeEl<HTMLDivElement>("div", "ac-options-panel__toggles");

  const initial = options.options();
  const engineToggle = makeToggle(
    "engineAudio",
    "Engine Audio",
    initial.engineAudio,
    (checked) => options.setOptions({ engineAudio: checked }),
  );
  const hudToggle = makeToggle(
    "showHud",
    "Show HUD",
    initial.showHud,
    (checked) => options.setOptions({ showHud: checked }),
  );
  const shakeToggle = makeToggle(
    "cameraShake",
    "Camera Shake",
    initial.cameraShake,
    (checked) => options.setOptions({ cameraShake: checked }),
  );
  togglesWrap.appendChild(engineToggle.row);
  togglesWrap.appendChild(hudToggle.row);
  togglesWrap.appendChild(shakeToggle.row);
  panel.appendChild(panelTitle);
  panel.appendChild(togglesWrap);

  // --- buttons ---
  const buttons = makeEl<HTMLDivElement>("div", "ac-pause__buttons");
  const resumeBtn = makeEl<HTMLButtonElement>("button", "ac-btn ac-btn--primary", "Resume");
  resumeBtn.type = "button";
  resumeBtn.dataset.action = "resume";
  const restartBtn = makeEl<HTMLButtonElement>("button", "ac-btn ac-btn--secondary", "Restart Race");
  restartBtn.type = "button";
  restartBtn.dataset.action = "restart";
  const quitBtn = makeEl<HTMLButtonElement>("button", "ac-btn ac-btn--secondary", "Quit to Menu");
  quitBtn.type = "button";
  quitBtn.dataset.action = "quit";
  buttons.appendChild(resumeBtn);
  buttons.appendChild(restartBtn);
  buttons.appendChild(quitBtn);

  resumeBtn.addEventListener("click", options.onResume);
  restartBtn.addEventListener("click", options.onRestart);
  quitBtn.addEventListener("click", options.onQuit);

  // --- assemble ---
  card.appendChild(antWrap);
  card.appendChild(eyebrow);
  card.appendChild(title);
  card.appendChild(subtitle);
  card.appendChild(divider);
  card.appendChild(panel);
  card.appendChild(buttons);
  overlay.appendChild(backdrop);
  overlay.appendChild(card);

  const screen = overlay as PauseScreen;
  screen.refresh = (): void => {
    const current = options.options();
    engineToggle.input.checked = current.engineAudio;
    hudToggle.input.checked = current.showHud;
    shakeToggle.input.checked = current.cameraShake;
  };
  return screen;
}
