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

## Fans load-in (fx/fansboot, Nov 18)
- `fboot.on` and `fboot.speed`. On entering Fans, every card in the first screenful has its frame traced in gold and its panel filled in 7 steps with a grid flash, one card after another (55 ms apart). Then the art resolves on each in turn (85 ms apart): interlaced lines thicken from 0 to 4 px under a gold scan bar, with a brief red/gold split and a sepia flash that settles. After that the name plate rises and the name decodes.
- Cards further down wait hidden (`.fxbw`) and boot in small batches as they scroll in (IntersectionObserver). The scroll-rise reveal is off while booting (`body.fx-fboot`). Reduced motion and arrange mode skip it.
## Stat resonance (fx/resonance, Nov 19, Impeccable overdrive on Dossier)
- `res.on`. Mouse only, Dossier, Iō.
- Hovering a STAT dims every skill row that doesn't use it. The rows that do use it light up in a gold sweep, ordered by distance from the stat cell (`--rd` = distance / 1.8 ms). The stat cell pulses and shows "N skills".
- Hovering a skill row (after 90 ms) draws a fixed SVG circuit trace from its STAT cell along the gutter bus to the row, with a light packet riding it (SMIL animateMotion). A chip above the row's right end builds the BASE sum, read from the row's MOD/LVL/STAT/BASE cells, with blanks counted as 0.
- The stat is read from the row's `b.st` "(XXX)". Language, Local Expert and Science count as INT, and Martial Arts as DEX.
- Reduced motion gets the same highlight and trace without the motion.
- The tag uses ::before, because `body.fx-plates .dossier .stat::after` owns ::after.

## Charge the Arm + elemental forms (fx/arm, Nov 19, Impeccable overdrive on Dossier)
- `arm.on`. Dossier, Iō, viewports wider than 880 px (phones load io-portrait.jpg, which the masks don't fit).
- There is one WebGL canvas `.fxarm` inside `.iopw`, padded 22% left/right and 12% top so effects can spill off the figure. The pose's gold mask (`--gm` on `.iogold`) becomes a 324 px texture: R = arm, G = soft halo, B = wide halo. The halos are blurred by down- and up-scaling. A CPU copy of the mask does the hit-testing.
- **Hover the gold arm:** circuit traces light along it and pulse upward.
- **Press and hold:** it charges over 1.15 s in the chosen mode.
  - Fire: flame tongues licking off the arm, embers.
  - Frost: Voronoi ice creeping over it, cold mist, glints.
  - Volt: stepped flickering arcs, plus jumps at high charge.
- **Release** (charge > 0.22): a ring leaves the arm, and every Dossier block gets a WAAPI push-and-spring (composite: add) plus a coloured glow, nearest first.
- The mode switch `.fxarmsw` (Fire / Frost / Volt, drawn SVG icons, no snowflake) sits above the pose switch and is remembered in localStorage `io-armmode`.
- **Hovering a mastered form row** (`tr.master.m-fire|water|air|earth`) plays its element over the portrait: fire embers + under-glow, water caustic light + ripples, air ribbons + motes swirling around the figure, earth falling grit + dust + a small tremor on the img and gold layer.
- The frame loop runs only while something is active, then clears and stops. Reduced motion freezes time and skips the ripple and tremor. Resonance skips the trace on mastered rows.
