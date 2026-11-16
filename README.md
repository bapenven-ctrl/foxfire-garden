# foxfire-garden

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/bapenven-ctrl/foxfire-garden/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/bapenven-ctrl/foxfire-garden/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**FOXFIRE — Garden of the Last Bloom.** An original arena-defense game for the desktop
browser. The gloom comes for the Great Bloom at the garden's heart, and you are its
keeper: a fox spirit with a tail of fire. Guard the Bloom through ten nights of moths,
beetles, darters and spitters; after every night the garden offers a blessing — damage,
twin fire, piercing light, a sturdier Bloom, a spirit ward — and your choices are the
build that carries you to the tenth night, when the Matriarch comes herself. Fell her
and dawn breaks; let the Bloom fade or the spirit scatter, and the night wins.

- **Goal:** keep the Great Bloom (and the fox) alive for ten nights and banish the Matriarch.
- **Controls:** WASD or arrow keys move · the mouse aims · hold the mouse button to shoot
  foxfire · Space dashes (with i-frames) · P pauses · M mutes · after each night, click a
  blessing card or press 1, 2 or 3.
- **Score:** gloom banished, pollen gathered (every 30 pollen heals the Bloom), nights
  cleared — with a full run summary of score, kills, accuracy and time on the win and
  game-over screens, and a best score kept between visits.
- **Complete loop:** title → ten escalating nights with blessing choices → boss night →
  dawn victory screen, or a game-over screen; both offer an instant restart.
- **Craft:** everything is drawn and sounded by the game's own code — layered canvas
  scenery, a wilting Bloom that shows its health in its petals, five enemy kinds with
  distinct silhouettes and behaviours, particles, screen shake and hit-stop, and a fully
  procedural WebAudio score and effects. No assets, no libraries, no network: it runs
  offline from the static files in `game/`.

## Run it

```sh
python3 -m http.server 8080 --directory game   # then open http://localhost:8080 in desktop Chrome
```

Any static file server over `game/` works the same way. To hand the game in the way the
bounty grades it (copies `game/` and `screenshots/` to the output and writes the dossier
the judge reads):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `main.ts` — the entry program (Node 22, standard library only): hands the game in.
- `vendor/makefun-game.ts` — make.fun's dossier library, the kit's copy, unchanged.
- `game/index.html` + `game/style.css` — the page.
- `game/src/` — the game itself, one job per file: `config.js` (tuning and palette),
  `random.js` (the seeded generator), `input.js` (keyboard and mouse), `audio.js`
  (procedural WebAudio sound), `enemies.js` (the five gloom kinds and the night
  director), `blessings.js` (the between-night choices), `world.js` (the simulation),
  `render.js` (all drawing, HUD and screens), `shots.js` (the deterministic screenshot
  scenes), `main.js` (boot, the loop and the screens' flow).
- `screenshots/` — four real renders of the game (title, the Matriarch fight, a blessing
  choice, the dawn victory), staged deterministically by `game/src/shots.js` through
  `?shot=<scene>&seed=<n>`; `shots.json` lists them.

MIT licensed — see `LICENSE`.

---
<sub>Entered on [make.fun](https://make.fun/?ref=mx5kwf81&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
