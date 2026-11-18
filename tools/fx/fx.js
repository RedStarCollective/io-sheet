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
    "lens.on":1, "ret.on":1, "ret.t":170, "ret.glow":1, "ret.pad":1.2,
    "circ.on":1, "circ.rest":.12, "circ.lit":.5, "circ.band":.55, "circ.r":230, "circ.s":560, "circ.t":.5, "circ.idle":7,
    "wipe.on":1, "wipe.t":.95, "wipe.jit":1, "wipe.glow":1,
    "pan.on":1, "pan.rim":.9, "pan.rimr":260, "pan.pool":.07, "pan.poolr":360,
    "grade.on":1, "grade.vig":.42, "grade.grain":.05, "grade.bloom":.35, "grade.streak":1,
    "sky.on":1, "sky.par":14, "sky.stars":1, "sky.neb":1, "sky.atmo":.65, "sky.city":1, "sky.res":1,
    "swap.on":1, "swap.t":.34, "swap.blur":7, "swap.carry":1,
    "amb.on":1, "amb.gap":9, "amb.motes":1,
    "id.on":1, "id.holo":.45, "id.spin":90,
    "mom.on":1, "mom.speed":1, "red.on":1, "spine.on":1, "pose.on":1, "pose.lit":.8, "pose.dof":1.6, "veh.on":1, "veh.thr":1, "veh.strip":1, "glass.on":1,
    "live.on":1, "live.par":1, "live.rel":1, "live.spec":1, "r2.on":1, "r2.par":1, "foil.on":1, "foil.str":.7, "turn.on":1, "turn.t":.75, "turn.depth":1,
    "tilt.on":1, "tilt.deg":1.2, "rekey.on":1, "rekey.t":.9, "scroll.on":1, "plate.on":1, "weap.on":1, "sync.on":1, "call.on":1, "nerve.on":1, "glt.on":1, "sch.on":1,
    "title.on":1
  };
  var SPEC = [
    {g:"Key light", k:[["light.ease","Follow speed",.03,.5,.01]]},
    {g:"Ware hover scanner (see underneath)", on:"lens.on", k:[]},
    {g:"Ware reticle", on:"ret.on", k:[["ret.t","Snap time (ms)",60,420,10],["ret.glow","Glow",0,2.5,.05],["ret.pad","Padding (%)",0,4,.1]]},
    {g:"Arm circuits", on:"circ.on", k:[["circ.rest","Resting traces",0,.4,.01],["circ.lit","Lit traces",0,1,.01],["circ.band","Weapon glow",0,1,.01],["circ.s","Trace size (px)",360,900,10],["circ.r","Light radius (px)",80,520,10],["circ.t","Pulse time (s)",.2,1.5,.05],["circ.idle","Idle pulses / min",0,20,1]]},
    {g:"Ware scan-wipe", on:"wipe.on", k:[["wipe.t","Duration (s)",.4,2.2,.05],["wipe.jit","Slice jitter",0,3,.1],["wipe.glow","Glow",0,2.5,.05]]},
    {g:"Key-light panels", on:"pan.on", k:[["pan.rim","Frame highlight",0,1,.05],["pan.rimr","Highlight reach (px)",80,600,10],["pan.pool","Light pool",0,.2,.005],["pan.poolr","Pool reach (px)",120,800,10]]},
    {g:"Film grade", on:"grade.on", k:[["grade.vig","Vignette",0,.9,.01],["grade.grain","Grain",0,.2,.005],["grade.bloom","Bloom",0,1,.05],["grade.streak","Tab streak",0,1,.05]]},
    {g:"Orbit backdrop", on:"sky.on", k:[["sky.par","Parallax (px)",0,40,1],["sky.stars","Stars",0,2,.05],["sky.neb","Nebula",0,2.5,.05],["sky.atmo","Atmosphere",0,2.5,.05],["sky.city","City lights",0,2,.05],["sky.res","Sharpness (lower = lighter)",.4,1.25,.05]]},
    {g:"Focus-pull tabs", on:"swap.on", k:[["swap.t","Duration (s)",.15,.9,.01],["swap.blur","Blur (px)",0,20,.5],["swap.carry","Carry Iō into Posse (0/1)",0,1,1]]},
    {g:"Ambient life", on:"amb.on", k:[["amb.gap","Seconds between events",3,30,1],["amb.motes","Dust motes",0,2,.05]]},
    {g:"ID header", on:"id.on", k:[["id.holo","Holo SIN",0,1,.05],["id.spin","Mark turn (s per turn)",8,240,2]]},
    {g:"Tab entrances", on:"mom.on", k:[["mom.speed","Speed",.5,2,.05]]},
    {g:"Case File redactions", on:"red.on", k:[]},
    {g:"Rep timeline spine", on:"spine.on", k:[]},
    {g:"Posse key light", on:"pose.on", k:[["pose.lit","Light strength",0,1.5,.05],["pose.dof","Blur behind (px)",0,5,.1]]},
    {g:"Vehicle engines and lights", on:"veh.on", k:[["veh.thr","Thruster glow",0,1.5,.05],["veh.strip","Light strip",0,1.5,.05]]},
    {g:"Treemap glass", on:"glass.on", k:[]},
    {g:"Fan card foil", on:"foil.on", k:[["foil.str","Foil strength",0,1,.02]]},
    {g:"Ware front/back turn", on:"turn.on", k:[["turn.t","Duration (s)",.3,1.6,.05],["turn.depth","Volume",0,2.5,.05]]},
    {g:"Panel depth (lean)", on:"tilt.on", k:[["tilt.deg","Lean (degrees)",0,4,.1]]},
    {g:"Iō / Zolo switch transition", on:"rekey.on", k:[["rekey.t","Duration (s)",.3,2,.05]]},
    {g:"Scroll reveals", on:"scroll.on", k:[]},
    {g:"Engraved stat plates", on:"plate.on", k:[]},
    {g:"Weapon alcoves", on:"weap.on", k:[]},
    {g:"Dossier sign-off", on:"sync.on", k:[]},
    {g:"Ware callouts", on:"call.on", k:[]},
    {g:"Live nerves", on:"nerve.on", k:[]},
    {g:"Implant glints", on:"glt.on", k:[]},
    {g:"Vehicle schematic button", on:"sch.on", k:[]},
    {g:"Title screen on first open (X1)", on:"title.on", k:[]}
  ];
  var shared = {}, local = {};
  try { local = JSON.parse(localStorage.getItem("io-fx") || "{}") || {}; } catch(e){ local = {}; }
  /* Pinned Nov 18 (Oak): the in-browser depth maps warp the portraits on load. Off until Oak supplies better depth maps. */
  var PIN = {"live.on":1, "r2.on":1};
  function P(k){ if (PIN[k]) return 0; var v = k in local ? local[k] : k in shared ? shared[k] : DEF[k]; return typeof v === "number" && isFinite(v) ? v : DEF[k]; }
  FX.P = P;
  function cssVars(){
    var s = root.style;
    s.setProperty("--ret-t", P("ret.t") + "ms"); s.setProperty("--ret-glow", String(P("ret.glow")));
    s.setProperty("--circ-rest", String(P("circ.rest"))); s.setProperty("--circ-lit", String(P("circ.lit")));
    s.setProperty("--pan-rim", String(P("pan.rim"))); s.setProperty("--pan-rimr", P("pan.rimr") + "px"); s.setProperty("--pan-pool", String(P("pan.pool"))); s.setProperty("--pan-poolr", P("pan.poolr") + "px");
    s.setProperty("--gr-vig", String(P("grade.vig"))); s.setProperty("--gr-grain", String(P("grade.grain"))); s.setProperty("--gr-bloom", String(P("grade.bloom"))); s.setProperty("--gr-streak", String(P("grade.streak")));
    s.setProperty("--mk", (1 / Math.max(.25, P("mom.speed"))).toFixed(3)); s.setProperty("--plit", String(P("pose.lit"))); s.setProperty("--pdof", P("pose.dof") + "px"); s.setProperty("--thr", String(P("veh.thr"))); s.setProperty("--strip", String(P("veh.strip")));
    s.setProperty("--foil", String(P("foil.str")));
    s.setProperty("--swap-t", P("swap.t") + "s"); s.setProperty("--swap-b", P("swap.blur") + "px");
    if (D.body){ D.body.classList.toggle("fx-nopan", !P("pan.on")); D.body.classList.toggle("fx-grade", !!P("grade.on")); }
    s.setProperty("--circ-r", P("circ.r") + "px"); s.setProperty("--circ-s", P("circ.s") + "px"); s.setProperty("--circ-band", String(P("circ.band"))); s.setProperty("--circ-t", P("circ.t") + "s");
  }
  function values(){ var o = {}; for (var k in DEF) o[k] = P(k); var cp = callPts(); if (Object.keys(cp).length) o["call.pts"] = cp; return o; }
  /* Ware callout points, placed by hand: {"who|f|item name":[x%, y%]} (not a number, so it lives outside P) */
  function callPts(){ var a = shared["call.pts"], b = local["call.pts"], o = {}, k; if (a && typeof a === "object") for (k in a) o[k] = a[k]; if (b && typeof b === "object") for (k in b) o[k] = b[k]; return o; }
  function setPt(key, v){ var b = local["call.pts"] && typeof local["call.pts"] === "object" ? local["call.pts"] : {}; b[key] = v; local["call.pts"] = b; try { localStorage.setItem("io-fx", JSON.stringify(local)); } catch(e){} }
  function setLocal(k, v){ local[k] = v; try { localStorage.setItem("io-fx", JSON.stringify(local)); } catch(e){} cssVars(); changed(k); }
  function changed(k){
    if (/^(ret|lens)\./.test(k)){ if (k === "lens.on" && CTX.rerender) CTX.rerender(); else wareAfter(); }
    if (/^circ\./.test(k)) armAfter();
    if (/^pan\./.test(k)) lightScan();
    if (/^grade\./.test(k)) gradeSync();
    if (/^sky\./.test(k)) skySync();
    if (/^amb\./.test(k)) ambAfter();
    if (/^(red|spine|pose|veh|glass)\./.test(k) && CTX.rerender) CTX.rerender();
    if (/^(live|r2|foil)\.on$/.test(k)) heroAfter();
    if (/^(tilt|rekey|scroll|plate|weap|sync|call|nerve|glt|sch)\./.test(k)){ restAfter(false); if (k === "plate.on") lightScan(); }
    if (/^id\./.test(k)){ idAfter(); lightScan(); }
    if (k === "title.on" && P("title.on")) titleShow(true);
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
     and jumps to the last touch. Elements marked data-lit get --klx / --kly (px, in their own box) while it moves. */
  var L = FX.light = {x:W.innerWidth * .3, y:W.innerHeight * .25, tx:W.innerWidth * .3, ty:W.innerHeight * .25, els:[], on:false, reach:400};
  function lightFrame(){
    var e = P("light.ease"), dx = L.tx - L.x, dy = L.ty - L.y;
    L.x += dx * e; L.y += dy * e;
    var reach = L.reach;
    for (var i = 0; i < L.els.length; i++){ var el = L.els[i]; if (!el.isConnected) continue;
      var r = el.getBoundingClientRect(), ox = Math.max(r.left - L.x, 0, L.x - r.right), oy = Math.max(r.top - L.y, 0, L.y - r.bottom);
      if (el._far === undefined) el._far = el.getAttribute("data-lit") === "far";
      if (!el._far && (ox > reach || oy > reach || ox * ox + oy * oy > reach * reach)){ if (el._lt){ el._lt = 0; el.style.removeProperty("--klx"); el.style.removeProperty("--kly"); } continue; }
      el._lt = 1; el.style.setProperty("--klx", (L.x - r.left).toFixed(1) + "px"); el.style.setProperty("--kly", (L.y - r.top).toFixed(1) + "px"); }
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
    /* the hover scanner (the app's lens that shows muscle, nerves and bone under the pointer) can be switched off here */
    if (fig && !P("lens.on")){ var ln = D.getElementById("lens"); if (ln) ln.remove(); fig.classList.remove("lensing"); }
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
      var carry = !!P("swap.carry") && to === "posse" && CTX.who !== "zolo" && !!D.querySelector("#bodyfig, .portrait.iop .iopw");
      root.classList.toggle("fx-carry", carry);
      /* the lead figure skips its own rise when Iō is carried in, so the two don't fight */
      try { vt = D.startViewTransition(function(){ fn(); if (carry){ var ld = D.querySelector(".lineup .fig.lead"); if (ld) ld.style.animation = "none"; } }); } catch(e){ vt = null; }
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

  /* ================= Phase 3: tab moments =================
     Each tab's entrance runs once when you arrive (not on re-renders such as a sheet sync), on top of the tab's own
     entrance. A click or key press during an entrance finishes it at once. The always-on details (Rep spine, Posse light,
     engines, redactions, glass tiles) are separate switches. */
  var MOM = {key:"", clean:[], timer:0};
  function momOn(){ return !reduce && !!P("mom.on") && !CTX.editing; }
  function momLater(fn, ms){ var t = setTimeout(fn, ms * (root.style.getPropertyValue("--mk") ? +root.style.getPropertyValue("--mk") : 1)); MOM.clean.push(function(){ clearTimeout(t); fn(); }); }
  function momFinish(){ var c = MOM.clean; MOM.clean = []; c.forEach(function(f){ try { f(); } catch(e){} }); }
  D.addEventListener("pointerdown", function(ev){ if (MOM.clean.length && !(ev.target.closest && ev.target.closest(".fxpanel,.fxbtn"))) momFinish(); }, true);
  D.addEventListener("keydown", function(){ if (MOM.clean.length) momFinish(); }, true);
  var GLY = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789/#";
  function scramble(node, dur, delay){
    var fin = node.nodeValue; if (!fin || !fin.trim()) return;
    var t0 = 0, done = false;
    function end(){ if (done) return; done = true; tick.remove(f); node.nodeValue = fin; }
    function f(t){ if (!t0) t0 = t + delay; var k = (t - t0) / dur; if (k < 0){ node.nodeValue = fin.replace(/\S/g, " "); return; }
      if (k >= 1){ end(); return; } var n = Math.floor(fin.length * k), s = fin.slice(0, n);
      for (var i = n; i < fin.length; i++) s += fin[i] === " " ? " " : GLY[Math.floor(Math.random() * GLY.length)]; node.nodeValue = s; }
    tick.add(f); MOM.clean.push(end);
  }
  function lastText(el){ for (var n = el.lastChild; n; n = n.previousSibling) if (n.nodeType === 3 && n.nodeValue.trim()) return n; return null; }

  /* C1 */
  function momCase(){
    var cf = D.querySelector(".cf"); if (!cf) return;
    var img = cf.querySelector(".cfhd img"); if (img){ img.classList.add("fxscan"); momLater(function(){ img.classList.remove("fxscan"); }, 1300); }
    [].forEach.call(cf.querySelectorAll(".cfs h3"), function(h, i){ var t = lastText(h); if (t && h.getBoundingClientRect().top < W.innerHeight) scramble(t, 420, 260 + i * 140); });
    var n = 0; [].forEach.call(cf.querySelectorAll("dd"), function(dd){ if (dd.getBoundingClientRect().top < W.innerHeight + 40) dd.style.setProperty("--fd", n++); else dd.style.setProperty("--fd", -20); });
    cf.classList.add("fxseal"); momLater(function(){ cf.classList.remove("fxseal"); }, 420 + n * 55 + 600);
  }
  function redact(){
    if (!P("red.on")) return;
    var cf = D.querySelector(".cf"); if (!cf) return;
    var w = D.createTreeWalker(cf, NodeFilter.SHOW_TEXT, null), hits = [], nd;
    while ((nd = w.nextNode())) if (/\?{2,}/.test(nd.nodeValue) && !(nd.parentNode.closest && nd.parentNode.closest(".fxredact,input,textarea"))) hits.push(nd);
    hits.forEach(function(t){
      var v = t.nodeValue, m = /(\S*\s*)?\?{2,}/.exec(v); if (!m) return;
      var a = v.slice(0, m.index), b = v.slice(m.index, m.index + m[0].length), c = v.slice(m.index + m[0].length);
      var sp = D.createElement("span"); sp.className = "fxredact"; sp.tabIndex = 0; sp.textContent = b; sp.title = "Not on file";
      var fr = D.createDocumentFragment(); if (a) fr.appendChild(D.createTextNode(a)); fr.appendChild(sp); if (c) fr.appendChild(D.createTextNode(c)); t.parentNode.replaceChild(fr, t);
    });
  }

  /* R1 */
  function momRep(){
    var film = D.querySelector(".film");
    if (film){ [].forEach.call(film.querySelectorAll(".frame"), function(f, i){ f.style.setProperty("--fi", i); }); film.classList.add("fxreel"); momLater(function(){ film.classList.remove("fxreel"); }, 450 + film.children.length * 190 + 1200); }
    var sig = D.querySelector(".rsig");
    if (sig){ var j = 0; [].forEach.call(sig.querySelectorAll("i.on"), function(b){ b.style.setProperty("--j", j++); }); sig.classList.add("fxr"); momLater(function(){ sig.classList.remove("fxr"); }, 380 + j * 95 + 500); }
  }
  /* R3 */
  var SPINE = {el:null, line:null, dots:[], raf:0};
  function spineUpdate(){
    SPINE.raf = 0; var tl = SPINE.line; if (!tl || !tl.isConnected) return;
    var r = tl.getBoundingClientRect(), mark = W.innerHeight * .55, h = Math.max(0, Math.min(r.height - 14, mark - r.top - 14));
    SPINE.el.style.height = h + "px";
    for (var i = 0; i < SPINE.dots.length; i++){ var d = SPINE.dots[i], on = d.getBoundingClientRect().top < mark;
      if (on && !d._lit){ d._lit = 1; d.classList.add("fxlit"); if (!reduce && SPINE.ready){ restart(d, "fxflare"); } } else if (!on && d._lit){ d._lit = 0; d.classList.remove("fxlit"); } }
    SPINE.ready = true;
  }
  function spineAfter(){
    if (SPINE.el) SPINE.el.remove(); SPINE.el = null; SPINE.line = null; SPINE.dots = []; SPINE.ready = false;
    var tl = CTX.tab === "rep" && P("spine.on") && !CTX.editing ? D.querySelector(".tline") : null; if (!tl) return;
    var s = D.createElement("i"); s.className = "fxspine"; s.setAttribute("aria-hidden", "true"); tl.appendChild(s);
    SPINE.el = s; SPINE.line = tl; SPINE.dots = [].slice.call(tl.querySelectorAll(".rdot")); spineUpdate();
  }
  W.addEventListener("scroll", function(){ if (SPINE.el && !SPINE.raf) SPINE.raf = requestAnimationFrame(spineUpdate); }, {passive:true});

  /* P1 / P2 */
  var POS = {figs:[], sweep:null, eyeT:0};
  function posseFrame(){
    if (!POS.figs.length || !POS.figs[0].isConnected){ tick.remove(posseFrame); POS.figs = []; return; }
    var lx = L.x, ly = L.y, sw = POS.sweep;
    if (sw){ var k = (performance.now() - sw.t0) / sw.dur; if (k >= 1) POS.sweep = null; else { var e = ease(Math.max(0, k)); lx = sw.x0 + (sw.x1 - sw.x0) * e; ly = sw.y; } }
    for (var i = 0; i < POS.figs.length; i++){ var f = POS.figs[i], r = f.getBoundingClientRect(), lit = f._lit, sh = f._sh;
      lit.style.setProperty("--px", (lx - r.left).toFixed(0) + "px"); lit.style.setProperty("--py", (ly - r.top).toFixed(0) + "px");
      var dx = (r.left + r.width / 2) - lx; sh.style.setProperty("--sx", Math.max(-40, Math.min(40, dx * .06)).toFixed(1) + "px"); sh.style.setProperty("--sw", (1 + Math.min(.5, Math.abs(dx) / 1400)).toFixed(2)); }
    if (!POS.sweep && !L.on && !POS.kick) tick.remove(posseFrame);
    POS.kick = false;
  }
  function posseKick(){ if (POS.figs.length){ POS.kick = true; tick.add(posseFrame); } }
  D.addEventListener("pointermove", function(){ if (POS.figs.length) posseKick(); }, {passive:true});
  W.addEventListener("scroll", function(){ if (POS.figs.length) posseKick(); }, {passive:true});
  function eyeLoop(){
    clearTimeout(POS.eyeT); if (reduce || !POS.figs.length) return;
    POS.eyeT = setTimeout(function(){ var w = D.querySelector(".lineup:not(.mini) .fig.wolf"); if (w && !D.hidden){ [].forEach.call(w.querySelectorAll(".fxeye"), function(e, i){ setTimeout(function(){ restart(e, "go"); }, i * 90); }); } eyeLoop(); }, 5500 + Math.random() * 6000);
  }
  function posseAfter(enter){
    POS.figs = []; tick.remove(posseFrame); clearTimeout(POS.eyeT);
    if (CTX.tab !== "posse" || CTX.editing || !P("pose.on")) return;
    [].forEach.call(D.querySelectorAll(".lineup:not(.mini) .fig"), function(f){
      var img = f.querySelector("img"); if (!img) return;
      var lit = D.createElement("i"); lit.className = "fxlit"; lit.setAttribute("aria-hidden", "true"); lit.style.setProperty("--am", 'url("' + img.getAttribute("src") + '")');
      var sh = D.createElement("i"); sh.className = "fxsh"; sh.setAttribute("aria-hidden", "true");
      f.appendChild(lit); f.insertBefore(sh, f.firstChild); f._lit = lit; f._sh = sh; POS.figs.push(f);
      if (f.classList.contains("wolf")) [[42, 18.6], [32.2, 19.2]].forEach(function(p){ var e = D.createElement("i"); e.className = "fxeye"; e.setAttribute("aria-hidden", "true"); e.style.left = p[0] + "%"; e.style.top = p[1] + "%"; f.appendChild(e); });
    });
    if (!POS.figs.length) return;
    var lu = D.querySelector(".lineup:not(.mini)").getBoundingClientRect();
    if (enter && momOn()){ POS.sweep = {t0:performance.now() + 120 * (+root.style.getPropertyValue("--mk") || 1), dur:1500 * (+root.style.getPropertyValue("--mk") || 1), x0:lu.left - 200, x1:Math.min(L.x, lu.right) || lu.left + lu.width / 2, y:lu.top + lu.height * .25};
      MOM.clean.push(function(){ POS.sweep = null; posseKick(); }); }
    posseKick(); eyeLoop();
  }

  /* V1 */
  var THR = [[96.7, 39.5], [97.2, 46.3], [97.3, 52.4], [96.4, 64.6]];
  function vehAfter(enter){
    [].forEach.call(D.querySelectorAll(".fxveh"), function(n){ n.remove(); });
    if (CTX.tab !== "vehicles" || CTX.editing || !P("veh.on")) return;
    var big = D.querySelector('.hv[data-gv="curiosity"] .hvfloat'), small = D.querySelector('.hv[data-gv="chui"] .hvfloat');
    var go = enter && momOn();
    if (big && /cut-zep/.test((big.querySelector("img") || {}).src || "")){
      var t = D.createElement("span"); t.className = "fxveh fxthr on" + (go ? " ign" : ""); t.setAttribute("aria-hidden", "true");
      t.innerHTML = THR.map(function(p, i){ return '<i style="left:' + p[0] + '%;top:' + p[1] + '%;--ti:' + i + '"></i>'; }).join(""); big.appendChild(t);
      if (go) momLater(function(){ t.classList.remove("ign"); }, 2100 + THR.length * 230);
    }
    if (small && /chui-sky/.test((small.querySelector("img") || {}).src || "")){
      var s = D.createElement("i"); s.className = "fxveh fxstrip"; s.setAttribute("aria-hidden", "true"); small.appendChild(s);
      if (go){ s.classList.add("go", "first"); momLater(function(){ s.classList.remove("go", "first"); }, 2500); }
      var hv = small.closest(".hv"); if (hv && !reduce) hv.addEventListener("mouseenter", function(){ if (!s.classList.contains("first")) restart(s, "go"); });
    }
  }

  /* A2 */
  function rollNum(el, dur, delay){
    var fin = el.textContent; if (!/\d/.test(fin)) return;
    var digits = fin.replace(/\D/g, "").length, k = 0, h = "";
    for (var i = 0; i < fin.length; i++){ var ch = fin[i];
      if (/\d/.test(ch)){ var to = +ch, place = digits - 1 - k, spins = 1 + Math.min(place, 3), col = "";
        for (var s = 0; s <= spins; s++) for (var d = 0; d < 10; d++) col += "<i>" + d + "</i>";
        col += "<i>" + to + "</i>";
        var total = (spins + 1) * 10, from = Math.floor(Math.random() * 10);
        h += '<span class="fxdg"><span style="--from:' + from + ';--to:' + total + ';--dur:' + (dur * (1 - place * .12)).toFixed(2) + 's;--dl:' + (delay + place * 60) + 'ms">' + col + '</span></span>'; k++; }
      else h += ch === " " ? " " : '<span>' + (ch === "<" ? "&lt;" : ch === "&" ? "&amp;" : ch) + '</span>'; }
    el.classList.remove("dec"); queueMicrotask(function(){ el.classList.add("dec"); });   /* hidden from the app's number scramble, which runs right after render, then styled as before */
    el.setAttribute("aria-label", fin); el.innerHTML = '<span class="fxroll" aria-hidden="true">' + h + '</span>';
    var back = function(){ if (el.isConnected && el.querySelector(".fxroll")){ el.textContent = fin; el.removeAttribute("aria-label"); } };
    MOM.clean.push(back); setTimeout(back, (dur + .2) * 1000 * (+root.style.getPropertyValue("--mk") || 1) + delay + digits * 60);
  }
  function momAdv(){
    var bal = D.querySelector(".a-bal"); if (!bal) return;
    [].forEach.call(bal.querySelectorAll(".lr b .dec, .lr b.dec"), function(el, i){ var tot = el.closest(".tot"); rollNum(el, tot ? 1.35 : .9, tot ? 500 : 250 + i * 120); });
  }

  function moments(){
    var key = (CTX.who || "") + "|" + (CTX.tab || ""), enter = key !== MOM.key; MOM.key = key;
    if (enter) momFinish();
    if (enter && momOn()){
      if (CTX.tab === "casefile") momCase();
      else if (CTX.tab === "rep") momRep();
      else if (CTX.tab === "advance") momAdv();
    }
    if (CTX.tab === "casefile" && !CTX.editing) redact();
    spineAfter(); posseAfter(enter); vehAfter(enter); restAfter(enter);
    D.body.classList.toggle("fx-glass", !!P("glass.on"));
  }

  /* ================= Phase 4: hero pieces =================
     All four use flat art and a depth map worked out in the browser: for cut-out art the silhouette is inflated into a
     rounded volume (distance from the edge), with a little of the picture's own light on top; for framed art (Rep
     portraits) depth comes from where the light falls and from the framing. A real depth map can replace either later. */
  function depthOf(img, cut, w){
    w = w || 160; var iw0 = img.naturalWidth || img.width, ih0 = img.naturalHeight || img.height, h = Math.max(2, Math.round(w * ih0 / Math.max(1, iw0)));
    var c = D.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d", {willReadFrequently:true}); x.drawImage(img, 0, 0, w, h);
    var px = x.getImageData(0, 0, w, h).data, n = w * h, a = new Float32Array(n), lum = new Float32Array(n), d = new Float32Array(n), i, j, k;
    for (i = 0; i < n; i++){ a[i] = px[i * 4 + 3] / 255; lum[i] = (px[i * 4] * .3 + px[i * 4 + 1] * .59 + px[i * 4 + 2] * .11) / 255; }
    function blur(src, r){ var t = new Float32Array(n), o = new Float32Array(n), y, xx, s, cnt;
      for (y = 0; y < h; y++){ s = 0; cnt = 0; for (xx = -r; xx < w + r; xx++){ if (xx + r < w){ s += src[y * w + xx + r]; cnt++; } if (xx - r - 1 >= 0){ s -= src[y * w + xx - r - 1]; cnt--; } if (xx >= 0 && xx < w) t[y * w + xx] = s / Math.max(1, cnt); } }
      for (xx = 0; xx < w; xx++){ s = 0; cnt = 0; for (y = -r; y < h + r; y++){ if (y + r < h){ s += t[(y + r) * w + xx]; cnt++; } if (y - r - 1 >= 0){ s -= t[(y - r - 1) * w + xx]; cnt--; } if (y >= 0 && y < h) o[y * w + xx] = s / Math.max(1, cnt); } }
      return o; }
    if (cut){
      /* chamfer distance from the silhouette's edge */
      var INF = 1e9; for (i = 0; i < n; i++) d[i] = a[i] > .5 ? INF : 0;
      for (j = 0; j < h; j++) for (i = 0; i < w; i++){ k = j * w + i; if (!d[k]) continue; var m = d[k];
        if (i > 0) m = Math.min(m, d[k - 1] + 1); if (j > 0){ m = Math.min(m, d[k - w] + 1); if (i > 0) m = Math.min(m, d[k - w - 1] + 1.414); if (i < w - 1) m = Math.min(m, d[k - w + 1] + 1.414); } d[k] = m; }
      for (j = h - 1; j >= 0; j--) for (i = w - 1; i >= 0; i--){ k = j * w + i; if (!d[k]) continue; var m2 = d[k];
        if (i < w - 1) m2 = Math.min(m2, d[k + 1] + 1); if (j < h - 1){ m2 = Math.min(m2, d[k + w] + 1); if (i < w - 1) m2 = Math.min(m2, d[k + w + 1] + 1.414); if (i > 0) m2 = Math.min(m2, d[k + w - 1] + 1.414); } d[k] = m2; }
      var mx = 0; for (i = 0; i < n; i++) if (d[i] < INF && d[i] > mx) mx = d[i];
      var lb = blur(lum, Math.max(1, Math.round(w / 60)));
      for (i = 0; i < n; i++){ var t2 = Math.min(1, d[i] / Math.max(1, mx * .95)); d[i] = a[i] > .02 ? Math.sqrt(t2 * (2 - t2)) * .72 + lb[i] * .28 : 0; }
      d = blur(d, Math.max(1, Math.round(w / 80)));
    } else {
      var lb2 = blur(lum, Math.max(2, Math.round(w / 14))), lo = 1, hi = 0;
      for (i = 0; i < n; i++){ if (lb2[i] < lo) lo = lb2[i]; if (lb2[i] > hi) hi = lb2[i]; }
      for (j = 0; j < h; j++) for (i = 0; i < w; i++){ k = j * w + i; var dx = (i / w - .5) / .55, dy = (j / h - .38) / .62, rad = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
        d[k] = .5 * ((lb2[k] - lo) / Math.max(.01, hi - lo)) + .5 * rad * rad * (3 - 2 * rad); }
      d = blur(d, Math.max(1, Math.round(w / 40)));
    }
    var out = D.createElement("canvas"); out.width = w; out.height = h; var ox = out.getContext("2d"), od = ox.createImageData(w, h);
    for (i = 0; i < n; i++){ var v = Math.round(Math.max(0, Math.min(1, d[i])) * 255); od.data[i * 4] = od.data[i * 4 + 1] = od.data[i * 4 + 2] = v; od.data[i * 4 + 3] = 255; }
    ox.putImageData(od, 0, 0); return out;
  }
  FX.depthOf = depthOf;
  var STARS_GLSL = "float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}" +
    "float starf(vec2 p){vec2 g=floor(p),f=fract(p)-.5;float r=h21(g);return r>.9?smoothstep(.12,0.,length(f-(vec2(h21(g+1.3),h21(g+2.1))-.5)*.6))*(r-.9)*10.:0.;}";

  /* ---- D2: the living portrait ---- */
  var LIVEF = [
    "precision mediump float;varying vec2 vUv;",
    "uniform sampler2D uImg,uDep,uGold;uniform vec2 uPtr,uLight;uniform float uT,uPar,uRel,uSpec,uHasGold,uAsp;",
    STARS_GLSL,
    "void main(){",
    "  vec2 uv=vUv;float d=texture2D(uDep,uv).r;",
    "  for(int i=0;i<3;i++){uv=vUv-(d-.45)*uPtr*uPar;d=texture2D(uDep,uv).r;}",
    "  vec4 c=texture2D(uImg,uv);if(c.a<.003){gl_FragColor=vec4(0.);return;}",
    "  vec2 e=vec2(1./160.,1./160.*uAsp);",
    "  float dx=texture2D(uDep,uv+vec2(e.x,0.)).r-texture2D(uDep,uv-vec2(e.x,0.)).r;",
    "  float dy=texture2D(uDep,uv+vec2(0.,e.y)).r-texture2D(uDep,uv-vec2(0.,e.y)).r;",
    "  vec3 n=normalize(vec3(-dx*5.,dy*5.,1.));",
    "  vec3 L=normalize(vec3((uLight-uv)*vec2(1.,-1.),.55));",
    "  float dif=dot(n,L);",
    "  vec3 rgb=c.rgb/max(c.a,.001);",
    "  rgb*=1.+uRel*(dif-.42)*.6;",
    "  float rim=pow(1.-n.z,1.6)*max(dot(normalize(n.xy+1e-4),L.xy),0.);",
    "  rgb+=vec3(1.,.82,.55)*rim*uRel*.5;",
    "  float g=uHasGold>.5?texture2D(uGold,uv).a:0.;",
    "  if(g>.01){",
    "    vec3 R=reflect(vec3(0.,0.,-1.),n);vec2 ru=R.xy*3.+uPtr*.6+vec2(uT*.01,0.);",
    "    vec3 env=vec3(.06,.04,.03)+vec3(.95,.62,.3)*smoothstep(-.4,-.9,R.y)*.55+vec3(1.,.93,.8)*(starf(ru*9.)+starf(ru*17.+7.)*.7);",
    "    float sp=pow(max(dot(reflect(-L,n),vec3(0.,0.,1.)),0.),22.);",
    "    rgb+=g*uSpec*(env*vec3(1.,.8,.5)*.55+vec3(1.,.9,.7)*sp*.9);",
    "  }",
    "  gl_FragColor=vec4(clamp(rgb,0.,1.)*c.a,c.a);",
    "}"].join("\n");
  var LIVE = {cv:null, g:null, wrap:null, ptr:[0,0], tp:[0,0], vis:false, key:""};
  function liveStop(){ tick.remove(liveFrame); if (LIVE.g) LIVE.g.kill(); if (LIVE.cv) LIVE.cv.remove(); if (LIVE.wrap) LIVE.wrap.classList.remove("fxlive-on"); LIVE.cv = LIVE.g = LIVE.wrap = null; LIVE.key = ""; }
  function liveFrame(t){
    var w = LIVE.wrap, g = LIVE.g; if (!w || !w.isConnected || !g || g.lost){ liveStop(); return; }
    var r = w.getBoundingClientRect(); if (r.bottom < 0 || r.top > W.innerHeight) return;
    var cx = r.left + r.width / 2, cy = r.top + r.height * .35;
    LIVE.tp = [Math.max(-1, Math.min(1, (L.x - cx) / (W.innerWidth * .5))), Math.max(-1, Math.min(1, (L.y - cy) / (W.innerHeight * .5)))];
    LIVE.ptr[0] += (LIVE.tp[0] - LIVE.ptr[0]) * .08; LIVE.ptr[1] += (LIVE.tp[1] - LIVE.ptr[1]) * .08;
    var dpr = GL.dpr(), cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
    if (LIVE.cv.width !== cw || LIVE.cv.height !== ch){ LIVE.cv.width = cw; LIVE.cv.height = ch; }
    g.f("uPtr", LIVE.ptr[0], -LIVE.ptr[1]); g.f("uLight", (L.x - r.left) / r.width, (L.y - r.top) / r.height); g.f("uT", t / 1000);
    g.f("uPar", P("live.par") * .03); g.f("uRel", P("live.rel")); g.f("uSpec", P("live.spec"));
    g.draw();
    if (!w.classList.contains("fxlive-on")) w.classList.add("fxlive-on");
  }
  function liveAfter(){
    var w = CTX.tab === "dossier" && CTX.who !== "zolo" && !CTX.editing ? D.querySelector(".portrait.iop .iopw") : null;
    var img = w && w.querySelector("picture img"), want = !!(w && img && P("live.on") && GL.test() && !reduce && W.innerWidth > 880);
    var key = want ? img.getAttribute("src") : "";
    if (!want){ liveStop(); return; }
    if (LIVE.wrap === w && LIVE.key === key) return;
    liveStop(); LIVE.key = key;
    var gsrc = (w.querySelector(".iogold") || {style:{getPropertyValue:function(){ return ""; }}}).style.getPropertyValue("--gm"); gsrc = urlOf(gsrc);
    Promise.all([loadImg(key), gsrc ? loadImg(gsrc).catch(function(){ return null; }) : Promise.resolve(null)]).then(function(ims){
      if (!w.isConnected || LIVE.key !== key) return;
      var cv = D.createElement("canvas"); cv.className = "fxlive"; cv.setAttribute("aria-hidden", "true");
      var g = GL.make(cv, LIVEF); if (!g) return;
      var dep = depthOf(ims[0], true, 160);
      g.tex(0, "uImg", ims[0]); g.tex(1, "uDep", dep); if (ims[1]) g.tex(2, "uGold", ims[1]); else { var l = g.u("uGold"); if (l) g.gl.uniform1i(l, 1); }
      g.f("uHasGold", ims[1] ? 1 : 0); g.f("uAsp", ims[0].naturalWidth / ims[0].naturalHeight);
      var pic = w.querySelector("picture"); pic.parentNode.insertBefore(cv, pic.nextSibling);
      LIVE.cv = cv; LIVE.g = g; LIVE.wrap = w; LIVE.ptr = [0, 0]; tick.add(liveFrame);
    }, function(){});
  }

  /* ---- R2: Rep portraits move in depth ---- */
  var R2F = [
    "precision mediump float;varying vec2 vUv;",
    "uniform sampler2D uImg,uDep;uniform vec2 uPtr,uS,uO;uniform float uZ,uPar;",
    "void main(){",
    "  vec2 base=(vUv-.5)/uZ+.5;vec2 uv=base*uS+uO;float d=texture2D(uDep,uv).r;",
    "  for(int i=0;i<3;i++){uv=(base-(d-.5)*uPtr*uPar)*uS+uO;d=texture2D(uDep,uv).r;}",
    "  vec3 c=texture2D(uImg,clamp(uv,0.,1.)).rgb;",
    "  float v=smoothstep(1.15,.35,length((vUv-.5)*vec2(1.,1.2)));",
    "  gl_FragColor=vec4(c*(.82+.18*v),1.);",
    "}"].join("\n");
  var R2 = {list:[], raf:false};
  function r2Stop(){ tick.remove(r2Frame); R2.list.forEach(function(o){ if (o.g) o.g.kill(); if (o.cv) o.cv.remove(); if (o.fr) o.fr.classList.remove("fxr2-on"); }); R2.list = []; }
  function r2Frame(t){
    var any = false;
    R2.list.forEach(function(o){
      if (!o.fr.isConnected || o.g.lost){ return; } any = true;
      var r = o.fr.getBoundingClientRect(); if (r.bottom < 0 || r.top > W.innerHeight || r.width < 4) return;
      var act = o.fr.matches(":hover") || (o.fr.classList.contains("now") && !o.fr.parentNode.matches(":hover"));
      var tx = act ? Math.max(-1, Math.min(1, (L.x - (r.left + r.width / 2)) / (r.width * .8))) : 0, ty = act ? Math.max(-1, Math.min(1, (L.y - (r.top + r.height / 2)) / (r.height * .8))) : 0;
      var drift = act ? .35 * Math.sin(t / 1000 * .35 + o.ph) : 0;
      o.p[0] += (tx + drift - o.p[0]) * .06; o.p[1] += (ty - o.p[1]) * .06; o.z += ((act ? 1.06 : 1.0) - o.z) * .04;
      var dpr = Math.min(1.5, GL.dpr()), cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
      if (o.cv.width !== cw || o.cv.height !== ch){ o.cv.width = cw; o.cv.height = ch; }
      /* object-fit: cover with the frame's object-position */
      var iw = o.im.naturalWidth, ih = o.im.naturalHeight, s = Math.max(r.width / iw, r.height / ih), vw = r.width / (iw * s), vh = r.height / (ih * s);
      g2(o, "uS", vw, vh); g2(o, "uO", (1 - vw) * o.pos[0], (1 - vh) * o.pos[1]);
      o.g.f("uPtr", -o.p[0], -o.p[1]); o.g.f("uZ", o.z); o.g.f("uPar", P("r2.par") * .035); o.g.draw();
      if (!o.fr.classList.contains("fxr2-on")) o.fr.classList.add("fxr2-on");
    });
    if (!any) r2Stop();
  }
  function g2(o, n, a, b){ o.g.f(n, a, b); }
  function r2After(){
    r2Stop();
    if (CTX.tab !== "rep" || CTX.editing || !P("r2.on") || !GL.test() || reduce) return;
    [].forEach.call(D.querySelectorAll(".film .frame"), function(fr, i){
      var img = fr.querySelector("img"); if (!img) return;
      var op = (img.style.objectPosition || "50% 50%").split(/\s+/).map(function(v){ return parseFloat(v) / 100; });
      loadImg(img.getAttribute("src")).then(function(im){
        if (!fr.isConnected) return;
        var cv = D.createElement("canvas"); cv.className = "fxr2"; cv.setAttribute("aria-hidden", "true");
        var g = GL.make(cv, R2F); if (!g) return; g.gl.disable(g.gl.BLEND);
        g.tex(0, "uImg", im); g.tex(1, "uDep", depthOf(im, false, 128));
        fr.insertBefore(cv, img.nextSibling);
        R2.list.push({fr:fr, cv:cv, g:g, im:im, pos:[isNaN(op[0]) ? .5 : op[0], isNaN(op[1]) ? .5 : op[1]], p:[0, 0], z:1, ph:i * 1.7});
        tick.add(r2Frame);
      }, function(){});
    });
  }

  /* ---- N2: true foil on the opened fan card ---- */
  var FOILF = [
    "precision mediump float;varying vec2 vUv;",
    "uniform sampler2D uImg,uDep;uniform vec2 uTilt;uniform float uT;",
    STARS_GLSL,
    "vec3 pal(float t){t=fract(t);vec3 a=vec3(.85,.62,.28),b=vec3(1.,.45,.55),c=vec3(.62,.38,1.),d=vec3(1.,.78,.42);",
    "  return t<.25?mix(a,b,t*4.):t<.5?mix(b,c,(t-.25)*4.):t<.75?mix(c,d,(t-.5)*4.):mix(d,a,(t-.75)*4.);}",
    "void main(){",
    "  vec4 c=texture2D(uImg,vUv);if(c.a<.01){gl_FragColor=vec4(0.);return;}",
    "  float dp=texture2D(uDep,vUv).r;",
    "  vec2 e=vec2(1./128.,0.);float dx=texture2D(uDep,vUv+e.xy).r-texture2D(uDep,vUv-e.xy).r,dy=texture2D(uDep,vUv+e.yx).r-texture2D(uDep,vUv-e.yx).r;",
    "  vec3 n=normalize(vec3(-dx*3.,-dy*3.,1.));",
    "  float lum=dot(c.rgb/max(c.a,.001),vec3(.3,.59,.11));",
    "  float film=dot(n.xy,uTilt)*1.6+(vUv.x*.9+vUv.y*.6)+dot(uTilt,vec2(.9,.6))*1.2+lum*.35;",
    "  vec3 col=pal(film);",
    "  float band=.35+.65*pow(.5+.5*sin(film*6.283*1.5),2.);",
    "  float mid=smoothstep(.12,.45,lum)*(1.-smoothstep(.85,1.,lum));",
    "  vec2 sg=vUv*vec2(70.,98.);float sp=starf(sg+floor(uTilt*8.))*step(.3,lum);",
    "  vec3 o=mix(vec3(.5),col,band*mid)+vec3(.5)*sp;",
    "  gl_FragColor=vec4(clamp(o,0.,1.)*c.a,c.a);",
    "}"].join("\n");
  var FOIL = {cv:null, g:null, aw:null, card:null, src:"", tilt:[0,0]};
  function foilStop(){ tick.remove(foilFrame); if (FOIL.g) FOIL.g.kill(); if (FOIL.cv) FOIL.cv.remove(); if (FOIL.aw) FOIL.aw.classList.remove("fxfoil-on"); FOIL.cv = FOIL.g = FOIL.aw = FOIL.card = null; FOIL.src = ""; }
  function foilFrame(t){
    var aw = FOIL.aw, g = FOIL.g; if (!aw || !aw.isConnected || !g || g.lost || !aw.closest(".fnspot.on")){ foilStop(); return; }
    var cs = FOIL.card.style, px = parseFloat(cs.getPropertyValue("--px")) || 0, py = parseFloat(cs.getPropertyValue("--py")) || 0;
    FOIL.tilt[0] += (px - FOIL.tilt[0]) * .2; FOIL.tilt[1] += (py - FOIL.tilt[1]) * .2;
    var r = FOIL.cv.getBoundingClientRect(), dpr = Math.min(1.5, GL.dpr()), ch = Math.round(Math.max(40, aw.clientHeight * 1.12) * dpr), cw = Math.round(ch * FOIL.asp);
    if (cw < 4 || ch < 4) return;
    if (FOIL.cv.width !== cw || FOIL.cv.height !== ch){ FOIL.cv.width = cw; FOIL.cv.height = ch; }
    g.f("uTilt", FOIL.tilt[0] * 2.2, FOIL.tilt[1] * 2.2); g.f("uT", t / 1000); g.draw();
    if (!aw.classList.contains("fxfoil-on")) aw.classList.add("fxfoil-on");
  }
  function foilWatch(){
    var aw = P("foil.on") && !reduce && GL.test() ? D.querySelector(".fnspot.on .fcard.big .fc-aw") : null, img = aw && aw.querySelector("img.fc-art:not(.fc-holo)");
    if (!aw || !img){ if (FOIL.aw) foilStop(); return; }
    var src = img.getAttribute("src"); if (FOIL.aw === aw && FOIL.src === src) return;
    foilStop(); FOIL.src = src;
    loadImg(src).then(function(im){
      if (!aw.isConnected || FOIL.src !== src) return;
      var cv = D.createElement("canvas"); cv.className = "fxfoil"; cv.setAttribute("aria-hidden", "true");
      FOIL.asp = im.naturalWidth / Math.max(1, im.naturalHeight); cv.style.aspectRatio = im.naturalWidth + "/" + im.naturalHeight;
      cv.height = Math.round(aw.clientHeight * 1.12); cv.width = Math.round(cv.height * FOIL.asp);
      var g = GL.make(cv, FOILF); if (!g) return;
      g.tex(0, "uImg", im); g.tex(1, "uDep", depthOf(im, true, 128));
      aw.appendChild(cv); FOIL.cv = cv; FOIL.g = g; FOIL.aw = aw; FOIL.card = aw.closest(".fcard.big"); FOIL.tilt = [0, 0]; tick.add(foilFrame);
    }, function(){});
  }
  var foilMO = new MutationObserver(function(){ clearTimeout(foilMO.t); foilMO.t = setTimeout(foilWatch, 60); });

  /* ---- W5: the Ware figure turns in depth ---- */
  var TURNF = [
    "precision mediump float;varying vec2 vUv;",
    "uniform sampler2D uImg,uDep;uniform float uA,uPad,uDZ,uGlow;uniform vec3 uCol;",
    "void main(){",
    "  float ca=cos(uA),sa=sin(uA);",
    "  float xo=(vUv.x-.5)*(1.+2.*uPad);",                       /* output x, in units of the figure's width, centred */
    "  float xs=xo/max(ca,.08),dz=0.;",
    "  for(int i=0;i<4;i++){vec2 su=vec2(xs+.5,vUv.y);dz=texture2D(uDep,su).r*step(0.,su.x)*step(su.x,1.)*uDZ;xs=(xo-dz*sa)/max(ca,.08);}",
    "  vec2 su=vec2(xs+.5,vUv.y);",
    "  if(su.x<0.||su.x>1.){gl_FragColor=vec4(0.);return;}",
    "  vec4 c=texture2D(uImg,su);",
    "  float e=.02;float gx=(texture2D(uDep,su+vec2(e,0.)).r-texture2D(uDep,su-vec2(e,0.)).r)/(2.*e)*uDZ;",
    "  float facing=clamp((ca+gx*sa)/sqrt(1.+gx*gx),0.,1.);",                  /* how square the surface sits to the viewer as it turns */
    "  vec3 rgb=c.rgb*(.45+.55*facing);",
    "  float rim=pow(1.-facing,4.)*abs(sa)*smoothstep(.02,.3,c.a);",
    "  rgb+=uCol*rim*uGlow*.35*c.a;",
    "  gl_FragColor=vec4(rgb,c.a);",
    "}"].join("\n");
  function turnSnap(fig){
    var img = fig.querySelector("#bodyimg"); if (!img || !img.naturalWidth) return null;
    var w = Math.min(520, img.naturalWidth), h = Math.round(w * img.naturalHeight / img.naturalWidth), c = D.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d");
    var clo = fig.querySelector(".cloth"), cs = clo && getComputedStyle(clo);
    if (!(clo && fig.classList.contains("clothed"))) x.drawImage(img, 0, 0, w, h);
    return {c:c, cloth:clo && fig.classList.contains("clothed") ? urlOf(clo.style.getPropertyValue("--ci")) : "", w:w, h:h, img:img};
  }
  function turnTex(fig){
    var s = turnSnap(fig); if (!s) return Promise.reject();
    if (!s.cloth) return Promise.resolve(s.c);
    return loadImg(s.cloth).then(function(ci){ s.c.getContext("2d").drawImage(ci, 0, 0, s.w, s.h); return s.c; });
  }
  FX.turn = function(fig, doRender, dir){
    try {
      if (!fig || reduce || !P("turn.on") || !GL.test() || fig.classList.contains("boot")) return false;
      var R = fig.getBoundingClientRect(); if (R.width < 20) return false;
      var pad = .3, cv = D.createElement("canvas"); cv.className = "fxturn"; cv.setAttribute("aria-hidden", "true");
      var dpr = GL.dpr(); cv.width = Math.round(R.width * (1 + 2 * pad) * dpr); cv.height = Math.round(R.height * dpr);
      cv.style.left = (R.left + W.scrollX - R.width * pad) + "px"; cv.style.top = (R.top + W.scrollY) + "px"; cv.style.width = (R.width * (1 + 2 * pad)) + "px"; cv.style.height = R.height + "px";
      var g = GL.make(cv, TURNF); if (!g) return false;
      var zo = D.body.classList.contains("zolo"), T = Math.max(.15, P("turn.t")) * 1000, sgn = dir === "back" ? 1 : -1;
      g.f("uPad", pad); g.f("uDZ", P("turn.depth") * .22); g.f("uGlow", 1.2); if (zo) g.f("uCol", .82, .9, .96); else g.f("uCol", 1., .8, .48);
      var done = false;
      function finish(){ if (done) return; done = true; tick.remove(fr); cv.remove(); g.kill(); var n = D.getElementById("bodyfig"); if (n) n.classList.remove("fxturning"); }
      function run(from, to, dur, ease0, then){ var t0 = 0; fr = function(t){ if (g.lost){ finish(); return; } if (!t0) t0 = t; var k = Math.min(1, (t - t0) / dur), e = ease0(k); g.f("uA", from + (to - from) * e); g.draw(); if (k >= 1){ tick.remove(fr); then(); } }; tick.add(fr); }
      var fr = null;
      return turnTex(fig).then(function(tex){
        var dep = depthOf(tex, true, 96); g.tex(0, "uImg", tex); g.tex(1, "uDep", dep);
        g.f("uA", 0); g.draw(); D.body.appendChild(cv); fig.classList.add("fxturning");
        run(0, sgn * 1.45, T * .45, function(k){ return k * k * (3 - 2 * k) * k; }, function(){
          doRender();
          var nf = D.getElementById("bodyfig"); if (!nf){ finish(); return; }
          nf.classList.add("fxturning");
          var ni = nf.querySelector("#bodyimg"), ready = ni && !ni.complete ? new Promise(function(res){ ni.addEventListener("load", res, {once:true}); ni.addEventListener("error", res, {once:true}); }) : Promise.resolve();
          within(900, ready.then(function(){ return turnTex(nf); })).then(function(t2){
            g.tex(0, "uImg", t2); g.tex(1, "uDep", depthOf(t2, true, 96));
            run(-sgn * 1.45, 0, T * .55, function(k){ var u = 1 - k; return 1 - u * u * u; }, finish);
          }, finish);
        });
      }, function(){ cv.remove(); g.kill(); var n = D.getElementById("bodyfig"); if (n) n.classList.remove("fxturning"); doRender(); }) && true;
    } catch(e){ return false; }
  };

  function heroAfter(){ liveAfter(); r2After(); foilWatch();
    var fs = D.getElementById("fnspot"); foilMO.disconnect(); if (fs) foilMO.observe(fs, {attributes:true, childList:true, subtree:true, attributeFilter:["class", "hidden"]}); }

  /* ================= The rest of the approved list ================= */
  function px2(v){ return (+v).toFixed(2); }
  function fxLater(fn, ms){ setTimeout(fn, ms); }

  /* G3: panel depth */
  var TILT = {el:null};
  D.addEventListener("pointermove", function(ev){
    if (ev.pointerType === "touch" || reduce || !P("tilt.on") || CTX.editing) return;
    var b = ev.target.closest && ev.target.closest(".box:not(.rside):not(.glite):not(.pcard):not(.lo-con)");
    if (b && !b.closest(".dossier, .adv, main.rep, .advance, .cf, main.posse")) b = null;
    if (TILT.el && TILT.el !== b){ var o = TILT.el; o.classList.add("fxtilt-out"); o.style.setProperty("--ttx", "0deg"); o.style.setProperty("--tty", "0deg"); o.style.setProperty("--tsh", 0); setTimeout(function(){ if (TILT.el !== o) o.classList.remove("fxtilt", "fxtilt-out"); }, 500); }
    TILT.el = b; if (!b) return;
    var r = b.getBoundingClientRect(), k = P("tilt.deg") * Math.min(1, 380 / Math.max(r.height, r.width * .6)), nx = (ev.clientX - r.left) / r.width - .5, ny = (ev.clientY - r.top) / r.height - .5;
    b.classList.remove("fxtilt-out"); b.classList.add("fxtilt");
    b.style.setProperty("--ttx", px2(nx * k * 2) + "deg"); b.style.setProperty("--tty", px2(-ny * k * 2) + "deg"); b.style.setProperty("--tsh", px2(2 + ny * 4));
  }, {passive:true});

  /* G6: persona re-key */
  FX.rekey = function(fn, btn){
    var vt = null;
    if (!reduce && P("rekey.on") && D.startViewTransition && !CTX.editing){
      var r = btn && btn.getBoundingClientRect ? btn.getBoundingClientRect() : {left:W.innerWidth / 2, top:60, width:0, height:0};
      root.style.setProperty("--rkx", (r.left + r.width / 2) + "px"); root.style.setProperty("--rky", (r.top + r.height / 2) + "px"); root.style.setProperty("--rk-t", Math.max(.3, P("rekey.t")) + "s");
      root.classList.add("fx-rekey");
      try { vt = D.startViewTransition(function(){ fn();
        var ring = D.createElement("i"); ring.className = "fxrk-ring"; ring.setAttribute("aria-hidden", "true");
        ring.style.setProperty("--rkc", D.body.classList.contains("zolo") ? "#e3eaee" : "#f0cf8e"); D.body.appendChild(ring); setTimeout(function(){ ring.remove(); }, 1600);
      }); } catch(e){ vt = null; }
    }
    function after(){ root.classList.remove("fx-rekey");
      if (reduce) return;
      [].forEach.call(D.querySelectorAll("header.top .id h1, header.top .id small, header.top .id .chip"), function(el, i){ var t = lastText(el) || (el.firstElementChild && lastText(el.firstElementChild)); if (t) scramble(t, 520, 60 + i * 120); }); }
    if (vt){ vt.finished.then(after, after); } else { root.classList.remove("fx-rekey"); fn(); after(); }
  };

  /* D6 is CSS only. D3 plates take the key light. */
  function platesAfter(){ D.body.classList.toggle("fx-plates", !!P("plate.on")); D.body.classList.toggle("fx-weap", !!P("weap.on"));
    if (P("plate.on")) [].forEach.call(D.querySelectorAll(".dossier .stat"), function(s){ s.setAttribute("data-lit", ""); }); }

  /* D7: when the Dossier load-in's scan lines leave, it signs off */
  var SYNC = {armed:false};
  new MutationObserver(function(ms){
    if (!SYNC.armed) return;
    for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].removedNodes.length; j++){ var n = ms[i].removedNodes[j];
      if (n.nodeType === 1 && n.classList.contains("hzscan") && !D.querySelector(".hzscan")){ SYNC.armed = false; syncDone(); return; } }
  }).observe(D.documentElement, {childList:true, subtree:true});
  function syncDone(){
    if (reduce || !P("sync.on") || CTX.tab !== "dossier" || CTX.who === "zolo") return;
    var tr = D.querySelector(".tabrow"); if (!tr) return; var r = tr.getBoundingClientRect();
    var s = D.createElement("i"); s.className = "fxsync"; s.setAttribute("aria-hidden", "true"); s.innerHTML = "<b>SYNC COMPLETE</b>";
    s.style.left = (r.left + W.scrollX) + "px"; s.style.width = r.width + "px"; s.style.top = (r.bottom + W.scrollY + 2) + "px"; D.body.appendChild(s); setTimeout(function(){ s.remove(); }, 1800);
    [].forEach.call(D.querySelectorAll("header.top .m > span"), function(sp, i){ var t = lastText(sp.querySelector(".dec") || sp); if (t) scramble(t, 380, 180 + i * 90); });
    var gold = D.querySelector(".iopw .iogold"); if (gold){ gold.classList.remove("fxsheen"); void gold.offsetWidth; gold.classList.add("fxsheen"); setTimeout(function(){ gold.classList.remove("fxsheen"); }, 1300); }
  }

  /* W3: film callouts beside the Ware figure. Each item's line ends where Oak placed it by hand;
     an item not placed yet points at its zone's anchor (and shows a hollow dot to the admin). */
  var CALL = {place:false, sel:"", drag:null};
  function callAfter(){
    [].forEach.call(D.querySelectorAll(".fxcall, .fxcallbar"), function(n){ n.remove(); }); D.body.classList.remove("fx-placing");
    var fig = D.getElementById("bodyfig"), panel = D.getElementById("zpanel"), F = CTX.fig;
    if (!fig || !panel || !F || !F.anch || CTX.tab !== "ware" || CTX.editing || !P("call.on") || W.innerWidth < 1180 || D.querySelector(".chrome2.ring")){ CALL.place = false; return; }
    var stage = fig.closest(".stage"); if (!stage) return;
    if (CTX.admin) callBar(stage);
    var regs = String(fig.dataset.sel || "").split(/\s+/).filter(Boolean); if (!regs.length) return;
    var rows = [].slice.call(panel.querySelectorAll(".ctree li.d0 > .nrow, .ctree li.d1 > .nrow")).slice(0, 14); if (!rows.length) return;
    var sr = stage.getBoundingClientRect(), fr = fig.getBoundingClientRect(), pts = callPts(), face = (CTX.who || "io") + "|" + (F.back ? "b" : "f") + "|";
    var a = F.anch[regs[0] === "legs" ? "legs" : regs[0]] || F.anch.torso; if (!a) return;
    function toStage(p){ return [fr.left - sr.left + fr.width * p[0] / 100, fr.top - sr.top + fr.height * p[1] / 100]; }
    var items = rows.map(function(rw){ var nm = ((rw.querySelector(".wn") || {}).textContent || "").trim(), key = face + nm, p = pts[key]; return {rw:rw, nm:nm, key:key, placed:!!p, pt:toStage(p || a)}; });
    if (items.some(function(it){ return it.placed; })) items.sort(function(p, q){ return p.pt[1] - q.pt[1]; });
    var avg = items.reduce(function(s, it){ return s + it.pt[1]; }, 0) / items.length;
    var lx = Math.max(-sr.left + 236, fr.left - sr.left - 230), x1 = lx + 186, top0 = Math.max(46, Math.min(sr.height - items.length * 28 - 50, avg - items.length * 14)), wrap = D.createElement("div");
    wrap.className = "fxcall" + (CALL.place ? " fxplace" : ""); wrap.setAttribute("aria-hidden", "true");
    var paths = "", dots = "", labels = "";
    items.forEach(function(it, i){
      var tg = it.rw.querySelector(".t-fab, .t-upg"), y = top0 + i * 28, px = it.pt[0], py = it.pt[1];
      var d = "M" + x1 + " " + (y + 9) + " L" + (x1 + 18) + " " + (y + 9) + " L" + px + " " + py;
      var on = CALL.place && CALL.sel === it.key;
      paths += '<path pathLength="1" d="' + d + '" style="--ci:' + i + '"' + (on ? ' class="on"' : '') + '/>';
      if (it.placed || CALL.place) dots += '<circle data-ci="' + i + '" cx="' + px + '" cy="' + py + '" r="' + (CALL.place ? 5 : 3) + '"' + (it.placed ? '' : ' class="un"') + (on ? ' data-on=""' : '') + '/>';
      labels += '<span class="fxcl' + (on ? ' on' : '') + (CALL.place && !it.placed ? ' un' : '') + '" data-ci="' + i + '" style="left:' + x1 + 'px;top:' + y + 'px;--ci:' + i + '" title="' + esc(it.nm) + '">' + esc(it.nm) + (tg ? '<em>' + esc(tg.textContent) + '</em>' : '') + '</span>';
    });
    var hub = items.some(function(it){ return !it.placed; }) && !CALL.place ? '<circle cx="' + toStage(a)[0] + '" cy="' + toStage(a)[1] + '" r="3"/>' : "";
    wrap.innerHTML = '<svg width="' + sr.width + '" height="' + sr.height + '">' + paths + dots + hub + '</svg>' + labels;
    stage.appendChild(wrap);
    wrap.addEventListener("click", function(ev){ var l = ev.target.closest(".fxcl"); if (!l) return; var it = items[+l.dataset.ci]; if (!it) return;
      if (CALL.place){ CALL.sel = CALL.sel === it.key ? "" : it.key; callAfter(); return; }
      it.rw.scrollIntoView({block:"nearest", behavior:reduce ? "auto" : "smooth"}); it.rw.click(); });
    if (!CALL.place) return;
    D.body.classList.toggle("fx-placing", !!CALL.sel);
    /* drag a dot to move it */
    wrap.addEventListener("pointerdown", function(ev){ var c = ev.target.closest && ev.target.closest("circle[data-ci]"); if (!c) return; ev.preventDefault(); ev.stopPropagation();
      var it = items[+c.dataset.ci]; CALL.sel = it.key; CALL.drag = {it:it, c:c}; c.setPointerCapture && c.setPointerCapture(ev.pointerId); });
    wrap.addEventListener("pointermove", function(ev){ var g = CALL.drag; if (!g) return; g.c.setAttribute("cx", ev.clientX - sr.left); g.c.setAttribute("cy", ev.clientY - sr.top); });
    wrap.addEventListener("pointerup", function(ev){ var g = CALL.drag; if (!g) return; CALL.drag = null; var r = fig.getBoundingClientRect();
      setPt(g.it.key, [+((ev.clientX - r.left) / r.width * 100).toFixed(2), +((ev.clientY - r.top) / r.height * 100).toFixed(2)]); callAfter(); });
  }
  /* admin bar: Place callouts / Save for everyone / Done */
  function callBar(stage){
    var bar = D.createElement("div"); bar.className = "fxcallbar" + (CALL.place ? " on" : "");
    if (!CALL.place){ bar.innerHTML = '<button type="button" data-cb="go">Place callouts</button>'; }
    else {
      var nm = CALL.sel ? CALL.sel.split("|").slice(2).join("|") : "";
      bar.innerHTML = '<span>' + (nm ? 'Click on the body where <b>' + esc(nm) + '</b> is. Drag any dot to adjust.' : 'Pick a label on the left, then click on the body where that item is. Hollow dots are not placed yet.') + '</span>' +
        (nm ? '<button type="button" data-cb="clear">Unplace</button>' : '') + '<button type="button" data-cb="save">Save for everyone</button><button type="button" data-cb="done">Done</button>';
    }
    stage.appendChild(bar);
    bar.addEventListener("click", function(ev){ var a = ev.target.getAttribute && ev.target.getAttribute("data-cb"); if (!a) return;
      if (a === "go"){ CALL.place = true; CALL.sel = ""; }
      if (a === "done"){ CALL.place = false; CALL.sel = ""; }
      if (a === "clear" && CALL.sel){ var b = local["call.pts"] || {}, s = shared["call.pts"]; delete b[CALL.sel]; if (s && CALL.sel in s){ b[CALL.sel] = null; } local["call.pts"] = b; try { localStorage.setItem("io-fx", JSON.stringify(local)); } catch(e){} }
      if (a === "save" && CTX.save){ var v = values(); v["call.pts"] = cleanPts(v["call.pts"]); shared = v; local = {}; try { localStorage.removeItem("io-fx"); } catch(e){}
        ev.target.textContent = "Saving…"; Promise.resolve(CTX.save(v)).then(function(ok){ ev.target.textContent = ok === false ? "Couldn't save" : "Saved"; }, function(){ ev.target.textContent = "Couldn't save"; }); return; }
      callAfter(); });
  }
  function cleanPts(o){ var r = {}; for (var k in o || {}) if (o[k] && o[k].length === 2) r[k] = o[k]; return r; }
  /* in place mode a click on the figure sets the selected item's point (and doesn't select a zone) */
  D.addEventListener("click", function(ev){
    if (!CALL.place || !CALL.sel || CTX.tab !== "ware") return;
    var fig = D.getElementById("bodyfig"); if (!fig || !fig.contains(ev.target)) return;
    ev.preventDefault(); ev.stopPropagation();
    var r = fig.getBoundingClientRect(); setPt(CALL.sel, [+((ev.clientX - r.left) / r.width * 100).toFixed(2), +((ev.clientY - r.top) / r.height * 100).toFixed(2)]);
    /* move on to the next label that has no point yet */
    var labs = [].slice.call(D.querySelectorAll(".fxcall .fxcl")), pts = callPts(), face = CALL.sel.split("|").slice(0, 2).join("|") + "|", next = "";
    labs.forEach(function(l){ var k = face + (l.getAttribute("title") || ""); if (!next && !pts[k]) next = k; });
    CALL.sel = next; callAfter();
  }, true);
  function esc(t){ return String(t).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

  /* W4: pulses run up the nerves on the Nerves layer */
  function nerveAfter(){
    [].forEach.call(D.querySelectorAll(".xr > .fxnv"), function(n){ n.remove(); });
    var fig = D.getElementById("bodyfig"); if (!fig || !P("nerve.on") || CTX.editing) return;
    if (!/nerve/i.test(fig.style.getPropertyValue("--sk"))) return;
    [].forEach.call(fig.querySelectorAll(".xr"), function(x){ var i = D.createElement("i"); i.className = "fxnv"; i.setAttribute("aria-hidden", "true"); x.appendChild(i); });
  }
  var nerveXl = FX.xl; FX.xl = function(fig, o, n, apply){ nerveXl(fig, o, n, function(){ apply(); setTimeout(nerveAfter, 0); }); };

  /* W6: hovering a fabricated or upgraded implant makes it glint on the body */
  D.addEventListener("mouseover", function(ev){
    if (CTX.tab !== "ware" || reduce || !P("glt.on")) return;
    var row = ev.target.closest && ev.target.closest(".nrow"); if (!row || row === RET.gl) return; RET.gl = row;
    if (!row.querySelector(".t-fab, .t-upg")) return;
    var fig = D.getElementById("bodyfig"), F = CTX.fig; if (!fig || !F || !F.anch) return;
    var hr = row.closest("[data-hr]"), regs = String(hr ? hr.dataset.hr : fig.dataset.sel || "").split(/\s+/).filter(Boolean);
    var an = row.closest("[data-an]"), keys = an && F.anch[an.dataset.an] ? [an.dataset.an] : regs; if (!keys.length) return;
    keys.slice(0, 2).forEach(function(k, i){ var a = F.anch[k === "legs" ? "legs" : k]; if (!a) return;
      var g = D.createElement("i"); g.className = "fxglt"; g.setAttribute("aria-hidden", "true"); g.style.left = a[0] + "%"; g.style.top = a[1] + "%"; g.style.animationDelay = i * 90 + "ms"; fig.appendChild(g); setTimeout(function(){ g.remove(); }, 1100); });
  });

  /* V2: schematic mode */
  var SCHF = [
    "precision mediump float;varying vec2 vUv;uniform sampler2D uImg;uniform vec2 uPx;uniform float uT;",
    "float L(vec2 p){vec4 c=texture2D(uImg,p);return dot(c.rgb,vec3(.3,.59,.11))*c.a+c.a*.6;}",
    "void main(){",
    "  float tl=L(vUv+vec2(-uPx.x,-uPx.y)),t=L(vUv+vec2(0.,-uPx.y)),tr=L(vUv+vec2(uPx.x,-uPx.y)),l=L(vUv+vec2(-uPx.x,0.)),r=L(vUv+vec2(uPx.x,0.)),bl=L(vUv+vec2(-uPx.x,uPx.y)),b=L(vUv+vec2(0.,uPx.y)),br=L(vUv+vec2(uPx.x,uPx.y));",
    "  float gx=-tl-2.*l-bl+tr+2.*r+br,gy=-tl-2.*t-tr+bl+2.*b+br,e=sqrt(gx*gx+gy*gy);",
    "  float a=texture2D(uImg,vUv).a;",
    "  float line=smoothstep(.12,.55,e);",
    "  float fill=a*.06;",
    "  float scan=.85+.15*sin(vUv.y*900.+uT*2.);",
    "  float sweep=exp(-pow((vUv.x-fract(uT*.12)*1.4+.2)*7.,2.))*a*.35;",
    "  vec3 col=vec3(.94,.78,.48)*(line*scan+fill)+vec3(1.,.95,.85)*sweep;",
    "  float al=clamp(line*.95+fill+sweep,0.,1.);",
    "  gl_FragColor=vec4(col*al,al);",
    "}"].join("\n");
  var SCH = {on:false, list:[]};
  try { SCH.on = localStorage.getItem("io-fx-sch") === "1"; } catch(e){}
  function schStop(){ tick.remove(schFrame); SCH.list.forEach(function(o){ o.g.kill(); o.cv.remove(); o.fig.classList.remove("fxsch-on"); }); SCH.list = []; }
  function schFrame(t){ SCH.list.forEach(function(o){ if (!o.fig.isConnected || o.g.lost) return; var r = o.fig.getBoundingClientRect(); if (r.width < 4) return;
    var dpr = Math.min(1.5, GL.dpr()), cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr); if (o.cv.width !== cw || o.cv.height !== ch){ o.cv.width = cw; o.cv.height = ch; }
    o.g.f("uPx", 1.2 / cw, 1.2 / ch); o.g.f("uT", t / 1000); o.g.draw(); if (!o.fig.classList.contains("fxsch-on")) o.fig.classList.add("fxsch-on"); }); }
  function schAfter(){
    schStop(); var st = D.querySelector(".vstage"); [].forEach.call(D.querySelectorAll(".fxschbtn, .fxtb"), function(n){ n.remove(); });
    if (!st || CTX.tab !== "vehicles" || CTX.editing || !P("sch.on") || !GL.test()){ if (st) st.classList.remove("fxsch-st"); return; }
    var foot = st.querySelector(".vfoot"); if (foot){ var b = D.createElement("button"); b.type = "button"; b.className = "fxschbtn"; b.textContent = "Schematic"; b.setAttribute("aria-pressed", String(SCH.on)); foot.appendChild(b);
      b.addEventListener("click", function(){ SCH.on = !SCH.on; try { localStorage.setItem("io-fx-sch", SCH.on ? "1" : "0"); } catch(e){} schAfter(); }); }
    st.classList.toggle("fxsch-st", SCH.on); if (!SCH.on) return;
    var title = (st.querySelector(".vtitle h2") || {}).textContent || "", kind = (st.querySelector(".vtitle .lab") || {}).textContent || "", mods = D.querySelectorAll("main.garage .vm").length;
    var tb = D.createElement("div"); tb.className = "fxtb"; tb.setAttribute("aria-hidden", "true"); tb.innerHTML = "<b>" + esc(title) + "</b>" + esc(kind) + " · schematic<br>" + mods + " modifications · rev 2048"; st.appendChild(tb);
    [].forEach.call(st.querySelectorAll(".vfig"), function(fg){ var img = fg.querySelector("img.vcut"); if (!img) return;
      loadImg(img.getAttribute("src")).then(function(im){ if (!fg.isConnected || !SCH.on) return;
        var cv = D.createElement("canvas"); cv.className = "fxsch"; cv.setAttribute("aria-hidden", "true"); var g = GL.make(cv, SCHF); if (!g) return;
        g.tex(0, "uImg", im); var cs = getComputedStyle(fg); if (cs.position === "static") fg.style.position = "relative"; fg.appendChild(cv);
        SCH.list.push({fig:fg, cv:cv, g:g}); tick.add(schFrame); }, function(){}); });
  }

  function restAfter(enter){
    D.body.classList.toggle("fx-scroll", !!P("scroll.on"));
    platesAfter(); callAfter(); nerveAfter(); schAfter();
    if (enter && CTX.tab === "dossier" && CTX.who !== "zolo" && D.querySelector(".hzscan")) SYNC.armed = true;
  }


  /* ================= Nov 18 pick: X1 title screen ================= */

  /* ---- X1: title screen on first open ---- */
  var TT = {el:null};
  function titleSkip(){ try { return localStorage.getItem("io-title") === "skip" || sessionStorage.getItem("io-title") === "seen"; } catch(e){ return false; } }
  function titleShow(force){
    if (TT.el || CTX.editing || CTX.who === "zolo" || !CTX.id) return;
    if (!force && (!P("title.on") || titleSkip())) return;
    var id = CTX.id, roles = (id.roles || []).filter(function(r){ return r && r.role; }).slice(0, 4);
    var el = D.createElement("div"); el.className = "fxtitle"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Title screen");
    var go = CTX.tab === "dossier" ? "Access dossier" : "Continue";
    el.innerHTML = '<div class="tt-planet" aria-hidden="true"></div><div class="tt-art" aria-hidden="true"><img src="img/io-fist.webp" alt=""></div><i class="tt-scan" aria-hidden="true"></i>' +
      '<div class="tt-copy">' +
        '<p class="tt-up">UPLINK ▸ ' + esc(String(id.origin || "O'Neill Two").split("·").pop().trim().toUpperCase()) + ' // L5 → NIGHT CITY</p>' +
        '<p class="tt-name">' + esc(id.name || "") + '</p>' +
        '<h1 class="tt-h">' + esc(id.handle || "Iō") + '</h1>' +
        '<p class="tt-org">' + esc(id.origin || "") + '</p>' +
        '<div class="tt-stats">' + roles.map(function(r, i){ return '<div style="--i:' + i + '"><span>' + esc(r.role) + '</span><b>' + esc(r.rank == null ? "" : r.rank) + '</b></div>'; }).join("") +
          (id.rep != null && id.rep !== "" ? '<i></i><div class="rep" style="--i:' + roles.length + '"><span>Reputation</span><b>' + esc(id.rep) + '</b></div>' : '') + '</div>' +
        '<div class="tt-go"><button type="button" class="tt-in" data-tt="in">' + go + ' <span aria-hidden="true">▸</span></button>' +
          (D.querySelector('[data-who="zolo"]') ? '<button type="button" class="tt-z" data-tt="zolo">Zolo</button>' : '') + '</div>' +
        '<label class="tt-skip"><input type="checkbox" data-tt="skip"> Skip this screen next time</label>' +
        '<p class="tt-key">Press any key to continue</p>' +
      '</div>' +
      '<div class="tt-foot" aria-hidden="true"><span>' + (id.sin ? "SIN " + esc(id.sin) : "") + '</span><span>Red Star Collective</span><span class="tt-sync">Sync <b>0</b>%</span></div>';
    D.body.appendChild(el); TT.el = el; root.classList.add("fx-titled");
    try { sessionStorage.setItem("io-title", "seen"); } catch(e){}
    var b = el.querySelector(".tt-in"); setTimeout(function(){ if (b && TT.el) b.focus({preventScroll:true}); }, 60);
    /* entrance: name decodes, sync counts up */
    if (!reduce){ var h = el.querySelector(".tt-h"); if (h && h.firstChild) scramble(h.firstChild, 900, 380); var nm = el.querySelector(".tt-name"); if (nm && nm.firstChild) scramble(nm.firstChild, 600, 200); }
    var sy = el.querySelector(".tt-sync b"), t0 = performance.now(), dur = reduce ? 1 : 1600;
    (function up(){ if (!TT.el) return; var k = Math.min(1, (performance.now() - t0) / dur); sy.textContent = Math.round(100 * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(up); })();
    el.addEventListener("click", function(ev){ var a = ev.target.closest && ev.target.closest("[data-tt]"); a = a && a.getAttribute("data-tt");
      if (a === "skip"){ try { if (ev.target.checked) localStorage.setItem("io-title", "skip"); else localStorage.removeItem("io-title"); } catch(e){} return; }
      if (a === "in") titleGo();
      if (a === "zolo") titleGo(function(){ var z = D.querySelector('[data-who="zolo"]'); if (z) z.click(); }); });
    el.addEventListener("keydown", function(ev){ if (ev.key === "Tab"){ var f = [].slice.call(el.querySelectorAll("button, input")); var i = f.indexOf(D.activeElement); if (ev.shiftKey && i <= 0){ ev.preventDefault(); f[f.length - 1].focus(); } else if (!ev.shiftKey && i === f.length - 1){ ev.preventDefault(); f[0].focus(); } } });
    D.addEventListener("keydown", titleKey, true);
  }
  function titleKey(ev){
    if (!TT.el) return D.removeEventListener("keydown", titleKey, true);
    if (ev.key === "Tab" || ev.key === "Shift" || (ev.target.closest && ev.target.closest(".tt-skip")) || (ev.target.closest && ev.target.closest(".fxtitle button") && (ev.key === "Enter" || ev.key === " "))) return;
    ev.preventDefault(); titleGo();
  }
  function titleGo(then){
    var el = TT.el; if (!el || el.classList.contains("out")) return;
    D.removeEventListener("keydown", titleKey, true);
    el.classList.add("out"); root.classList.remove("fx-titled");
    setTimeout(function(){ el.remove(); TT.el = null; if (then) then(); }, reduce ? 0 : 760);
  }
  FX.title = function(){ titleShow(true); };


  /* ================= the app's hook ================= */
  FX.rendered = function(ctx){
    CTX = ctx || {};
    if (CTX.fx && typeof CTX.fx === "object") shared = CTX.fx;
    cssVars(); panelSync(); gradeSync(); skySync(); idAfter();
    wareAfter(); armAfter(); lightScan(); clothWipe(); ambAfter(); moments(); heroAfter();
    if (!FX._tt && CTX.id && CTX.id.handle){ FX._tt = 1; titleShow(false); }
    if (!FX._first){ FX._first = 1; setTimeout(streak, 500); }
  };
  cssVars();
})();
