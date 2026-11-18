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
