/* EVO Cabinet v2 — wave avatar (cab2-wave-v1, 2026-11-18; components.md › „Cabinet v2 — wave avatar”; spec wiki
   04-Look-and-motion.md › „Entrance — wave avatar”; research .claude/evo-cabinet/research/avatar-entrance-motion.md).

   The EVO brand wavy circle (Figma EVO-Cabinet 1651:68106 / 1651:68043), drawn parametrically:
       r(θ) = R · (1 + A · [(1 − w) · sin(n₀(θ − ρ)) + w · sin(n₁(θ − ρ))])
   R radius · A amplitude (share of R) · n₀ → n₁ wave counts blended by w (an integer harmonic at every frame → the outline
   is always closed and never jumps) · ρ rotation. r > 0 always → a star-shaped curve → it never self-intersects.
   ONE parameter set per frame feeds two outlines: the ring (an SVG path, stroke) and the avatar's mask (CSS
   `clip-path: path()` on the library `.avatar` inside) → the photo / initials edge morphs with the ring.

   window.WaveAvatar
     mount(host, options) → instance       host = an element that contains the library `.avatar` (the masked face)
       options.size          avatar diameter in px (default: the face's width, else 72)
       options.palette       colour tokens, e.g. ["--lavender-600", "--forest-green-600", "--blue-sky-500"]
       options.rest          { n, a, color } resting shape; color = a token name (default the brand border token)
       options.sequence      shapes [{ n, a, color: <palette index> }] — one step from each to the next, the last → `rest`
       options.timing        { pop, step, hold, turn } — pop ms (600), each morph + rotate step ms (800, eased in-out),
                             the still hold between steps ms (350), degrees turned per step (24); total = pop + steps ·
                             step + (steps − 1) · hold (4 steps → 4.85 s). Rotation only during the steps.
       options.play          false → the resting frame at once (previews, a second visit)
       options.reducedMotion true / false; default = the system setting or `.is-motion-reduced` on <html>
     instance.play() · instance.finish() (jump to rest) · instance.destroy() · instance.done (Promise)
     WaveAvatar.lastStats   { frames, avgMs, maxMs } of the last entrance (Performance check)
     WaveAvatar.path(cx, cy, R, params, points) → the SVG path string (reuse elsewhere)

   Performance: requestAnimationFrame; per frame only the ring's `d` / `stroke` and the face's `clip-path` change
   (paint, no layout); the pop is a Web Animation on transform / opacity (compositor). Accessibility: the SVG is
   aria-hidden; the face keeps its own name; focus or pointer on the host finishes the entrance at once. */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const POINTS = 256;
  const TAU = Math.PI * 2;
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const systemReduced = () => media.matches || root.classList.contains("is-motion-reduced");

  /* ---------- tokens ---------- */
  const tokenText = (name, el = document.body || root) => getComputedStyle(el).getPropertyValue(name).trim();
  /* a colour token → [r, g, b] 0…255, resolved by the browser (var chains, named colours) */
  let probe = null;
  function tokenRgb(name) {
    if (!probe) {
      probe = document.createElement("span");
      probe.setAttribute("aria-hidden", "true");
      probe.className = "cab2-wave__probe";
      document.body.appendChild(probe);
    }
    probe.style.color = `var(${name})`;
    const m = getComputedStyle(probe).color.match(/[\d.]+/g) || ["0", "0", "0"];
    return m.slice(0, 3).map(Number);
  }

  /* ---------- easing: the motion tokens' cubic-bezier, solved ---------- */
  function bezier(text, fallback) {
    const m = String(text || "").match(/cubic-bezier\(([^)]+)\)/);
    const [x1, y1, x2, y2] = m ? m[1].split(",").map(Number) : fallback;
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const err = sx(t) - x;
        const d = dx(t);
        if (Math.abs(err) < 1e-5 || Math.abs(d) < 1e-6) break;
        t -= err / d;
      }
      if (t < 0 || t > 1) { /* bisection fallback */
        let lo = 0, hi = 1; t = x;
        for (let i = 0; i < 24; i++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      }
      return sy(t);
    };
  }
  /* in-out cubic = cubic-bezier(0.65, 0, 0.35, 1): each step starts and lands softly (the research note's „in-out per step”) */
  const inOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2);

  /* ---------- colour: OKLab (perceptual — no grey middles between blue, green and violet) ---------- */
  const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const toSrgb = (c) => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, v)) * 255); };
  function oklab([r, g, b]) {
    const R = toLin(r), G = toLin(g), B = toLin(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  function fromOklab([L, a, b]) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ];
  }
  const mixLab = (p, q, w) => p.map((v, i) => v + (q[i] - v) * w);

  /* ---------- geometry ---------- */
  /* params = { n0, n1, w, a, rot } */
  function path(cx, cy, R, { n0, n1 = n0, w = 0, a, rot = 0 }, points = POINTS) {
    let d = "";
    for (let k = 0; k < points; k++) {
      const t = (k / points) * TAU;
      const u = t - rot;
      const r = R * (1 + a * ((1 - w) * Math.sin(n0 * u) + w * Math.sin(n1 * u)));
      d += `${k ? "L" : "M"}${(cx + r * Math.cos(t)).toFixed(2)} ${(cy + r * Math.sin(t)).toFixed(2)}`;
    }
    return `${d}Z`;
  }

  /* ---------- the EVO default entrance (Figma 1651:68043 measured: n 4 · 10 · 12 · 22, A/R .024 – .104) ---------- */
  const DEFAULT_PALETTE = ["--lavender-600", "--forest-green-600", "--blue-sky-500"];
  const DEFAULT_SEQUENCE = [
    { n: 4, a: 0.08, color: 0 },     /* the set's centre: a soft rounded square, violet */
    { n: 10, a: 0.06, color: 0 },  /* the outer violet ring */
    { n: 12, a: 0.08, color: 1 }, /* deep teal, the set's middle rings */
    { n: 22, a: 0.03, color: 2 }, /* the fine blue ring */
  ];
  const DEFAULT_REST = { n: 12, a: 0.025, color: "--color-border-brand-default" }; /* the Figma teal avatar: 12 waves, A/R .025 */
  const POP = { from: 0.6, peak: 1.02, peakAt: 0.65 };
  /* product owner 2026-11-18 („too quick”): pop, then each wave change = one morph + rotate step, a still hold between */
  const DEFAULT_TIMING = { pop: 600, step: 800, hold: 350, turn: 24 };

  let uid = 0;
  const WaveAvatar = { lastStats: null, path };

  WaveAvatar.mount = function mount(host, options = {}) {
    if (!host) return null;
    const face = options.face || host.querySelector(".avatar");
    const size = options.size || (face && face.getBoundingClientRect().width) || 72;
    const gap = options.gap ?? Math.round(size / 18); /* 72 → 4 · 80 → 4 · 96 → 5 */
    const stroke = parseFloat(tokenText("--border-width-2", host)) || 2;
    const reduced = options.reducedMotion ?? systemReduced();
    const timing = { ...DEFAULT_TIMING, ...(options.timing || {}) };
    const palette = (options.palette || DEFAULT_PALETTE).map(tokenRgb);
    const rest = { ...DEFAULT_REST, ...(options.rest || {}) };
    const restLab = oklab(tokenRgb(rest.color));
    const keys = [...(options.sequence || DEFAULT_SEQUENCE).map((k) => ({ ...k, lab: oklab(palette[k.color] || palette[0]) })),
      { n: rest.n, a: rest.a, lab: restLab }];
    const steps = keys.length - 1;
    const duration = timing.pop + steps * timing.step + (steps - 1) * timing.hold;

    /* the face's mean radius: peaks (a ≤ 0.08) stay inside its square box; the ring sits `gap` outside it */
    const Rm = (size / 2) * 0.93; /* 72 → 33.5 */
    const Rr = Rm + gap + stroke / 2;
    const pad = Math.ceil(size * 0.2);
    const box = size + 2 * pad;
    const c = box / 2;

    host.classList.add("cab2-wave");
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "cab2-wave__ring");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("width", String(box));
    svg.setAttribute("height", String(box));
    svg.setAttribute("viewBox", `0 0 ${box} ${box}`);
    const ring = document.createElementNS(NS, "path");
    ring.setAttribute("class", "cab2-wave__path");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke-width", String(stroke));
    ring.setAttribute("stroke-linejoin", "round");
    svg.appendChild(ring);
    host.insertBefore(svg, host.firstChild);
    if (face) face.classList.add("cab2-wave__face");
    const id = ++uid;
    host.dataset.cab2Wave = String(id);

    const fc = size / 2;
    function draw(params, lab) {
      ring.setAttribute("d", path(c, c, Rr, params));
      if (face) face.style.clipPath = `path("${path(fc, fc, Rm, params)}")`;
      /* a style (not the attribute): the CSS rest colour would win over a presentation attribute */
      if (lab) ring.style.stroke = `rgb(${fromOklab(lab).join(",")})`;
      else ring.style.removeProperty("stroke");
    }
    /* the morph at time t (ms): segment k → k+1, eased in-out; rotation = one calm turn of 36°, decelerating */
    const TURN = (timing.turn * Math.PI) / 180;
    /* the frame at t ms: the first shape during the pop; then step i (morph i → i+1 + one turn, eased in-out) and a still
       hold; colour mixes with the step */
    function frameAt(t) {
      const u = Math.max(0, t - timing.pop);
      const cycle = timing.step + timing.hold;
      const i = Math.min(steps - 1, Math.floor(u / cycle));
      const within = u - i * cycle;
      const w = t < timing.pop ? 0 : inOutCubic(Math.min(1, within / timing.step));
      const p = keys[i];
      const q = keys[i + 1];
      return {
        params: { n0: p.n, n1: q.n, w, a: p.a + (q.a - p.a) * w, rot: TURN * (i + w) },
        lab: mixLab(p.lab, q.lab, w),
      };
    }

    const restParams = { n0: rest.n, a: rest.a, rot: TURN * steps };
    let raf = 0;
    let pop = null;
    let resolveDone;
    const instance = { host, done: new Promise((r) => { resolveDone = r; }) };

    function settle() {
      cancelAnimationFrame(raf);
      raf = 0;
      if (pop) { pop.cancel(); pop = null; }
      draw(restParams, null); /* rest colour = the CSS token (no stroke attribute) */
      host.classList.remove("is-wave-playing");
      host.classList.add("is-wave-settled");
      host.removeEventListener("pointerenter", settle);
      host.removeEventListener("focusin", settle);
      resolveDone(true);
    }
    instance.finish = settle;

    instance.play = () => {
      if (reduced || !face) { settle(); return instance.done; }
      host.classList.remove("is-wave-settled");
      host.classList.add("is-wave-playing");
      host.addEventListener("pointerenter", settle, { once: true });
      host.addEventListener("focusin", settle, { once: true });
      const enter = tokenText("--motion-ease-enter") || "cubic-bezier(0.05, 0.7, 0.1, 1)";
      const standard = tokenText("--motion-ease-standard") || "cubic-bezier(0.2, 0, 0, 1)";
      pop = host.animate([
        { transform: `scale(${POP.from})`, opacity: 0, easing: enter },
        { transform: `scale(${POP.peak})`, opacity: 1, offset: POP.peakAt, easing: standard },
        { transform: "scale(1)", opacity: 1 },
      ], { duration: timing.pop });
      const start = performance.now();
      let last = start;
      const deltas = [];
      const tick = (now) => {
        deltas.push(now - last);
        last = now;
        const t = now - start;
        if (t >= duration) {
          deltas.shift();
          const sum = deltas.reduce((s, v) => s + v, 0);
          WaveAvatar.lastStats = { frames: deltas.length, avgMs: +(sum / Math.max(1, deltas.length)).toFixed(2), maxMs: +Math.max(0, ...deltas).toFixed(2) };
          settle();
          return;
        }
        const f = frameAt(t);
        draw(f.params, f.lab);
        raf = requestAnimationFrame(tick);
      };
      const f0 = frameAt(0);
      draw(f0.params, f0.lab);
      raf = requestAnimationFrame(tick);
      return instance.done;
    };

    instance.destroy = () => {
      cancelAnimationFrame(raf);
      if (pop) pop.cancel();
      svg.remove();
      if (face) { face.classList.remove("cab2-wave__face"); face.style.clipPath = ""; }
      host.classList.remove("cab2-wave", "is-wave-playing", "is-wave-settled");
    };

    /* the debugging / evidence hook: draw the frame at t ms without playing */
    instance.seek = (t) => { const f = frameAt(t); draw(f.params, f.lab); };

    if (options.play) instance.play();
    else settle();
    return instance;
  };

  window.WaveAvatar = WaveAvatar;
})();
