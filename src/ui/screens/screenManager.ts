// ScreenManager: a small phase state machine for the AntCarts front-end.
//
// Pure TypeScript — no Three.js, no DOM-coupled imports beyond the structural
// `ScreenOverlay` interface (which a real HTMLElement satisfies). That keeps it
// unit-testable in the default vitest node environment with lightweight stubs.
//
// Each registered overlay is shown/hidden by toggling the `.is-active` class.
// `goto` updates `current` and notifies an optional onChange callback so
// main.ts can pause/resume the race loop when the phase leaves "race".

export type GamePhase =
  | "menu"
  | "race"
  | "results"
  | "betweenRaces"
  | "store"
  | "paused"
  | "trackSelect";

/**
 * Minimal shape the ScreenManager touches on an overlay element.
 * A real `HTMLElement` satisfies this structurally (its `classList` is a
 * `DOMTokenList`), but tests can pass in a tiny stub without a DOM env.
 */
export interface ScreenOverlay {
  classList: {
    add(...tokens: string[]): void;
    remove(...tokens: string[]): void;
    contains(token: string): boolean;
  };
}

export type PhaseChangeCallback = (phase: GamePhase, previous: GamePhase) => void;

export interface ScreenManager {
  /** The phase the game is currently in. */
  readonly current: GamePhase;
  /** Transition to a new phase, toggling `.is-active` on registered overlays. */
  goto(phase: GamePhase): GamePhase;
  /** Attach an overlay element to a phase so the manager can show/hide it. */
  register(phase: GamePhase, element: ScreenOverlay): void;
  /** Hide every registered overlay (no active phase). */
  hideAll(): void;
  /** Install a callback fired on every successful `goto`. */
  setOnChange(callback: PhaseChangeCallback | undefined): void;
}

const ACTIVE_CLASS = "is-active";

export function createScreenManager(): ScreenManager {
  const overlays = new Map<GamePhase, ScreenOverlay>();
  let current: GamePhase = "menu";
  let onChange: PhaseChangeCallback | undefined;

  function syncActive(phase: GamePhase): void {
    overlays.forEach((element, registeredPhase) => {
      if (registeredPhase === phase) {
        element.classList.add(ACTIVE_CLASS);
      } else {
        element.classList.remove(ACTIVE_CLASS);
      }
    });
  }

  return {
    get current(): GamePhase {
      return current;
    },
    register(phase, element) {
      overlays.set(phase, element);
      // A newly registered element matches the active state immediately.
      if (phase === current) {
        element.classList.add(ACTIVE_CLASS);
      } else {
        element.classList.remove(ACTIVE_CLASS);
      }
    },
    goto(phase) {
      const previous = current;
      current = phase;
      syncActive(phase);
      if (onChange) {
        onChange(phase, previous);
      }
      return phase;
    },
    hideAll() {
      overlays.forEach((element) => {
        element.classList.remove(ACTIVE_CLASS);
      });
    },
    setOnChange(callback) {
      onChange = callback;
    },
  };
}
