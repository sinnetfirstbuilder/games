// Birthday detective game. All texts and answers come from content.js (window.CONTENT).
(function () {
  'use strict';

  var C = window.CONTENT;
  var STAGE_W = 1600, STAGE_H = 900;
  var STORE_KEY = 'mashaDetective_v1';

  var stage = document.getElementById('stage');
  var sceneEl = document.getElementById('scene');
  var modalEl = document.getElementById('modal');
  var overlayRoot = document.getElementById('overlay-root');
  var fullRoot = document.getElementById('full-root');
  var textEl = document.getElementById('text');
  var invEl = document.getElementById('inventory');

  var scale = 1;
  var params = new URLSearchParams(location.search);
  var DEBUG = params.has('debug');

  // ---------- small helpers ----------

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(s, map) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return map[k] != null ? map[k] : m; });
  }
  function div(cls, html) {
    var e = document.createElement('div');
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  // Deterministic random, so torn edges look the same every time.
  function seeded(seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }
  // Restart a CSS animation class.
  function replayClass(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
  // Total on-screen scale of an element (stage scale times any inner CSS scale).
  function scaleOf(el) {
    return el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : scale;
  }
  // Client (screen) coordinates -> coordinates inside an unrotated element.
  function toLocal(e, el) {
    var r = el.getBoundingClientRect(), s = scaleOf(el);
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  }

  // ---------- stage scaling (letterboxed) ----------

  function fitStage() {
    var w = window.innerWidth, h = window.innerHeight;
    scale = Math.min(w / STAGE_W, h / STAGE_H);
    var x = (w - STAGE_W * scale) / 2, y = (h - STAGE_H * scale) / 2;
    stage.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
  }
  window.addEventListener('resize', fitStage);
  // The stage must never scroll (focusing an input can try to).
  stage.addEventListener('scroll', function () { stage.scrollLeft = 0; stage.scrollTop = 0; });
  fitStage();

  // ---------- progress ----------

  function loadProgress() {
    try {
      var p = JSON.parse(localStorage.getItem(STORE_KEY));
      if (p && p.solved) return p;
    } catch (e) { /* storage unavailable */ }
    return { solved: {}, unlocked: false };
  }
  function saveProgress() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
  }

  if (params.has('reset')) {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  }
  var progress = loadProgress();
  if (params.has('solve')) {
    var list = params.get('solve') === 'all' ? '1,2,3,4,5,6,7' : params.get('solve');
    list.split(',').forEach(function (n) {
      n = parseInt(n, 10);
      if (n >= 1 && n <= 7) progress.solved[n] = true;
    });
    saveProgress();
  }
  function isSolved(n) { return !!progress.solved[n]; }

  // ---------- text box and dialog ----------

  // Writes a line into the black text box at the bottom, typewriter style.
  var typeTimer = null, typeFull = '';
  function say(text) {
    clearInterval(typeTimer);
    typeFull = String(text || '');
    var i = 0;
    textEl.textContent = '';
    typeTimer = setInterval(function () {
      i += 2;
      textEl.textContent = typeFull.slice(0, i);
      if (i >= typeFull.length) clearInterval(typeTimer);
    }, 18);
  }
  var toast = say;
  document.getElementById('textbox').addEventListener('click', function () {
    clearInterval(typeTimer);
    textEl.textContent = typeFull;
  });

  function dialog(opts) {
    var wrap = div('dialog-wrap');
    var html = '<div class="dialog paper">';
    if (opts.title) html += '<h3>' + esc(opts.title) + '</h3>';
    if (opts.photo) html += '<img class="dialog-photo" src="' + esc(opts.photo) + '" alt="">';
    if (opts.text) html += '<p>' + esc(opts.text) + '</p>';
    html += '<button class="btn">' + esc(C.ui.ok) + '</button></div>';
    wrap.innerHTML = html;
    function close() { wrap.remove(); if (opts.onClose) opts.onClose(); }
    wrap.querySelector('.btn').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    overlayRoot.appendChild(wrap);
  }

  // ---------- reusable drag-and-snap component ----------
  // pieces: [{ el, x, y }] where x/y is the correct left/top in the parent (px).
  // Pieces without x/y drag freely and never snap.
  var dragZ = 10;
  function makeDragSnap(opts) {
    var tol = opts.tolerance || 30;
    var remaining = 0;
    opts.pieces.forEach(function (p) {
      if (p.x != null) remaining++;
      p.el.addEventListener('pointerdown', function (e) {
        if (p.locked || e.button !== 0) return;
        e.preventDefault();
        var sx = e.clientX, sy = e.clientY;
        var ox = parseFloat(p.el.style.left) || 0, oy = parseFloat(p.el.style.top) || 0;
        var k = scaleOf(p.el.parentNode);
        p.el.style.zIndex = ++dragZ;
        p.el.classList.add('dragging');
        function move(ev) {
          p.el.style.left = ox + (ev.clientX - sx) / k + 'px';
          p.el.style.top = oy + (ev.clientY - sy) / k + 'px';
        }
        function up() {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
          document.removeEventListener('pointercancel', up);
          p.el.classList.remove('dragging');
          if (p.x == null) return;
          var cx = parseFloat(p.el.style.left), cy = parseFloat(p.el.style.top);
          if (Math.hypot(cx - p.x, cy - p.y) <= tol) {
            snap(p);
            if (opts.onSnap) opts.onSnap(p);
            if (remaining === 0 && opts.onComplete) opts.onComplete();
          }
        }
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
      });
    });
    function snap(p) {
      p.locked = true;
      remaining--;
      p.el.style.left = p.x + 'px';
      p.el.style.top = p.y + 'px';
      p.el.style.setProperty('--rot', '0deg');
      p.el.classList.add('snapped');
    }
    return {
      snapAll: function () {
        opts.pieces.forEach(function (p) { if (p.x != null && !p.locked) snap(p); });
      }
    };
  }

  // ---------- shared drawings ----------

  // X-ray film with 4 teeth. kind: healthy, cavity, braces, wisdom, filling, cracked.
  function toothPath(ox) {
    return 'M' + (ox + 2) + ' 60 Q' + (ox + 2) + ' 38 ' + (ox + 17) + ' 38 Q' + (ox + 32) + ' 38 ' + (ox + 32) + ' 60 ' +
      'L' + (ox + 31) + ' 95 Q' + (ox + 30) + ' 105 ' + (ox + 26) + ' 108 L' + (ox + 24) + ' 168 Q' + (ox + 22) + ' 178 ' + (ox + 19) + ' 168 ' +
      'L' + (ox + 17) + ' 120 L' + (ox + 15) + ' 168 Q' + (ox + 12) + ' 178 ' + (ox + 10) + ' 168 L' + (ox + 8) + ' 108 ' +
      'Q' + (ox + 4) + ' 105 ' + (ox + 3) + ' 95 Z';
  }
  function filmSVG(kind) {
    var xs = [14, 50, 86, 122];
    var teeth = '';
    xs.forEach(function (ox, i) {
      if (kind === 'wisdom' && i === 3) {
        teeth += '<g transform="rotate(38 139 110) translate(4 26)"><path d="' + toothPath(ox) + '" class="tooth"/></g>';
      } else {
        teeth += '<path d="' + toothPath(ox) + '" class="tooth"/>';
      }
    });
    var extra = '';
    if (kind === 'cavity') extra = '<ellipse cx="66" cy="54" rx="7" ry="5" fill="#08131a"/><ellipse cx="64" cy="52" rx="3" ry="2" fill="#000"/>';
    if (kind === 'braces') {
      extra = '<line x1="10" y1="68" x2="160" y2="68" stroke="#f4fbff" stroke-width="2"/>';
      xs.forEach(function (ox) { extra += '<rect x="' + (ox + 11) + '" y="62" width="12" height="11" rx="2" fill="#ffffff"/>'; });
    }
    if (kind === 'filling') extra = '<path d="M95 50 Q103 44 111 50 Q114 58 108 64 Q100 68 95 62 Z" fill="#ffffff"/>';
    if (kind === 'cracked') extra = '<polyline points="67,38 62,56 70,72 61,92 68,112 63,140" fill="none" stroke="#050b10" stroke-width="3.2" stroke-linejoin="bevel"/>';
    return '<svg class="film-svg" viewBox="0 0 170 200" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><radialGradient id="fg-' + kind + '" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#20404f"/><stop offset="1" stop-color="#03080c"/></radialGradient>' +
      '<filter id="glow-' + kind + '"><feGaussianBlur stdDeviation="0.8"/></filter></defs>' +
      '<rect width="170" height="200" rx="8" fill="url(#fg-' + kind + ')"/>' +
      '<g filter="url(#glow-' + kind + ')">' + teeth + '</g>' + extra + '</svg>';
  }

  // Georgia map projection: equirectangular, standard parallel 42.3°N.
  // Equirectangular projection of a lon/lat box onto a map of the given width.
  // The standard parallel is the middle of the box, so shapes look right.
  var GEORGIA_BOX = { west: 39.8, east: 46.9, south: 40.95, north: 43.7 };
  function geoSize(width, box) {
    box = box || GEORGIA_BOX;
    var cos = Math.cos((box.south + box.north) / 2 * Math.PI / 180);
    var k = width / ((box.east - box.west) * cos);
    return { k: k, w: width, h: (box.north - box.south) * k, cos: cos, box: box };
  }
  function project(lon, lat, size) {
    return [(lon - size.box.west) * size.cos * size.k, (size.box.north - lat) * size.k];
  }
  function unproject(x, y, size) {
    return [x / (size.cos * size.k) + size.box.west, size.box.north - y / size.k];
  }
  function outlinePath(size) {
    return window.GEORGIA_OUTLINE.map(function (p, i) {
      var q = project(p[0], p[1], size);
      return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1);
    }).join('') + 'Z';
  }

  // Large ornamental "r" used across the Georgia photo grid.
  // Built from strokes that reach every column of both rows: stem and top serif
  // on the left, the arm across the top, a flourish across the bottom.
  function letterRPaths(x0, y0, w, h) {
    function P(u, v) { return (x0 + u * w).toFixed(1) + ' ' + (y0 + v * h).toFixed(1); }
    return {
      d: 'M' + P(0.04, 0.13) + ' L' + P(0.19, 0.07) +
         ' M' + P(0.19, 0.07) + ' L' + P(0.19, 0.84) +
         ' M' + P(0.19, 0.36) + ' C' + P(0.30, 0.06) + ' ' + P(0.60, 0.02) + ' ' + P(0.80, 0.08) +
         ' C' + P(0.88, 0.11) + ' ' + P(0.93, 0.16) + ' ' + P(0.95, 0.24) +
         ' M' + P(0.03, 0.93) + ' C' + P(0.18, 0.80) + ' ' + P(0.30, 0.80) + ' ' + P(0.42, 0.87) +
         ' C' + P(0.60, 0.97) + ' ' + P(0.82, 0.96) + ' ' + P(0.97, 0.80),
      ball: { cx: x0 + 0.95 * w, cy: y0 + 0.27 * h }
    };
  }

  // ---------- scene ----------

  var CORK_BG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.2 0 0 0 0 0.08 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")";
  var WOOD_BG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='200'%3E%3Cfilter id='w'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.004 0.09' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.15 0 0 0 0 0.07 0 0 0 0 0.02 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='600' height='200' filter='url(%23w)'/%3E%3C/svg%3E\")";

  function pin(color) {
    return '<span class="pin" style="--pin:' + (color || '#d22') + '"></span>';
  }

  function sceneItemArt(n) {
    var d = C.items[n];
    switch (n) {
      case 1:
        return '<svg viewBox="0 0 270 190" class="art"><path d="M8 22 L90 22 L104 8 L262 8 L262 182 L8 182 Z" fill="#b98a3e"/>' +
          '<path d="M4 40 L266 32 L262 186 L8 188 Z" fill="#e0b867"/><path d="M4 40 L266 32" stroke="#c99d4c" stroke-width="2"/></svg>' +
          '<div class="folder-label">' + esc(d.sceneLabel) + '</div>';
      case 2:
        return '<div class="mini-book"><div class="mini-book-title">' + esc(d.sceneLabel) + '</div>' +
          '<svg viewBox="0 0 60 60" class="mini-flower">' + flowerSVGInner() + '</svg></div>';
      case 3:
        return pin('#2a7de1') + '<div class="mini-ticket"><div class="mt-a">' + esc(C.items[3].artist) + '</div><div class="mt-b">' + esc(C.items[3].show) + '</div></div>';
      case 4:
        var films = '';
        C.items[4].films.forEach(function (f, i) {
          films += '<div class="mini-film">' + pin(i % 2 ? '#e8b923' : '#d22') + filmSVG(f.id) + '</div>';
        });
        return '<div class="mini-films">' + films + '</div>';
      case 5:
        return '<div class="frame"><img src="' + esc(d.photo) + '" alt=""></div>' +
          '<svg class="magnifier" viewBox="0 0 120 120"><circle cx="45" cy="45" r="32" fill="rgba(200,230,255,0.35)" stroke="#2b2b2b" stroke-width="9"/>' +
          '<line x1="70" y1="70" x2="112" y2="112" stroke="#5a3a1a" stroke-width="13" stroke-linecap="round"/></svg>';
      case 6:
        var size = geoSize(300);
        var pts = C.items[6].stops.map(function (s) { return project(s.lon, s.lat, size).map(function (v) { return v.toFixed(1); }).join(','); });
        var pins = pts.map(function (p) { var q = p.split(','); return '<circle cx="' + q[0] + '" cy="' + (q[1] - 0 + 10) + '" r="4" fill="#d22" stroke="#600" stroke-width="1"/>'; }).join('');
        return pin('#2e9c4a') + '<div class="mini-map"><svg viewBox="0 0 300 ' + size.h.toFixed(0) + '" style="margin-top:10px"><g transform="translate(0 10)">' +
          '<path d="' + outlinePath(size) + '" fill="#efe2bf" stroke="#7a5a2e" stroke-width="1.5"/>' +
          '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#c0161e" stroke-width="1.5"/></g>' + pins + '</svg>' +
          '<div class="mini-map-title">' + esc(d.sceneLabel) + '</div></div>';
      case 7:
        return '<div class="mini-phone"><div class="mini-phone-screen"><svg viewBox="0 0 40 50" class="lock-ico"><rect x="6" y="20" width="28" height="24" rx="4" fill="#fff"/><path d="M12 20 V14 a8 8 0 0 1 16 0 V20" fill="none" stroke="#fff" stroke-width="4"/></svg></div></div>';
    }
    return '';
  }

  // Decorative fingerprint: concentric arcs.
  function fingerprintSVG() {
    var out = '';
    for (var i = 0; i < 9; i++) {
      var r = 8 + i * 6;
      out += '<path d="M' + (60 - r) + ' 75 a' + r + ' ' + (r * 1.25) + ' 0 0 1 ' + (2 * r) + ' 0' + '" fill="none" stroke="#3d4a5c" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="' + (i % 2 ? '40 4' : '60 6') + '"/>';
    }
    return out;
  }

  function flowerSVGInner() {
    var petals = '';
    for (var i = 0; i < 6; i++) {
      petals += '<ellipse cx="30" cy="16" rx="7" ry="13" fill="#f7a8c4" stroke="#c2507d" stroke-width="1" transform="rotate(' + (i * 60) + ' 30 28)"/>';
    }
    return petals + '<circle cx="30" cy="28" r="6" fill="#f6d04d"/>';
  }

  var DESK_SVG = (function () {
    var drawers = [[40, 522, 360, 52], [40, 582, 360, 52], [420, 522, 620, 40], [1060, 522, 360, 52], [1060, 582, 360, 52]];
    var out = '<svg class="desk-svg" viewBox="0 0 1460 640"><defs>' +
      '<linearGradient id="dTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e5034"/><stop offset="1" stop-color="#a7835a"/></linearGradient>' +
      '<linearGradient id="dFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4c30"/><stop offset="1" stop-color="#3a2817"/></linearGradient>' +
      '<linearGradient id="dDrawer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b6a46"/><stop offset="1" stop-color="#5e4429"/></linearGradient>' +
      '<filter id="dGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.003 0.07" numOctaves="3" seed="4"/>' +
      '<feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.11  0 0 0 0 0.04  0 0 0 0.55 0"/><feComposite operator="in" in2="SourceGraphic"/></filter>' +
      '</defs>' +
      '<polygon points="120,300 1340,300 1445,495 15,495" fill="url(#dTop)"/>' +
      '<polygon points="120,300 1340,300 1445,495 15,495" fill="#000" filter="url(#dGrain)"/>' +
      '<rect x="15" y="495" width="1430" height="16" fill="#4e3620"/><rect x="15" y="495" width="1430" height="3" fill="#d9b07a" opacity=".55"/>' +
      '<rect x="20" y="511" width="1420" height="129" fill="url(#dFront)"/>' +
      '<rect x="420" y="568" width="620" height="72" fill="#120b06"/>';
    drawers.forEach(function (r) {
      var cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
      out += '<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '" rx="3" fill="url(#dDrawer)" stroke="#33210f" stroke-width="2"/>' +
        '<rect x="' + (r[0] + 4) + '" y="' + (r[1] + 3) + '" width="' + (r[2] - 8) + '" height="2" fill="rgba(255,230,190,.25)"/>' +
        '<path d="M' + (cx - 28) + ' ' + (cy - 4) + ' Q' + cx + ' ' + (cy + 12) + ' ' + (cx + 28) + ' ' + (cy - 4) + '" fill="none" stroke="#d8b25a" stroke-width="5" stroke-linecap="round"/>' +
        '<circle cx="' + (cx - 28) + '" cy="' + (cy - 4) + '" r="5" fill="#a8812f"/><circle cx="' + (cx + 28) + '" cy="' + (cy - 4) + '" r="5" fill="#a8812f"/>';
    });
    return out + '</svg>';
  })();

  var LAMP_SVG =
    '<svg class="lamp" viewBox="0 0 260 360"><defs><linearGradient id="shadeG" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#4f9a64"/><stop offset="1" stop-color="#1c4a2b"/></linearGradient></defs>' +
    '<ellipse cx="88" cy="346" rx="66" ry="12" fill="rgba(0,0,0,.45)"/>' +
    '<ellipse cx="85" cy="336" rx="56" ry="14" fill="#173d25"/><ellipse cx="85" cy="330" rx="50" ry="11" fill="#2f6b42"/>' +
    '<line x1="85" y1="328" x2="58" y2="190" stroke="#2a2a2a" stroke-width="9" stroke-linecap="round"/>' +
    '<line x1="58" y1="190" x2="150" y2="100" stroke="#2a2a2a" stroke-width="8" stroke-linecap="round"/>' +
    '<circle cx="58" cy="190" r="8" fill="#555"/>' +
    '<g transform="rotate(32 160 104)"><path d="M132 78 L188 78 L216 142 L104 142 Z" fill="url(#shadeG)"/>' +
    '<path d="M140 82 L150 82 L132 138 L118 138 Z" fill="rgba(255,255,255,.18)"/>' +
    '<ellipse cx="160" cy="142" rx="56" ry="10" fill="#fff4c4"/></g></svg>';

  function buildScene() {
    stage.style.setProperty('--cork', CORK_BG);
    stage.style.setProperty('--wood', WOOD_BG);
    var html = '<div class="wall"></div>' +
      '<div class="board"><div class="cork"></div></div>' +
      '<div class="fingerprint">' + pin('#e8b923') + '<svg viewBox="0 0 120 140">' + fingerprintSVG() + '</svg></div>' +
      '<svg class="board-strings" viewBox="0 0 1460 300"><g fill="none" stroke="#a8111a" stroke-width="2.2">' +
      '<polyline points="350,34 515,36"/><polyline points="855,36 1108,40"/><polyline points="855,36 790,138"/><polyline points="350,34 545,138"/></g></svg>' +
      '<div class="note">' + pin('#d22') + '<h3>' + esc(C.board.noteTitle) + '</h3><p>' + esc(C.board.noteText) + '</p></div>' +
      DESK_SVG + LAMP_SVG + '<div class="lamp-light"></div>';

    for (var n = 1; n <= 7; n++) {
      html += '<div class="scene-item it' + n + '" data-n="' + n + '">' + sceneItemArt(n) +
        '<span class="num">' + n + '</span><span class="stamp">' + esc(C.ui.stamp) + '</span></div>';
    }

    html += '<div class="laptop" id="laptop"><div class="laptop-screen"><div class="laptop-screen-inner">' +
      '<svg viewBox="0 0 40 50" class="lock-ico"><rect x="6" y="20" width="28" height="24" rx="4" fill="#fff"/><path d="M12 20 V14 a8 8 0 0 1 16 0 V20" fill="none" stroke="#fff" stroke-width="4"/></svg>' +
      '<div class="laptop-screen-text"></div></div></div><div class="laptop-base"></div></div>';

    C.eggs.forEach(function (egg, i) {
      html += '<div class="egg egg-' + esc(egg.look || 'none') + '" data-egg="' + i + '" style="left:' + egg.x + 'px;top:' + egg.y + 'px;width:' + egg.w + 'px;height:' + egg.h + 'px">' + eggArt(egg.look) + '</div>';
    });
    html += '<div class="vignette"></div>';

    sceneEl.innerHTML = html;

    sceneEl.querySelectorAll('.scene-item').forEach(function (el) {
      el.addEventListener('click', function () { openItem(parseInt(el.dataset.n, 10)); });
    });
    document.getElementById('laptop').addEventListener('click', function () {
      if (progress.unlocked) showDesktop(); else openLaptop();
    });
    sceneEl.querySelectorAll('.egg').forEach(function (el) {
      el.addEventListener('click', function () {
        var egg = C.eggs[parseInt(el.dataset.egg, 10)];
        dialog({ title: egg.title, text: egg.text, photo: egg.photo });
      });
    });
    refreshScene();
  }

  function eggArt(look) {
    if (look === 'mug') {
      return '<svg viewBox="0 0 90 100" class="art"><ellipse cx="40" cy="92" rx="38" ry="7" fill="rgba(0,0,0,.35)"/>' +
        '<path d="M8 22 L72 22 L66 88 Q40 96 14 88 Z" fill="#e9e4da"/><path d="M72 36 Q90 38 86 56 Q82 70 68 70" fill="none" stroke="#e9e4da" stroke-width="8"/>' +
        '<ellipse cx="40" cy="22" rx="32" ry="8" fill="#5a3418"/><path d="M28 10 Q34 0 30 -8 M44 12 Q50 2 46 -6" stroke="rgba(255,255,255,.5)" stroke-width="3" fill="none"/></svg>';
    }
    if (look === 'duck') {
      return '<svg viewBox="0 0 110 90" class="art"><ellipse cx="55" cy="84" rx="44" ry="6" fill="rgba(0,0,0,.35)"/>' +
        '<ellipse cx="52" cy="60" rx="40" ry="24" fill="#f7cf2f"/><circle cx="78" cy="32" r="18" fill="#f7cf2f"/>' +
        '<path d="M92 30 L108 34 L92 40 Z" fill="#f08a1c"/><circle cx="82" cy="27" r="3" fill="#222"/>' +
        '<path d="M30 56 Q48 46 60 60" stroke="#e0b51e" stroke-width="4" fill="none"/></svg>';
    }
    if (look === 'paper') {
      return '<svg viewBox="0 0 80 70" class="art"><ellipse cx="40" cy="64" rx="30" ry="5" fill="rgba(0,0,0,.35)"/>' +
        '<path d="M14 30 L24 10 L44 6 L62 14 L70 34 L60 56 L36 62 L16 52 Z" fill="#f1ede2"/>' +
        '<path d="M24 10 L36 30 L62 14 M36 30 L36 62 M16 52 L36 30 L70 34" stroke="#c9c2b0" stroke-width="2" fill="none"/></svg>';
    }
    return '';
  }

  function refreshScene() {
    sceneEl.querySelectorAll('.scene-item').forEach(function (el) {
      el.classList.toggle('solved', isSolved(parseInt(el.dataset.n, 10)));
    });
    var t = sceneEl.querySelector('.laptop-screen-text');
    t.textContent = progress.unlocked ? C.laptop.unlockedScreen : C.laptop.lockedScreen;
    sceneEl.querySelector('.laptop').classList.toggle('unlocked', !!progress.unlocked);
    renderInventory();
  }

  // Inventory box: one evidence tag per solved item. Clicking a tag reopens it.
  function renderInventory() {
    var html = '<div class="inv-title">' + esc(C.ui.inventoryTitle) + '</div><div class="inv-slots">';
    for (var n = 1; n <= 7; n++) {
      html += isSolved(n)
        ? '<button class="inv-tag" data-n="' + n + '"><span class="inv-num">№' + n + '</span><span class="inv-sym">' + esc(C.items[n].symbol) + '</span></button>'
        : '<div class="inv-slot"></div>';
    }
    invEl.innerHTML = html + '</div>';
    invEl.querySelectorAll('.inv-tag').forEach(function (b) {
      b.addEventListener('click', function () { openItem(parseInt(b.dataset.n, 10)); });
    });
  }

  // ---------- frame: menu and help ----------

  function openMenu() {
    if (overlayRoot.querySelector('.menu-card')) return;
    var wrap = div('dialog-wrap');
    wrap.innerHTML = '<div class="dialog menu-card"><h3>' + esc(C.ui.menuTitle) + '</h3>' +
      '<button class="btn btn-big m-cont">' + esc(C.ui.menuContinue) + '</button>' +
      '<button class="btn m-restart">' + esc(C.ui.menuRestart) + '</button></div>';
    overlayRoot.appendChild(wrap);
    var armed = false;
    wrap.querySelector('.m-cont').addEventListener('click', function () { wrap.remove(); });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) wrap.remove(); });
    wrap.querySelector('.m-restart').addEventListener('click', function () {
      if (!armed) { armed = true; this.textContent = C.ui.restartConfirm; return; }
      try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
      location.href = location.pathname;
    });
  }
  var menuBtn = document.getElementById('menu-btn');
  menuBtn.innerHTML = C.ui.menu.split('').map(function (ch) { return '<span>' + esc(ch) + '</span>'; }).join('');
  menuBtn.addEventListener('click', openMenu);
  document.getElementById('help-btn').addEventListener('click', function () { say(C.ui.helpText); });

  // ---------- modal ----------

  var current = null;

  function openPanel(title, withHint, hintText) {
    closeModal();
    say('');
    var panel = div('closeup');
    panel.innerHTML = (title ? '<div class="cu-title">' + esc(title) + '</div>' : '') +
      (withHint ? '<button class="btn btn-hint">' + esc(C.ui.hint) + '</button>' : '') +
      '<div class="cu-stage"><div class="panel-body"></div></div>' +
      '<button class="cu-back" title="' + esc(C.ui.close) + '"><svg viewBox="0 0 120 70"><path d="M104 60 Q104 20 52 20 L52 4 L10 32 L52 60 L52 42 Q84 42 86 60 Z"/></svg>' +
      '<span>' + esc(C.ui.close) + '</span></button>';
    modalEl.innerHTML = '';
    modalEl.appendChild(panel);
    modalEl.classList.remove('hidden');
    panel.querySelector('.cu-back').addEventListener('click', closeModal);
    var hb = panel.querySelector('.btn-hint');
    if (hb) hb.addEventListener('click', function () { say(hintText); });
    current = { panel: panel, cleanup: null };
    return panel;
  }

  function closeModal() {
    if (current) say('');
    if (current && current.cleanup) current.cleanup();
    current = null;
    modalEl.classList.add('hidden');
    modalEl.innerHTML = '';
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var dlg = overlayRoot.querySelector('.dialog-wrap');
    if (dlg) dlg.remove(); else closeModal();
  });

  function showSolvedBox(panel, n) {
    if (panel.querySelector('.solved-box')) return;
    var box = div('solved-box', esc(fmt(C.ui.solvedLine, { n: n, s: C.items[n].symbol })));
    panel.appendChild(box);
  }

  function openItem(n) {
    var d = C.items[n];
    var panel = openPanel(d.title, true, d.hint);
    var body = panel.querySelector('.panel-body');
    body.classList.add('body-' + n);
    var api = {
      n: n,
      data: d,
      body: body,
      solved: isSolved(n),
      solve: function () {
        if (!progress.solved[n]) {
          progress.solved[n] = true;
          saveProgress();
          refreshScene();
        }
        if (current && current.panel === panel) showSolvedBox(panel, n);
      }
    };
    current.cleanup = ITEMS[n](api) || null;
    if (api.solved) showSolvedBox(panel, n);
  }

  // ---------- item 1: kick the door ----------

  function item1(api) {
    var d = api.data, b = api.body;
    b.innerHTML =
      '<div class="i1-story paper-card"><p>' + esc(d.story) + '</p></div>' +
      '<div class="i1-right">' +
      '<div class="i1-wall"><div class="i1-doorway">' +
      '<div class="i1-behind"><span class="i1-paint">' + esc(d.symbol) + '</span></div>' +
      '<div class="i1-door"><div class="i1-sign">' + esc(d.doorSign) + '</div><div class="i1-panel p1"></div><div class="i1-panel p2"></div><div class="i1-knob"></div></div>' +
      '</div></div>' +
      '<div class="i1-meter-wrap"><div class="i1-meter-label">' + esc(d.meterLabel) + '</div>' +
      '<div class="i1-meter"><div class="i1-green"></div><div class="i1-marker"></div></div>' +
      '<button class="btn btn-big i1-kick">' + esc(d.kickButton) + '</button></div>' +
      '</div>';

    var doorway = b.querySelector('.i1-doorway');
    var door = b.querySelector('.i1-door');
    if (api.solved) {
      doorway.classList.add('open');
      b.querySelector('.i1-meter-wrap').classList.add('hidden');
      return null;
    }

    var green = b.querySelector('.i1-green');
    var marker = b.querySelector('.i1-marker');
    var zoneW = d.greenZone, zoneX = 0;
    var misses = 0, pos = 0, running = true, raf = 0;
    var t0 = performance.now();

    function placeZone() {
      zoneX = 0.66 - zoneW / 2;
      green.style.left = zoneX * 100 + '%';
      green.style.width = zoneW * 100 + '%';
    }
    function tick(now) {
      var ph = ((now - t0) / 1000 * 0.9) % 2;
      pos = ph < 1 ? ph : 2 - ph;
      marker.style.left = pos * 100 + '%';
      raf = requestAnimationFrame(tick);
    }
    function kick() {
      if (!running) return;
      if (pos >= zoneX && pos <= zoneX + zoneW) {
        running = false;
        cancelAnimationFrame(raf);
        doorway.classList.add('open');
        toast(d.hitLine);
        setTimeout(api.solve, 1100);
      } else {
        misses++;
        replayClass(door, 'shudder');
        if (misses === 3) {
          zoneW = d.greenZoneWide;
          placeZone();
          toast(d.widenLine, 3200);
        } else {
          toast(d.missLines[(misses - 1) % d.missLines.length]);
        }
      }
    }
    function onKey(e) {
      if (e.code === 'Space') { e.preventDefault(); kick(); }
    }
    placeZone();
    raf = requestAnimationFrame(tick);
    b.querySelector('.i1-kick').addEventListener('click', kick);
    document.addEventListener('keydown', onKey);
    return function () { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); };
  }

  // ---------- item 2: romance novel ----------

  function normalize(s) {
    return String(s).toLowerCase().replace(/ё/g, 'е').replace(/[^0-9a-zа-я]/g, '');
  }

  function item2(api) {
    var d = api.data, b = api.body;
    b.innerHTML =
      '<div class="i2-stage">' +
      '<div class="i2-bookmark"><div class="i2-bm-letter">' + esc(d.symbol) + '</div><svg viewBox="0 0 60 120" class="i2-bm-flower">' +
      '<path d="M30 120 Q28 80 30 46" stroke="#5f8a3a" stroke-width="3" fill="none"/>' +
      '<ellipse cx="20" cy="84" rx="10" ry="4" fill="#7aa64a" transform="rotate(-30 20 84)"/><ellipse cx="40" cy="96" rx="10" ry="4" fill="#7aa64a" transform="rotate(30 40 96)"/>' +
      flowerSVGInner() + '</svg>' +
      '<div class="i2-bm-text">' + esc(d.bookmarkText) + '</div></div>' +
      '<div class="i2-book"><div class="i2-face i2-front">' +
      '<div class="i2-tagline">' + esc(d.coverTagline) + '</div>' +
      '<svg viewBox="0 0 60 60" class="i2-cover-flower">' + flowerSVGInner() + '</svg>' +
      '<div class="i2-title">' + esc(d.coverTitle) + '</div><div class="i2-author">' + esc(d.coverAuthor) + '</div></div>' +
      '<div class="i2-face i2-back"><div class="i2-blurb">' +
      d.blurb.map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') +
      '</div><div class="i2-barcode"></div></div></div>' +
      '<div class="i2-fliphint">' + esc(d.flipHint) + '</div>' +
      '</div>' +
      '<div class="i2-side paper-card"><p class="i2-q">' + esc(d.question) + '</p>' +
      '<input class="i2-input" type="text" autocomplete="off" spellcheck="false" placeholder="' + esc(d.placeholder) + '">' +
      '<button class="btn btn-big i2-submit">' + esc(d.submit) + '</button></div>';

    var book = b.querySelector('.i2-book');
    var input = b.querySelector('.i2-input');
    var stageEl = b.querySelector('.i2-stage');
    book.addEventListener('click', function () { book.classList.toggle('flipped'); });

    if (api.solved) {
      book.classList.add('flipped');
      stageEl.classList.add('solved');
      input.value = d.answers[0];
      input.disabled = true;
      return null;
    }
    var wrongCount = 0;
    function check() {
      var v = normalize(input.value);
      if (!v) return;
      var ok = d.answers.some(function (a) { return normalize(a) === v; });
      if (ok) {
        input.disabled = true;
        stageEl.classList.add('solved');
        setTimeout(api.solve, 1200);
      } else {
        replayClass(input, 'shake');
        toast(d.wrongLines[wrongCount++ % d.wrongLines.length]);
      }
    }
    b.querySelector('.i2-submit').addEventListener('click', check);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
    return null;
  }

  // ---------- item 3: torn ticket ----------

  var TICKET_W = 820, TICKET_H = 280;

  function ticketHTML(d, seat) {
    return '<div class="ticket">' +
      '<div class="ticket-main">' +
      '<div class="ticket-artist">' + esc(d.artist) + '</div>' +
      '<div class="ticket-show">' + esc(d.show) + '</div>' +
      '<div class="ticket-venue">' + esc(d.venue) + '</div>' +
      '<div class="ticket-fields">' +
      d.fields.map(function (f) { return '<div class="tf"><span>' + esc(f.label) + '</span><b>' + esc(f.value) + '</b></div>'; }).join('') +
      '<div class="tf tf-seat"><span>' + esc(d.seatLabel) + '</span><b class="seat-val">' + esc(seat) + '</b></div>' +
      '</div>' +
      '<div class="ticket-gift">' + esc(d.giftNote) + '</div>' +
      '</div>' +
      '<div class="ticket-stub"><div class="stub-text">' + esc(d.stubText) + '</div><div class="barcode"></div></div>' +
      '</div>';
  }

  function item3(api) {
    var d = api.data, b = api.body;
    var FX = 270, FY = 40;
    b.innerHTML = '<div class="i3-instr">' + esc(d.instruction) + '</div>' +
      '<div class="i3-frame" style="left:' + FX + 'px;top:' + FY + 'px;width:' + TICKET_W + 'px;height:' + TICKET_H + 'px"></div>';

    // Jagged cut lines between 5 pieces.
    var rnd = seeded(20251);
    var cuts = [];
    for (var k = 1; k <= 4; k++) {
      var x0 = k * TICKET_W / 5, pts = [];
      for (var y = 0, i = 0; y <= TICKET_H; y += 20, i++) {
        pts.push([x0 + (i % 2 ? 1 : -1) * (5 + rnd() * 11), y]);
      }
      cuts.push(pts);
    }
    var pieces = [];
    var order = shuffle([0, 1, 2, 3, 4]);
    for (var p = 0; p < 5; p++) {
      var left = p === 0 ? [[0, 0], [0, TICKET_H]] : cuts[p - 1];
      var right = p === 4 ? [[TICKET_W, 0], [TICKET_W, TICKET_H]] : cuts[p];
      var minX = Math.min.apply(null, left.map(function (q) { return q[0]; }));
      var maxX = Math.max.apply(null, right.map(function (q) { return q[0]; }));
      var poly = left.concat(right.slice().reverse()).map(function (q) {
        return (q[0] - minX).toFixed(1) + 'px ' + q[1] + 'px';
      }).join(',');
      var el = div('piece');
      el.style.width = (maxX - minX) + 'px';
      el.style.height = TICKET_H + 'px';
      el.innerHTML = '<div class="piece-clip" style="clip-path:polygon(' + poly + ')"><div class="piece-inner" style="left:' + (-minX) + 'px">' + ticketHTML(d, d.seatHidden) + '</div></div>';
      var slot = order[p];
      el.style.left = (30 + slot * 262 + rand(-20, 20)) + 'px';
      el.style.top = (FY + TICKET_H + 40 + rand(0, 40)) + 'px';
      el.style.setProperty('--rot', rand(-9, 9).toFixed(1) + 'deg');
      b.appendChild(el);
      pieces.push({ el: el, x: FX + minX, y: FY });
    }
    function complete() {
      b.querySelectorAll('.seat-val').forEach(function (s) { s.textContent = d.symbol; });
      b.classList.add('complete');
    }
    var ds = makeDragSnap({
      pieces: pieces,
      tolerance: 40,
      onComplete: function () { complete(); setTimeout(api.solve, 900); }
    });
    if (api.solved) { ds.snapAll(); complete(); }
    return null;
  }

  // ---------- item 4: dental X-rays ----------

  function item4(api) {
    var d = api.data, b = api.body;
    b.innerHTML = '<div class="i4-case paper-card"><div class="i4-case-text">' + esc(d.caseCard) + '</div><div class="i4-instr">' + esc(d.instruction) + '</div></div>' +
      '<div class="i4-films">' + d.films.map(function (f, i) {
        return '<button class="i4-film" data-i="' + i + '">' + pin(i % 2 ? '#e8b923' : '#d22') + filmSVG(f.id) + '<span class="i4-label">' + esc(f.label) + '</span></button>';
      }).join('') + '</div>';
    var done = api.solved;
    b.querySelectorAll('.i4-film').forEach(function (btn) {
      var f = d.films[parseInt(btn.dataset.i, 10)];
      if (done && f.id === d.correct) btn.classList.add('right');
      btn.addEventListener('click', function () {
        if (f.id === d.correct) {
          btn.classList.add('right');
          if (!done) { done = true; toast(f.diagnosis, 3000); setTimeout(api.solve, 700); }
        } else {
          replayClass(btn, 'shake');
          dialog({ title: f.label, text: f.diagnosis });
        }
      });
    });
    return null;
  }

  // ---------- item 5: photo with magnifier ----------

  function item5(api) {
    var d = api.data, b = api.body;
    b.innerHTML = '<div class="i5-q">' + esc(d.question) + '</div>' +
      '<div class="i5-wrap"><img class="i5-img" src="' + esc(d.photo) + '" alt="" draggable="false"><div class="i5-mark hidden"></div><div class="i5-lens hidden"></div></div>';
    var img = b.querySelector('.i5-img');
    var lens = b.querySelector('.i5-lens');
    var mark = b.querySelector('.i5-mark');
    var LENS = 260, zoom = d.zoom || 2.5; // LENS matches .i5-lens size in style.css
    var done = api.solved;
    lens.style.backgroundImage = 'url("' + d.photo + '")';

    function placeMark(show) {
      var w = img.clientWidth, h = img.clientHeight, r = d.hotspot.r * w;
      mark.style.left = (d.hotspot.x * w - r) + 'px';
      mark.style.top = (d.hotspot.y * h - r) + 'px';
      mark.style.width = mark.style.height = 2 * r + 'px';
      mark.classList.toggle('hidden', !show);
    }
    function onLoad() { placeMark(done || DEBUG); if (DEBUG && !done) mark.classList.add('debug'); }
    if (img.complete) onLoad(); else img.addEventListener('load', onLoad);

    function local(e) {
      var r = img.getBoundingClientRect(), k = scaleOf(b);
      return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k, w: r.width / k, h: r.height / k };
    }
    img.addEventListener('mousemove', function (e) {
      var p = local(e);
      lens.classList.remove('hidden');
      lens.style.left = (p.x - LENS / 2) + 'px';
      lens.style.top = (p.y - LENS / 2) + 'px';
      lens.style.backgroundSize = (p.w * zoom) + 'px ' + (p.h * zoom) + 'px';
      lens.style.backgroundPosition = (-(p.x * zoom - LENS / 2)) + 'px ' + (-(p.y * zoom - LENS / 2)) + 'px';
    });
    img.addEventListener('mouseleave', function () { lens.classList.add('hidden'); });
    var wrong = 0;
    img.addEventListener('click', function (e) {
      if (done) return;
      var p = local(e);
      var dx = p.x - d.hotspot.x * p.w, dy = p.y - d.hotspot.y * p.h;
      if (Math.hypot(dx, dy) <= d.hotspot.r * p.w) {
        done = true;
        mark.classList.remove('debug');
        placeMark(true);
        setTimeout(api.solve, 500);
      } else {
        toast(d.wrongLines[wrong++ % d.wrongLines.length], 1500);
      }
    });
    return null;
  }

  // ---------- item 6: map of Georgia ----------

  var POL_W = 190, POL_H = 222, PHOTO_W = 170, PHOTO_H = 160, GAP = 14;

  function item6(api) {
    var d = api.data, b = api.body;
    var stops = d.stops, M = stops.length;
    if (api.solved) { assemble(true); return null; }

    var box = d.mapView || GEORGIA_BOX;
    var size = geoSize(880, box);
    var W = 880, H = Math.round(size.h);
    var step = d.gridStep || 1;
    var grid = '';
    for (var lon = Math.ceil(box.west / step) * step; lon <= box.east; lon += step) {
      var gx = project(lon, box.north, size)[0];
      grid += '<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="' + H + '"/><text x="' + (gx + 3) + '" y="' + (H - 4) + '">' + +lon.toFixed(2) + '°</text>';
    }
    for (var lat = Math.ceil(box.south / step) * step; lat <= box.north; lat += step) {
      var gy = project(box.west, lat, size)[1];
      grid += '<line x1="0" y1="' + gy + '" x2="' + W + '" y2="' + gy + '"/><text x="3" y="' + (gy - 3) + '">' + +lat.toFixed(2) + '°</text>';
    }
    // The sea label only makes sense when the Black Sea is inside the view.
    var seaLon = 40.15, seaLat = 42.35;
    var sea = project(seaLon, seaLat, size);
    var seaHTML = (seaLon > box.west && seaLon < box.east && seaLat > box.south && seaLat < box.north)
      ? '<text class="sea" x="' + sea[0] + '" y="' + sea[1] + '">' + esc(d.seaLabel) + '</text>' : '';
    var marks = (d.landmarks || []).map(function (m) {
      var q = project(m.lon, m.lat, size);
      return '<g class="landmark" transform="translate(' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')"><circle r="6"/><text x="' + (m.labelLeft ? -10 : 10) + '" y="5" text-anchor="' + (m.labelLeft ? 'end' : 'start') + '">' + esc(m.name) + '</text></g>';
    }).join('');
    b.innerHTML =
      '<div class="i6-left"><svg class="i6-map" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' +
      '<rect width="' + W + '" height="' + H + '" fill="#d9caa3"/><g class="graticule">' + grid + '</g>' +
      seaHTML +
      '<path d="' + outlinePath(size) + '" fill="#f6eed6" stroke="#7a5a2e" stroke-width="3" stroke-dasharray="10 4"/>' + marks +
      '<polyline class="i6-string" points="" fill="none" stroke="#c0161e" stroke-width="3"/><g class="i6-pins"></g><g class="i6-debug"></g></svg>' +
      '<div class="i6-tray"></div></div>' +
      '<div class="i6-side paper-card"><div class="i6-stop"></div><p class="i6-clue"></p><p class="i6-prompt">' + esc(d.mapPrompt) + '</p>' +
      '<button class="btn btn-big i6-assemble hidden">' + esc(d.assembleButton) + '</button></div>';

    var svg = b.querySelector('.i6-map');
    var pinsG = b.querySelector('.i6-pins');
    var stringEl = b.querySelector('.i6-string');
    var tray = b.querySelector('.i6-tray');
    var idx = 0, pts = [], cold = 0;
    var targets = stops.map(function (s) { return project(s.lon, s.lat, size); });

    if (DEBUG) {
      b.querySelector('.i6-debug').innerHTML = targets.map(function (t) {
        return '<circle cx="' + t[0] + '" cy="' + t[1] + '" r="' + d.tolerance + '" fill="rgba(0,120,255,.12)" stroke="#06f" stroke-dasharray="4 3"/>';
      }).join('');
    }

    function showStop() {
      b.querySelector('.i6-stop').textContent = fmt(d.stopLabel, { n: idx + 1, m: M });
      b.querySelector('.i6-clue').textContent = stops[idx].clue;
    }
    showStop();

    svg.addEventListener('click', function (e) {
      if (idx >= M) return;
      var r = svg.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      if (DEBUG) {
        var ll = unproject(x, y, size);
        debugSay('Map click: lat ' + ll[1].toFixed(4) + ', lon ' + ll[0].toFixed(4));
      }
      var t = targets[idx];
      var dist = Math.hypot(x - t[0], y - t[1]);
      if (dist <= d.tolerance) {
        pts.push(t[0].toFixed(1) + ',' + t[1].toFixed(1));
        stringEl.setAttribute('points', pts.join(' '));
        pinsG.insertAdjacentHTML('beforeend',
          '<g class="map-pin" transform="translate(' + t[0] + ' ' + t[1] + ')"><ellipse cx="3" cy="2" rx="7" ry="3" fill="rgba(0,0,0,.3)"/>' +
          '<line x1="0" y1="0" x2="0" y2="-16" stroke="#555" stroke-width="2"/><circle cy="-20" r="8" fill="#d6262f" stroke="#7a0d12" stroke-width="1.5"/><circle cx="-3" cy="-23" r="2.5" fill="#ff9a9a"/></g>');
        var pol = div('polaroid small', '<div class="pol-photo"><img src="' + esc(stops[idx].photo) + '" alt=""></div><div class="pol-cap' + (stops[idx].name.length > 12 ? ' long' : '') + '">' + esc(stops[idx].name) + '</div>');
        pol.style.setProperty('--rot', rand(-6, 6).toFixed(1) + 'deg');
        tray.appendChild(pol);
        idx++;
        if (idx < M) {
          showStop();
        } else {
          b.querySelector('.i6-stop').textContent = d.allFoundLine;
          b.querySelector('.i6-clue').textContent = '';
          b.querySelector('.i6-prompt').textContent = '';
          b.querySelector('.i6-assemble').classList.remove('hidden');
        }
      } else {
        toast(dist < 120 ? d.warmLine : d.coldLines[cold++ % d.coldLines.length], 1500);
      }
    });
    b.querySelector('.i6-assemble').addEventListener('click', function () { assemble(false); });
    return null;

    // Phase 2: drag polaroids into the grid. The sliced letter appears when the order is right.
    function assemble(solvedNow) {
      var cols = M <= 3 ? M : Math.ceil(M / 2);
      var rows = M <= 3 ? 1 : 2;
      var gw = cols * POL_W + (cols - 1) * GAP, gh = rows * POL_H + (rows - 1) * GAP;
      var BW = 1360;
      var GX = Math.round((BW - gw) / 2), GY = 60;
      b.innerHTML = '<div class="i6-assemble-prompt">' + esc(d.assemblePrompt) + '</div>' +
        '<div class="i6-grid" style="left:' + GX + 'px;top:' + GY + 'px;width:' + gw + 'px;height:' + gh + 'px"></div>';
      var gridEl = b.querySelector('.i6-grid');

      // Letter geometry in grid coordinates, spanning all photo areas.
      var lx = 10, ly = 10, lw = gw - 20, lh = (rows - 1) * (POL_H + GAP) + PHOTO_H;
      var L = letterRPaths(lx, ly, lw, lh);
      var sw = Math.max(26, Math.min(lw, lh) * 0.1);

      var leftX = Math.max(10, Math.round((GX - POL_W) / 2)), rightX = Math.min(BW - POL_W - 10, Math.round(GX + gw + (BW - GX - gw - POL_W) / 2));
      var spots = shuffle([[leftX, 40], [rightX, 40], [leftX, 270], [rightX, 270], [leftX, 500], [rightX, 500]]);
      var pieces = [];
      for (var i = 0; i < M; i++) {
        var col = i % cols, row = Math.floor(i / cols);
        var sx = col * (POL_W + GAP), sy = row * (POL_H + GAP);
        gridEl.insertAdjacentHTML('beforeend', '<div class="i6-slot" style="left:' + sx + 'px;top:' + sy + 'px"><span>' + (i + 1) + '</span></div>');
        var tx = sx + 10, ty = sy + 10;
        var slice = '<svg class="letter-slice" viewBox="' + tx + ' ' + ty + ' ' + PHOTO_W + ' ' + PHOTO_H + '" preserveAspectRatio="none">' +
          '<path d="' + L.d + '" fill="none" stroke="#3a0006" stroke-width="' + (sw + 8) + '" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>' +
          '<path d="' + L.d + '" fill="none" stroke="#ff2d55" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<circle cx="' + L.ball.cx + '" cy="' + L.ball.cy + '" r="' + (sw * 0.85) + '" fill="#ff2d55" stroke="#3a0006" stroke-opacity=".55" stroke-width="4"/></svg>';
        var pol = div('polaroid', '<div class="pol-photo"><img src="' + esc(stops[i].photo) + '" alt="" draggable="false">' + slice + '</div><div class="pol-cap' + (stops[i].name.length > 12 ? ' long' : '') + '">' + esc(stops[i].name) + '</div>');
        // Scatter beside the grid: fixed non-overlapping spots in shuffled order,
        // random spots only if there are more photos than spots.
        var spot = spots[i];
        var px = spot ? spot[0] + rand(-10, 10) : rand(10, BW - POL_W - 10);
        var py = spot ? spot[1] + rand(-8, 8) : rand(40, 500);
        pol.style.left = px + 'px';
        pol.style.top = py + 'px';
        pol.style.setProperty('--rot', rand(-10, 10).toFixed(1) + 'deg');
        b.appendChild(pol);
        pieces.push({ el: pol, x: GX + sx, y: GY + sy });
      }
      var ds = makeDragSnap({
        pieces: pieces,
        tolerance: 45,
        onComplete: function () { b.classList.add('complete'); setTimeout(api.solve, 900); }
      });
      if (solvedNow) { ds.snapAll(); b.classList.add('complete'); }
    }
  }

  // ---------- item 7: phone captcha ----------

  var GIRL_SVG =
    '<svg class="girl" viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="83" y="192" width="13" height="68" rx="6" fill="#f2c9a5"/><rect x="104" y="192" width="13" height="68" rx="6" fill="#f2c9a5"/>' +
    '<ellipse cx="88" cy="262" rx="13" ry="6" fill="#2d2d3a"/><ellipse cx="112" cy="262" rx="13" ry="6" fill="#2d2d3a"/>' +
    '<path d="M78 108 L122 108 L140 202 L60 202 Z" fill="#e94b7b"/>' +
    '<path d="M78 108 L122 108 L118 140 L82 140 Z" fill="#d63d6c"/>' +
    '<rect x="94" y="92" width="12" height="20" fill="#eab894"/>' +
    '<g class="arm arm-l"><path d="M82 114 L56 144 L32 122" fill="none" stroke="#f2c9a5" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M80 110 L70 126" stroke="#e94b7b" stroke-width="14" stroke-linecap="round"/>' +
    '<ellipse cx="26" cy="118" rx="12" ry="5" fill="#f2c9a5"/></g>' +
    '<g class="arm arm-r"><path d="M118 114 L144 144 L168 122" fill="none" stroke="#f2c9a5" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M120 110 L130 126" stroke="#e94b7b" stroke-width="14" stroke-linecap="round"/>' +
    '<ellipse cx="174" cy="118" rx="12" ry="5" fill="#f2c9a5"/></g>' +
    '<g class="head"><circle cx="100" cy="62" r="34" fill="#4a2c1d"/><path d="M128 52 Q150 70 140 100 Q132 84 126 70 Z" fill="#4a2c1d"/>' +
    '<circle cx="100" cy="66" r="27" fill="#f2c9a5"/>' +
    '<path d="M73 60 Q78 34 100 34 Q124 34 128 58 Q112 44 92 48 Q82 52 73 60 Z" fill="#4a2c1d"/>' +
    '<path d="M84 55 Q90 50 96 54 M104 54 Q110 50 116 55" stroke="#4a2c1d" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="90" cy="64" r="3.2" fill="#2b1a10"/><circle cx="110" cy="64" r="3.2" fill="#2b1a10"/>' +
    '<circle cx="83" cy="74" r="5" fill="#f59ab0" opacity=".6"/><circle cx="117" cy="74" r="5" fill="#f59ab0" opacity=".6"/>' +
    '<path d="M90 78 Q100 89 110 78 Z" fill="#8a1c33"/></g>' +
    '</svg>';

  function item7(api) {
    var d = api.data, b = api.body;
    b.innerHTML = '<div class="phone"><div class="phone-notch"></div><div class="phone-screen">' +
      '<div class="captcha"><div class="captcha-head"><div class="captcha-title">' + esc(d.captchaTitle) + '</div><div class="captcha-sub">' + esc(d.captchaSub) + '</div></div>' +
      '<div class="captcha-grid">' + d.people.map(function (p, i) {
        return '<button class="captcha-cell" data-i="' + i + '"><img src="' + esc(p.photo) + '" alt="" draggable="false"></button>';
      }).join('') + '</div>' +
      '<div class="captcha-foot"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" fill="none" stroke="#777" stroke-width="2.4"/></svg>' +
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#777" stroke-width="2.4"/><path d="M12 11v6M12 7v1" stroke="#777" stroke-width="2.4"/></svg></div></div>' +
      '<div class="unlocked">' + GIRL_SVG + '<div class="six-seven">' + esc(d.unlockedText) + '</div></div>' +
      '</div></div>';
    var phone = b.querySelector('.phone');
    if (api.solved) { phone.classList.add('open'); return null; }
    b.querySelectorAll('.captcha-cell').forEach(function (cell) {
      var p = d.people[parseInt(cell.dataset.i, 10)];
      cell.addEventListener('click', function () {
        if (p.villain) {
          cell.classList.add('picked');
          toast(p.text, 1800);
          setTimeout(function () { phone.classList.add('open'); }, 900);
          setTimeout(api.solve, 2000);
        } else {
          cell.classList.add('nope');
          dialog({ text: p.text, photo: p.photo });
        }
      });
    });
    return null;
  }

  var ITEMS = { 1: item1, 2: item2, 3: item3, 4: item4, 5: item5, 6: item6, 7: item7 };

  // ---------- laptop lock screen ----------

  // Physical key code -> Latin character. Used when the Russian layout is active.
  var CODE_MAP = {
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'",
    Comma: ',', Period: '.', Slash: '/', Backquote: '`', Backslash: '\\'
  };
  var RU_MAP = {
    'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p', 'х': '[', 'ъ': ']',
    'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l', 'ж': ';', 'э': "'",
    'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm', 'б': ',', 'ю': '.', 'ё': '`'
  };
  function latinFromKey(e) {
    var key = e.key;
    if (!/[а-яё]/i.test(key)) return key;
    var upper = key !== key.toLowerCase();
    var ch = null;
    if (/^Key[A-Z]$/.test(e.code)) ch = e.code.slice(3).toLowerCase();
    else if (CODE_MAP[e.code]) ch = CODE_MAP[e.code];
    else ch = RU_MAP[key.toLowerCase()] || key;
    return upper ? ch.toUpperCase() : ch;
  }

  function openLaptop() {
    var L = C.laptop;
    var panel = openPanel('', false);
    panel.classList.add('laptop-mode');
    var body = panel.querySelector('.panel-body');
    var n = C.password.length;
    var boxes = '';
    for (var i = 0; i < n; i++) {
      boxes += '<div class="pw-cell"><span class="pw-q">?<span class="pw-tip">' + esc(L.tooltips[i] || '') + '</span></span>' +
        '<input class="pw-box" maxlength="1" autocomplete="off" spellcheck="false" data-i="' + i + '"></div>';
    }
    body.innerHTML = '<div class="lock-screen"><div class="lock-avatar">' + esc(C.name.charAt(0)) + '</div>' +
      '<div class="lock-title">' + esc(L.title) + '</div><div class="lock-sub">' + esc(L.sub) + '</div>' +
      '<div class="pw-row">' + boxes + '</div><button class="btn btn-big pw-go">' + esc(L.button) + '</button></div>';

    var inputs = Array.prototype.slice.call(body.querySelectorAll('.pw-box'));
    var row = body.querySelector('.pw-row');

    function check() {
      var target = C.password.toLowerCase();
      var allOk = true;
      inputs.forEach(function (inp, i) {
        var ok = inp.value.toLowerCase() === target.charAt(i);
        inp.classList.toggle('bad', !ok);
        if (!ok) allOk = false;
      });
      if (allOk) {
        progress.unlocked = true;
        saveProgress();
        refreshScene();
        closeModal();
        showFinale();
      } else {
        replayClass(row, 'shake');
        toast(L.wrongLine);
      }
    }

    inputs.forEach(function (inp, i) {
      inp.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Backspace') {
          e.preventDefault();
          if (inp.value) inp.value = '';
          else if (i > 0) inputs[i - 1].value = '';
          inp.classList.remove('bad');
          if (i > 0) inputs[i - 1].focus({ preventScroll: true });
          return;
        }
        if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); inputs[i - 1].focus({ preventScroll: true }); return; }
        if (e.key === 'ArrowRight' && i < n - 1) { e.preventDefault(); inputs[i + 1].focus({ preventScroll: true }); return; }
        if (e.key === 'Enter') { e.preventDefault(); check(); return; }
        if (e.key.length !== 1) return;
        e.preventDefault();
        inp.value = latinFromKey(e);
        inp.classList.remove('bad');
        if (i < n - 1) inputs[i + 1].focus({ preventScroll: true });
        else if (inputs.every(function (x) { return x.value; })) check();
      });
      // Fallback for input that bypasses keydown (e.g. autofill).
      inp.addEventListener('input', function () {
        if (inp.value.length > 1) inp.value = inp.value.slice(-1);
      });
    });
    body.querySelector('.pw-go').addEventListener('click', check);
    setTimeout(function () { inputs[0].focus({ preventScroll: true }); }, 50);
  }

  // ---------- finale: confetti ----------

  function startConfetti(canvas) {
    var ctx = canvas.getContext('2d');
    var colors = ['#ff2d55', '#ffcc00', '#34c759', '#0a84ff', '#af52de', '#ff9500', '#ffffff'];
    var parts = [];
    var t0 = performance.now();
    var raf = 0;
    function add(x, y, vx, vy) {
      parts.push({ x: x, y: y, vx: vx, vy: vy, w: rand(8, 15), h: rand(5, 9), r: rand(0, 6.28), vr: rand(-0.25, 0.25), c: colors[Math.floor(Math.random() * colors.length)], s: rand(0, 6.28) });
    }
    for (var i = 0; i < 160; i++) {
      add(0, 900, rand(6, 16), rand(-26, -12));
      add(1600, 900, -rand(6, 16), rand(-26, -12));
    }
    function frame(now) {
      var elapsed = now - t0;
      if (elapsed < 7000) { for (var j = 0; j < 3; j++) add(rand(0, 1600), -20, rand(-1, 1), rand(2, 4)); }
      ctx.clearRect(0, 0, 1600, 900);
      for (var k = parts.length - 1; k >= 0; k--) {
        var p = parts[k];
        p.vy += 0.22; p.vx *= 0.985; p.vy *= 0.985;
        p.s += 0.08;
        p.x += p.vx + Math.sin(p.s) * 0.8; p.y += p.vy; p.r += p.vr;
        if (p.y > 940) { parts.splice(k, 1); continue; }
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2 * Math.abs(Math.cos(p.s)), p.w, p.h * Math.abs(Math.cos(p.s)) + 1);
        ctx.restore();
      }
      if (parts.length || elapsed < 7000) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return function () { cancelAnimationFrame(raf); };
  }

  function showFinale() {
    var f = C.finale;
    var el = div('finale', '<canvas width="1600" height="900"></canvas><div class="finale-text"><h1>' + esc(fmt(f.title, { NAME: C.name })) + '</h1>' +
      '<p>' + esc(f.subtitle) + '</p><div class="finale-click">' + esc(f.clickHint) + '</div></div>');
    fullRoot.appendChild(el);
    var stop = startConfetti(el.querySelector('canvas'));
    el.addEventListener('click', function () { stop(); el.remove(); showDesktop(); });
  }

  // ---------- desktop with notes and photos ----------

  function showDesktop() {
    var D = C.desktop;
    var el = div('desktop', '<div class="desk-bar"><span>' + esc(D.title) + '</span><button class="desk-close">' + esc(C.ui.back) + '</button></div><div class="desk-area"></div>');
    fullRoot.appendChild(el);
    var area = el.querySelector('.desk-area');
    var items = [];
    D.notes.forEach(function (nt) {
      items.push(div('sticky sticky-' + esc(nt.color || 'yellow'), esc(nt.text)));
    });
    D.photos.forEach(function (ph) {
      items.push(div('polaroid big', '<div class="pol-photo"><img src="' + esc(ph.src) + '" alt="" draggable="false"></div><div class="pol-cap">' + esc(ph.caption) + '</div>'));
    });
    // Spread items over a loose grid with jitter.
    var cols = Math.ceil(Math.sqrt(items.length * 1.8));
    var rows = Math.ceil(items.length / cols);
    var cellW = 1500 / cols, cellH = 780 / rows;
    shuffle(items).forEach(function (it, i) {
      var c = i % cols, r = Math.floor(i / cols);
      it.style.left = (30 + c * cellW + rand(0, Math.max(0, cellW - 260))) + 'px';
      it.style.top = (20 + r * cellH + rand(0, Math.max(0, cellH - 280))) + 'px';
      it.style.setProperty('--rot', rand(-8, 8).toFixed(1) + 'deg');
      area.appendChild(it);
    });
    makeDragSnap({ pieces: items.map(function (it) { return { el: it }; }) });
    el.querySelector('.desk-close').addEventListener('click', function () { el.remove(); });
  }

  // ---------- debug ----------

  var debugReadout = null;
  function debugSay(text) { if (debugReadout) debugReadout.textContent = text; }

  function setupDebug() {
    var it = C.items;
    var lines = [
      'Password: ' + C.password,
      '1: hit the green zone → ' + it[1].symbol,
      '2: ' + it[2].answers.join(' / ') + ' → ' + it[2].symbol,
      '3: assemble ticket → ' + it[3].symbol,
      '4: film "' + it[4].correct + '" → ' + it[4].symbol,
      '5: hotspot x=' + it[5].hotspot.x + ' y=' + it[5].hotspot.y + ' r=' + it[5].hotspot.r + ' → ' + it[5].symbol,
      '6: ' + it[6].stops.map(function (s) { return s.name; }).join(' → ') + ' → ' + it[6].symbol,
      '7: villain = ' + (it[7].people.filter(function (p) { return p.villain; })[0] || {}).photo + ' → ' + it[7].symbol
    ];
    var panel = div('debug-panel', '<b>DEBUG</b><br>' + lines.map(esc).join('<br>'));
    debugReadout = div('debug-readout', 'Click anywhere to see coordinates.');
    stage.appendChild(panel);
    stage.appendChild(debugReadout);
    stage.addEventListener('click', function (e) {
      var p = toLocal(e, document.getElementById('viewport'));
      var s = 'Scene x=' + Math.round(p.x) + ' y=' + Math.round(p.y);
      if (e.target.tagName === 'IMG') {
        var r = e.target.getBoundingClientRect();
        s += '  |  Photo ' + e.target.getAttribute('src') + ': x=' + ((e.clientX - r.left) / r.width).toFixed(3) + ', y=' + ((e.clientY - r.top) / r.height).toFixed(3);
      }
      debugSay(s);
    }, true);
  }

  // ---------- start ----------

  buildScene();
  say(C.ui.welcome);
  if (DEBUG) setupDebug();
})();
