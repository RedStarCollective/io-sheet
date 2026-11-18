# FX layer sources

`fx.css` and `fx.js` are the readable sources of the `<style id="io-fx-css">` and `<script id="io-fx">` blocks in `index.html`.

Rebuild after editing them:

    python3 tools/fx/build.py . tools/fx

The script replaces the two blocks and patches the app's hooks (it is safe to run again). If you edit the blocks in `index.html` directly, copy the change back here.

## Nov 18 changes (fx/iter5)
- Removed: HP / Humanity instruments (D5), brush-seal ink-in (D4), the Fans deal-in (N1, and the app's own `.deal` entrance).
- Pinned: Living portrait (Dossier) and Rep portraits in depth are forced off (`PIN` in fx.js). The in-browser depth maps warp the art on load. They come back when Oak supplies real depth maps.
- Ware callouts are placed by hand. Admin sees "Place callouts" on the Ware stage. Pick a label, then click on the body; drag dots to adjust. Points are stored as `call.pts` {"who|f/b|item name":[x%,y%]} in the fx meta, and "Save for everyone" publishes them. Items with no point aim at the zone anchor.

## Nov 18 picks (fx/iter5): X1, Y3, Y2
- X1 title screen (`title.on`): shows on the first open of a browser session for Iō, over a blurred sheet. Any key, Access, or Zolo dismisses it. "Skip this screen next time" stores `io-title=skip` in localStorage. The app passes `id` (name, handle, origin, rep, sin, roles) in the rendered() context.
- Y3 (`hex.on`, `bar.on`): game attribute hexes sit behind the STAT values, mapped by the fixed stat order. Each skill row fills to BASE on a 2–18 scale (red at 18+). Each skill table header gets the game's skill glyph, picked by the table's first skill and dropped if it would wrap the header.
- Y2 (`diag.on`): a ripperdoc diagnostic block at the top of the Ware zone panel, showing the game's anatomy render for the zone. A limb pick switches it to a cropped skeleton or the legs render. It is hidden in the cyberarm diagram view.
- Assets live in img/fx/2077/ (gold-tinted or white-mask webp, made from the 2077 sprite library).
