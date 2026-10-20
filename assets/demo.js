/* Step-through demo player (trace format: see site/TRACE.md). Vanilla JS, no build step.
   A demo card is  <div class="card demo live"><script type="application/json" class="trace-data">…</script></div>  */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var CW = 46, CH = 40; // array cell width / height

  function svg(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function h(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function str(v) { return v === null || v === undefined ? "" : String(v); }

  function roles(view) {
    var m = {};
    (view.highlight || []).forEach(function (hl) {
      (hl.at || []).forEach(function (a) { m[String(a)] = hl.role || "C"; });
    });
    return m;
  }
  function arrowHead(parent, x, y, dir, cls) { // small triangle; dir: down|up|left|right
    var s = 5, pts;
    if (dir === "down") pts = [x - s, y - s, x + s, y - s, x, y];
    else if (dir === "up") pts = [x - s, y + s, x + s, y + s, x, y];
    else if (dir === "left") pts = [x + s, y - s, x + s, y + s, x, y];
    else pts = [x - s, y - s, x - s, y + s, x, y];
    return svg("polygon", { points: pts.join(","), "class": cls || "sv-arrow" }, parent);
  }
  function frame(width, height, label) {
    var s = svg("svg", { viewBox: "0 0 " + width + " " + height, width: width, height: height, "class": "sv", role: "img", "preserveAspectRatio": "xMinYMin meet" });
    if (label) svg("text", { x: 4, y: 11, "class": "sv-label" }, s, label);
    return s;
  }

  /* ---------- array ---------- */
  function renderArray(v) {
    var st = v.state, cells = st.cells, n = cells.length, rl = roles(v), pad = 10;
    var ptr = v.pointers || [], above = {}, below = {}, aboveMax = 0, belowMax = 0;
    ptr.forEach(function (p) {
      var map = p.side === "below" ? below : above, key = String(p.at);
      p._k = map[key] = (map[key] === undefined ? 0 : map[key] + 1);
      if (p.side === "below") belowMax = Math.max(belowMax, p._k + 1); else aboveMax = Math.max(aboveMax, p._k + 1);
    });
    var hasAddr = st.address_start !== undefined, showIdx = st.indices !== false;
    var y0 = (v.label ? 18 : 6) + aboveMax * 17 + (aboveMax ? 6 : 0);
    var yBelow = y0 + CH + 4 + (showIdx ? 15 : 0) + (hasAddr ? 15 : 0);
    var W = Math.max(n * CW + 2 * pad, 80), H = yBelow + belowMax * 17 + 8;
    var s = frame(W, H, v.label);
    cells.forEach(function (val, i) {
      var role = rl[String(i)], empty = val === null || val === undefined || val === "";
      svg("rect", { x: pad + i * CW, y: y0, width: CW - 4, height: CH, rx: 6, "class": "sv-cell" + (empty ? " empty" : "") + (role ? " r-" + role : "") }, s);
      if (!empty) svg("text", { x: pad + i * CW + (CW - 4) / 2, y: y0 + CH / 2 + 5, "class": "sv-val", "text-anchor": "middle" }, s, str(val));
      var ty = y0 + CH + 14;
      if (showIdx) svg("text", { x: pad + i * CW + (CW - 4) / 2, y: ty, "class": "sv-idx", "text-anchor": "middle" }, s, i);
      if (hasAddr) svg("text", { x: pad + i * CW + (CW - 4) / 2, y: ty + (showIdx ? 15 : 0), "class": "sv-addr", "text-anchor": "middle" }, s, st.address_start + i * (st.address_stride || 1));
    });
    ptr.forEach(function (p) {
      var cx = pad + p.at * CW + (CW - 4) / 2;
      if (p.side === "below") {
        var y = yBelow + p._k * 17 + 11;
        svg("text", { x: cx, y: y, "class": "sv-ptr", "text-anchor": "middle" }, s, p.name);
        if (p._k === 0) arrowHead(s, cx, yBelow - 4, "up");
      } else {
        var ya = y0 - 8 - p._k * 17;
        svg("text", { x: cx, y: ya - 2, "class": "sv-ptr", "text-anchor": "middle" }, s, p.name);
        if (p._k === 0) arrowHead(s, cx, y0 - 3, "down");
      }
    });
    return s;
  }

  /* ---------- ring ---------- */
  function renderRing(v) {
    var cells = v.state.cells, n = cells.length, rl = roles(v), R = Math.max(54, n * 15), bw = 42, bh = 32;
    var W = 2 * R + 130, H = 2 * R + 116, cx = W / 2, cy = H / 2 + 2;
    var s = frame(W, H, v.label);
    function pos(i, r) { var a = -Math.PI / 2 + (2 * Math.PI * i) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    cells.forEach(function (val, i) {
      var p = pos(i, R), role = rl[String(i)], empty = val === null || val === undefined || val === "";
      svg("rect", { x: p[0] - bw / 2, y: p[1] - bh / 2, width: bw, height: bh, rx: 6, "class": "sv-cell" + (empty ? " empty" : "") + (role ? " r-" + role : "") }, s);
      if (!empty) svg("text", { x: p[0], y: p[1] + 5, "class": "sv-val", "text-anchor": "middle" }, s, str(val));
      var q = pos(i, R - bw / 2 - 8);
      svg("text", { x: q[0], y: q[1] + 3, "class": "sv-idx", "text-anchor": "middle" }, s, i);
    });
    var groups = {};
    (v.pointers || []).forEach(function (p) {
      var k = String(p.at), g = groups[k] = (groups[k] || 0);
      var q = pos(p.at, R + 36 + g * 16);
      svg("text", { x: q[0], y: q[1] + 4, "class": "sv-ptr", "text-anchor": "middle" }, s, p.name);
      groups[k] = g + 1;
    });
    return s;
  }

  /* ---------- stack ---------- */
  function renderStack(v) {
    var st = v.state, items = st.items, cap = Math.max(st.capacity || 0, items.length), rl = roles(v), bh = 32, bw = 90;
    items.forEach(function (it) { bw = Math.max(bw, 8.6 * str(it).length + 18); });
    var W = bw + 80, H = (v.label ? 18 : 6) + cap * (bh + 2) + 24, s = frame(W, H, v.label);
    var yTop = H - 18 - cap * (bh + 2);
    for (var i = 0; i < cap; i++) {
      var y = H - 18 - (i + 1) * (bh + 2), has = i < items.length, role = rl[String(i)];
      svg("rect", { x: 56, y: y, width: bw, height: bh, rx: 6, "class": "sv-cell" + (has ? "" : " empty") + (role ? " r-" + role : "") }, s);
      if (has) svg("text", { x: 56 + bw / 2, y: y + bh / 2 + 5, "class": "sv-val", "text-anchor": "middle" }, s, str(items[i]));
      svg("text", { x: 50, y: y + bh / 2 + 4, "class": "sv-idx", "text-anchor": "end" }, s, i);
      if (has && i === items.length - 1 && st.top !== false) {
        svg("text", { x: 56 + bw + 8, y: y + bh / 2 + 4, "class": "sv-ptr" }, s, "top");
        arrowHead(s, 56 + bw + 2, y + bh / 2, "left");
      }
    }
    void yTop;
    return s;
  }

  /* ---------- linked ---------- */
  function renderLinked(v) {
    var st = v.state, nodes = st.nodes || [], byId = {}, rl = roles(v), NW = 54, NH = 34, GAP = 38, pad = 12;
    nodes.forEach(function (n) { byId[n.id] = n; });
    var order = [], seen = {}, cur = st.head === null || st.head === undefined ? null : byId[st.head];
    while (cur && !seen[cur.id]) { seen[cur.id] = 1; order.push(cur); cur = cur.next === null || cur.next === undefined ? null : byId[cur.next]; }
    var col = {}, row = {}, extra = 0;
    order.forEach(function (n, i) { col[n.id] = n.col !== undefined ? n.col : i; row[n.id] = n.row !== undefined ? n.row : 0; });
    nodes.forEach(function (n) {
      if (col[n.id] === undefined) { col[n.id] = n.col !== undefined ? n.col : extra++; row[n.id] = n.row !== undefined ? n.row : 1; }
    });
    var maxCol = 0, maxRow = 0;
    nodes.forEach(function (n) { maxCol = Math.max(maxCol, col[n.id]); maxRow = Math.max(maxRow, row[n.id]); });
    var y0 = (v.label ? 18 : 6) + 30, W = pad * 2 + (maxCol + 1) * (NW + GAP) + 26, H = y0 + maxRow * 78 + NH + 54, s = frame(W, H, v.label);
    function X(id) { return pad + col[id] * (NW + GAP); }
    function Y(id) { return y0 + row[id] * 78; }
    var tags = {};
    function tag(id, text) { (tags[id] = tags[id] || []).push(text); }
    if (st.head !== null && st.head !== undefined) tag(st.head, "head");
    if (st.tail !== null && st.tail !== undefined) tag(st.tail, "tail");
    var lab = st.labels || {};
    for (var k in lab) tag(k, lab[k]);
    if (st.head === null || st.head === undefined) {
      svg("text", { x: pad, y: y0 + NH / 2 + 4, "class": "sv-ptr" }, s, "head = ∅");
    }
    nodes.forEach(function (n) {
      var x = X(n.id), y = Y(n.id), role = rl[String(n.id)];
      svg("rect", { x: x, y: y, width: NW, height: NH, rx: 7, "class": "sv-cell" + (role ? " r-" + role : "") }, s);
      svg("text", { x: x + NW / 2, y: y + NH / 2 + 5, "class": "sv-val", "text-anchor": "middle" }, s, str(n.value));
      if (tags[n.id]) {
        svg("text", { x: x + NW / 2, y: y - 12, "class": "sv-ptr", "text-anchor": "middle" }, s, tags[n.id].join(" · "));
        arrowHead(s, x + NW / 2, y - 3, "down");
      }
      var off = st.doubly ? 9 : 0;
      if (n.next === null || n.next === undefined) {
        svg("line", { x1: x + NW, y1: y + NH / 2 - off, x2: x + NW + 18, y2: y + NH / 2 - off, "class": "sv-line" }, s);
        svg("text", { x: x + NW + 22, y: y + NH / 2 + 5 - off, "class": "sv-idx" }, s, "∅");
      } else if (byId[n.next]) {
        var m = byId[n.next], ax = x + NW, ay = y + NH / 2 - off, bx = X(m.id), by = Y(m.id) + NH / 2 - off, d;
        if (col[m.id] === col[n.id] && row[m.id] !== row[n.id]) { // straight up / down between boxes
          var down = row[m.id] > row[n.id], sx = x + NW / 2 - 6;
          svg("line", { x1: sx, y1: down ? y + NH : y, x2: sx, y2: down ? Y(m.id) : Y(m.id) + NH, "class": "sv-line" }, s);
          arrowHead(s, sx, down ? Y(m.id) : Y(m.id) + NH, down ? "down" : "up");
        } else if (col[m.id] > col[n.id]) {
          d = "M" + ax + "," + ay + " C" + (ax + 24) + "," + ay + " " + (bx - 24) + "," + by + " " + bx + "," + by;
          svg("path", { d: d, "class": "sv-line", fill: "none" }, s);
          arrowHead(s, bx, by, "right");
        } else { // backward (circular): loop under the boxes
          var yb = Math.max(Y(n.id), Y(m.id)) + NH;
          d = "M" + (x + NW / 2) + "," + (y + NH) + " C" + (x + NW / 2) + "," + (yb + 34) + " " + (bx + NW / 2) + "," + (yb + 34) + " " + (bx + NW / 2) + "," + (Y(m.id) + NH);
          svg("path", { d: d, "class": "sv-line", fill: "none" }, s);
          arrowHead(s, bx + NW / 2, Y(m.id) + NH, "up");
        }
      }
      if (st.doubly && n.prev !== null && n.prev !== undefined && byId[n.prev]) {
        var pm = byId[n.prev], px = X(pm.id), py = Y(pm.id);
        if (row[pm.id] === row[n.id]) {
          svg("line", { x1: x, y1: y + NH / 2 + off, x2: px + NW, y2: py + NH / 2 + off, "class": "sv-line prev" }, s);
          arrowHead(s, px + NW, py + NH / 2 + off, "left");
        } else {
          var up = row[pm.id] < row[n.id], qx = x + NW / 2 + 6;
          svg("line", { x1: qx, y1: up ? y : y + NH, x2: qx + (px - x) / 2, y2: up ? py + NH : py, "class": "sv-line prev" }, s);
        }
      }
    });
    return s;
  }

  /* ---------- tree ---------- */
  // Binary trees: {left,right}; n-ary trees ((2,4) trees, union-find forests): {kids: [ids]}.
  // Optional per node: color "red"|"black" (red-black trees), sub (small text under the node, e.g. a balance factor).
  function renderTree(v) {
    var st = v.state, nodes = st.nodes || [], byId = {}, rl = roles(v), pos = {}, cursor = 6, maxDepth = 0, NH = 28, VG = 54;
    var nary = nodes.some(function (n) { return n.kids !== undefined; }), hasSub = nodes.some(function (n) { return n.sub !== undefined; });
    nodes.forEach(function (n) { byId[n.id] = n; });
    function kidsOf(n) {
      if (n.kids) return n.kids;
      var a = [];
      if (n.left !== undefined && n.left !== null) a.push(n.left);
      if (n.right !== undefined && n.right !== null) a.push(n.right);
      return a;
    }
    function width(n) { return Math.max(34, 8.2 * str(n.label).length + 16); }
    function place(id, depth) {
      var n = byId[id]; if (!n || pos[id]) return;
      pos[id] = { depth: depth }; maxDepth = Math.max(maxDepth, depth);
      var w = width(n);
      if (nary) {
        var ks = kidsOf(n);
        ks.forEach(function (c) { place(c, depth + 1); });
        if (!ks.length) { pos[id].x = cursor + w / 2; cursor += w + 12; }
        else { pos[id].x = (pos[ks[0]].x + pos[ks[ks.length - 1]].x) / 2; cursor = Math.max(cursor, pos[id].x + w / 2 + 12); }
        pos[id].w = w;
        return;
      }
      if (n.left !== undefined && n.left !== null) place(n.left, depth + 1);
      pos[id].x = cursor + w / 2; pos[id].w = w; cursor += w + 12;
      if (n.right !== undefined && n.right !== null) place(n.right, depth + 1);
    }
    if (st.root !== undefined && st.root !== null) place(st.root, 0);
    var W = Math.max(cursor + 6, 90), y0 = (v.label ? 18 : 6) + 4, H = y0 + maxDepth * VG + NH + 10 + (hasSub ? 8 : 0), s = frame(W, H, v.label);
    nodes.forEach(function (n) {
      if (!pos[n.id]) return;
      kidsOf(n).forEach(function (c) {
        if (!pos[c]) return;
        var on = rl[String(n.id)] && rl[String(c)];
        svg("line", { x1: pos[n.id].x, y1: y0 + pos[n.id].depth * VG + NH, x2: pos[c].x, y2: y0 + pos[c].depth * VG, "class": "sv-line" + (on ? " on" : "") }, s);
      });
    });
    nodes.forEach(function (n) {
      var p = pos[n.id]; if (!p) return;
      var role = rl[String(n.id)] || n.role, rb = n.color === "red" ? " rb-red" : (n.color === "black" ? " rb-black" : "");
      svg("rect", { x: p.x - p.w / 2, y: y0 + p.depth * VG, width: p.w, height: NH, rx: 13, "class": "sv-cell" + rb + (role ? " r-" + role : "") }, s);
      svg("text", { x: p.x, y: y0 + p.depth * VG + NH / 2 + 5, "class": "sv-val" + (n.color === "black" ? " on-dark" : ""), "text-anchor": "middle" }, s, str(n.label));
      if (n.sub !== undefined) svg("text", { x: p.x, y: y0 + p.depth * VG + NH + 11, "class": "sv-idx", "text-anchor": "middle" }, s, str(n.sub));
    });
    return s;
  }

  /* ---------- chains (hash table with separate chaining) ---------- */
  // state: {buckets: [[key, ...], ...], size?: n}; highlight `at` = [bucket, bucket, position-in-chain] triples are not used:
  // highlight {at:[i]} marks bucket i's slot, {at:["i.j"]} marks entry j of bucket i.
  function renderChains(v) {
    var bs = v.state.buckets || [], rl = roles(v), RH = 34, BW = 40, EW = 44, pad = 10, maxLen = 0;
    bs.forEach(function (b) { maxLen = Math.max(maxLen, b.length); });
    var y0 = v.label ? 22 : 8, W = pad * 2 + 22 + BW + Math.max(1, maxLen) * (EW + 14) + 14, H = y0 + bs.length * RH + 6, s = frame(W, H, v.label);
    bs.forEach(function (b, i) {
      var y = y0 + i * RH, role = rl[String(i)];
      svg("text", { x: pad + 14, y: y + RH / 2 + 4, "class": "sv-idx", "text-anchor": "end" }, s, i);
      svg("rect", { x: pad + 20, y: y + 2, width: BW, height: RH - 6, rx: 6, "class": "sv-cell" + (b.length ? "" : " empty") + (role ? " r-" + role : "") }, s);
      var x = pad + 20 + BW;
      b.forEach(function (key, j) {
        var r2 = rl[i + "." + j];
        svg("line", { x1: x, y1: y + RH / 2 - 1, x2: x + 12, y2: y + RH / 2 - 1, "class": "sv-line" }, s);
        arrowHead(s, x + 14, y + RH / 2 - 1, "right");
        svg("rect", { x: x + 14, y: y + 2, width: EW, height: RH - 6, rx: 6, "class": "sv-cell" + (r2 ? " r-" + r2 : "") }, s);
        svg("text", { x: x + 14 + EW / 2, y: y + RH / 2 + 4, "class": "sv-val", "text-anchor": "middle" }, s, str(key));
        x += EW + 14;
      });
      if (!b.length) svg("text", { x: pad + 20 + BW + 8, y: y + RH / 2 + 4, "class": "sv-idx" }, s, "∅");
    });
    return s;
  }

  /* ---------- graph ---------- */
  // state: {nodes: [{id, row, col, label?, sub?}], edges: [{a, b, w?, state?: "tree"|"rejected"|"on"}], directed?: bool}
  // node highlight roles come from `highlight`; `label` replaces the id inside the circle, `sub` is a small text under it.
  function renderGraph(v) {
    var st = v.state, nodes = st.nodes || [], rl = roles(v), CX = 78, CY = 66, R = 17, pad = 26, maxR = 0, maxC = 0, byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; maxR = Math.max(maxR, n.row); maxC = Math.max(maxC, n.col); });
    var y0 = (v.label ? 20 : 8) + 10, W = pad * 2 + maxC * CX + 20, H = y0 + maxR * CY + 2 * R + 26, s = frame(W, H, v.label);
    function X(n) { return pad + 10 + n.col * CX; }
    function Y(n) { return y0 + R + n.row * CY; }
    (st.edges || []).forEach(function (e) {
      var a = byId[e.a], b = byId[e.b]; if (!a || !b) return;
      var x1 = X(a), y1 = Y(a), x2 = X(b), y2 = Y(b), dx = x2 - x1, dy = y2 - y1, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var sx = x1 + dx / d * R, sy = y1 + dy / d * R, ex = x2 - dx / d * R, ey = y2 - dy / d * R;
      var cls = "sv-line" + (e.state === "tree" || e.state === "on" ? " on" : "") + (e.state === "rejected" ? " rejected" : "");
      svg("line", { x1: sx, y1: sy, x2: ex, y2: ey, "class": cls }, s);
      if (st.directed) {
        var ang = Math.atan2(dy, dx), L = 9;
        svg("polygon", { points: [ex, ey, ex - L * Math.cos(ang - 0.4), ey - L * Math.sin(ang - 0.4), ex - L * Math.cos(ang + 0.4), ey - L * Math.sin(ang + 0.4)].join(","), "class": "sv-arrow" }, s);
      }
      if (e.w !== undefined && e.w !== null) {
        var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, nx = -dy / d * 9, ny = dx / d * 9;
        svg("text", { x: mx + nx, y: my + ny + 4, "class": "sv-ew" + (e.state === "tree" || e.state === "on" ? " on" : ""), "text-anchor": "middle" }, s, str(e.w));
      }
    });
    nodes.forEach(function (n) {
      var role = rl[String(n.id)];
      svg("circle", { cx: X(n), cy: Y(n), r: R, "class": "sv-cell" + (role ? " r-" + role : "") }, s);
      svg("text", { x: X(n), y: Y(n) + 5, "class": "sv-val", "text-anchor": "middle" }, s, str(n.label !== undefined ? n.label : n.id));
      if (n.sub !== undefined) svg("text", { x: X(n), y: Y(n) + R + 13, "class": "sv-idx", "text-anchor": "middle" }, s, str(n.sub));
    });
    return s;
  }

  /* ---------- text ---------- */
  function renderText(v) {
    var lines = v.state.lines || [], rl = roles(v), maxLen = 10;
    lines.forEach(function (l) { maxLen = Math.max(maxLen, str(l).length); });
    var W = maxLen * 8.2 + 20, y0 = v.label ? 22 : 8, H = y0 + lines.length * 20 + 8, s = frame(W, H, v.label);
    lines.forEach(function (l, i) {
      if (rl[String(i)]) svg("rect", { x: 2, y: y0 + i * 20 - 2, width: W - 4, height: 20, rx: 4, "class": "sv-cell r-" + rl[String(i)] }, s);
      svg("text", { x: 10, y: y0 + i * 20 + 13, "class": "sv-val left" }, s, str(l));
    });
    return s;
  }

  var RENDER = { array: renderArray, ring: renderRing, stack: renderStack, linked: renderLinked, tree: renderTree, text: renderText, chains: renderChains, graph: renderGraph };

  /* ---------- player ---------- */
  function mount(card, trace) {
    var frames = trace.frames || [];
    if (!frames.length) return;
    var lang = function () { return document.documentElement.getAttribute("data-lang") === "java" ? "java" : "py"; };
    var idx = 0, pending = -1, revealed = {}, timer = null, speed = 1;
    card.classList.remove("placeholder");
    card.textContent = "";
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", "Interactive step-through: " + (trace.title || trace.id));
    var head = h("div", "head", card);
    h("span", "title", head, trace.title || trace.id);
    h("span", "live-tag", head, "STEP-THROUGH");
    if (trace.hint) h("p", "hint", card, trace.hint);
    var body = h("div", "dbody", card);
    var wide = frames.some(function (f) { return (f.views || []).some(function (v) { return v.structure === "tree" || v.structure === "graph"; }); });
    if (wide) body.className += " wide";
    var views = h("div", "dviews", body);
    var codeBox = trace.source ? h("pre", "dcode", body) : null;
    var counters = h("div", "dcounters", card);
    var caption = h("p", "dcaption", card);
    caption.setAttribute("aria-live", "polite");
    var pbox = h("div", "dpredict", card);
    pbox.hidden = true;
    var ctl = h("div", "dctl", card);
    function btn(label, aria) { var b = h("button", "dbtn", ctl, label); b.type = "button"; if (aria) b.setAttribute("aria-label", aria); return b; }
    var bReset = btn("Reset", "Back to the first step"), bBack = btn("Back", "Previous step"), bPlay = btn("Play", "Play or pause"), bNext = btn("Step", "Next step");
    var slider = h("input", "dslider", ctl); slider.type = "range"; slider.min = 0; slider.max = frames.length - 1; slider.value = 0; slider.setAttribute("aria-label", "Step");
    var pos = h("span", "dpos", ctl);
    var sp = h("select", "dspeed", ctl);
    [["0.5×", 0.5], ["1×", 1], ["2×", 2]].forEach(function (o) { var op = h("option", "", sp, o[0]); op.value = o[1]; if (o[1] === 1) op.selected = true; });
    sp.setAttribute("aria-label", "Speed");

    function drawCode(f) {
      if (!codeBox) return;
      var src = trace.source[lang()] || trace.source.py;
      codeBox.textContent = "";
      if (!src) return;
      var cur = f.code_line ? f.code_line[lang()] : 0;
      src.code.split("\n").forEach(function (line, i) {
        var l = h("span", "ln" + (cur === i + 1 ? " on" : ""), codeBox);
        h("span", "no", l, String(i + 1));
        l.appendChild(document.createTextNode(line + "\n"));
        if (cur === i + 1) l.setAttribute("aria-current", "step");
      });
      var on = codeBox.querySelector(".on");
      if (on && codeBox.scrollHeight > codeBox.clientHeight + 4) codeBox.scrollTop = Math.max(0, on.offsetTop - codeBox.clientHeight / 2);
    }
    function draw() {
      var f = frames[idx];
      views.textContent = "";
      (f.views || []).forEach(function (v) { var w = h("div", "dview", views); var fn = RENDER[v.structure]; if (fn) w.appendChild(fn(v)); });
      counters.textContent = "";
      var cs = f.counters || {};
      Object.keys(cs).forEach(function (k) { var c = h("span", "chip", counters); c.appendChild(document.createTextNode(k + " ")); h("b", "", c, String(cs[k])); });
      caption.textContent = f.caption || "";
      drawCode(f);
      slider.value = idx;
      pos.textContent = (idx + 1) + " / " + frames.length;
      bBack.disabled = idx === 0 && pending < 0;
      bReset.disabled = idx === 0 && pending < 0;
      bNext.disabled = idx === frames.length - 1 && pending < 0;
      bPlay.textContent = timer ? "Pause" : (idx === frames.length - 1 ? "Replay" : "Play");
    }
    function showPredict(i) {
      pending = i;
      var p = frames[i].predict;
      pbox.textContent = "";
      pbox.hidden = false;
      var q = h("p", "q", pbox);
      h("b", "", q, "PREDICT · ");
      q.appendChild(document.createTextNode(p.question));
      var b = h("button", "dbtn reveal", pbox, "Show the answer");
      b.type = "button";
      b.addEventListener("click", function () {
        revealed[i] = true;
        h("p", "a", pbox, p.answer);
        b.remove();
        var go = h("button", "dbtn", pbox, "Continue"); go.type = "button";
        go.addEventListener("click", function () { hidePredict(); goTo(i); });
        go.focus();
      });
      b.focus();
      stop();
      draw();
    }
    function hidePredict() { pending = -1; pbox.hidden = true; pbox.textContent = ""; }
    function goTo(i, user) {
      i = Math.max(0, Math.min(frames.length - 1, i));
      if (pending >= 0) hidePredict();
      if (i > idx && user && frames[i].predict && !revealed[i] && i === idx + 1) { showPredict(i); return; }
      for (var k = 0; k <= i; k++) revealed[k] = true;
      idx = i;
      draw();
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function play() {
      if (timer) { stop(); draw(); return; }
      if (idx === frames.length - 1) goTo(0);
      timer = setInterval(function () {
        if (idx >= frames.length - 1) { stop(); draw(); return; }
        goTo(idx + 1, true);
      }, 1500 / speed);
      draw();
    }
    bReset.addEventListener("click", function () { stop(); revealed = {}; goTo(0); });
    bBack.addEventListener("click", function () { stop(); goTo(pending >= 0 ? idx : idx - 1); });
    bNext.addEventListener("click", function () { stop(); goTo(idx + 1, true); });
    bPlay.addEventListener("click", play);
    slider.addEventListener("input", function () { stop(); goTo(+slider.value); });
    sp.addEventListener("change", function () { speed = +sp.value; if (timer) { stop(); play(); } });
    card.addEventListener("keydown", function (e) {
      if (e.target && /^(INPUT|SELECT|BUTTON|TEXTAREA)$/.test(e.target.tagName) && e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      if (e.key === "ArrowRight") { e.preventDefault(); stop(); goTo(idx + 1, true); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stop(); goTo(idx - 1); }
      else if (e.key === "Home") { e.preventDefault(); stop(); goTo(0); }
      else if (e.key === "End") { e.preventDefault(); stop(); goTo(frames.length - 1); }
      else if (e.key === " " && e.target === card) { e.preventDefault(); play(); }
    });
    new MutationObserver(function () { drawCode(frames[idx]); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-lang"] });
    draw();
    card.setAttribute("data-ready", "1");
  }

  function init() {
    var cards = document.querySelectorAll(".demo.live");
    for (var i = 0; i < cards.length; i++) {
      var data = cards[i].querySelector("script.trace-data");
      if (!data) continue;
      try { mount(cards[i], JSON.parse(data.textContent)); }
      catch (err) { cards[i].setAttribute("data-error", String(err)); if (window.console) console.warn("demo failed:", err); }
    }
  }
  window.DSDemo = { mount: mount, init: init, render: RENDER };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
