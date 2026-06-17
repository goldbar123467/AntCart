# Game Modules

Use this folder for AntCarts gameplay code.

- `simulation/`: serializable game state, entity data, scoring, timers, and progression.
- `input/`: maps physical browser input to game actions.
- `content/`: level, vehicle, cart, and tuning data.

Renderer objects should consume simulation snapshots instead of owning game rules directly.
