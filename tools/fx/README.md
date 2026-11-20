# FX layer sources

`fx.css` and `fx.js` are the readable sources of the `<style id="io-fx-css">` and `<script id="io-fx">` blocks in `index.html`.

Rebuild after editing them:

    python3 tools/fx/build.py . tools/fx

The script replaces the two blocks and patches the app's hooks (it is safe to run again). If you edit the blocks in `index.html` directly, copy the change back here.

## Nov 18 changes (fx/iter5)
- Removed: HP / Humanity instruments (D5), brush-seal ink-in (D4), the Fans deal-in (N1, and the app's own `.deal` entrance).
- Pinned: Living portrait (Dossier) and Rep portraits in depth are forced off (`PIN` in fx.js). The in-browser depth maps warp the art on load. They come back when Oak supplies real depth maps.
- Ware callouts are placed by hand. Admin sees "Place callouts" on the Ware stage. Pick a label, then click on the body; drag dots to adjust. Points are stored as `call.pts` {"who|f/b|item name":[x%,y%]} in the fx meta, and "Save for everyone" publishes them. Items with no point aim at the zone anchor.

## Nov 18 pick (fx/iter5): X1
- X1 title screen (`title.on`): shows on the first open of a browser session for Iō, over a blurred sheet. Any key, Access, or Zolo dismisses it. "Skip this screen next time" stores `io-title=skip` in localStorage. The app passes `id` (name, handle, origin, rep, sin, roles) in the rendered() context. Y2 and Y3 were tried and removed (Oak, Nov 18).

## Stat resonance (fx/resonance, Nov 19, Impeccable overdrive on Dossier)
- `res.on`. Mouse only, Dossier, Iō.
- Hovering a STAT dims every skill row that doesn't use it. The rows that do use it light up in a gold sweep, ordered by distance from the stat cell (`--rd` = distance / 1.8 ms). The stat cell pulses and shows "N skills".
- Hovering a skill row (after 90 ms) draws a fixed SVG circuit trace from its STAT cell along the gutter bus to the row, with a light packet riding it (SMIL animateMotion). A chip above the row's right end builds the BASE sum, read from the row's MOD/LVL/STAT/BASE cells, with blanks counted as 0.
- The stat is read from the row's `b.st` "(XXX)". Language, Local Expert and Science count as INT, and Martial Arts as DEX.
- Reduced motion gets the same highlight and trace without the motion.
- The tag uses ::before, because `body.fx-plates .dossier .stat::after` owns ::after.
