/**
 * KAGE 3D SCENE & SHADER ENGINE — ADAPTED FOR JIDAN JULIANA PORTFOLIO
 * Front-End Developer Cinematic WebGL Environment
 * Complete Procedural Shaders, Textures, Camera Splines & Physics
 */

(function (global) {
  'use strict';

  /* ------------------------------------------------------------ 0 · Math & Helpers */
  const Q = new URLSearchParams(location.search);
  const qs = (k, d) => { const v = Q.get(k); return v === null ? d : v; };
  const qn = (k, d) => { const v = Q.get(k); return v === null ? d : parseFloat(v); };
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE = matchMedia('(hover: none)').matches;

  const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
  const sat = v => clamp(v, 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => {
    const t = sat((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const TAU = Math.PI * 2;
  const damp = (cur, to, rate, dt) => lerp(cur, to, 1 - Math.exp(-rate * dt));

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function noise2D(seed) {
    const rnd = mulberry32(seed), p = new Uint8Array(256), perm = new Uint8Array(512);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0, t = p[i];
      p[i] = p[j]; p[j] = t;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const G = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const X = xi & 255, Y = yi & 255, xf = x - xi, yf = y - yi;
      const u = fade(xf), v = fade(yf);
      const g = (h, dx, dy) => { const q = G[h & 7]; return q[0] * dx + q[1] * dy; };
      const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
      const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
      return lerp(
        lerp(g(aa, xf, yf), g(ba, xf - 1, yf), u),
        lerp(g(ab, xf, yf - 1), g(bb, xf - 1, yf - 1), u),
        v
      );
    };
  }

  function fbm(n, x, y, oct, lac, gain) {
    let a = 0.5, f = 1, s = 0, m = 0;
    for (let i = 0; i < (oct || 4); i++) {
      s += a * n(x * f, y * f);
      m += a;
      a *= (gain || 0.5);
      f *= (lac || 2);
    }
    return s / m;
  }

  function cvs(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  const hex = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;

  function fbmCanvas(W, H, seed, octaves, baseCells, contrast) {
    const out = cvs(W, H), o = out.getContext('2d');
    o.fillStyle = '#808080';
    o.fillRect(0, 0, W, H);
    let cells = baseCells || 3, alpha = 1;
    for (let i = 0; i < (octaves || 5); i++) {
      const n = cvs(cells, cells), nx = n.getContext('2d');
      const im = nx.createImageData(cells, cells), d = im.data, r = mulberry32(seed + i * 977);
      for (let k = 0; k < cells * cells; k++) {
        const v = 128 + (r() - 0.5) * 255 * (contrast || 1);
        d[k * 4] = d[k * 4 + 1] = d[k * 4 + 2] = clamp(v, 0, 255);
        d[k * 4 + 3] = 255;
      }
      nx.putImageData(im, 0, 0);
      o.globalAlpha = alpha;
      o.globalCompositeOperation = i === 0 ? 'source-over' : 'overlay';
      o.imageSmoothingEnabled = true;
      o.imageSmoothingQuality = 'high';
      o.drawImage(n, 0, 0, W, H);
      cells *= 2;
      alpha *= 0.62;
    }
    o.globalAlpha = 1;
    o.globalCompositeOperation = 'source-over';
    return out;
  }

  function normalFromHeight(hc, strength) {
    const W = hc.width, H = hc.height;
    const b = cvs(W, H), bx = b.getContext('2d');
    bx.filter = 'blur(1.1px)';
    bx.drawImage(hc, 0, 0);
    bx.filter = 'none';
    const src = bx.getImageData(0, 0, W, H).data;
    const out = cvs(W, H), ox = out.getContext('2d');
    const im = ox.createImageData(W, H), d = im.data;
    const at = (x, y) => src[(((y + H) % H) * W + ((x + W) % W)) * 4] / 255;
    const s = strength || 2.4;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const gx = (at(x + 1, y) - at(x - 1, y)) * s;
        const gy = (at(x, y + 1) - at(x, y - 1)) * s;
        let nx = -gx, ny = gy, nz = 1;
        const il = 1 / Math.hypot(nx, ny, nz);
        const i = (y * W + x) * 4;
        d[i] = (nx * il * 0.5 + 0.5) * 255;
        d[i + 1] = (ny * il * 0.5 + 0.5) * 255;
        d[i + 2] = (nz * il * 0.5 + 0.5) * 255;
        d[i + 3] = 255;
      }
    }
    ox.putImageData(im, 0, 0);
    return out;
  }

  /* ------------------------------------------------------------ 1 · Procedural Texture Synthesizers */
  function texWall() {
    const W = 1024, H = 1024;
    const c = cvs(W, H), x = c.getContext('2d');
    x.fillStyle = '#0a1016';
    x.fillRect(0, 0, W, H);

    x.globalCompositeOperation = 'overlay';
    x.globalAlpha = 0.82;
    x.drawImage(fbmCanvas(W, H, 41, 6, 3, 1), 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';

    const rnd = mulberry32(7);
    for (let i = 1; i < 6; i++) {
      const y = (H / 6) * i;
      x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, y - 1.5, W, 3);
      x.fillStyle = 'rgba(100,160,255,.05)'; x.fillRect(0, y + 2, W, 2);
    }
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        const cx2 = (W / 4) * (j + 0.5) + (rnd() - 0.5) * 14, cy = (H / 6) * (i + 0.5);
        const g = x.createRadialGradient(cx2, cy, 1, cx2, cy, 11);
        g.addColorStop(0, 'rgba(0,0,0,.5)');
        g.addColorStop(0.7, 'rgba(0,0,0,.18)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.beginPath(); x.arc(cx2, cy, 11, 0, TAU); x.fill();
      }
    }
    for (let i = 0; i < 190; i++) {
      const sx = rnd() * W, w = 0.6 + rnd() * 3.4, top = rnd() * H * 0.5, len = H * (0.4 + rnd() * 0.7);
      const g = x.createLinearGradient(0, top, 0, top + len);
      const dark = rnd() > 0.45;
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.25, dark ? 'rgba(0,0,0,.20)' : 'rgba(100,180,255,.04)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(sx, top, w, len);
    }

    const h = cvs(W, H), hx = h.getContext('2d');
    hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
    hx.globalAlpha = 0.5; hx.drawImage(fbmCanvas(W, H, 41, 5, 6, 1), 0, 0); hx.globalAlpha = 1;
    for (let i = 1; i < 6; i++) { hx.fillStyle = '#2a2a2a'; hx.fillRect(0, (H / 6) * i - 2, W, 4); }
    return { map: c, normal: normalFromHeight(h, 2.0) };
  }

  function texFloor() {
    const W = 1024, H = 1024;
    const c = cvs(W, H), x = c.getContext('2d');
    const rnd = mulberry32(23);
    x.fillStyle = '#080d12'; x.fillRect(0, 0, W, H);
    const N = 4, S = W / N;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const t = 0.82 + rnd() * 0.36;
        x.fillStyle = hex(10 * t, 16 * t, 24 * t);
        x.fillRect(i * S + 1.5, j * S + 1.5, S - 3, S - 3);
      }
    }
    x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.55;
    x.drawImage(fbmCanvas(W, H, 63, 6, 4, 1), 0, 0);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';

    x.strokeStyle = 'rgba(0,0,0,.72)'; x.lineWidth = 3;
    for (let i = 0; i <= N; i++) {
      x.beginPath(); x.moveTo(i * S, 0); x.lineTo(i * S, H); x.stroke();
      x.beginPath(); x.moveTo(0, i * S); x.lineTo(W, i * S); x.stroke();
    }
    const h = cvs(W, H), hx = h.getContext('2d');
    hx.fillStyle = '#8c8c8c'; hx.fillRect(0, 0, W, H);
    hx.globalAlpha = 0.35; hx.drawImage(fbmCanvas(W, H, 63, 5, 8, 1), 0, 0); hx.globalAlpha = 1;
    hx.strokeStyle = '#303030'; hx.lineWidth = 5;
    for (let i = 0; i <= N; i++) {
      hx.beginPath(); hx.moveTo(i * S, 0); hx.lineTo(i * S, H); hx.stroke();
      hx.beginPath(); hx.moveTo(0, i * S); hx.lineTo(W, i * S); hx.stroke();
    }
    const r = cvs(512, 512), rx = r.getContext('2d');
    rx.fillStyle = '#1c1c1c'; rx.fillRect(0, 0, 512, 512);
    rx.globalAlpha = 0.95; rx.globalCompositeOperation = 'lighten';
    rx.drawImage(fbmCanvas(512, 512, 77, 4, 3, 1.5), 0, 0);
    rx.globalAlpha = 1; rx.globalCompositeOperation = 'source-over';
    return { map: c, normal: normalFromHeight(h, 1.5), rough: r };
  }

  function texWood(seed, opt) {
    const o = opt || {}, W = 512, H = 512;
    const c = cvs(W, H), x = c.getContext('2d');
    const h = cvs(W, H), hx = h.getContext('2d');
    const r = cvs(W, H), rx = r.getContext('2d');
    const rnd = mulberry32(seed || 3);
    const base = o.base || [22, 25, 30];
    x.fillStyle = hex(base[0], base[1], base[2]); x.fillRect(0, 0, W, H);
    hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
    rx.fillStyle = o.rough || '#d6d6d6'; rx.fillRect(0, 0, W, H);

    const nb = o.boards === undefined ? 7 : o.boards;
    const cuts = [0];
    if (nb > 0) {
      const ws = []; let sum = 0;
      for (let i = 0; i < nb; i++) { const v = 0.7 + rnd() * 0.6; ws.push(v); sum += v; }
      let acc = 0;
      ws.forEach(v => { acc += (v / sum) * W; cuts.push(acc); });
    } else cuts.push(W);

    const stroke = (pts, ctx, style, w) => {
      if (pts.length < 2) return;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.strokeStyle = style; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
    };

    for (let b = 0; b < cuts.length - 1; b++) {
      const x0 = cuts[b], x1 = cuts[b + 1], bw = x1 - x0;
      const tone = 0.8 + rnd() * 0.44;
      const pith = x0 + bw * (rnd() * 2.8 - 0.9);
      const d0 = bw * (0.12 + rnd() * 1.7);
      const amp = bw * (0.1 + rnd() * 0.4);
      const per = 1 + ((rnd() * 2) | 0), ph = rnd() * TAU;
      const dAt = y => d0 + Math.sin((y / H) * TAU * per + ph) * amp;
      const gap = 2.4 + rnd() * 5.0;

      [x, hx, rx].forEach(d => { d.save(); d.beginPath(); d.rect(x0, 0, bw, H); d.clip(); });
      x.fillStyle = hex(base[0] * tone, base[1] * tone, base[2] * tone);
      x.fillRect(x0, 0, bw, H);

      for (let k = 1; k * gap < bw * 3.4 + d0 + amp; k++) {
        const rr = k * gap * (0.88 + rnd() * 0.24);
        const dark = 0.42 + rnd() * 0.38, wide = 0.8 + rnd() * 1.9;
        for (const side of [-1, 1]) {
          let pts = [];
          const flush = () => {
            stroke(pts, x, `rgba(0,0,0,${dark.toFixed(2)})`, wide);
            stroke(pts, hx, `rgba(0,0,0,${(dark * 0.8).toFixed(2)})`, wide);
            stroke(pts.map(q => [q[0] + side * (wide + 0.6), q[1]]), x,
              `rgba(110,140,180,${(dark * 0.30).toFixed(2)})`, wide * 0.7);
            pts = [];
          };
          for (let y = -3; y <= H + 3; y += 3) {
            const d = dAt(y), q = rr * rr - d * d;
            if (q <= 0) { flush(); continue; }
            pts.push([pith + side * Math.sqrt(q), y]);
          }
          flush();
        }
      }
      [x, hx, rx].forEach(d => d.restore());

      if (nb > 0) {
        x.fillStyle = 'rgba(0,0,0,.80)'; x.fillRect(x1 - 1.1, 0, 2.2, H);
        x.fillStyle = 'rgba(100,150,220,.14)'; x.fillRect(x1 + 1.1, 0, 1.1, H);
        hx.fillStyle = 'rgba(0,0,0,.85)'; hx.fillRect(x1 - 1.3, 0, 2.6, H);
        hx.fillStyle = 'rgba(255,255,255,.35)'; hx.fillRect(x1 + 1.3, 0, 1.6, H);
      }
    }
    return { map: c, normal: normalFromHeight(h, o.relief || 2.4), rough: r };
  }

  function texStone(seed, opt) {
    const o = opt || {}, W = 512, H = 512;
    const c = cvs(W, H), x = c.getContext('2d');
    const h = cvs(W, H), hx = h.getContext('2d');
    const r = cvs(W, H), rx = r.getContext('2d');
    const rnd = mulberry32(seed || 17);
    const base = o.base || [36, 44, 52];
    x.fillStyle = hex(base[0], base[1], base[2]); x.fillRect(0, 0, W, H);
    hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
    rx.fillStyle = '#e8e8e8'; rx.fillRect(0, 0, W, H);

    for (let i = 0; i < 3000; i++) {
      const s = 0.6 + rnd() * 2.5, px = rnd() * W, py = rnd() * H;
      x.fillStyle = `rgba(180,210,240,${0.06 + rnd() * 0.2})`;
      x.beginPath(); x.arc(px, py, s, 0, TAU); x.fill();
    }
    return { map: c, normal: normalFromHeight(h, o.relief || 3.0), rough: r };
  }

  function texLacquer() {
    const W = 512, H = 512;
    const wood = texWood(131, { base: [18, 26, 40], boards: 0 });
    const c = cvs(W, H), x = c.getContext('2d');
    const h = cvs(W, H), hx = h.getContext('2d');
    const r = cvs(W, H), rx = r.getContext('2d');
    x.drawImage(wood.map, 0, 0);
    hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
    rx.fillStyle = '#8c8c8c'; rx.fillRect(0, 0, W, H);

    x.globalAlpha = 0.85; x.fillStyle = '#102540'; x.fillRect(0, 0, W, H);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.42;
    x.drawImage(wood.map, 0, 0);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    return { map: c, normal: normalFromHeight(h, 2.2), rough: r };
  }

  function texShoji() {
    const W = 1024, H = 768, c = cvs(W, H), x = c.getContext('2d');
    x.clearRect(0, 0, W, H);
    x.fillStyle = 'rgba(180,220,255,.07)'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(8,16,24,.90)';
    const cols = 12, rows = 9;
    x.lineWidth = 5;
    for (let i = 1; i < cols; i++) { x.beginPath(); x.moveTo((W / cols) * i, 0); x.lineTo((W / cols) * i, H); x.stroke(); }
    for (let j = 1; j < rows; j++) { x.beginPath(); x.moveTo(0, (H / rows) * j); x.lineTo(W, (H / rows) * j); x.stroke(); }
    x.lineWidth = 13; x.strokeStyle = 'rgba(6,12,20,.95)';
    x.strokeRect(0, 0, W, H);
    x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.stroke();
    return c;
  }

  function texLeaf() {
    const S = 128, c = cvs(S, S), x = c.getContext('2d');
    x.translate(S / 2, S * 0.92); x.scale(S / 2.2, -S / 2.2);
    x.beginPath();
    const lobes = 5, spread = 1.9;
    for (let i = 0; i < lobes; i++) {
      const a = -spread / 2 + spread * (i / (lobes - 1)) + Math.PI / 2;
      const len = i === 2 ? 0.96 : (i === 1 || i === 3 ? 0.82 : 0.6);
      const wob = 0.17;
      x.moveTo(0, 0.02);
      x.lineTo(Math.cos(a - wob) * len * 0.55, Math.sin(a - wob) * len * 0.55);
      x.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      x.lineTo(Math.cos(a + wob) * len * 0.55, Math.sin(a + wob) * len * 0.55);
      x.closePath();
    }
    x.fillStyle = '#fff'; x.fill();
    return c;
  }

  function texSky() {
    const W = 512, H = 512, c = cvs(W, H), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgb(4,8,14)');
    g.addColorStop(0.34, 'rgb(8,16,26)');
    g.addColorStop(0.66, 'rgb(12,22,34)');
    g.addColorStop(0.88, 'rgb(18,30,46)');
    g.addColorStop(1, 'rgb(10,18,28)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    x.globalAlpha = 0.34; x.globalCompositeOperation = 'overlay';
    x.drawImage(fbmCanvas(W, H, 313, 5, 3, 0.9), 0, 0);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';

    const wg = x.createRadialGradient(W * 0.68, H * 0.95, 4, W * 0.68, H * 0.95, W * 0.44);
    wg.addColorStop(0, 'rgba(59,130,246,.28)');
    wg.addColorStop(0.5, 'rgba(29,78,216,.10)');
    wg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = wg; x.fillRect(0, 0, W, H);

    const rnd = mulberry32(881);
    for (let i = 0; i < 480; i++) {
      const sx = rnd() * W, sy = rnd() * H * 0.78, r = 0.5 + rnd() * rnd() * 1.8;
      x.fillStyle = `rgba(200,230,255,${(0.15 + rnd() * 0.5) * (1 - sy / H)})`;
      x.beginPath(); x.arc(sx, sy, r, 0, TAU); x.fill();
    }
    return c;
  }

  function texRidge() {
    const W = 2048, H = 512, c = cvs(W, H), x = c.getContext('2d');
    const n = noise2D(1207), rnd = mulberry32(1207);
    x.beginPath(); x.moveTo(0, H);
    for (let i = 0; i <= W; i += 4) {
      const t = i / W;
      const ridge = 0.46 + 0.3 * (fbm(n, t * 2.4, 0.5, 4, 2.1, 0.55) * 0.5 + 0.5)
                        + 0.16 * (fbm(n, t * 7.5, 3.1, 3, 2.2, 0.5) * 0.5 + 0.5);
      x.lineTo(i, H - ridge * H * 0.84);
    }
    x.lineTo(W, H); x.closePath();
    x.fillStyle = '#03060a'; x.fill();
    for (let i = 0; i < 460; i++) {
      const px = rnd() * W, t = px / W;
      const ridge = 0.46 + 0.3 * (fbm(n, t * 2.4, 0.5, 4, 2.1, 0.55) * 0.5 + 0.5)
                        + 0.16 * (fbm(n, t * 7.5, 3.1, 3, 2.2, 0.5) * 0.5 + 0.5);
      const by = H - ridge * H * 0.84, hh = 8 + rnd() * 30, ww = 3 + rnd() * 6;
      x.beginPath(); x.moveTo(px, by - hh); x.lineTo(px + ww, by + 4); x.lineTo(px - ww, by + 4);
      x.closePath(); x.fill();
    }
    return c;
  }

  function texRoof() {
    const W = 512, H = 512, c = cvs(W, H), x = c.getContext('2d');
    const h = cvs(W, H), hx = h.getContext('2d');
    x.fillStyle = '#0f1720'; x.fillRect(0, 0, W, H);
    hx.fillStyle = '#606060'; hx.fillRect(0, 0, W, H);
    const ribs = 14, s = W / ribs;
    for (let i = 0; i < ribs; i++) {
      const g = x.createLinearGradient(i * s, 0, (i + 1) * s, 0);
      g.addColorStop(0, 'rgba(0,0,0,.62)');
      g.addColorStop(0.3, 'rgba(96,165,250,.12)');
      g.addColorStop(0.66, 'rgba(37,99,235,.05)');
      g.addColorStop(1, 'rgba(0,0,0,.62)');
      x.fillStyle = g; x.fillRect(i * s, 0, s, H);

      const hg = hx.createLinearGradient(i * s, 0, (i + 1) * s, 0);
      hg.addColorStop(0, '#2c2c2c'); hg.addColorStop(0.5, '#eaeaea'); hg.addColorStop(1, '#2c2c2c');
      hx.fillStyle = hg; hx.fillRect(i * s, 0, s, H);
    }
    return { map: c, normal: normalFromHeight(h, 2.2) };
  }

  /* Celestial Lunar Orb - Styled for Developer Horizon */
  function texMoon() {
    const S = 1024, c = cvs(S, S), x = c.getContext('2d');
    const R = S / 2 - 2, rnd = mulberry32(91);
    const px = (u, v) => [S / 2 + u * R, S / 2 + v * R];

    x.beginPath(); x.arc(S / 2, S / 2, R, 0, TAU); x.closePath();
    x.save(); x.clip();

    const g = x.createRadialGradient(S * 0.44, S * 0.40, S * 0.04, S / 2, S / 2, R);
    g.addColorStop(0, 'rgb(210,232,255)');
    g.addColorStop(0.35, 'rgb(175,208,252)');
    g.addColorStop(0.70, 'rgb(135,175,235)');
    g.addColorStop(0.92, 'rgb(95,138,215)');
    g.addColorStop(1, 'rgb(75,115,190)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);

    x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.42;
    x.drawImage(fbmCanvas(512, 512, 517, 7, 4, 1.15), 0, 0, S, S);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';

    const seas = [
      [-0.52, -0.06, 0.46, 0.85],
      [-0.26, -0.38, 0.31, 0.94],
      [0.13, -0.31, 0.20, 0.90],
      [0.30, -0.08, 0.23, 0.86],
      [0.45, 0.12, 0.15, 0.80],
      [0.57, -0.30, 0.12, 0.96]
    ];
    const sea = cvs(S, S), sx = sea.getContext('2d');
    seas.forEach(([u, v, rad, dk]) => {
      for (let i = 0; i < 32; i++) {
        const a = rnd() * TAU, off = rnd() * rad * 0.68;
        const [bx, by] = px(u + Math.cos(a) * off, v + Math.sin(a) * off * 0.8);
        const rr = rad * R * (0.25 + rnd() * 0.44);
        const bg = sx.createRadialGradient(bx, by, rr * 0.15, bx, by, rr);
        bg.addColorStop(0, `rgba(4,16,42,${(dk * 0.22).toFixed(3)})`);
        bg.addColorStop(0.6, `rgba(4,16,42,${(dk * 0.10).toFixed(3)})`);
        bg.addColorStop(1, 'rgba(0,0,0,0)');
        sx.fillStyle = bg; sx.beginPath(); sx.arc(bx, by, rr, 0, TAU); sx.fill();
      }
    });
    x.save(); x.filter = 'blur(1.5px)'; x.globalAlpha = 0.95;
    x.drawImage(sea, 0, 0); x.restore();

    // Sharp outer rim glow
    const rim = x.createRadialGradient(S / 2, S / 2, R * 0.88, S / 2, S / 2, R);
    rim.addColorStop(0, 'rgba(255,255,255,0)');
    rim.addColorStop(0.85, 'rgba(215,238,255,0.3)');
    rim.addColorStop(1, 'rgba(255,255,255,0.7)');
    x.fillStyle = rim; x.beginPath(); x.arc(S / 2, S / 2, R, 0, TAU); x.fill();

    x.restore();
    return c;
  }

  function texGlow(inner, mid) {
    const S = 256, c = cvs(S, S), x = c.getContext('2d');
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, inner || 'rgba(96,165,250,1)');
    g.addColorStop(0.28, mid || 'rgba(59,130,246,.36)');
    g.addColorStop(0.62, 'rgba(37,99,235,.07)');
    g.addColorStop(1, 'rgba(29,78,216,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    return c;
  }

  function texWisp() {
    const S = 128, c = cvs(S, S), x = c.getContext('2d');
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.07, 'rgba(219,234,254,.92)');
    g.addColorStop(0.16, 'rgba(147,197,253,.40)');
    g.addColorStop(0.34, 'rgba(96,165,250,.13)');
    g.addColorStop(0.62, 'rgba(59,130,246,.035)');
    g.addColorStop(1, 'rgba(37,99,235,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    return c;
  }

  function texGrassCutout(seed, opt) {
    opt = opt || {};
    const W = opt.w || 2048, H = opt.h || 1024;
    const c = cvs(W, H), x = c.getContext('2d');
    const n = noise2D(seed * 13 + 5);

    const crest = opt.crest !== undefined ? opt.crest : 0.46;
    const peak = opt.peak !== undefined ? opt.peak : 0.6;
    const wide = opt.wide !== undefined ? opt.wide : 0.4;
    const prof = new Float32Array(W);
    for (let i = 0; i < W; i++) {
      const t = i / W;
      let m = Math.exp(-Math.pow((t - crest) / wide, 2) * 2.1);
      m += 0.46 * Math.exp(-Math.pow((t - crest - (opt.crest2 || 0.4)) / (wide * 0.62), 2) * 3.1);
      const g = fbm(n, t * 4.2, 0.5, 4, 2.05, 0.52) * 0.5 + 0.5;
      prof[i] = m * (0.8 + 0.38 * g);
    }
    let pk = 0;
    for (let i = 0; i < W; i++) pk = Math.max(pk, prof[i]);
    for (let i = 0; i < W; i++) prof[i] *= (H * peak) / pk;
    const surf = i => H - prof[clamp(i | 0, 0, W - 1)];

    x.beginPath(); x.moveTo(0, H);
    for (let i = 0; i < W; i += 2) x.lineTo(i, surf(i));
    x.lineTo(W, surf(W - 1)); x.lineTo(W, H); x.closePath();
    const bg = x.createLinearGradient(0, H - H * peak, 0, H);
    bg.addColorStop(0, '#102236');
    bg.addColorStop(0.2, '#0c1a2c');
    bg.addColorStop(0.5, '#060d16');
    bg.addColorStop(1, '#020408');
    x.fillStyle = bg; x.fill();

    // Soft crest rim lighting
    x.beginPath();
    for (let i = 0; i < W; i += 2) x.lineTo(i, surf(i));
    x.strokeStyle = 'rgba(59, 130, 246, 0.28)';
    x.lineWidth = 3;
    x.stroke();

    return c;
  }

  function texRockCutout(seed, opt) {
    opt = opt || {};
    const W = opt.w || 1536, H = opt.h || 1024;
    const c = cvs(W, H), x = c.getContext('2d');
    const rnd = mulberry32(seed);
    const blobs = opt.blobs || [[0.3, 0.7, 0.4, 0.34], [0.66, 0.82, 0.38, 0.28]];
    blobs.forEach((b) => {
      const cx2 = b[0] * W, cy = b[1] * H, rx = b[2] * W * 0.5, ry = b[3] * H * 0.8;
      const g = x.createLinearGradient(cx2 - rx, cy - ry, cx2 + rx * 0.4, cy + ry);
      g.addColorStop(0, '#1a2634');
      g.addColorStop(0.5, '#0b1219');
      g.addColorStop(1, '#030608');
      x.fillStyle = g; x.beginPath(); x.ellipse(cx2, cy, rx, ry, 0, 0, TAU); x.fill();
    });
    return c;
  }

  /* ------------------------------------------------------------ 2 · Three.js Setup */
  const canvas = document.getElementById('gl');
  const vpW = () => document.documentElement.clientWidth || innerWidth;
  const vpH = () => document.documentElement.clientHeight || innerHeight;
  let renderer, scene, camera, maxAniso = 1;

  const IS_MOBILE = (typeof window !== 'undefined') && (window.innerWidth < 768 || matchMedia('(pointer: coarse)').matches);
  const HI = qs('q', 'high');
  const LOW = false;
  const WANT_POST = !IS_MOBILE && qs('post', '1') !== '0';
  const WANT_SHADOW = !IS_MOBILE && qs('shadow', '0') !== '0';
  // Always use high-definition retina pixel ratio (up to 2.0) - NEVER drop to blurry 1.0!
  const DPR_CAP = Math.min(window.devicePixelRatio || 1.5, 2.0);
  // Lock resolution scale to 1.0 so performance throttle never degrades the visual sharpness
  const PERF = { scale: 1, acc: 0, n: 0, locked: true };

  function initGL() {
    if (!window.THREE) throw new Error('THREE.js library is required');
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(DPR_CAP);
    renderer.setSize(vpW(), vpH(), true);
    renderer.outputEncoding = WANT_POST ? THREE.LinearEncoding : THREE.sRGBEncoding;
    renderer.toneMapping = WANT_POST ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setClearColor(0x000000, 0);
    if (WANT_SHADOW) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    maxAniso = renderer.capabilities.getMaxAnisotropy();
    scene = new THREE.Scene();
    // Ultra-light atmospheric haze so the castle (temple) and celestial moon are razor sharp and vivid!
    scene.fog = new THREE.FogExp2(0x05090f, IS_MOBILE ? 0.0018 : 0.005);
    camera = new THREE.PerspectiveCamera(36, vpW() / vpH(), 0.35, 220);
    scene.add(camera);
  }

  function tx(canvasEl, o) {
    o = o || {};
    const t = new THREE.CanvasTexture(canvasEl);
    t.wrapS = t.wrapT = o.wrap || THREE.ClampToEdgeWrapping;
    if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
    t.anisotropy = Math.min(o.aniso || 16, maxAniso);
    if (o.srgb !== false) t.encoding = THREE.sRGBEncoding;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }

  const hdr = (r, g, b) => new THREE.Color().setRGB(r, g, b);

  function surface(t, rep, o) {
    o = o || {};
    const wrap = THREE.RepeatWrapping, aniso = o.aniso || 8;
    const m = new THREE.MeshStandardMaterial({
      map: tx(t.map, { wrap: wrap, repeat: rep, aniso: aniso }),
      normalMap: tx(t.normal, { wrap: wrap, repeat: rep, srgb: false, aniso: aniso }),
      normalScale: new THREE.Vector2(o.normal === undefined ? 0.8 : o.normal, o.normal === undefined ? 0.8 : o.normal),
      color: o.color === undefined ? 0xffffff : o.color,
      roughness: o.roughness === undefined ? 1 : o.roughness,
      metalness: o.metalness === undefined ? 0.02 : o.metalness
    });
    if (t.rough) m.roughnessMap = tx(t.rough, { wrap: wrap, repeat: rep, srgb: false });
    return m;
  }

  const LIB = {};
  const lib = (k, f) => (LIB[k] || (LIB[k] = f()));
  const wallWood = () => lib('wallWood', () => texWood(3, { boards: 7 }));
  const postWood = () => lib('postWood', () => texWood(29, { boards: 0 }));

  function sweepPoly(points, profile) {
    const segs = points.length, np = profile.length;
    const pos = [], nor = [], uv = [], idx = [];
    const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < segs; i++) {
      const p = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(segs - 1, i + 1)];
      T.subVectors(b, a).normalize();
      B.crossVectors(T, up).normalize();
      N.crossVectors(B, T).normalize();
      for (let j = 0; j < np; j++) {
        const u = profile[j][0], v = profile[j][1], l = Math.hypot(u, v) || 1;
        pos.push(p.x + B.x * u + N.x * v, p.y + B.y * u + N.y * v, p.z + B.z * u + N.z * v);
        nor.push((B.x * u) / l + (N.x * v) / l, (B.y * u) / l + (N.y * v) / l, (B.z * u) / l + (N.z * v) / l);
        uv.push(j / np, i / (segs - 1));
      }
    }
    for (let i = 0; i < segs - 1; i++) {
      for (let j = 0; j < np; j++) {
        const j2 = (j + 1) % np, a = i * np + j, b = i * np + j2, c = (i + 1) * np + j2, d = (i + 1) * np + j;
        idx.push(a, b, c, a, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  function roofGeo(A, B, R, Hr, thick, flare) {
    const NX = 52, NZ = 34, FL = flare === undefined ? 0.3 : flare, e = 1e-3;
    const hAt = (x, z) => {
      const cx = Math.min(1, Math.abs(x) / A), cz = Math.min(1, Math.abs(z) / B);
      const tx = Math.max(0, (Math.abs(x) - R) / Math.max(A - R, 1e-4));
      const t = Math.min(1, Math.max(tx, cz));
      return Hr * Math.pow(1 - t, 1.45) + FL * Hr * smooth(0.72, 1, t) * (0.52 + 0.68 * Math.min(cx, cz));
    };
    const pos = [], nor = [], uv = [], idx = [];
    const N = new THREE.Vector3();
    const VPS = (NX + 1) * (NZ + 1);
    for (let k = 0; k < 2; k++) {
      for (let j = 0; j <= NZ; j++) {
        for (let i = 0; i <= NX; i++) {
          const x = -A + (2 * A * i) / NX, z = -B + (2 * B * j) / NZ;
          N.set(
            -(hAt(x + e, z) - hAt(x - e, z)) / (2 * e),
            1,
            -(hAt(x, z + e) - hAt(x, z - e)) / (2 * e)
          ).normalize();
          if (k) N.negate();
          pos.push(x, hAt(x, z) - (k ? thick : 0), z);
          nor.push(N.x, N.y, N.z);
          uv.push(x * 0.14, z * 0.14);
        }
      }
      for (let j = 0; j < NZ; j++) {
        for (let i = 0; i < NX; i++) {
          const a = k * VPS + j * (NX + 1) + i, b = a + 1, c = a + NX + 2, d = a + NX + 1;
          k ? idx.push(a, c, b, a, d, c) : idx.push(a, b, c, a, c, d);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  function mergeGeos(list) {
    let vN = 0, iN = 0;
    list.forEach(g => { vN += g.attributes.position.count; iN += g.index.count; });
    const pos = new Float32Array(vN * 3), nor = new Float32Array(vN * 3), uv = new Float32Array(vN * 2);
    const idx = vN > 65535 ? new Uint32Array(iN) : new Uint16Array(iN);
    let vo = 0, io = 0;
    list.forEach(g => {
      pos.set(g.attributes.position.array, vo * 3);
      nor.set(g.attributes.normal.array, vo * 3);
      uv.set(g.attributes.uv.array, vo * 2);
      const gi = g.index.array;
      for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
      io += gi.length; vo += g.attributes.position.count;
      g.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    return out;
  }

  /* ------------------------------------------------------------ 3 · World Structures */
  const WORLD = {};
  const PODIUM = 7.0;
  const STEPS = 40;
  const STAIR_Z0 = -11.0;
  const STAIR_RUN = 0.55;
  const STAIR_W = 8.4;
  const TEMPLE_Z = -44;

  function buildShell() {
    const wallT = texWall();
    const wallMap = tx(wallT.map, { wrap: THREE.RepeatWrapping, repeat: [4, 1.4] });
    const wallNrm = tx(wallT.normal, { wrap: THREE.RepeatWrapping, repeat: [4, 1.4], srgb: false });
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallMap, normalMap: wallNrm, normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.78, metalness: 0.05, color: 0x485868
    });

    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(360, 190),
      new THREE.MeshBasicMaterial({
        color: hdr(0.55, 0.75, 1.05),
        map: tx(texSky()),
        depthWrite: false,
        fog: false,
        toneMapped: false
      })
    );
    sky.position.set(0, 62, -108);
    sky.renderOrder = 0;
    scene.add(sky);
    WORLD.sky = sky;

    const ridgeMap = tx(texRidge(), { wrap: THREE.RepeatWrapping, repeat: [1.7, 1] });
    [[-90, 13, 300, 26, 0], [-63, 9.5, 210, 19, 16]].forEach((r, i) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(r[2], r[3]),
        new THREE.MeshBasicMaterial({
          map: i ? tx(texRidge()) : ridgeMap,
          transparent: true,
          color: i ? 0x08101a : 0x05090e,
          depthWrite: false,
          fog: false
        })
      );
      m.position.set(r[4], r[1], r[0]);
      m.renderOrder = 1;
      scene.add(m);
    });

    const fT = texFloor();
    const floorMat = new THREE.MeshStandardMaterial({
      map: tx(fT.map, { wrap: THREE.RepeatWrapping, repeat: [7, 7], aniso: 16 }),
      normalMap: tx(fT.normal, { wrap: THREE.RepeatWrapping, repeat: [7, 7], srgb: false, aniso: 16 }),
      roughnessMap: tx(fT.rough, { wrap: THREE.RepeatWrapping, repeat: [3.4, 3.4], srgb: false }),
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughness: 0.74,
      metalness: 0.06,
      color: 0x5a6a7a
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -18);
    floor.receiveShadow = true;
    scene.add(floor);
    WORLD.floor = floor;

    const platMat = new THREE.MeshStandardMaterial({
      map: tx(fT.map, { wrap: THREE.RepeatWrapping, repeat: [3, 1.2], aniso: 16 }),
      normalMap: tx(fT.normal, { wrap: THREE.RepeatWrapping, repeat: [3, 1.2], srgb: false, aniso: 16 }),
      normalScale: new THREE.Vector2(0.18, 0.18),
      roughness: 0.93,
      metalness: 0.02,
      color: 0x4d5c6b
    });

    const plat = new THREE.Mesh(new THREE.BoxGeometry(42, PODIUM, 24), platMat);
    plat.position.set(0, PODIUM / 2, -45);
    plat.receiveShadow = true; plat.castShadow = true;
    scene.add(plat);

    const treads = [], cheeks = [];
    for (let i = 0; i < STEPS; i++) {
      const y = (i + 1) * (PODIUM / STEPS), z = STAIR_Z0 - (i + 0.5) * STAIR_RUN;
      const w = STAIR_W + (STEPS - i) * 0.052;
      treads.push(new THREE.BoxGeometry(w, PODIUM / STEPS + 0.04, STAIR_RUN + 0.04).translate(0, y - (PODIUM / STEPS) / 2, z));
      [-1, 1].forEach(s => cheeks.push(new THREE.BoxGeometry(0.9, 1.5, STAIR_RUN + 0.06).translate(s * (w / 2 + 0.45), y - 0.3, z)));
    }
    const stair = new THREE.Mesh(mergeGeos(treads), platMat);
    stair.receiveShadow = true; stair.castShadow = true; scene.add(stair);
    const rail = new THREE.Mesh(mergeGeos(cheeks), wallMat);
    rail.receiveShadow = true; rail.castShadow = true; scene.add(rail);
  }

  function buildTemple() {
    const g = new THREE.Group();
    const timber = surface(wallWood(), [4, 1.6], { color: 0x4a5562, normal: 1.5 });
    const post = surface(postWood(), [1.1, 1.0], { color: 0x7088a2, normal: 1.05, metalness: 0.03 });
    const gold = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.38, metalness: 0.78 });
    const rf = lib('roof', () => texRoof());
    const tileMat = surface(rf, [1, 1], { color: 0x243242, roughness: 0.74, metalness: 0.10, normal: 1.4 });

    const paper = new THREE.MeshBasicMaterial({ color: hdr(0.35, 0.75, 1.45), fog: true, toneMapped: false });
    const grid = new THREE.MeshBasicMaterial({ map: tx(texShoji()), transparent: true, depthWrite: false, fog: true });
    WORLD.paper = paper;

    function bay(w, h, x, y, z) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), paper);
      p.position.set(x, y, z); g.add(p);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), grid);
      s.position.set(x, y, z + 0.06); s.renderOrder = 3; g.add(s);
    }

    const F = PODIUM;
    const core = new THREE.Mesh(new THREE.BoxGeometry(13.6, 5.0, 8.2), timber);
    core.position.set(0, F + 2.5, TEMPLE_Z); core.castShadow = true; g.add(core);

    for (let i = 0; i < 5; i++) bay(1.55, 2.5, -5.6 + i * 2.8, F + 2.6, TEMPLE_Z + 4.16);
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.34, 5.0, 14), post);
      c.position.set(-7.0 + i * 2.8, F + 2.5, TEMPLE_Z + 4.24); c.castShadow = true; g.add(c);
    }

    const lower = new THREE.Mesh(roofGeo(9.6, 6.4, 3.2, 2.9, 0.40, 0.26), tileMat);
    lower.position.set(0, F + 5.6, TEMPLE_Z); lower.castShadow = true; g.add(lower);

    const up = new THREE.Mesh(new THREE.BoxGeometry(10.0, 3.4, 6.0), timber);
    up.position.set(0, F + 9.4, TEMPLE_Z); up.castShadow = true; g.add(up);

    for (let i = 0; i < 4; i++) bay(1.0, 1.35, -4.5 + i * 3.0, F + 9.5, TEMPLE_Z + 3.06);

    const plq = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.30, 0.16), gold);
    plq.position.set(0, F + 9.7, TEMPLE_Z + 3.12); g.add(plq);

    const upper = new THREE.Mesh(roofGeo(10.8, 7.2, 3.6, 5.2, 0.48, 0.26), tileMat);
    upper.position.set(0, F + 11.7, TEMPLE_Z); upper.castShadow = true; g.add(upper);

    [-1, 1].forEach(s => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.4, 5.2), timber);
      w.position.set(s * 10.6, F + 1.7, TEMPLE_Z + 1.4); w.castShadow = true; g.add(w);
      const r = new THREE.Mesh(roofGeo(5.0, 4.0, 1.4, 1.9, 0.32, 0.26), tileMat);
      r.position.set(s * 10.6, F + 3.4, TEMPLE_Z + 1.4); r.castShadow = true; g.add(r);
    });

    scene.add(g); WORLD.temple = g;

    const spill = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 12),
      new THREE.MeshBasicMaterial({
        map: tx(texGlow('rgba(96,165,250,.60)', 'rgba(37,99,235,.15)')),
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.10
      })
    );
    spill.position.set(0, F + 3.0, TEMPLE_Z + 5.6); spill.renderOrder = 2;
    scene.add(spill); WORLD.hallHalo = spill;
  }

  const MOON = { x: 17.9, y: 31.9, z: -72, r: 8.6 };
  function buildMoon() {
    const disc = new THREE.Mesh(
      new THREE.PlaneGeometry(MOON.r * 2, MOON.r * 2),
      new THREE.MeshBasicMaterial({
        map: tx(texMoon()),
        color: hdr(0.70, 1.5, 3.8),
        transparent: true, depthWrite: false, fog: false, toneMapped: false
      })
    );
    disc.position.set(MOON.x, MOON.y, MOON.z);
    disc.renderOrder = 1;
    scene.add(disc); WORLD.moon = disc;

    // Focused, luminous coronal halo — never washes out the moon's sharp circular edge
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(MOON.r * 3.2, MOON.r * 3.2),
      new THREE.MeshBasicMaterial({
        map: tx(texGlow('rgba(96,165,250,.70)', 'rgba(37,99,235,.16)')),
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.22
      })
    );
    halo.position.set(MOON.x, MOON.y, MOON.z - 0.3); halo.renderOrder = 0;
    scene.add(halo); WORLD.moonHalo = halo;
  }

  function placeMoon() {
    if (!WORLD.moon || !WORLD.moonHalo) return;
    const x = MOON.x * (1 - 0.4 * aspectFix());
    WORLD.moon.position.x = x;
    WORLD.moonHalo.position.x = x;
  }

  function buildTorii() {
    const lac = surface(lib('lacquer', () => texLacquer()), [2, 2], {
      color: hdr(0.85, 1.25, 1.8), roughness: 0.92, metalness: 0.05, normal: 0.75
    });
    const gold = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.50, metalness: 0.60 });
    const g = new THREE.Group();
    const BASE = 0.78, H = 8.2, SPAN = 3.55;

    [-1, 1].forEach(s => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.38, H, 26), lac);
      col.position.set(s * SPAN, BASE + H / 2, 0); col.castShadow = true; g.add(col);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.50, 0.52, 26), gold);
      foot.position.set(s * SPAN, BASE + 0.26, 0); foot.castShadow = true; g.add(foot);
    });

    const nuki = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.52, 0.46), lac);
    nuki.position.set(0, BASE + H - 2.15, 0); nuki.castShadow = true; g.add(nuki);

    function beamPath(half, rise, power) {
      const p = [];
      for (let i = 0; i <= 26; i++) {
        const u = (i / 26) * 2 - 1;
        p.push(new THREE.Vector3(u * half, Math.pow(Math.abs(u), power) * rise, 0));
      }
      return p;
    }

    const kasagi = new THREE.Mesh(sweepPoly(beamPath(5.85, 0.62, 2.4),
      [[-0.42, -0.24], [0.42, -0.24], [0.46, 0.04], [0.30, 0.28], [-0.30, 0.28], [-0.46, 0.04]]), lac);
    kasagi.position.set(0, BASE + H + 0.96, 0); kasagi.castShadow = true; g.add(kasagi);

    const GS = 0.72;
    g.position.set(0, -BASE * GS, -8.6); g.scale.setScalar(GS);
    scene.add(g); WORLD.torii = g;
  }

  function buildLantern(x, z, s, y) {
    const stone = lib('lanternStone', () => surface(lib('granite', () => texStone(17)), [1.5, 1.5],
      { color: 0x8a98a8, metalness: 0, normal: 1.45 }));
    const dark = lib('lanternDark', () => surface(postWood(), [0.9, 0.9],
      { color: 0xa8b8c8, metalness: 0.1, normal: 0.7 }));

    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.52, 0.26, 20), stone);
    base.position.y = 0.13; base.castShadow = true; g.add(base);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 1.02, 16), stone);
    post.position.y = 0.77; post.castShadow = true; g.add(post);

    const shelf = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.13, 20), stone);
    shelf.position.y = 1.34; shelf.castShadow = true; g.add(shelf);

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.50, 0.50), dark);
    box.position.y = 1.66; box.castShadow = true; g.add(box);

    const paneMat = new THREE.MeshBasicMaterial({ color: hdr(0.5, 1.2, 2.5), fog: false, toneMapped: false });
    [[0, 0, 0.256, 0], [0, 0, -0.256, Math.PI], [0.256, 0, 0, Math.PI / 2], [-0.256, 0, 0, -Math.PI / 2]].forEach(p => {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), paneMat);
      pane.position.set(p[0], 1.66, p[2]); pane.rotation.y = p[3]; g.add(pane);
    });

    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.62, 0.34, 4, 1), stone);
    roof.position.y = 2.06; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshBasicMaterial({
        map: tx(texGlow('rgba(96,165,250,.9)', 'rgba(37,99,235,.28)')),
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.5
      })
    );
    glow.position.y = 1.66; glow.renderOrder = 2; g.add(glow);

    const lt = new THREE.PointLight(0x3b82f6, 2.6, 9, 2);
    lt.position.set(0, 1.66, 0); g.add(lt);

    WORLD.lanternLights = WORLD.lanternLights || [];
    WORLD.lanternLights.push(lt);
    WORLD.lanternGlows = WORLD.lanternGlows || [];
    WORLD.lanternGlows.push(glow);

    g.position.set(x, y || 0, z); g.scale.setScalar(s || 1);
    scene.add(g);
    return g;
  }

  function buildMaple(seed, x, z, scale) {
    const rnd = mulberry32(seed);
    const parts = [], tips = [];
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(), pos = new THREE.Vector3();

    function seg(from, to, r0, r1) {
      dir.subVectors(to, from);
      const len = dir.length(); dir.normalize();
      const geo = new THREE.CylinderGeometry(r1, r0, len, 6, 1, true);
      Q.setFromUnitVectors(UP, dir);
      pos.addVectors(from, to).multiplyScalar(0.5);
      M.compose(pos, Q, new THREE.Vector3(1, 1, 1));
      geo.applyMatrix4(M);
      parts.push(geo);
    }

    function branch(from, dirV, len, rad, depth) {
      const to = from.clone().addScaledVector(dirV, len);
      to.y += len * 0.10;
      seg(from, to, rad, rad * 0.68);
      if (depth >= 4 || len < 0.34) { tips.push(to.clone()); return; }
      const n = depth < 2 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const d = dirV.clone();
        d.x += (rnd() - 0.5) * 1.25; d.z += (rnd() - 0.5) * 1.25; d.y += 0.30 + rnd() * 0.5;
        d.normalize();
        branch(to, d, len * (0.62 + rnd() * 0.16), rad * 0.66, depth + 1);
      }
    }

    const root = new THREE.Vector3(0, 0, 0);
    seg(root, new THREE.Vector3(0, 1.5, 0), 0.22, 0.16);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + rnd();
      branch(new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(Math.cos(a) * 0.8, 0.8, Math.sin(a) * 0.8).normalize(), 1.45, 0.155, 0);
    }
    const trunk = new THREE.Mesh(mergeGeos(parts),
      new THREE.MeshStandardMaterial({ color: 0x101620, roughness: 0.94, metalness: 0.0, side: THREE.DoubleSide }));
    trunk.castShadow = true;

    const leafGeo = new THREE.PlaneGeometry(0.36, 0.36);
    const leafMat = new THREE.MeshStandardMaterial({
      map: tx(texLeaf()), color: 0x1e3a5f, alphaTest: 0.42, side: THREE.DoubleSide,
      roughness: 0.86, metalness: 0, emissive: 0x0a1828, emissiveIntensity: 0.12
    });

    const per = LOW ? 5 : 9;
    const inst = new THREE.InstancedMesh(leafGeo, leafMat, tips.length * per);
    const m4 = new THREE.Matrix4(), e = new THREE.Euler(), q2 = new THREE.Quaternion(), sc = new THREE.Vector3();
    let k = 0;
    tips.forEach(t => {
      for (let i = 0; i < per; i++) {
        const p = new THREE.Vector3(t.x + (rnd() - 0.5) * 0.95, t.y + (rnd() - 0.5) * 0.8, t.z + (rnd() - 0.5) * 0.95);
        e.set(rnd() * TAU, rnd() * TAU, rnd() * TAU);
        q2.setFromEuler(e);
        const s = 0.7 + rnd() * 0.75; sc.set(s, s, s);
        m4.compose(p, q2, sc);
        inst.setMatrixAt(k++, m4);
      }
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;

    const g = new THREE.Group();
    g.add(trunk); g.add(inst);
    g.position.set(x, 0, z); g.scale.setScalar(scale || 1);
    g.rotation.y = rnd() * TAU;
    scene.add(g);
    return g;
  }

  function buildRocks() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x121b24, roughness: 0.46, metalness: 0.10 });
    const rnd = mulberry32(404), n = noise2D(88);
    const spots = [[-6.2, -5.4, 0.95], [-7.4, -2.1, 0.7], [6.6, -7.2, 0.8], [8.0, -4.0, 1.05]];
    spots.forEach((s, i) => {
      const geo = new THREE.IcosahedronGeometry(s[2], 2);
      const p = geo.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const vx = p.getX(v), vy = p.getY(v), vz = p.getZ(v);
        const d = 1 + 0.34 * fbm(n, vx * 1.6 + i * 7, vz * 1.6 + vy, 3, 2.2, 0.5);
        p.setXYZ(v, vx * d, vy * d * 0.68, vz * d);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      m.position.set(s[0], s[2] * 0.30, s[1]);
      m.rotation.set(rnd(), rnd() * TAU, rnd() * 0.4);
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
    });
  }

  function cutoutMaterial(canvasEl, sway) {
    const mat = new THREE.MeshBasicMaterial({
      map: tx(canvasEl, { aniso: 16 }), transparent: true, depthWrite: true,
      alphaTest: 0.012, side: THREE.DoubleSide, fog: true, color: 0xffffff
    });
    return mat;
  }

  function buildForeground() {
    const layers = [
      ['grassFar', texGrassCutout(101, { crest: 0.3, peak: 0.46, wide: 0.42, blades: 11000 }), -3.4, 2.85, -0.4, 24, 12, 0.04],
      ['rockLeft', texRockCutout(404), -7.2, 2.55, 1.8, 17, 11.3, 0.01],
      ['grassMid', texGrassCutout(202, { crest: 0.6, peak: 0.55, wide: 0.4 }), 3.9, 2.86, 3.6, 15, 7.5, 0.062],
      ['grassNear', texGrassCutout(303, { crest: 0.42, peak: 0.62, wide: 0.48 }), -1.9, 2.92, 5.6, 12, 6, 0.092]
    ];
    WORLD.fg = [];
    layers.forEach(L => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L[5], L[6], 12, 12), cutoutMaterial(L[1], L[7]));
      m.position.set(L[2], L[3], L[4]);
      m.renderOrder = 20 + WORLD.fg.length;
      m.frustumCulled = false;
      scene.add(m);
      WORLD.fg.push(m);
    });
  }

  /* ------------------------------------------------------------ 4 · 3D WebGL Wordmark ("JIDAN") */
  const WORD_Z = 3.0;
  const WORD = { glyphs: [], group: null, ink: null, reveal: 0 };

  function buildWordmark() {
    const SZ = 320, TRACK = 0.35, PAD = 26;
    const m = cvs(4, 4).getContext('2d');
    m.font = `600 ${SZ}px "Onest", "Space Grotesk", sans-serif`;
    m.textBaseline = 'alphabetic'; m.textAlign = 'left';
    const word = 'JIDAN', gl = [];
    let pen = 0, ascMax = 0, descMax = 0, xMin = 1e9, xMax = -1e9;

    for (const ch of word) {
      const t = m.measureText(ch);
      const g = {
        ch: ch, adv: t.width, asc: t.actualBoundingBoxAscent || SZ * 0.78, desc: t.actualBoundingBoxDescent || SZ * 0.15,
        l: t.actualBoundingBoxLeft || 0, r: t.actualBoundingBoxRight || t.width, pen: pen
      };
      gl.push(g);
      ascMax = Math.max(ascMax, g.asc); descMax = Math.max(descMax, g.desc);
      xMin = Math.min(xMin, pen - g.l); xMax = Math.max(xMax, pen + g.r);
      pen += t.width + TRACK * SZ;
    }

    const group = new THREE.Group();
    WORD.glyphs = [];
    gl.forEach((g) => {
      const cw = Math.ceil(g.l + g.r) + PAD * 2, chh = Math.ceil(g.asc + g.desc) + PAD * 2;
      const c = cvs(cw, chh), x = c.getContext('2d');
      x.font = `600 ${SZ}px "Onest", "Space Grotesk", sans-serif`;
      x.textBaseline = 'alphabetic'; x.textAlign = 'left';

      const gy0 = PAD + g.asc - ascMax, gy1 = PAD + g.asc + descMax * 0.4;
      const grad = x.createLinearGradient(0, gy0, 0, gy1);
      grad.addColorStop(0, 'rgb(240,246,255)');
      grad.addColorStop(0.48, 'rgb(180,210,245)');
      grad.addColorStop(1, 'rgb(96,165,250)');
      x.fillStyle = grad;
      x.fillText(g.ch, PAD + g.l, PAD + g.asc);

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(cw, chh),
        new THREE.MeshBasicMaterial({
          map: tx(c, { aniso: 16 }),
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: true,
          opacity: 1
        })
      );
      mesh.position.set(g.pen + (g.r - g.l) / 2, (g.asc - g.desc) / 2, 0);
      mesh.renderOrder = 12;
      mesh.frustumCulled = false;
      mesh.userData.baseY = mesh.position.y;
      group.add(mesh);
      WORD.glyphs.push(mesh);
    });

    group.position.z = WORD_Z;
    scene.add(group);
    WORD.group = group;
    WORD.ink = { xMin: xMin, xMax: xMax, cx: (xMin + xMax) / 2, w: xMax - xMin, asc: ascMax };
  }

  function layoutWord() {
    if (!WORD.group || !tmpCam) return;
    const c = CAM[0];
    const hp = new THREE.Vector3(c.p[0], c.p[1], c.p[2]);
    const ht = new THREE.Vector3(c.t[0], c.t[1], c.t[2]);
    tmpCam.fov = fitAspect(hp, ht, c.fov);
    tmpCam.aspect = vpW() / vpH();
    tmpCam.position.copy(hp);
    tmpCam.lookAt(ht);
    tmpCam.updateProjectionMatrix(); tmpCam.updateMatrixWorld(true);

    const hit = (nx, ny) => {
      const v = new THREE.Vector3(nx, ny, 0.5).unproject(tmpCam).sub(tmpCam.position).normalize();
      return tmpCam.position.clone().addScaledVector(v, (WORD_Z - tmpCam.position.z) / v.z);
    };

    const L = hit(-1, 0), R = hit(1, 0);
    const narrow = vpW() / vpH() < 1.05;
    const fill = narrow ? 0.85 : 1.0;
    const s = ((R.x - L.x) * fill) / WORD.ink.w;
    const base = hit(0, narrow ? -0.45 : -0.58);
    WORD.group.scale.setScalar(s);
    WORD.group.position.set(-WORD.ink.cx * s, base.y, WORD_Z);
  }

  /* ------------------------------------------------------------ 5 · Atmosphere & Particles */
  const WISP = { mesh: null, count: 64 };

  function buildAtmosphere() {
    const hazeTex = tx(texGlow('rgba(96,165,250,.45)', 'rgba(37,99,235,.15)'));
    WORLD.haze = [];
    const rnd = mulberry32(66);
    for (let i = 0; i < (LOW ? 4 : 6); i++) {
      const s = 12 + rnd() * 15;
      const h = new THREE.Mesh(
        new THREE.PlaneGeometry(s, s * 0.55),
        new THREE.MeshBasicMaterial({
          map: hazeTex, transparent: true, blending: THREE.AdditiveBlending,
          depthWrite: false, fog: false, opacity: 0.06 + rnd() * 0.06
        })
      );
      h.position.set((rnd() - 0.5) * 44, 1.5 + rnd() * 10, -38 + rnd() * 40);
      h.renderOrder = 4;
      h.userData = { sp: 0.06 + rnd() * 0.12, ph: rnd() * TAU, x0: h.position.x };
      scene.add(h); WORLD.haze.push(h);
    }

    const N = LOW ? 200 : 400;
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rnd() - 0.5) * 30;
      pos[i * 3 + 1] = rnd() * 11;
      pos[i * 3 + 2] = -26 + rnd() * 36;
      seed[i] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const emb = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        uniforms: {
          uT: WORLD.uT,
          uTex: { value: tx(texGlow('rgba(191,219,254,1)', 'rgba(59,130,246,.4)')) },
          uSize: { value: vpH() * 0.5 }
        },
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        vertexShader: `
          attribute float aSeed; uniform float uT; uniform float uSize; varying float vA;
          void main(){
            vec3 p = position;
            p.y = mod(p.y + uT*(0.14+aSeed*0.28), 11.5);
            p.x += sin(uT*0.36 + aSeed*22.0)*0.85;
            p.z += cos(uT*0.29 + aSeed*17.0)*0.7;
            vec4 mv = modelViewMatrix * vec4(p,1.0);
            vA = (0.25+aSeed*0.75) * smoothstep(11.5,7.0,p.y) * smoothstep(0.0,1.4,p.y);
            gl_PointSize = uSize*(0.010+aSeed*0.020)/max(-mv.z,0.6);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform sampler2D uTex; varying float vA;
          void main(){
            vec4 t = texture2D(uTex, gl_PointCoord);
            gl_FragColor = vec4(t.rgb * vec3(0.5, 0.85, 1.6), t.a * vA * 0.75);
          }`
      })
    );
    emb.frustumCulled = false; emb.renderOrder = 5;
    scene.add(emb); WORLD.embers = emb;
  }

  function buildWisps() {
    const N = WISP.count;
    const pos = new Float32Array(N * 3), phase = new Float32Array(N);
    const rnd = mulberry32(99);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rnd() - 0.5) * 28;
      pos[i * 3 + 1] = 0.5 + rnd() * 6;
      pos[i * 3 + 2] = -30 + rnd() * 40;
      phase[i] = rnd() * TAU;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uT: WORLD.uT,
        uTex: { value: tx(texWisp()) },
        uPx: { value: vpH() * renderer.getPixelRatio() }
      },
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: `
        attribute float aPhase; uniform float uT; uniform float uPx; varying float vAlpha;
        void main(){
          vec3 p = position;
          p.x += sin(uT*0.5 + aPhase)*1.2;
          p.y += sin(uT*0.8 + aPhase*2.0)*0.6;
          p.z += cos(uT*0.4 + aPhase)*1.2;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vAlpha = 0.3 + 0.5 * sin(uT*1.2 + aPhase);
          gl_PointSize = max(2.0, (uPx * 0.035) / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uTex; varying float vAlpha;
        void main(){
          vec4 t = texture2D(uTex, gl_PointCoord);
          gl_FragColor = vec4(t.rgb * vec3(0.6, 0.9, 1.5), t.a * vAlpha);
        }`
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false; pts.renderOrder = 8;
    scene.add(pts); WISP.mesh = pts;
  }

  /* ------------------------------------------------------------ 6 · Lights & Shadows */
  function buildLights() {
    scene.add(new THREE.HemisphereLight(0x4a7a9a, 0x060b10, 0.16));

    const key = new THREE.DirectionalLight(0xa5c8e8, 1.25);
    key.position.set(2.6, 21, 2.5);
    key.target.position.set(0, 2.2, -12.5); scene.add(key.target);
    if (WANT_SHADOW) {
      key.castShadow = true;
      const S = LOW ? 1024 : 2048;
      key.shadow.mapSize.set(S, S);
      const c = key.shadow.camera;
      c.left = -26; c.right = 26; c.top = 34; c.bottom = -16; c.near = 3; c.far = 78;
      key.shadow.bias = -0.0012; key.shadow.normalBias = 0.035; key.shadow.radius = 2.2;
    }
    scene.add(key); WORLD.key = key;

    const moonKey = new THREE.DirectionalLight(0x3b82f6, 0.65);
    moonKey.position.set(26, 30, -60);
    moonKey.target.position.set(0, 8, -40); scene.add(moonKey.target);
    scene.add(moonKey);

    const hallL = new THREE.PointLight(0x38bdf8, 2.5, 16, 2);
    hallL.position.set(0, PODIUM + 1.2, TEMPLE_Z + 8.6); scene.add(hallL); WORLD.hallLight = hallL;

    const moonL = new THREE.PointLight(0x2563eb, 3.2, 46, 2);
    moonL.position.set(11.0, 17.0, -24.0); scene.add(moonL); WORLD.moonLight = moonL;

    const fill = new THREE.PointLight(0x60a5fa, 1.1, 30, 2);
    fill.position.set(-1, 13.5, -16.0); scene.add(fill);

    const stairL = new THREE.PointLight(0x60a5fa, 4.0, 18, 2);
    stairL.position.set(0, 7.6, -26.0); scene.add(stairL);
  }

  /* ------------------------------------------------------------ 7 · Post-Processing Chain */
  const POST = { levels: [] };
  const QUAD_VS = 'varying vec2 vUv;\nvoid main(){ vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }';

  function initPost() {
    POST.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    POST.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    POST.quad.frustumCulled = false;
    POST.qScene = new THREE.Scene(); POST.qScene.add(POST.quad);

    POST.up = new THREE.ShaderMaterial({
      uniforms: { tS: { value: null }, uAmt: { value: 1 } }, vertexShader: QUAD_VS,
      fragmentShader: 'uniform sampler2D tS; uniform float uAmt; varying vec2 vUv;\nvoid main(){ gl_FragColor = vec4(texture2D(tS,vUv).rgb*uAmt, 1.0); }',
      blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false
    });

    if (!WANT_POST) return;
    const w = renderer.domElement.width, h = renderer.domElement.height;
    const O = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false };
    POST.scene = new THREE.WebGLRenderTarget(w, h, Object.assign({}, O, { depthBuffer: true, samples: LOW ? 0 : 2 }));

    let lw = Math.max(2, w >> 1), lh = Math.max(2, h >> 1);
    const N = 4;
    for (let i = 0; i < N; i++) {
      POST.levels.push({ a: new THREE.WebGLRenderTarget(lw, lh, O), b: new THREE.WebGLRenderTarget(lw, lh, O), w: lw, h: lh });
      lw = Math.max(2, lw >> 1); lh = Math.max(2, lh >> 1);
    }

    POST.bright = new THREE.ShaderMaterial({
      uniforms: { tS: { value: null }, uThr: { value: 0.82 }, uKnee: { value: 0.50 } },
      vertexShader: QUAD_VS,
      fragmentShader: `
        uniform sampler2D tS; uniform float uThr; uniform float uKnee; varying vec2 vUv;
        void main(){
          vec3 c = texture2D(tS, vUv).rgb;
          float l = dot(c, vec3(0.2126,0.7152,0.0722));
          float k = smoothstep(uThr, uThr+uKnee, l);
          gl_FragColor = vec4(c*k, 1.0);
        }`
    });

    POST.blur = new THREE.ShaderMaterial({
      uniforms: { tS: { value: null }, uDir: { value: new THREE.Vector2(1, 0) } },
      vertexShader: QUAD_VS,
      fragmentShader: `
        uniform sampler2D tS; uniform vec2 uDir; varying vec2 vUv;
        void main(){
          vec3 c = texture2D(tS, vUv).rgb * 0.2270270270;
          c += texture2D(tS, vUv + uDir*1.3846153846).rgb * 0.3162162162;
          c += texture2D(tS, vUv - uDir*1.3846153846).rgb * 0.3162162162;
          c += texture2D(tS, vUv + uDir*3.2307692308).rgb * 0.0702702703;
          c += texture2D(tS, vUv - uDir*3.2307692308).rgb * 0.0702702703;
          gl_FragColor = vec4(c, 1.0);
        }`
    });

    POST.comp = new THREE.ShaderMaterial({
      uniforms: {
        tS: { value: null }, tB: { value: null }, uRes: { value: new THREE.Vector2(w, h) },
        uT: { value: 0 }, uBloom: { value: 0.22 }, uVig: { value: 0.8 }, uExp: { value: 0.72 }, uFade: { value: 1 }, uSat: { value: 1.05 }
      },
      vertexShader: QUAD_VS,
      fragmentShader: `
        uniform sampler2D tS; uniform sampler2D tB; uniform vec2 uRes;
        uniform float uT, uBloom, uVig, uExp, uFade, uSat;
        varying vec2 vUv;
        vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
        void main(){
          vec2 d = vUv - 0.5;
          vec3 c = texture2D(tS, vUv).rgb;
          c += texture2D(tB, vUv).rgb * uBloom;
          c *= uExp;
          c = aces(c);
          float l = dot(c, vec3(0.2126,0.7152,0.0722));
          c = mix(vec3(l), c, uSat);
          c = mix(c, c*vec3(0.82,0.95,1.15), smoothstep(0.55,0.0,l)*0.60);
          c = mix(c, c*vec3(1.02,1.01,0.98), smoothstep(0.50,1.0,l)*0.20);
          float v = smoothstep(1.25, 0.32, length(d*vec2(1.0,0.94))*1.35);
          c *= mix(1.0, v, uVig);
          c *= uFade;
          vec3 e = pow(max(c,0.0), vec3(1.0/2.2));
          e = clamp((e - 0.30) * 1.00 + 0.30, 0.0, 1.0);
          gl_FragColor = vec4( e, 1.0 );
        }`
    });
  }

  function pass(mat, target, additive) {
    POST.quad.material = mat;
    renderer.setRenderTarget(target || null);
    if (!additive) renderer.clear(true, false, false);
    renderer.render(POST.qScene, POST.cam);
  }

  function renderPost() {
    const L = POST.levels;
    POST.bright.uniforms.tS.value = POST.scene.texture;
    pass(POST.bright, L[0].a);
    for (let i = 0; i < L.length; i++) {
      if (i > 0) {
        POST.up.blending = THREE.NoBlending;
        POST.up.uniforms.uAmt.value = 1;
        POST.up.uniforms.tS.value = L[i - 1].a;
        pass(POST.up, L[i].a);
      }
      POST.blur.uniforms.tS.value = L[i].a;
      POST.blur.uniforms.uDir.value.set(1 / L[i].w, 0);
      pass(POST.blur, L[i].b);
      POST.blur.uniforms.tS.value = L[i].b;
      POST.blur.uniforms.uDir.value.set(0, 1 / L[i].h);
      pass(POST.blur, L[i].a);
    }
    POST.up.blending = THREE.AdditiveBlending;
    POST.up.uniforms.uAmt.value = 0.52;
    for (let i = L.length - 1; i > 0; i--) {
      POST.up.uniforms.tS.value = L[i].a;
      pass(POST.up, L[i - 1].a, true);
    }
    POST.comp.uniforms.tS.value = POST.scene.texture;
    POST.comp.uniforms.tB.value = L[0].a;
    pass(POST.comp, null);
  }

  /* ------------------------------------------------------------ 8 · Camera Waypoints & Rig */
  const CAM = [
    { p: [0.0, 4.05, 13.6], t: [0.0, 6.60, -18.0], fov: 36 },    /* 0: Hero / Jidan Juliana */
    { p: [-5.6, 2.35, 11.6], t: [1.2, 5.60, -14.0], fov: 48 },   /* 1: About & What I Do */
    { p: [1.2, 3.60, 2.2], t: [-0.6, 7.50, -22.0], fov: 40 },    /* 2: Experience BBWS */
    { p: [5.2, 2.10, -3.4], t: [-2.6, 7.00, -20.0], fov: 46 },   /* 3: Selected Work */
    { p: [0.0, 7.60, -16.0], t: [0.0, 13.0, -40.0], fov: 42 },   /* 4: Skills & Credentials */
    { p: [0.0, 10.5, -20.0], t: [0.0, 3.00, -34.0], fov: 46 }    /* 5: Contact Finale */
  ];

  const RIG = { prog: 0, smooth: 0, mx: 0, my: 0, tmx: 0, tmy: 0, intro: 0, focus: -1, focusAmt: 0 };
  let curveP, curveT, tmpCam;

  function buildRig() {
    curveP = new THREE.CatmullRomCurve3(CAM.map(c => new THREE.Vector3(c.p[0], c.p[1], c.p[2])), false, 'catmullrom', 0.42);
    curveT = new THREE.CatmullRomCurve3(CAM.map(c => new THREE.Vector3(c.t[0], c.t[1], c.t[2])), false, 'catmullrom', 0.42);
    tmpCam = new THREE.PerspectiveCamera(CAM[0].fov, vpW() / vpH(), 0.35, 220);
    camera.layers.enable(1); camera.layers.enable(2);
  }

  const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _d = new THREE.Vector3();

  function aspectFix() { return clamp((1.62 - vpW() / vpH()) / 1.05, 0, 1); }

  function fitAspect(p, t, fov) {
    const nf = aspectFix();
    if (nf <= 0) return fov;
    _d.subVectors(p, t).normalize();
    p.addScaledVector(_d, nf * 8.2);
    p.y += nf * 1.1;
    return fov * (1 + nf * 0.40);
  }

  function applyCamera() {
    const N = CAM.length - 1;
    const u = clamp(RIG.smooth / N, 0, 1);
    curveP.getPoint(u, _p); curveT.getPoint(u, _t);
    const i = clamp(Math.floor(RIG.smooth), 0, N - 1), f = clamp(RIG.smooth - i, 0, 1);
    let fov = lerp(CAM[i].fov, CAM[i + 1].fov, f);

    fov = fitAspect(_p, _t, fov);

    const io = 1 - RIG.intro;
    _p.z += io * 5.6; _p.y += io * 0.65; fov += io * 8;

    const par = 1 - smooth(0, 1.6, RIG.smooth) * 0.55;
    _p.x += RIG.mx * 0.62 * par; _p.y += RIG.my * 0.34 * par;
    _t.x -= RIG.mx * 0.20 * par; _t.y -= RIG.my * 0.12 * par;

    camera.position.copy(_p);
    camera.lookAt(_t);
    if (Math.abs(camera.fov - fov) > 1e-4) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  /* ------------------------------------------------------------ 9 · Scissored Card Viewports */
  const CARDS = [];
  function buildCards() {
    const defs = [
      { p: [-2.0, 1.60, -2.0], t: [0, 10.0, -34.0], fov: 40 },
      { p: [4.2, 2.90, -9.5], t: [6.4, 2.90, -14.4], fov: 40 },
      { p: [3.4, 2.40, 2.0], t: [-1.0, -0.60, -6.0], fov: 40 },
      { p: [0.6, 3.40, -12.0], t: [0, 12.0, -40.0], fov: 26 }
    ];
    const elements = document.querySelectorAll('[data-view]');
    elements.forEach(el => {
      const d = defs[+el.dataset.view]; if (!d) return;
      const c = new THREE.PerspectiveCamera(d.fov, 4 / 5, 0.3, 200);
      c.position.set(d.p[0], d.p[1], d.p[2]);
      c.lookAt(d.t[0], d.t[1], d.t[2]);
      c.layers.set(0);
      c.userData = { home: c.position.clone(), look: new THREE.Vector3(d.t[0], d.t[1], d.t[2]), push: 0, want: 0 };
      CARDS.push({ cam: c, el: el.querySelector('[data-frame]') || el });
      el.addEventListener('mouseenter', () => { c.userData.want = 1; });
      el.addEventListener('mouseleave', () => { c.userData.want = 0; });
    });
  }

  function cardBuffer(C, w, h) {
    const pr = Math.min(renderer.getPixelRatio(), 2);
    const W = Math.max(8, Math.round(w * pr)), H = Math.max(8, Math.round(h * pr));
    if (C.rt && C.rt.width === W && C.rt.height === H) return C.rt;
    if (C.rt) C.rt.dispose();
    C.rt = new THREE.WebGLRenderTarget(W, H, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false
    });
    C.dirty = true;
    return C.rt;
  }

  function setRegion(rt, x, y, w, h) {
    if (rt) {
      const pr = renderer.getPixelRatio();
      rt.viewport.set(x * pr, y * pr, w * pr, h * pr);
      rt.scissor.set(x * pr, y * pr, w * pr, h * pr);
      rt.scissorTest = true;
      renderer.setRenderTarget(rt);
    } else {
      renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, w, h);
      renderer.setScissorTest(true);
    }
  }

  function clearRegion(rt) {
    if (rt) {
      rt.viewport.set(0, 0, rt.width, rt.height);
      rt.scissor.set(0, 0, rt.width, rt.height);
      rt.scissorTest = false;
      renderer.setRenderTarget(rt);
    } else {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, vpW(), vpH());
      renderer.setScissor(0, 0, vpW(), vpH());
    }
  }

  function renderCards(rt) {
    if (!CARDS.length) return;
    let drew = false;
    for (let i = 0; i < CARDS.length; i++) {
      const C = CARDS[i], r = C.el.getBoundingClientRect();
      if (r.bottom < -40 || r.top > vpH() + 40 || r.width < 4) continue;
      const buf = cardBuffer(C, r.width, r.height);
      const u = C.cam.userData;
      if (C.dirty || Math.abs(u.push - u.want) > 0.002 || (FRAME + i * 7) % 24 === 0) {
        C.cam.aspect = r.width / r.height;
        C.cam.updateProjectionMatrix();
        renderer.setRenderTarget(buf);
        renderer.clear(true, true, false);
        renderer.render(scene, C.cam);
        C.dirty = false;
      }
      setRegion(rt, r.left, vpH() - r.bottom, r.width, r.height);
      POST.up.blending = THREE.NoBlending;
      POST.up.uniforms.uAmt.value = 1;
      POST.up.uniforms.tS.value = buf.texture;
      pass(POST.up, rt);
      drew = true;
    }
    if (drew) clearRegion(rt);
  }

  /* ------------------------------------------------------------ 10 · Core Animation Loop */
  let running = false, tPrev = 0, clock = 0, fadeIn = 0, FRAME = 0;
  const INTRO = { t0: 0 };

  function resize() {
    const w = vpW(), h = vpH();
    document.documentElement.style.setProperty('--vw', w + 'px');
    if (!renderer || !camera) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, DPR_CAP) * PERF.scale);
    renderer.setSize(w, h, true);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const pw = renderer.domElement.width, ph = renderer.domElement.height;
    if (WANT_POST && POST.scene) {
      POST.scene.setSize(pw, ph);
      POST.comp.uniforms.uRes.value.set(pw, ph);
      let lw = Math.max(2, pw >> 1), lh = Math.max(2, ph >> 1);
      POST.levels.forEach(L => {
        L.a.setSize(lw, lh); L.b.setSize(lw, lh); L.w = lw; L.h = lh;
        lw = Math.max(2, lw >> 1); lh = Math.max(2, lh >> 1);
      });
    }
    placeMoon();
    layoutWord();
  }

  function updateWorld(dt) {
    WORLD.uT.value = clock;
    RIG.focusAmt = damp(RIG.focusAmt, RIG.focus >= 0 ? 1 : 0, 5, dt);
    const pulse = Math.sin(clock * 1.9) * 0.5 + 0.5;
    const f = RIG.focusAmt;

    if (WORLD.hallHalo) WORLD.hallHalo.material.opacity = 0.32 + f * 0.14 + Math.sin(clock * 0.6) * 0.035;
    if (WORLD.hallLight) WORLD.hallLight.intensity = 3.2 * (1 + f * 0.3) * (1 + Math.sin(clock * 0.43) * 0.045);
    if (WORLD.moonHalo) WORLD.moonHalo.material.opacity = 0.44 + f * 0.10 + Math.sin(clock * 0.34) * 0.05;

    if (WORLD.lanternLights) {
      WORLD.lanternLights.forEach((l, i) => {
        l.intensity = 2.6 * (1 + f * 0.55) * (0.86 + 0.22 * Math.sin(clock * (2.3 + i * 0.7) + i * 2.1) + 0.1 * pulse);
      });
    }
    if (WORLD.lanternGlows) WORLD.lanternGlows.forEach(g => g.quaternion.copy(camera.quaternion));

    if (WORLD.haze) {
      WORLD.haze.forEach(h => {
        h.position.x = h.userData.x0 + Math.sin(clock * h.userData.sp + h.userData.ph) * 5.5;
        h.quaternion.copy(camera.quaternion);
      });
    }

    if (WORD.group) {
      const near = smooth(0.02, 0.92, RIG.smooth);
      const isMobile = vpW() < 768;
      if (isMobile) {
        WORD.group.visible = false;
      } else {
        WORD.group.visible = true;
        WORD.glyphs.forEach((g, i) => {
          const st = clamp((WORD.reveal - i * 0.075) / 0.62, 0, 1);
          const e = easeOut(st);
          g.position.y = g.userData.baseY - (1 - e) * (WORD.ink.asc * 1.15);
          g.material.opacity = e * (1 - near * 0.96);
          g.visible = g.material.opacity > 0.004;
        });
      }
    }

    if (WORLD.fg) {
      WORLD.fg.forEach(m => {
        const a = smooth(0.9, 4.6, camera.position.z - m.position.z);
        m.material.opacity = a;
        m.visible = a > 0.006;
      });
    }

    if (CARDS.length) {
      CARDS.forEach(C => {
        const u = C.cam.userData;
        u.push = damp(u.push, u.want, 3.4, dt);
      });
    }
  }

  function render() {
    FRAME++;
    renderer.setRenderTarget(WANT_POST ? POST.scene : null);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);
    renderCards(WANT_POST ? POST.scene : null);
    renderer.setRenderTarget(null);

    if (WANT_POST) {
      POST.comp.uniforms.uT.value = clock;
      POST.comp.uniforms.uFade.value = fadeIn;
      renderPost();
    }
  }

  function frameLoop(now) {
    if (!running) return;
    const raw = (now - tPrev) / 1000 || 0;
    const dt = Math.min(raw, 0.05);
    tPrev = now;
    clock += dt;
    fadeIn = INTRO.t0 ? sat((now - INTRO.t0) / 700) : 1;

    if (!PERF.locked && clock > 2.2) {
      PERF.acc += raw; PERF.n++;
      if (PERF.n >= 40 || PERF.acc > 0.9) {
        const avg = PERF.acc / PERF.n; PERF.acc = 0; PERF.n = 0;
        if (avg > 0.023 && PERF.scale > 0.55) { PERF.scale = Math.max(0.55, PERF.scale * 0.85); resize(); }
        else if (avg < 0.0138 && PERF.scale < 1) { PERF.scale = Math.min(1, PERF.scale + 0.08); resize(); }
      }
    }

    RIG.smooth = REDUCE ? RIG.prog : damp(RIG.smooth, RIG.prog, 5.2, dt);
    RIG.mx = damp(RIG.mx, RIG.tmx, 2.6, dt);
    RIG.my = damp(RIG.my, RIG.tmy, 2.6, dt);

    if (INTRO.t0) {
      const el = (now - INTRO.t0) / 1000;
      RIG.intro = sat(el / 2.4);
      WORD.reveal = Math.min(1.2, el / 1.5);
    }

    applyCamera();
    updateWorld(dt);
    render();
    requestAnimationFrame(frameLoop);
  }

  /* ------------------------------------------------------------ 11 · Bootstrapping Pipeline */
  const JOBS = [
    ['Initializing GL & Camera Rig', () => {
      initGL();
      WORLD.uT = { value: 0 };
      buildRig();
      buildLights();
    }],
    ['Constructing Digital Sanctuary Shell', () => buildShell()],
    ['Raising Architectural Sanctuary', () => buildTemple()],
    ['Positioning Horizon Celestial Moon', () => buildMoon()],
    ['Forging Cyan Torii Gate', () => buildTorii()],
    ['Synthesizing Environment & Lanterns', () => {
      buildRocks();
      buildLantern(7.4, -7.0, 1.15); buildLantern(-7.6, -5.2, 1.0);
      const stepAt = z => Math.max(0, (STAIR_Z0 - z) / STAIR_RUN - 0.5);
      const cheekTop = z => (stepAt(z) + 1) * (PODIUM / STEPS) + 0.45;
      const cheekX = z => (STAIR_W + (STEPS - stepAt(z)) * 0.052) / 2 + 0.45;
      [-14.4, -23.5].forEach((z, i) => {
        const sc = i ? 0.95 : 0.90;
        buildLantern(cheekX(z), z, sc, cheekTop(z));
        buildLantern(-cheekX(z), z, sc, cheekTop(z));
      });
    }],
    ['Generating Organic Foliage', () => {
      buildMaple(71, 12.6, -13.0, 1.05); buildMaple(72, -11.8, -9.4, 0.95);
      buildMaple(73, 9.2, -19.0, 0.82); buildMaple(74, -14.5, -17.5, 1.0);
    }],
    ['Synthesizing 3D Foreground Cutouts', () => buildForeground()],
    ['Rendering 3D Wordmark (JIDAN)', () => buildWordmark()],
    ['Engaging Atmospheric Wisps & Embers', () => {
      buildAtmosphere();
      buildWisps();
    }],
    ['Binding Post-Processing & Viewport Cards', () => {
      initPost();
      buildCards();
      WORLD.fg.forEach(m => m.layers.set(1));
      WORD.glyphs.forEach(m => m.layers.set(2));
      layoutWord();
      if (WANT_SHADOW && WORLD.key) {
        WORLD.key.shadow.autoUpdate = false;
        WORLD.key.shadow.needsUpdate = true;
      }
    }]
  ];

  function startScene(onReady) {
    const preFill = document.getElementById('pre-fill');
    const prePct = document.getElementById('pre-pct');
    let i = 0;

    const step = () => {
      const j = JOBS[i];
      const done = () => {
        i++;
        const p = i / JOBS.length;
        if (preFill) preFill.style.right = ((1 - p) * 100).toFixed(1) + '%';
        if (prePct) prePct.textContent = Math.round(p * 100);
        if (i < JOBS.length) {
          setTimeout(step, 16);
        } else {
          setTimeout(() => {
            running = true;
            tPrev = performance.now();
            INTRO.t0 = REDUCE ? performance.now() - 4000 : performance.now();
            resize();
            requestAnimationFrame(frameLoop);
            if (onReady) onReady();
          }, 200);
        }
      };

      try {
        const r = j[1]();
        (r && r.then) ? r.then(done, done) : done();
      } catch (err) {
        console.error(`[KageEngine] Job "${j[0]}" error:`, err);
        done();
      }
    };

    setTimeout(step, 50);
  }

  addEventListener('resize', resize, { passive: true });
  addEventListener('pointermove', e => {
    RIG.tmx = (e.clientX / vpW()) * 2 - 1;
    RIG.tmy = -((e.clientY / vpH()) * 2 - 1);
  }, { passive: true });

  global.KageEngine = {
    start: startScene,
    resize: resize,
    setScrollProgress: p => { RIG.prog = p; },
    setHoverFocus: idx => { RIG.focus = idx; },
    getRig: () => RIG
  };

})(window);
