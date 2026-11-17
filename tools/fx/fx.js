/* IO FX layer (Nov 16): F1 key light, F2 WebGL stage, F3 tuning panel, W1 reticle, D1 Arm circuits, W2 scan-wipe.
   Loaded before the app script. The app calls IOFX.rendered(ctx) at the end of render() and IOFX.xl(...) on a scan-depth change.
   Nothing here is needed for the sheet to work: every hook is optional and every effect has a plain fallback. */
(function(){
  "use strict";
  var W = window, D = document, root = D.documentElement;
  var reduce = !!(W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var coarse = !!(W.matchMedia && W.matchMedia("(hover: none)").matches);
  var FX = W.IOFX = {v:1}, CTX = {};

  /* ================= F3: settings ================= */
  var DEF = {
    "light.ease":.14,
    "ret.on":1, "ret.t":170, "ret.glow":1, "ret.pad":1.2,
    "circ.on":1, "circ.rest":.12, "circ.lit":.5, "circ.band":.55, "circ.r":230, "circ.s":560, "circ.t":.5, "circ.idle":7,
    "wipe.on":1, "wipe.t":.95, "wipe.jit":1, "wipe.glow":1,
    "pan.on":1, "pan.rim":.9, "pan.rimr":260, "pan.pool":.07, "pan.poolr":360,
    "grade.on":1, "grade.vig":.42, "grade.grain":.05, "grade.bloom":.35, "grade.streak":1,
    "sky.on":1, "sky.par":14, "sky.stars":1, "sky.neb":1, "sky.atmo":.65, "sky.city":1, "sky.res":1,
    "swap.on":1, "swap.t":.34, "swap.blur":7, "swap.carry":0,
    "amb.on":1, "amb.gap":9, "amb.motes":1,
    "id.on":1, "id.holo":.45, "id.spin":90
  };
  var SPEC = [
    {g:"Key light", k:[["light.ease","Follow speed",.03,.5,.01]]},
    {g:"Ware reticle", on:"ret.on", k:[["ret.t","Snap time (ms)",60,420,10],["ret.glow","Glow",0,2.5,.05],["ret.pad","Padding (%)",0,4,.1]]},
    {g:"Arm circuits", on:"circ.on", k:[["circ.rest","Resting traces",0,.4,.01],["circ.lit","Lit traces",0,1,.01],["circ.band","Weapon glow",0,1,.01],["circ.s","Trace size (px)",360,900,10],["circ.r","Light radius (px)",80,520,10],["circ.t","Pulse time (s)",.2,1.5,.05],["circ.idle","Idle pulses / min",0,20,1]]},
    {g:"Ware scan-wipe", on:"wipe.on", k:[["wipe.t","Duration (s)",.4,2.2,.05],["wipe.jit","Slice jitter",0,3,.1],["wipe.glow","Glow",0,2.5,.05]]},
    {g:"Key-light panels", on:"pan.on", k:[["pan.rim","Frame highlight",0,1,.05],["pan.rimr","Highlight reach (px)",80,600,10],["pan.pool","Light pool",0,.2,.005],["pan.poolr","Pool reach (px)",120,800,10]]},
    {g:"Film grade", on:"grade.on", k:[["grade.vig","Vignette",0,.9,.01],["grade.grain","Grain",0,.2,.005],["grade.bloom","Bloom",0,1,.05],["grade.streak","Tab streak",0,1,.05]]},
    {g:"Orbit backdrop", on:"sky.on", k:[["sky.par","Parallax (px)",0,40,1],["sky.stars","Stars",0,2,.05],["sky.neb","Nebula",0,2.5,.05],["sky.atmo","Atmosphere",0,2.5,.05],["sky.city","City lights",0,2,.05],["sky.res","Sharpness (lower = lighter)",.4,1.25,.05]]},
    {g:"Focus-pull tabs", on:"swap.on", k:[["swap.t","Duration (s)",.15,.9,.01],["swap.blur","Blur (px)",0,20,.5]]},
    {g:"Ambient life", on:"amb.on", k:[["amb.gap","Seconds between events",3,30,1],["amb.motes","Dust motes",0,2,.05]]},
    {g:"ID header", on:"id.on", k:[["id.holo","Holo SIN",0,1,.05],["id.spin","Mark turn (s per turn)",8,240,2]]}
  ];
  var shared = {}, local = {};
  try { local = JSON.parse(localStorage.getItem("io-fx") || "{}") || {}; } catch(e){ local = {}; }
  function P(k){ var v = k in local ? local[k] : k in shared ? shared[k] : DEF[k]; return typeof v === "number" && isFinite(v) ? v : DEF[k]; }
  FX.P = P;
  function cssVars(){
    var s = root.style;
    s.setProperty("--ret-t", P("ret.t") + "ms"); s.setProperty("--ret-glow", String(P("ret.glow")));
    s.setProperty("--circ-rest", String(P("circ.rest"))); s.setProperty("--circ-lit", String(P("circ.lit")));
    s.setProperty("--pan-rim", String(P("pan.rim"))); s.setProperty("--pan-rimr", P("pan.rimr") + "px"); s.setProperty("--pan-pool", String(P("pan.pool"))); s.setProperty("--pan-poolr", P("pan.poolr") + "px");
    s.setProperty("--gr-vig", String(P("grade.vig"))); s.setProperty("--gr-grain", String(P("grade.grain"))); s.setProperty("--gr-bloom", String(P("grade.bloom"))); s.setProperty("--gr-streak", String(P("grade.streak")));
    s.setProperty("--swap-t", P("swap.t") + "s"); s.setProperty("--swap-b", P("swap.blur") + "px");
    if (D.body){ D.body.classList.toggle("fx-nopan", !P("pan.on")); D.body.classList.toggle("fx-grade", !!P("grade.on")); }
    s.setProperty("--circ-r", P("circ.r") + "px"); s.setProperty("--circ-s", P("circ.s") + "px"); s.setProperty("--circ-band", String(P("circ.band"))); s.setProperty("--circ-t", P("circ.t") + "s");
  }
  function values(){ var o = {}; for (var k in DEF) o[k] = P(k); return o; }
  function setLocal(k, v){ local[k] = v; try { localStorage.setItem("io-fx", JSON.stringify(local)); } catch(e){} cssVars(); changed(k); }
  function changed(k){
    if (/^ret\./.test(k)) wareAfter();
    if (/^circ\./.test(k)) armAfter();
    if (/^pan\./.test(k)) lightScan();
    if (/^grade\./.test(k)) gradeSync();
    if (/^sky\./.test(k)) skySync();
    if (/^amb\./.test(k)) ambAfter();
    if (/^id\./.test(k)){ idAfter(); lightScan(); }
  }

  /* panel */
  var panel = null, btn = null;
  function fmt(v, step){ return step >= 1 ? String(Math.round(v)) : (+v).toFixed(step < .1 ? 2 : 1).replace(/^0\./, "."); }
  function buildPanel(){
    btn = D.createElement("button"); btn.type = "button"; btn.className = "fxbtn"; btn.textContent = "FX"; btn.title = "Effect settings (only you see this)"; btn.setAttribute("aria-expanded", "false");
    panel = D.createElement("div"); panel.className = "fxpanel"; panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Effect settings");
    D.body.appendChild(btn); D.body.appendChild(panel);
    btn.addEventListener("click", function(){ panel.hidden = !panel.hidden; btn.setAttribute("aria-expanded", String(!panel.hidden)); if (!panel.hidden) fillPanel(); });
    panel.addEventListener("input", function(ev){
      var t = ev.target, k = t.getAttribute("data-k"); if (!k) return;
      if (t.type === "checkbox"){ setLocal(k, t.checked ? 1 : 0); t.closest(".fxg").classList.toggle("off", !t.checked); }
      else { var v = +t.value; setLocal(k, v); var o = t.parentNode.querySelector("output"); if (o) o.textContent = fmt(v, +t.step); }
      note("Changed on this device only until you save.");
    });
    panel.addEventListener("click", function(ev){
      var a = ev.target.getAttribute && ev.target.getAttribute("data-fxa"); if (!a) return;
      if (a === "reset"){ local = {}; try { localStorage.removeItem("io-fx"); } catch(e){} cssVars(); fillPanel(); for (var k in DEF) if (/\.on$/.test(k)) changed(k); note("Back to the saved settings."); }
      if (a === "copy"){ var txt = JSON.stringify(values()); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function(){ note("Copied."); }, function(){ note(txt); }); }
      if (a === "save" && CTX.save){ var v = values(); shared = v; local = {}; try { localStorage.removeItem("io-fx"); } catch(e){} note("Saving…");
        Promise.resolve(CTX.save(v)).then(function(ok){ note(ok === false ? "Couldn't save. Your changes are still on this device." : "Saved for everyone."); }, function(){ note("Couldn't save."); }); }
    });
  }
  function note(t){ var n = panel && panel.querySelector(".fxnote"); if (n) n.textContent = t; }
  function fillPanel(){
    var h = '<h4>Effect settings</h4><p class="fxsub">Only you see this panel. WebGL: ' + (GL.test() ? "on" : "not available, using the plain versions") + '.</p>';
    SPEC.forEach(function(g){
      var on = !g.on || !!P(g.on);
      h += '<div class="fxg' + (on ? '' : ' off') + '">' + (g.on ? '<label class="fxh"><input type="checkbox" data-k="' + g.on + '"' + (on ? ' checked' : '') + '>' + g.g + '</label>' : '<div class="fxh plain" style="font:700 11px/1 var(--f-cond);letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-bottom:6px">' + g.g + '</div>');
      g.k.forEach(function(r){ var v = P(r[0]); h += '<label class="fxr"><span>' + r[1] + '</span><input type="range" data-k="' + r[0] + '" min="' + r[2] + '" max="' + r[3] + '" step="' + r[4] + '" value="' + v + '"><output>' + fmt(v, r[4]) + '</output></label>'; });
      h += '</div>';
    });
    h += '<div class="fxbar"><button type="button" data-fxa="reset">Reset</button><button type="button" data-fxa="copy">Copy</button>' + (CTX.save ? '<button type="button" class="pri" data-fxa="save">Save for everyone</button>' : '') + '</div><p class="fxnote"></p>';
    panel.innerHTML = h;
  }
  function panelSync(){
    var show = !!CTX.admin;
    if (show && !btn) buildPanel();
    if (btn){ btn.hidden = !show; if (!show){ panel.hidden = true; btn.setAttribute("aria-expanded", "false"); } }
  }

  /* ================= shared ticker ================= */
  var tick = FX.tick = {fns:[], raf:0,
    add:function(fn){ if (tick.fns.indexOf(fn) < 0) tick.fns.push(fn); if (!tick.raf) tick.raf = requestAnimationFrame(tick.run); },
    remove:function(fn){ var i = tick.fns.indexOf(fn); if (i >= 0) tick.fns.splice(i, 1); },
    run:function(t){ tick.raf = 0; if (!D.hidden) tick.fns.slice().forEach(function(fn){ try { fn(t); } catch(e){ tick.remove(fn); } }); if (tick.fns.length) tick.raf = requestAnimationFrame(tick.run); }
  };

  /* ================= F1: key light =================
     One light for the whole page. It follows the pointer (eased); on touch screens it rests upper-left of the screen
     and jumps to the last touch. Elements marked data-lit get --lx / --ly (px, in their own box) while it moves. */
  var L = FX.light = {x:W.innerWidth * .3, y:W.innerHeight * .25, tx:W.innerWidth * .3, ty:W.innerHeight * .25, els:[], on:false, reach:400};
  function lightFrame(){
    var e = P("light.ease"), dx = L.tx - L.x, dy = L.ty - L.y;
    L.x += dx * e; L.y += dy * e;
    var reach = L.reach;
    for (var i = 0; i < L.els.length; i++){ var el = L.els[i]; if (!el.isConnected) continue;
      var r = el.getBoundingClientRect(), ox = Math.max(r.left - L.x, 0, L.x - r.right), oy = Math.max(r.top - L.y, 0, L.y - r.bottom);
      if (el._far === undefined) el._far = el.getAttribute("data-lit") === "far";
      if (!el._far && (ox > reach || oy > reach || ox * ox + oy * oy > reach * reach)){ if (el._lt){ el._lt = 0; el.style.removeProperty("--lx"); el.style.removeProperty("--ly"); } continue; }
      el._lt = 1; el.style.setProperty("--lx", (L.x - r.left).toFixed(1) + "px"); el.style.setProperty("--ly", (L.y - r.top).toFixed(1) + "px"); }
    if (Math.abs(dx) + Math.abs(dy) < .4){ tick.remove(lightFrame); L.on = false; }
  }
  function lightKick(){ if (!L.els.length) return; if (reduce){ L.x = L.tx; L.y = L.ty; } if (!L.on){ L.on = true; tick.add(lightFrame); } }
  function lightScan(){
    L.els = [].slice.call(D.querySelectorAll(P("pan.on") ? "[data-lit], .box:not(.glite)" : "[data-lit]"));
    L.reach = Math.max(P("circ.r"), P("pan.on") ? Math.max(P("pan.rimr"), P("pan.poolr")) : 0) + 20;
    L.x += .5; lightKick();
  }
  D.addEventListener("pointermove", function(ev){ if (ev.pointerType === "touch") return; L.tx = ev.clientX; L.ty = ev.clientY; lightKick(); }, {passive:true});
  D.addEventListener("pointerdown", function(ev){ if (ev.pointerType !== "touch") return; L.tx = ev.clientX; L.ty = ev.clientY; lightKick(); }, {passive:true});
  W.addEventListener("scroll", function(){ L.x += .5; lightKick(); }, {passive:true});
  W.addEventListener("resize", function(){ if (coarse){ L.tx = W.innerWidth * .3; L.ty = W.innerHeight * .25; } L.x += .5; lightKick(); });

  /* ================= F2: WebGL stage =================
     GL.make(canvas, fragmentSource) gives a full-quad program with uniform and texture helpers. Each effect owns a small
     canvas and lets go of its context when it finishes. GL.test() says whether WebGL is there at all. */
  var GL = FX.gl = {ok:null};
  GL.test = function(){
    if (GL.ok !== null) return GL.ok;
    try { var c = D.createElement("canvas"), g = c.getContext("webgl", {alpha:true, premultipliedAlpha:true}) || c.getContext("experimental-webgl");
      GL.ok = !!g; if (g){ var x = g.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); } } catch(e){ GL.ok = false; }
    return GL.ok;
  };
  GL.dpr = function(){ return Math.min(W.devicePixelRatio || 1, coarse ? 1.25 : 1.75); };
  var VERT = "attribute vec2 p;varying vec2 vUv;void main(){vUv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}";
  GL.make = function(canvas, frag){
    var gl = canvas.getContext("webgl", {alpha:true, premultipliedAlpha:true, antialias:false, depth:false, stencil:false, powerPreference:"low-power"}); if (!gl) return null;
    function sh(type, src){ var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ var m = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(m); } return s; }
    var pr = gl.createProgram();
    try { gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, frag)); } catch(e){ if (W.console) console.warn("IOFX shader:", e.message); return null; }
    gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    var ul = {}, texs = [], dead = false;
    var o = {gl:gl, lost:false,
      u:function(n){ return n in ul ? ul[n] : (ul[n] = gl.getUniformLocation(pr, n)); },
      f:function(n, a, b, c){ var l = o.u(n); if (!l) return; if (c != null) gl.uniform3f(l, a, b, c); else if (b != null) gl.uniform2f(l, a, b); else gl.uniform1f(l, a); },
      tex:function(unit, name, src){ var t = gl.createTexture(); texs.push(t); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); var l = o.u(name); if (l) gl.uniform1i(l, unit); },
      draw:function(){ gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); },
      kill:function(){ if (dead) return; dead = true; try { texs.forEach(function(t){ gl.deleteTexture(t); }); gl.deleteBuffer(buf); gl.deleteProgram(pr); var x = gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); } catch(e){} }
    };
    canvas.addEventListener("webglcontextlost", function(ev){ ev.preventDefault(); o.lost = true; });
    return o;
  };
  function loadImg(src){ return new Promise(function(res, rej){ var im = new Image(); im.decoding = "async"; im.onload = function(){ res(im); }; im.onerror = rej; im.src = src; }); }
  function within(ms, p){ return Promise.race([p, new Promise(function(_, rej){ setTimeout(function(){ rej(new Error("slow")); }, ms); })]); }

  /* ================= W1: scanner reticle and brackets ================= */
  var RET = {fig:null, mo:null, hov:[], lock:[], selWas:null, boxes:{}};
  function retEl(lock){ var s = D.createElement("span"); s.className = "wret" + (lock ? " lock" : ""); s.setAttribute("aria-hidden", "true");
    s.innerHTML = '<i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i><u class="t1"></u><u class="t2"></u><u class="t3"></u><u class="t4"></u><b></b>'; return s; }
  /* a part's box, in % of the figure: from the app's table, or measured once from the part's mask (the single legs have no entry) */
  function regBox(r){
    var F = CTX.fig || {}, k = (F.m || "") + r;
    if (F.rbox && F.rbox[r]) return F.rbox[r];
    if (RET.boxes[k]) return RET.boxes[k];
    if (RET.boxes[k] === undefined && F.m){ RET.boxes[k] = null;
      loadImg(F.m + r + ".png").then(function(im){ var w = 120, h = Math.max(1, Math.round(120 * im.height / im.width)), c = D.createElement("canvas"); c.width = w; c.height = h;
        var x = c.getContext("2d"); x.drawImage(im, 0, 0, w, h); var d = x.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] > 40){ if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
        if (x1 >= 0){ RET.boxes[k] = [x0 / w * 100, y0 / h * 100, (x1 + 1) / w * 100, (y1 + 1) / h * 100]; retSync(); retLock(false); } }, function(){});
    }
    return null;
  }
  function place(el, r){
    var b = regBox(r); if (!b){ el.classList.remove("on"); el._r = ""; return false; }
    var pad = P("ret.pad"), x0 = b[0] - pad, y0 = b[1] - pad * .6, x1 = b[2] + pad, y1 = b[3] + pad * .6;
    if (y1 - y0 < 3.4){ var cy = (y0 + y1) / 2; y0 = cy - 1.7; y1 = cy + 1.7; }
    if (x1 - x0 < 9){ var cx = (x0 + x1) / 2; x0 = cx - 4.5; x1 = cx + 4.5; }
    x0 = Math.max(x0, -2); y0 = Math.max(y0, -.6); x1 = Math.min(x1, 102); y1 = Math.min(y1, 100.6);
    el.style.left = x0.toFixed(2) + "%"; el.style.top = y0.toFixed(2) + "%"; el.style.width = (x1 - x0).toFixed(2) + "%"; el.style.height = (y1 - y0).toFixed(2) + "%";
    return true;
  }
  function restart(el, cls){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function regsOf(v){ return String(v || "").split(/\s+/).filter(Boolean); }
  function retSync(){
    var fig = RET.fig; if (!fig || !fig.isConnected) return;
    var want = regsOf(fig.dataset.hov), locked = regsOf(fig.dataset.sel);
    want = want.filter(function(r){ return locked.indexOf(r) < 0; }).slice(0, RET.hov.length);
    if (fig.classList.contains("boot")) want = [];
    RET.hov.forEach(function(el, i){
      var r = want[i];
      if (!r){ el.classList.remove("on"); el._r = ""; return; }
      if (el._r === r) return;
      var fresh = !el._r; if (fresh) el.classList.add("jump");
      if (!place(el, r)) return;
      if (fresh){ void el.offsetWidth; el.classList.remove("jump"); restart(el, "snap"); }
      el._r = r; el.classList.add("on"); restart(el, "scan");
    });
  }
  function retLock(pulse){
    var fig = RET.fig; if (!fig || !fig.isConnected) return;
    var regs = regsOf(fig.dataset.sel).slice(0, RET.lock.length);
    if (regs.indexOf("body") >= 0 && regs.length > 1) regs = regs.filter(function(r){ return r !== "body"; });
    RET.lock.forEach(function(el, i){ var r = regs[i]; el.classList.add("jump");
      if (r && place(el, r)){ el.classList.add("on"); if (pulse){ restart(el, "pulse"); restart(el, "scan"); } } else el.classList.remove("on"); });
  }
  function wareAfter(){
    if (RET.mo){ RET.mo.disconnect(); RET.mo = null; }
    var fig = D.getElementById("bodyfig"); RET.fig = null; RET.hov = []; RET.lock = [];
    [].forEach.call(D.querySelectorAll(".wret"), function(n){ n.remove(); });
    if (!fig || CTX.tab !== "ware" || CTX.editing || !P("ret.on") || !CTX.fig){ RET.selWas = fig ? fig.dataset.sel || "" : null; return; }
    RET.fig = fig;
    for (var i = 0; i < 4; i++){ var a = retEl(false), b = retEl(true); RET.hov.push(a); RET.lock.push(b); fig.appendChild(b); fig.appendChild(a); }
    var sel = fig.dataset.sel || "", key = (CTX.who || "") + "|" + (CTX.fig.m || "") + "|" + sel;
    retLock(!reduce && RET.selWas !== null && RET.selWas !== key && !!sel && !fig.classList.contains("boot"));
    RET.selWas = key;
    retSync();
    RET.mo = new MutationObserver(retSync); RET.mo.observe(fig, {attributes:true, attributeFilter:["data-hov"]});
  }

  /* ================= D1: circuit-traced Arm box ================= */
  var ARM = {box:null, svg:null, groups:[], timer:0, ro:null};
  function rowColor(tr){ var n = tr.querySelector('[class^="tone-"] .tn, [class*=" tone-"] .tn, .tn'); var c = n ? getComputedStyle(n).color : ""; return c && !/rgba?\(0, 0, 0/.test(c) ? c : "#e2b86c"; }
  function armBuild(){
    var box = ARM.box; if (!box || !box.isConnected) return;
    if (ARM.svg) ARM.svg.remove();
    var hb = box.querySelector(".hb"), rows = [].slice.call(box.querySelectorAll(".t tbody > tr:not(.ind)")); if (!hb || !rows.length) return;
    var br = box.getBoundingClientRect(), ox = br.left + box.clientLeft, oy = br.top + box.clientTop, Wd = box.clientWidth, Ht = box.clientHeight;
    var sx = Wd - 4.5, top = hb.getBoundingClientRect().bottom - oy + 3;
    var h = '<svg class="circbus" width="' + Wd + '" height="' + Ht + '" viewBox="0 0 ' + Wd + ' ' + Ht + '" aria-hidden="true"><circle class="port" cx="' + sx + '" cy="' + top.toFixed(1) + '" r="1.8"/>';
    ARM.groups = [];
    rows.forEach(function(tr, i){
      var r = tr.getBoundingClientRect(), y = Math.round(r.bottom - oy) - .5, td = tr.querySelector("td.name"), x = 5.5;
      var d = "M" + sx + " " + top.toFixed(1) + "V" + y + "H" + x;
      h += '<g data-i="' + i + '" style="--c:' + rowColor(tr) + '"><path class="b" d="' + d + '"/><path class="p" pathLength="1" d="' + d + '"/><circle cx="' + x + '" cy="' + y + '" r="2"/></g>';
      tr.setAttribute("data-circ", i);
    });
    var t = D.createElement("div"); t.innerHTML = h + '</svg>'; ARM.svg = t.firstChild; box.appendChild(ARM.svg);
    ARM.groups = [].slice.call(ARM.svg.querySelectorAll("g"));
  }
  function armHover(tr, on){
    if (!ARM.svg) return; var i = tr.getAttribute("data-circ"); if (i == null) return; var g = ARM.groups[+i]; if (!g) return;
    var c = ARM.box && ARM.box.querySelector(".circ");
    if (on){ g.classList.remove("idle"); g.classList.add("hot"); restart(g, "go");
      if (c){ var br = ARM.box.getBoundingClientRect(), r = tr.getBoundingClientRect(), last = tr; while (last.nextElementSibling && last.nextElementSibling.classList.contains("ind")) last = last.nextElementSibling;
        var bot = last.getBoundingClientRect().bottom; c.style.setProperty("--by", (r.top - br.top - ARM.box.clientTop).toFixed(1) + "px"); c.style.setProperty("--bh", (bot - r.top).toFixed(1) + "px"); c.style.setProperty("--bc", g.style.getPropertyValue("--c") || "#e2b86c"); restart(c, "band"); } }
    else { g.classList.remove("hot", "go"); if (c) c.classList.remove("band"); }
  }
  function armRow(t){ var tr = t && t.closest && t.closest(".armbox .t tbody > tr"); if (!tr) return null;
    if (tr.classList.contains("ind")){ var p = tr.previousElementSibling; while (p && p.classList.contains("ind")) p = p.previousElementSibling; tr = p; }
    return tr; }
  D.addEventListener("mouseover", function(ev){ var tr = armRow(ev.target); if (tr && tr !== ARM.hot){ if (ARM.hot) armHover(ARM.hot, false); ARM.hot = tr; armHover(tr, true); } else if (!tr && ARM.hot && !(ev.target.closest && ev.target.closest(".armbox .t"))){ armHover(ARM.hot, false); ARM.hot = null; } });
  D.addEventListener("focusin", function(ev){ var tr = armRow(ev.target); if (tr){ if (ARM.hot && ARM.hot !== tr) armHover(ARM.hot, false); ARM.hot = tr; armHover(tr, true); } });
  function armIdle(){
    clearTimeout(ARM.timer); var per = P("circ.idle"); if (reduce || !per || !ARM.box) return;
    ARM.timer = setTimeout(function(){
      var box = ARM.box;
      if (box && box.isConnected && !D.hidden && ARM.groups.length && !ARM.hot){ var r = box.getBoundingClientRect();
        if (r.bottom > 0 && r.top < W.innerHeight){ var g = ARM.groups[Math.floor(Math.random() * ARM.groups.length)]; if (!g.classList.contains("hot")) restart(g, "idle"); } }
      armIdle();
    }, (60000 / per) * (.6 + Math.random() * .8));
  }
  function armAfter(){
    clearTimeout(ARM.timer); if (ARM.ro){ ARM.ro.disconnect(); ARM.ro = null; }
    [].forEach.call(D.querySelectorAll(".armbox .circ, .armbox .circbus"), function(n){ n.remove(); });
    ARM.box = null; ARM.svg = null; ARM.groups = []; ARM.hot = null;
    var box = D.querySelector(".box.armbox"); if (!box || CTX.editing || !P("circ.on")) return;
    ARM.box = box;
    var c = D.createElement("i"); c.className = "circ"; c.setAttribute("aria-hidden", "true"); c.appendChild(D.createElement("i")); box.insertBefore(c, box.firstChild);
    armBuild();
    if (W.ResizeObserver){ var first = true, t = 0; ARM.ro = new ResizeObserver(function(){ if (first){ first = false; return; } clearTimeout(t); t = setTimeout(armBuild, 60); }); ARM.ro.observe(box); }
    armIdle();
  }

  /* ================= W2: scan-wipe between layers ================= */
  var FRAG = [
    "precision mediump float;",
    "varying vec2 vUv;",
    "uniform sampler2D uA,uB,uM;",
    "uniform float uP,uDir,uMode,uTime,uJit,uGlow,uPad,uRows;",
    "uniform vec2 uEx;",
    "uniform vec3 uCol;",
    "float hash(float n){return fract(sin(n)*43758.5453123);}",
    "vec4 samp(sampler2D t,vec2 uv){float k=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);return texture2D(t,clamp(uv,0.,1.))*k;}",
    "void main(){",
    "  float d=(vUv.y-uP)*uDir;",                       /* >0 ahead of the line (old picture), <0 behind it (new picture) */
    "  float near=exp(-abs(d)*34.);",
    "  float row=floor(vUv.y*uRows);",
    "  float j=(hash(row*1.73+floor(uTime*30.)*7.1)-.5)*.026*uJit*near;",
    "  j+=(hash(floor(vUv.y*uRows*.2)+floor(uTime*12.)*3.3)-.5)*.01*uJit*exp(-abs(d)*12.)*step(d,0.);",
    "  vec2 uv=vec2((vUv.x-uPad)/(1.-2.*uPad)+j,vUv.y);",
    "  vec4 oldc;vec4 newc;float sil;",
    "  if(uMode<.5){oldc=samp(uA,uv);newc=samp(uB,uv);sil=max(oldc.a,newc.a);}",
    "  else{vec4 m=samp(uM,uv);vec4 body=samp(uB,uv);vec4 sk=samp(uA,uv);",
    "    vec4 dark=vec4(vec3(.0235,.0392,.0549)*.62,.62);",
    "    vec4 c0=dark+body*(1.-dark.a);c0=sk+c0*(1.-sk.a);oldc=c0*m.a;newc=vec4(0.);sil=m.a;}",
    "  float sw=step(d,0.);",
    "  vec4 c=mix(oldc,newc,sw);",
    "  float core=exp(-abs(d)*1100.);",
    "  float halo=exp(-abs(d)*70.);",
    "  float trail=sw*exp(-abs(d)*13.);",
    "  float scan=.5+.5*sin(vUv.y*uRows*3.14159);",
    "  float ew=(uEx.y-uEx.x)*.2;",
    "  float ends=smoothstep(uEx.x,uEx.x+ew,vUv.x)*(1.-smoothstep(uEx.y-ew,uEx.y,vUv.x));",
    "  vec3 hot=mix(uCol,vec3(1.,.97,.88),.65);",
    "  float e=(halo*.5+trail*.3*scan)*sil*uGlow;",
    "  float l=core*ends*(.3+.7*sil)*min(uGlow,1.5);",
    "  vec3 rgb=c.rgb*(1.+trail*.5*uGlow)+uCol*e+hot*l;",
    "  float a=clamp(max(c.a,max(l,e*.6)),0.,1.);",
    "  gl_FragColor=vec4(min(rgb,vec3(1.)),a);",
    "}"
  ].join("\n");
  function ease(t){ return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function urlOf(v){ var m = /url\((['"]?)(.*?)\1\)/.exec(v || ""); return m ? m[2] : ""; }
  var WIPE = {busy:null};
  /* run one wipe on a figure. o: {fig, a, b, mask, mode, dir, xl, done} ; returns a promise<bool> (false = let the plain version run) */
  function wipeRun(o){
    var fig = o.fig, r = fig.getBoundingClientRect(); if (r.width < 20 || r.height < 20) return Promise.resolve(false);
    var srcs = [o.a, o.b].concat(o.mask ? [o.mask] : []);
    return within(450, Promise.all(srcs.map(function(s){ return typeof s === "string" ? loadImg(s) : Promise.resolve(s); }))).then(function(ims){
      if (!fig.isConnected) return false;
      var cv = D.createElement("canvas"); cv.className = "glw" + (o.xl ? " xl" : ""); cv.setAttribute("aria-hidden", "true");
      var dpr = GL.dpr(), pad = o.xl ? 0 : .07 / 1.14;
      cv.width = Math.round(r.width * (o.xl ? 1 : 1.14) * dpr); cv.height = Math.round(r.height * dpr);
      var g = GL.make(cv, FRAG); if (!g) return false;
      g.tex(0, "uA", ims[0]); g.tex(1, "uB", ims[1]); if (ims[2]) g.tex(2, "uM", ims[2]); else { var l = g.u("uM"); if (l) g.gl.uniform1i(l, 1); }
      var zo = D.body.classList.contains("zolo");
      g.f("uMode", o.mode); g.f("uDir", o.dir); g.f("uPad", pad); g.f("uRows", Math.round(r.height / 3)); g.f("uJit", P("wipe.jit")); g.f("uGlow", P("wipe.glow"));
      if (zo) g.f("uCol", .80, .90, .96); else g.f("uCol", .94, .76, .44);
      var y0 = o.box ? o.box[1] : 0, y1 = o.box ? o.box[3] : 1, span = y1 - y0;
      g.f("uEx", o.box ? o.box[0] : 0, o.box ? o.box[2] : 1);
      var from = o.dir > 0 ? y0 - .06 * span - .01 : y1 + .06 * span + .01, to = o.dir > 0 ? y1 + .06 * span + .01 : y0 - .06 * span - .01;
      var dur = Math.max(.2, P("wipe.t")) * 1000 * (o.box ? Math.max(.5, Math.min(1, span + .25)) : 1), t0 = 0, first = true;
      return new Promise(function(res){
        function end(ok){ tick.remove(frame); WIPE.busy = null; if (o.done) o.done(ok); requestAnimationFrame(function(){ cv.remove(); g.kill(); }); res(ok); }
        function frame(t){
          if (!fig.isConnected || g.lost){ end(false); return; }
          if (!t0) t0 = t; var k = Math.min(1, (t - t0) / dur);
          g.f("uP", from + (to - from) * ease(k)); g.f("uTime", (t - t0) / 1000); g.draw();
          if (first){ first = false; fig.appendChild(cv); if (o.start) o.start(); }
          if (k >= 1) end(true);
        }
        WIPE.busy = {end:end}; tick.add(frame);
      });
    }, function(){ return false; });
  }
  /* Clothed <-> Bare <-> Nude: the app renders the figure with .cl-on / .cl-off and a CSS wipe. With WebGL we hold that wipe at
     its first frame, run ours over it, then leave the figure in the wipe's end state. Anything goes wrong: the CSS wipe plays. */
  function clothWipe(){
    var fig = D.getElementById("bodyfig"); if (!fig || reduce || !P("wipe.on") || CTX.tab !== "ware") return;
    var on = fig.classList.contains("cl-on"), off = fig.classList.contains("cl-off"); if (!on && !off) return;
    if (fig._glw || !GL.test()) return; fig._glw = 1;
    var cloth = fig.querySelector(".cloth"), img = D.getElementById("bodyimg"); if (!cloth || !img) return;
    var top = urlOf(cloth.style.getPropertyValue("--ci")), base = img.currentSrc || img.src; if (!top || !base) return;
    fig.classList.add("glwipe");
    /* cl-off: the line runs down, the cloth layer (old) goes, the base shows. cl-on: the line runs up, the cloth layer (new) arrives. */
    wipeRun({fig:fig, a:on ? base : top, b:on ? top : base, mode:0, dir:on ? -1 : 1,
      start:function(){ fig.classList.add("glrun"); },
      done:function(ok){
        if (!fig.isConnected) return;
        if (ok){ var ln = fig.querySelector(".clline"); if (ln) ln.remove(); if (off){ var c = fig.querySelector(".cloth"); if (c) c.remove(); } fig.classList.remove("cl-on", "cl-off"); }
        fig.classList.remove("glwipe", "glrun");
      }
    }).then(function(ok){ if (!ok && fig.isConnected) fig.classList.remove("glwipe", "glrun"); });
  }
  /* Muscle / Nerves / Bone: the app swaps one CSS variable. We draw the old layer over the new one inside the selected parts and wipe it away. */
  FX.xl = function(fig, oldUrl, newUrl, apply){
    try {
      var regs = regsOf(fig && fig.dataset.sel), F = CTX.fig || {};
      if (!fig || reduce || !P("wipe.on") || !GL.test() || !regs.length || !F.m || oldUrl === newUrl || fig.classList.contains("boot") || fig.classList.contains("nanoon") || WIPE.busy){ apply(); return; }
      var img = D.getElementById("bodyimg"), have = regs.filter(function(r){ return fig.querySelector(".xr-" + r); }); if (!have.length || !img){ apply(); return; }
      var applied = false, go = function(){ if (!applied){ applied = true; apply(); } };
      within(450, Promise.all(have.map(function(r){ return loadImg(F.m + r + ".png"); }))).then(function(ms){
        var w = 360, h = Math.round(360 * img.naturalHeight / Math.max(1, img.naturalWidth)), c = D.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d");
        ms.forEach(function(m){ x.drawImage(m, 0, 0, w, h); });
        var bx = [100, 100, 0, 0]; have.forEach(function(r){ var b = regBox(r); if (b){ bx[0] = Math.min(bx[0], b[0]); bx[1] = Math.min(bx[1], b[1]); bx[2] = Math.max(bx[2], b[2]); bx[3] = Math.max(bx[3], b[3]); } });
        var box = bx[2] > bx[0] ? [Math.max(0, bx[0] / 100 - .1), bx[1] / 100, Math.min(1, bx[2] / 100 + .1), bx[3] / 100] : null;
        return wipeRun({fig:fig, a:oldUrl, b:img.currentSrc || img.src, mask:c, mode:1, dir:1, xl:true, box:box, start:go});
      }).then(go, go);
    } catch(e){ apply(); }
  };

  /* ================= G4: film grade ================= */
  var GRADE = {el:null, streak:null};
  function grainImg(){
    var c = D.createElement("canvas"); c.width = c.height = 160; var x = c.getContext("2d"), im = x.createImageData(160, 160), d = im.data, s = 987654321;
    for (var i = 0; i < d.length; i += 4){ s = (s * 16807) % 2147483647; var r = s / 2147483647; s = (s * 16807) % 2147483647; var a = s / 2147483647;
      var v = r < .5 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = Math.round(a * a * 255); }
    x.putImageData(im, 0, 0); return c.toDataURL("image/png");
  }
  function gradeSync(){
    if (!D.body) return;
    var on = !!P("grade.on"); D.body.classList.toggle("fx-grade", on);
    if (on && !GRADE.el){ var g = D.createElement("div"); g.className = "fxgrade"; g.setAttribute("aria-hidden", "true"); g.innerHTML = '<i class="grain"></i><i class="vig"></i>';
      try { root.style.setProperty("--grain-img", "url(" + grainImg() + ")"); } catch(e){}
      D.body.appendChild(g); GRADE.el = g; }
  }
  /* the lens streak sits on the lit tab, in page coordinates so it scrolls with it */
  function streak(){
    if (reduce || !P("grade.on") || !P("grade.streak")) return;
    var t = D.querySelector('.tab[aria-current="page"]'); if (!t) return; var r = t.getBoundingClientRect(); if (r.bottom < 0 || r.top > W.innerHeight) return;
    if (!GRADE.streak){ GRADE.streak = D.createElement("i"); GRADE.streak.className = "fxstreak"; GRADE.streak.setAttribute("aria-hidden", "true"); D.body.appendChild(GRADE.streak); }
    var s = GRADE.streak; s.style.left = (r.left + r.width / 2 + W.scrollX) + "px"; s.style.top = (r.bottom - 1 + W.scrollY) + "px"; restart(s, "go");
  }

  /* ================= G1: living orbit backdrop =================
     Iō only. One fragment shader: nebula, three depths of drifting stars, the planet's limb lit by a sun off-screen to the left
     (crescent, atmosphere, city lights on the night side), the orbital ring with its station, and now and then a far ship.
     Drawn at 1x, 30 fps (60 while the view is moving). The old 2D sky stays underneath: it is the fallback when WebGL is
     missing or lost, and it still draws Zolo's forest. */
  var SKYF = [
    "precision highp float;",
    "uniform vec2 uRes;uniform float uS,uT,uScr;uniform vec2 uPar;uniform vec3 uSta;uniform vec4 uShip;uniform vec4 uK;",
    "float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}",
    "vec2 h22(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}",
    "float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}",
    "float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(17.3,9.1);a*=.5;}return s;}",
    "vec3 stars(vec2 p,float cell,float size,float dens,float seed){",
    "  vec2 g=p/cell,id=floor(g),f=fract(g);",
    "  if(h21(id+seed)>dens)return vec3(0.);",
    "  vec2 o=.16+.68*h22(id+seed*1.7),q=(f-o)*cell;",
    "  float m=h21(id+seed+5.3),s=size*(.5+.95*m*m),b=1.-smoothstep(0.,s,length(q));b*=b;",
    "  float tw=.6+.4*sin(uT*(.45+1.3*h21(id+9.1))+m*40.);",
    "  vec3 col=mix(vec3(.91,.93,.97),vec3(.97,.86,.67),step(.8,h21(id+seed+2.2)));",
    "  float fl=0.;if(m>.9&&size>1.6){vec2 a=abs(q);fl=(exp(-a.y*2.4)*exp(-a.x*.3)+exp(-a.x*2.4)*exp(-a.y*.3))*.45;}",
    "  return col*(b*(.3+.7*m)+fl)*tw;",
    "}",
    "void main(){",
    "  vec2 p=vec2(gl_FragCoord.x,uRes.y*uS-gl_FragCoord.y)/uS;",
    "  float W=uRes.x,H=uRes.y,M=max(W,H);",
    "  vec3 col=vec3(.031,.024,.020);",
    /* nebula: the three drifting clouds of the old sky, broken up by slow noise */
    "  vec2 nv=(p+uPar*.15)/M;",
    "  float n1=fbm(nv*2.3+vec2(uT*.0035,0.)),n2=fbm(nv*5.+vec2(0.,-uT*.0025)+n1*1.4);",
    "  float wisp=.3+1.7*n2*smoothstep(.2,.7,n1);",
    "  float k=uT;",
    "  vec2 c1=vec2(W*(.16+.03*sin(k*.021)),H*(.14+.03*cos(k*.017)))/M,c2=vec2(W*(.62+.04*cos(k*.013)),H*(.42+.04*sin(k*.019)))/M,c3=vec2(W*(.88+.02*sin(k*.011)),H*(.08+.02*sin(k*.023)))/M;",
    "  float g1=1.-smoothstep(0.,.55,length(nv-c1)),g2=1.-smoothstep(0.,.45,length(nv-c2)),g3=1.-smoothstep(0.,.35,length(nv-c3));",
    "  col+=(vec3(.47,.078,.11)*pow(g1,1.4)*.15+vec3(.275,.118,.235)*pow(g2,1.4)*.11+vec3(.71,.56,.32)*pow(g3,1.4)*.06)*wisp*uK.y;",
    /* stars, far to near */
    "  vec3 st=stars(p+vec2(uT*4.,0.)+uPar*.25,26.,1.2,.36,11.)*.62",
    "         +stars(p+vec2(uT*8.,0.)+uPar*.55,58.,1.6,.44,23.)*.85",
    "         +stars(p+vec2(uT*14.,0.)+uPar,150.,2.3,.5,37.);",
    /* the planet */
    "  float R=M*1.05;vec2 c=vec2(W*.78,H+R*.80-uScr)+uPar*.35;",
    "  vec2 q=p-c;float dist=length(q),d=dist-R;vec2 n=q/dist;",
    "  float sd=dot(n,normalize(vec2(-.95,-.31)));",
    "  float lit=smoothstep(-.06,.72,sd);",
    "  vec3 aCol=mix(vec3(.62,.13,.12),vec3(.97,.76,.44),lit);",
    "  float out_=step(0.,d);",
    "  float atm=exp(-max(d,0.)/(R*.0085)),haze=exp(-max(d,0.)/(R*.05));",
    "  col+=st*out_*uK.x;",
    "  col+=aCol*(atm*.42+haze*.13)*(.2+.8*lit)*out_*uK.z;",
    "  if(d<0.){",
    "    float arc=sqrt(max(-d,0.)*2.*R),along=atan(q.x,-q.y)*R;",
    "    vec3 surf=vec3(.036,.026,.023);",
    "    float rim=exp(d/(R*.0045)),cres=exp(d/(R*.045))*lit;",
    "    float tex=fbm(vec2(along/260.+uT*.0015,arc/90.));",
    "    surf+=aCol*rim*.36*(.25+.75*lit)*uK.z+vec3(.58,.37,.22)*cres*.3*(.4+1.2*tex)*uK.z;",
    "    vec2 cg=vec2(along,arc)/11.,ci=floor(cg),cf=fract(cg)-.5;",
    "    float town=smoothstep(.42,.64,fbm(ci*.06+3.))*step(.72,h21(ci+71.));",
    "    float night=(1.-smoothstep(.0,.5,lit))*smoothstep(40.,160.,arc)*(1.-smoothstep(500.,1700.,arc));",
    "    surf+=vec3(1.,.74,.4)*town*night*(1.-smoothstep(0.,.32,length(cf)))*.55*(.65+.35*sin(uT*.9+h21(ci)*40.))*uK.w;",
    "    col=surf;",
    "  }",
    /* the orbital ring and its station */
    "  vec2 e=p-vec2(c.x,c.y-R*.72);float ca=cos(.12),sa=sin(.12);e=vec2(ca*e.x-sa*e.y,sa*e.x+ca*e.y);",
    "  vec2 ab=vec2(R*1.15,R*.16),en=e/ab;float er=length(en),gr=length(en/ab)/max(er,.0001);",
    "  float rd=abs(er-1.)/gr;",
    "  col+=vec3(.42,.33,.19)*(1.-smoothstep(0.,1.1,rd))*.22*step(e.y,0.)*(1.-smoothstep(.86,1.,abs(en.x)));",
    "  vec2 sv=p-uSta.xy;col+=vec3(.93,.85,.7)*(exp(-dot(sv,sv)/2.6)+exp(-abs(sv.y)*1.6)*exp(-abs(sv.x)*.2)*.35)*uSta.z;",
    /* a far ship: a point of light with a short tail */
    "  vec2 hv=p-uShip.xy;vec2 hd=vec2(cos(uShip.w),sin(uShip.w));float al=dot(hv,hd),ac=dot(hv,vec2(-hd.y,hd.x));",
    "  col+=vec3(1.,.93,.82)*(exp(-dot(hv,hv)/1.8)+exp(-abs(ac)*1.8)*exp(min(al,0.)*.11)*step(al,0.)*.5)*uShip.z*out_;",
    "  col+=(h21(gl_FragCoord.xy+fract(uT)*61.)-.5)/255.;",
    "  gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");
  var SKY = {cv:null, g:null, on:false, t0:0, last:0, px:0, py:0, tx:0, ty:0, scr:0, ship:null, nextShip:0, odd:false, W:0, H:0, S:1};
  FX.skyOn = function(){ return SKY.on && !D.body.classList.contains("zolo"); };
  function skySize(){
    var cv = SKY.cv; if (!cv) return; SKY.W = W.innerWidth; SKY.H = W.innerHeight; SKY.S = Math.min(W.devicePixelRatio || 1, coarse ? 1 : 1.25, Math.max(.3, P("sky.res")));
    cv.width = Math.max(2, Math.round(SKY.W * SKY.S)); cv.height = Math.max(2, Math.round(SKY.H * SKY.S));
  }
  function skyDraw(t){
    var g = SKY.g, k = (t - SKY.t0) / 1000, Wd = SKY.W, Ht = SKY.H, M = Math.max(Wd, Ht), R = M * 1.05, par = P("sky.par");
    g.f("uRes", Wd, Ht); g.f("uS", SKY.S); g.f("uT", k); g.f("uPar", -SKY.px * par, -SKY.py * par); g.f("uScr", SKY.scr);
    g.gl.uniform4f(g.u("uK"), P("sky.stars"), P("sky.neb"), P("sky.atmo"), P("sky.city"));
    /* station: along the ring's upper arc, as the old sky had it */
    var cx = Wd * .78 - SKY.px * par * .35, cy = Ht + R * .80 - SKY.scr - SKY.py * par * .35, ang = Math.PI * 1.04 + ((k * .004) % 1) * Math.PI * .92;
    var ex = Math.cos(ang) * R * 1.15, ey = Math.sin(ang) * R * .16, ca = Math.cos(-.12), sa = Math.sin(-.12);
    g.f("uSta", cx + ca * ex - sa * ey, cy - R * .72 + sa * ex + ca * ey, reduce ? 0 : .75);
    var sh = SKY.ship, a = 0, sx = -99, sy = -99, sw = 0;
    if (!reduce){
      if (!sh && k > SKY.nextShip) sh = SKY.ship = {t:k, dur:22 + Math.random() * 12, x0:Wd * (1.05), y0:Ht * (.08 + Math.random() * .3), x1:-Wd * .05, y1:Ht * (.04 + Math.random() * .28)};
      if (sh){ var u = (k - sh.t) / sh.dur; if (u >= 1){ SKY.ship = null; SKY.nextShip = k + 45 + Math.random() * 60; } else { sx = sh.x0 + (sh.x1 - sh.x0) * u; sy = sh.y0 + (sh.y1 - sh.y0) * u; sw = Math.atan2(sh.y1 - sh.y0, sh.x1 - sh.x0); a = .5 * Math.min(1, u * 8, (1 - u) * 8); } }
    }
    g.gl.uniform4f(g.u("uShip"), sx, sy, a, sw);
    g.draw();
  }
  function skyFrame(t){
    if (!SKY.on || SKY.g.lost){ skyStop(SKY.g && SKY.g.lost); return; }
    if (D.body.classList.contains("zolo")) return;
    var dx = SKY.tx - SKY.px, dy = SKY.ty - SKY.py, ds = (Math.min(90, W.scrollY * .035)) - SKY.scr, moving = Math.abs(dx) + Math.abs(dy) > .002 || Math.abs(ds) > .05;
    SKY.px += dx * .06; SKY.py += dy * .06; SKY.scr += ds * .12;
    SKY.odd = !SKY.odd; if (!moving && SKY.odd) return;
    skyDraw(t);
  }
  function skyStop(lost){
    tick.remove(skyFrame); SKY.on = false; D.body.classList.remove("fxsky");
    if (SKY.cv){ SKY.cv.remove(); SKY.cv = null; } if (SKY.g){ SKY.g.kill(); SKY.g = null; }
    if (lost) SKY.dead = true;
  }
  function skySync(){
    if (!D.body) return;
    var want = !!P("sky.on") && !SKY.dead && GL.test();
    if (!want){ if (SKY.on) skyStop(false); return; }
    if (SKY.on){ if (Math.abs(SKY.S - Math.min(W.devicePixelRatio || 1, coarse ? 1 : 1.25, Math.max(.3, P("sky.res")))) > .01) skySize(); if (reduce) skyDraw(SKY.t0); return; }
    var sky = D.getElementById("sky"); if (!sky) return;
    var cv = D.createElement("canvas"); cv.id = "skygl"; cv.setAttribute("aria-hidden", "true");
    var gl0 = cv.getContext("webgl", {alpha:false, antialias:false, depth:false, stencil:false, powerPreference:"low-power"});
    var hp = gl0 && gl0.getShaderPrecisionFormat(gl0.FRAGMENT_SHADER, gl0.HIGH_FLOAT);
    if (!gl0 || !hp || !hp.precision){ SKY.dead = true; return; }
    SKY.cv = cv; skySize(); var g = GL.make(cv, SKYF); if (!g){ SKY.cv = null; SKY.dead = true; return; }
    g.gl.disable(g.gl.BLEND);
    SKY.g = g; SKY.on = true; SKY.t0 = performance.now() - 40000; SKY.nextShip = 40 + 12 + Math.random() * 20;
    sky.parentNode.insertBefore(cv, sky); D.body.classList.add("fxsky");
    skyDraw(performance.now());
    if (!reduce) tick.add(skyFrame);
  }
  D.addEventListener("pointermove", function(ev){ if (ev.pointerType === "touch") return; SKY.tx = ev.clientX / Math.max(1, W.innerWidth) * 2 - 1; SKY.ty = ev.clientY / Math.max(1, W.innerHeight) * 2 - 1; }, {passive:true});
  W.addEventListener("resize", function(){ if (SKY.on){ skySize(); skyDraw(reduce ? SKY.t0 : performance.now()); } });

  /* ================= G5: focus-pull tab change =================
     The app hands us the function that changes the tab. With View Transitions the old page racks out of focus and the new one
     pulls in; the header and the tab row stay sharp. Without them (or with reduced motion) the change is the plain cut. */
  FX.swap = function(fn, to){
    var vt = null;
    if (!reduce && P("swap.on") && D.startViewTransition && !CTX.editing){
      root.classList.add("fx-swap");
      /* carrying the Iō figure between tabs is off by default: it fights each tab's own entrance (Ware boot scan, Dossier load-in, Posse reveal) */
      root.classList.toggle("fx-carry", !!P("swap.carry") && (to === "ware" || to === "posse") && !!D.querySelector("#bodyfig, .portrait.iop .iopw, .fig.lead"));
      try { vt = D.startViewTransition(function(){ fn(); }); } catch(e){ vt = null; }
    }
    if (vt){ var done = function(){ root.classList.remove("fx-swap", "fx-carry"); }; vt.finished.then(done, done); vt.ready.then(streak, streak); }
    else { root.classList.remove("fx-swap", "fx-carry"); fn(); streak(); }
  };

  /* ================= G7: ambient life =================
     Iō's pages only (Zolo has his blade glint). One event every few seconds, never two at once: a glint along a panel's
     edges, or a pass of light over the SIN barcode. Dust motes drift in the light in front of the Dossier portrait. */
  var AMB = {timer:0, busy:false, motes:null};
  function ambOk(){ return !reduce && !!P("amb.on") && !D.hidden && CTX.who !== "zolo" && !CTX.editing; }
  function ambGlint(){
    var boxes = [].filter.call(D.querySelectorAll(".box:not(.glite)"), function(b){ var r = b.getBoundingClientRect(); return r.width > 140 && r.height > 60 && r.top > 40 && r.bottom < W.innerHeight - 10 && r.left >= 0 && r.right <= W.innerWidth; });
    if (!boxes.length) return false;
    var r = boxes[Math.floor(Math.random() * boxes.length)].getBoundingClientRect();
    [0, 1].forEach(function(k){ var g = D.createElement("i"); g.className = "fxglint" + (k ? " rev" : ""); g.setAttribute("aria-hidden", "true");
      g.style.left = (r.left + W.scrollX) + "px"; g.style.width = r.width + "px"; g.style.top = ((k ? r.bottom - 2 : r.top) + W.scrollY) + "px";
      D.body.appendChild(g); setTimeout(function(){ g.remove(); }, 1400); });
    return true;
  }
  function ambBarcode(){
    var h = D.querySelector(".sin-row > div"); if (!h) return false; var r = h.getBoundingClientRect(); if (r.bottom < 0 || r.top > W.innerHeight || !r.width) return false;
    var s = D.createElement("i"); s.className = "fxbcscan"; s.setAttribute("aria-hidden", "true"); h.appendChild(s); setTimeout(function(){ s.remove(); }, 1500); return true;
  }
  function ambLoop(){
    clearTimeout(AMB.timer);
    AMB.timer = setTimeout(function(){
      if (ambOk()){ var pick = Math.random(); if (!(pick < .3 ? ambBarcode() : ambGlint())) ambGlint(); }
      ambLoop();
    }, Math.max(3, P("amb.gap")) * 1000 * (.7 + Math.random() * .6));
  }
  function motesFrame(t){
    var m = AMB.motes; if (!m || !m.cv.isConnected){ tick.remove(motesFrame); AMB.motes = null; return; }
    if (t - m.last < 33) return; var dt = Math.min(.1, (t - m.last) / 1000); m.last = t;
    var r = m.cv.getBoundingClientRect(); if (r.bottom < 0 || r.top > W.innerHeight) return;
    var x = m.x, w = m.cv.width, h = m.cv.height, sx = w / r.width, lx = (L.x - r.left) * sx, ly = (L.y - r.top) * sx, rad = 300 * sx, a0 = P("amb.motes");
    x.clearRect(0, 0, w, h);
    for (var i = 0; i < m.p.length; i++){ var p = m.p[i];
      p.y -= p.v * dt; p.x += Math.sin(t / 1000 * p.f + p.ph) * p.s * dt; if (p.y < -.03){ p.y = 1.03; p.x = Math.random(); }
      var px = p.x * w, py = p.y * h, dx = px - lx, dy = py - ly, near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / rad);
      var tw = .6 + .4 * Math.sin(t / 1000 * p.f * 2.3 + p.ph * 3), a = (p.a * .28 + near * near * .75) * tw * a0, edge = Math.min(1, p.y * 6, (1 - p.y) * 6); a *= Math.max(0, edge);
      if (a < .01) continue;
      x.globalAlpha = Math.min(1, a); x.fillStyle = "#f6dfb0"; x.beginPath(); x.arc(px, py, p.r * sx, 0, 6.2832); x.fill(); }
    x.globalAlpha = 1;
  }
  function ambAfter(){
    [].forEach.call(D.querySelectorAll(".fxmotes"), function(n){ n.remove(); }); AMB.motes = null; tick.remove(motesFrame);
    clearTimeout(AMB.timer); if (reduce || !P("amb.on") || CTX.who === "zolo" || CTX.editing) return;
    ambLoop();
    var fig = CTX.tab === "dossier" && P("amb.motes") > 0 ? D.querySelector(".portrait.iop") : null;
    if (fig && W.innerWidth > 880 && getComputedStyle(fig).position !== "static"){
      var cv = D.createElement("canvas"); cv.className = "fxmotes"; cv.setAttribute("aria-hidden", "true"); cv.width = 480; cv.height = 620; fig.appendChild(cv);
      var ps = []; for (var i = 0; i < 26; i++) ps.push({x:Math.random(), y:Math.random(), v:.008 + Math.random() * .016, s:.004 + Math.random() * .012, f:.25 + Math.random() * .6, ph:Math.random() * 6.28, a:.25 + Math.random() * .75, r:.5 + Math.random() * 1.1});
      AMB.motes = {cv:cv, x:cv.getContext("2d"), p:ps, last:0}; tick.add(motesFrame);
    }
  }

  /* ================= G8: Highrider ID header ================= */
  function idAfter(){
    if (!D.body) return;
    D.body.classList.toggle("fx-id", !!P("id.on"));
    root.style.setProperty("--id-holo", String(P("id.holo"))); root.style.setProperty("--id-spin", Math.max(8, P("id.spin")) + "s");
    var code = D.querySelector(".top .code"); if (code && P("id.on")) code.setAttribute("data-lit", "far");
    var top = D.querySelector("header.top"); if (top) top.setAttribute("data-lit", "");
  }

  /* ================= the app's hook ================= */
  FX.rendered = function(ctx){
    CTX = ctx || {};
    if (CTX.fx && typeof CTX.fx === "object") shared = CTX.fx;
    cssVars(); panelSync(); gradeSync(); skySync(); idAfter();
    wareAfter(); armAfter(); lightScan(); clothWipe(); ambAfter();
    if (!FX._first){ FX._first = 1; setTimeout(streak, 500); }
  };
  cssVars();
})();
