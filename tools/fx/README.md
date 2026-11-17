# FX layer sources

`fx.css` and `fx.js` are the readable sources of the `<style id="io-fx-css">` and `<script id="io-fx">` blocks in `index.html`.

Rebuild after editing them:

    python3 tools/fx/build.py . tools/fx

The script replaces the two blocks and patches the app's hooks (it is safe to run again). If you edit the blocks in `index.html` directly, copy the change back here.
