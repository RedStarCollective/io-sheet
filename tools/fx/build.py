#!/usr/bin/env python3
"""Inject the IO FX layer (fx.css, fx.js) into index.html and patch the app's hooks. Safe to run again."""
import re, sys, io
ROOT = sys.argv[1]
SRC = sys.argv[2]
p = ROOT + "/index.html"
s = io.open(p, encoding="utf8").read()
css = io.open(SRC + "/fx.css", encoding="utf8").read().rstrip() + "\n"
js = io.open(SRC + "/fx.js", encoding="utf8").read().rstrip() + "\n"
assert "</script" not in js and "</style" not in css

CSS_BLOCK = '<style id="io-fx-css">\n' + css + '</style>\n'
JS_BLOCK = '<script id="io-fx">\n' + js + '</script>\n'

def put(s, rx, block, anchor, before):
    m = re.search(rx, s, re.S)
    if m:
        return s[:m.start()] + block + s[m.end():]
    i = s.index(anchor)
    assert s.count(anchor) == 1, anchor
    return (s[:i] + block + "\n" + s[i:]) if before else (s[:i + len(anchor)] + "\n" + block + s[i + len(anchor):])

s = put(s, r'<style id="io-fx-css">.*?</style>\n', CSS_BLOCK, '<canvas id="sky" aria-hidden="true"></canvas>', True)
s = put(s, r'<script id="io-fx">.*?</script>\n', JS_BLOCK, '<script id="io-app">', True)

def once(s, old, new, mark):
    if mark in s:
        return s
    assert s.count(old) == 1, (s.count(old), old[:70])
    return s.replace(old, new)

# 1. render(): tell the FX layer the page was drawn
s = once(s,
  '    paintViewers(); beatOnRender();\n    window.scrollTo(0, y);\n  }',
  '    paintViewers(); beatOnRender();\n    window.scrollTo(0, y);\n    fxAfter();\n  }\n'
  '  /* FX layer (id="io-fx"): reticle, Arm circuits, scan-wipe, key light and the admin tuning panel. Optional: the page works without it. */\n'
  '  function fxAfter(){\n'
  '    if (!window.IOFX || !IOFX.rendered) return;\n'
  '    var F = tab === "ware" ? FIG() : null, base = WHO === "zolo" && IO ? IO : S;\n'
  '    try { IOFX.rendered({tab:tab, who:WHO, editing:editing, admin:isAdmin() || (WHO === "zolo" && !roIo), fig:F && !F.nomask ? {m:F.m, rbox:F.rbox, anch:F.anch, back:!!F.back} : null, fx:base && base.fx, save:fxSave, rerender:render}); } catch(e){}\n'
  '  }\n'
  '  function fxSave(v){\n'
  '    var base = WHO === "zolo" && IO ? IO : S; base.fx = v;\n'
  '    return HOSTED ? pushState("meta", {name:"fx", value:v}) : persist(base);\n'
  '  }',
  'function fxAfter(){')

# 2. the saved FX settings come back with the sheet's page settings
s = once(s,
  '      if (j.meta && j.meta.arm && typeof j.meta.arm === "object") S.arm = {on:!!j.meta.arm.on};',
  '      if (j.meta && j.meta.arm && typeof j.meta.arm === "object") S.arm = {on:!!j.meta.arm.on};\n'
  '      if (j.meta && j.meta.fx && typeof j.meta.fx === "object") S.fx = j.meta.fx;',
  'j.meta.fx')

# 3. The Arm box gets a class and takes the key light
s = once(s,
  '\'<section class="box"><div class="hb"><span class="sp">The Arm</span>',
  '\'<section class="box armbox" data-lit><div class="hb"><span class="sp">The Arm</span>',
  'class="box armbox"')

# 4. scan depth change goes through the FX layer (it wipes the old layer away); without it, the plain swap
s = once(s,
  'if (b.dataset.xl){ XL = b.dataset.xl;',
  'if (b.dataset.xl){ var xlOld = XLSRC(FIG()); XL = b.dataset.xl;',
  'var xlOld = XLSRC(FIG());')
s = once(s,
  'if (bf && F2.skel) bf.style.setProperty("--sk", "url(" + XLSRC(F2) + ")");',
  'if (bf && F2.skel){ var xlNew = XLSRC(F2), xlSet = function(){ bf.style.setProperty("--sk", "url(" + xlNew + ")"); }; if (window.IOFX && IOFX.xl) IOFX.xl(bf, xlOld, xlNew, xlSet); else xlSet(); }',
  'var xlNew = XLSRC(F2)')

# 5. tab change goes through the FX layer (focus pull); without it, the plain cut
s = once(s,
  'enter:true}; try { history.replaceState(null, "", "#" + hashFor(tab)); } catch(e){} render(); window.scrollTo(0,0); decode(); } return; }',
  'enter:true}; try { history.replaceState(null, "", "#" + hashFor(tab)); } catch(e){} var fxGo = function(){ render(); window.scrollTo(0,0); decode(); }; if (window.IOFX && IOFX.swap) IOFX.swap(fxGo, tab); else fxGo(); } return; }',
  'var fxGo = function(){')

# 6. the old 2D sky rests while the WebGL backdrop is drawing (it stays as the fallback and for Zolo's forest)
s = once(s,
  '  function loop(t){ if (t - last > 33){ draw(t); last = t; } requestAnimationFrame(loop); }',
  '  function loop(t){ if (t - last > 33 && !(window.IOFX && IOFX.skyOn && IOFX.skyOn())){ draw(t); last = t; } requestAnimationFrame(loop); }',
  'IOFX.skyOn && IOFX.skyOn()')

# 7. Ware front/back: the FX layer turns the figure in depth; without it (or if it declines), the app's own CSS turn
s = once(s,
  'var bf0 = document.getElementById("bodyfig");\n      if (reduce || !bf0){ render(); return; }',
  'var bf0 = document.getElementById("bodyfig");\n      if (reduce || !bf0){ render(); return; }\n      if (window.IOFX && IOFX.turn && IOFX.turn(bf0, render, VIEW)) return;',
  'IOFX.turn(bf0, render, VIEW)')

# 7b. the figure's anchor points (for callouts and glints)
s = s.replace("fig:F && !F.nomask ? {m:F.m, rbox:F.rbox, back:!!F.back} : null", "fig:F && !F.nomask ? {m:F.m, rbox:F.rbox, anch:F.anch, back:!!F.back} : null")

# 8. Iō <-> Zolo switch goes through the FX layer (re-key reveal); without it, the plain swap
s = once(s,
  'repEnter = true; try { history.replaceState(null, "", "#" + hashFor(tab)); } catch(e){} render(); window.scrollTo(0,0); decode(); } return; }',
  'repEnter = true; try { history.replaceState(null, "", "#" + hashFor(tab)); } catch(e){} var fxRk = function(){ render(); window.scrollTo(0,0); decode(); }; if (window.IOFX && IOFX.rekey) IOFX.rekey(fxRk, b); else fxRk(); } return; }',
  'var fxRk = function(){')

io.open(p, "w", encoding="utf8", newline="\n").write(s)
print("built", len(s))
