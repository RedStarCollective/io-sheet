# FX layer sources

`fx.css` and `fx.js` are the readable sources of the `<style id="io-fx-css">` and `<script id="io-fx">` blocks in `index.html`.

Rebuild after editing them:

    python3 tools/fx/build.py . tools/fx

The script replaces the two blocks and patches the app's hooks (it is safe to run again). If you edit the blocks in `index.html` directly, copy the change back here.

## Nov 18 changes (fx/iter5)
- Removed: HP / Humanity instruments (D5), brush-seal ink-in (D4), the Fans deal-in (N1, and the app's own `.deal` entrance).
- Pinned: Living portrait (Dossier) and Rep portraits in depth are forced off (`PIN` in fx.js). The in-browser depth maps warp the art on load. They come back when Oak supplies real depth maps.
- Ware callouts are placed by hand. Admin sees "Place callouts" on the Ware stage. Pick a label, then click on the body; drag dots to adjust. Points are stored as `call.pts` {"who|f/b|item name":[x%,y%]} in the fx meta, and "Save for everyone" publishes them. Items with no point aim at the zone anchor.
