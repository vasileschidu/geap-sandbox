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
       options.sequence      shapes [{ n, a, colors: [4 colour tokens] }] — one step from each to the next, the last →
                             `rest`; the ring stroke = a linear gradient of the 4 colours + OKLab sub-stops (mixed with each step,
                             turning with the shape)
       options.rest          { n, a, colors } resting shape + its calm brand gradient (tokens, applied as var())
       options.timing        { pop, step, hold, last, turn } — pop ms (450, scale 0.6 → 1, no overshoot), each morph +
                             rotate step ms (800), hold ms between steps (0: continuous), the LAST step ms (1300), degrees
                             per step (48). Default 3 steps (10 → 4 → 12 deep → 12 rest) = 3.35 s. Shape, turn and gradient
                             move together on one curve per step: in-out cubic-bezier(0.45, 0, 0.2, 1), the last
                             cubic-bezier(0.45, 0, 0.1, 1) (long soft glide); speed nears zero only at the joins, no bounce.
       options.idle          after the entrance the ring's gradient turns once per 10 s, linear, seamless (only the
                             gradient — the outline stays still); paused when the tab is hidden or the host off screen;
                             none with reduced motion. Default on inside `[data-cab2-hero]` / `[data-wave-idle]`;
                             false = off, { period } = ms per turn.
       options.burst         false = off; default inside `[data-cab2-hero]`: the fixed rows BURST_DESKTOP (6) / BURST_PHONE
                             (4) — filled group icons fly out from under the avatar to the hero's edge in the avatar's
                             height band and turn straight back (no dwell), accelerating under it; scale 0.9 → 1 → 0.85;
                             no randomness. options.burstBox = the box they stay in. Reduced motion: none.
       options.burst         false = off; default inside `[data-cab2-hero]`: 6 filled group icons (4 on phones), 32 / 40
                             (phones 24 / 32), fly out from under the avatar like sun rays (even angles ± 12°, ± 10 px) to
                             the hero's edge in the avatar's height band and turn straight back (no dwell), accelerating
                             under it; scale 0.9 → 1 → 0.85, random tilt ± 20° easing back; colours = CSS tokens.
                             options.burstBox = the box they stay in. Reduced motion: none.
       options.burst         false = off; default inside `[data-cab2-hero]`: 10 filled group icons (6 on phones) fly out
                             from under the avatar like sun rays (even angles ± 12°, ± 10 px), rest near the hero's edge in
                             the avatar's height band, then accelerate back under it and fade; colours = CSS tokens.
                             options.burstBox = the box they stay in. Reduced motion: none.
       options.play          false → the resting frame at once (previews, a second visit)
       options.reducedMotion true / false; default = the system setting or `.is-motion-reduced` on <html>
     instance.play() · instance.finish() (jump to rest) · instance.destroy() · instance.done (Promise)
     instance.duration · instance.lastStep (ms) — for choreography around the entrance
     WaveAvatar.lastStats   { frames, avgMs, maxMs } of the last entrance (Performance check)
     WaveAvatar.path(cx, cy, R, params, points) → the SVG path string (reuse elsewhere)

   Performance: requestAnimationFrame; per frame only the ring's `d`, the gradient's stops / transform and the face's `clip-path` change
   (paint, no layout); the pop is a Web Animation on transform / opacity (compositor). Accessibility: the SVG is
   aria-hidden; the face keeps its own name; the entrance always plays to the end (hover / focus never stop it); a keyboard
   focus on the hidden pen shows it at once. */
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

  /* ---------- the EVO default entrance (Figma 1651:68043 / 1651:68106 measured: n 4 · 10 · 12, A/R .025 – .104;
     v9 product owner: 4 shapes — 10 → the 4-wave rounded square → the deep violet 12 (A .10) → 12 rest) ---------- */
  const DEFAULT_SEQUENCE = [
    { n: 10, a: 0.06, colors: ["--blue-sky-600", "--blue-sky-400", "--lavender-500", "--lavender-700"] },       /* the outer ring, blue → indigo */
    { n: 4, a: 0.08, colors: ["--forest-green-600", "--forest-green-400", "--blue-sky-600", "--lavender-700"] }, /* the rounded square, teal → indigo */
    { n: 12, a: 0.1, colors: ["--lavender-700", "--purple-500", "--magenta-500", "--magenta-600"] },            /* the deep 12-wave ring, indigo → magenta */
  ];
  /* rest = the Figma avatar (12 waves, A/R .025) in a calm brand gradient */
  /* v12 (product owner: „more contrast, add indigo and magenta”): Foundations has no indigo family — `--lavender-700`
     (OKLCH hue 283) is the closest to indigo (Tailwind indigo-600 = 277; purple-700 = 292 reads violet,
     blue-sky-800 = 259 reads navy). Hue order blue 260 → indigo 283 → magenta 318: magenta never sits next to blue. */
  const DEFAULT_REST = { n: 12, a: 0.025, colors: ["--blue-sky-400", "--blue-sky-600", "--lavender-700", "--magenta-500"] };
  /* between two anchor colours the SVG gradient would mix in sRGB → OKLab-computed sub-stops (no muddy middles) */
  const SUBSTOPS = 3;
  const POP = { from: 0.6 }; /* v5: no overshoot — scale 0.6 → 1 on --motion-ease-enter */
  /* product owner 2026-11-18: pop, then each wave change = one morph + rotate step (v2); no bounce (v5); 48° per step,
     the LAST step longer so it glides to rest (v7); v10: NO static holds — steps chained back-to-back, each eased in-out so
     the speed only nears zero at the joins; the last one eases in gently and glides out long.
     450 + 800 + 800 + 1300 = 3350 ms */
  const DEFAULT_TIMING = { pop: 450, step: 800, hold: 0, last: 1300, turn: 48 };
  const stepEase = bezier("cubic-bezier(0.45, 0, 0.2, 1)"); /* in-out, a touch longer out */
  const lastEase = bezier("cubic-bezier(0.45, 0, 0.1, 1)"); /* gentle start, long soft glide to rest */

  /* ---------- burst (product owner 2026-11-18): Cabinet group icons fly out from behind the avatar like sun rays and
     come back under it. Filled sprite icons only; colours = CSS (cab2-wave-avatar.css § 6, one token per icon). ---------- */
  /* v16 (product owner: „no randomness — the same every time”): one fixed, hand-tuned row per icon. Irregular on purpose
     (uneven angles, reaches, tilts, delays), never Math.random.
       icon    sprite id (filled)
       tone    colour modifier → `.cab2-wave__ray--<tone>` = one token (cab2-wave-avatar.css § 1c)
       size    size token
       angle   direction in degrees (0 = right, 90 = down, 180 = left, 270 = up)
       reach   share of the free distance to the hero's edge (inside the avatar's height band, clear of the ring)
       rotate  tilt in degrees at the edge (eases back to 30 % of it on the return)
       delay   ms after the burst start (out and back keep the same offset) */
  const BURST_DESKTOP = [
    { icon: "group-filled", tone: "blue-sky", size: "--spacing-32", angle: 197, reach: 0.92, rotate: -14, delay: 0 },
    { icon: "document-filled", tone: "lavender", size: "--spacing-40", angle: 328, reach: 0.82, rotate: 12, delay: 60 },
    { icon: "home-line-filled", tone: "magenta", size: "--spacing-32", angle: 152, reach: 0.74, rotate: 18, delay: 25 },
    { icon: "wallet-filled", tone: "forest-green", size: "--spacing-32", angle: 14, reach: 0.96, rotate: -10, delay: 90 },
    { icon: "business-filled", tone: "apricot", size: "--spacing-40", angle: 236, reach: 0.86, rotate: 8, delay: 45 },
    { icon: "id-card-filled", tone: "purple", size: "--spacing-32", angle: 44, reach: 0.7, rotate: -18, delay: 110 },
  ];
  const BURST_PHONE = [
    { icon: "group-filled", tone: "blue-sky", size: "--spacing-24", angle: 195, reach: 0.9, rotate: -12, delay: 0 },
    { icon: "document-filled", tone: "lavender", size: "--spacing-32", angle: 330, reach: 0.85, rotate: 14, delay: 50 },
    { icon: "wallet-filled", tone: "forest-green", size: "--spacing-24", angle: 15, reach: 0.95, rotate: -8, delay: 30 },
    { icon: "home-line-filled", tone: "magenta", size: "--spacing-32", angle: 150, reach: 0.8, rotate: 16, delay: 80 },
  ];
  const BURST = {
    start: 500,      /* ms after the entrance starts = 50 ms into step 1 (the pop ends at 450) */
    length: 1400,    /* each icon's whole trip; the last one (delay 110) is under the avatar by ≈ 2.01 s = the end of
                        step 2 (2.05 s) — the last step's glide to rest then plays alone */
    turn: 0.45,      /* share of the trip at which it reaches the edge and turns straight back */
  };
  /* v16 (product owner): they linger near the edge through easing, never a static pause — a strong quint ease-out (long
     soft approach) flows into a slow quint ease-in (a very gentle start back, then accelerating under the avatar) */
  const OUT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";  /* quint out */
  const BACK_EASE = "cubic-bezier(0.64, 0, 0.78, 0)"; /* quint in */

  let uid = 0;
  const WaveAvatar = { lastStats: null, path };

  WaveAvatar.mount = function mount(host, options = {}) {
    if (!host) return null;
    const face = options.face || host.querySelector(".avatar");
    const size = options.size || (face && face.getBoundingClientRect().width) || 72;
    const gap = options.gap ?? Math.round(size / 18); /* 72 → 4 · 80 → 4 · 96 → 5 */
    const stroke = parseFloat(tokenText("--border-width-3", host)) || 3;
    const reduced = options.reducedMotion ?? systemReduced();
    const timing = { ...DEFAULT_TIMING, ...(options.timing || {}) };
    const rest = { ...DEFAULT_REST, ...(options.rest || {}) };
    const labs = (tokens) => tokens.map((name) => oklab(tokenRgb(name)));
    const keys = [...(options.sequence || DEFAULT_SEQUENCE).map((k) => ({ ...k, labs: labs(k.colors) })),
      { n: rest.n, a: rest.a, labs: labs(rest.colors) }];
    const steps = keys.length - 1;
    const duration = timing.pop + (steps - 1) * (timing.step + timing.hold) + (timing.last || timing.step);

    /* the face's mean radius: peaks (a ≤ 0.10) stay inside its square box; the ring sits `gap` outside it */
    const Rm = (size / 2) * 0.91; /* peaks of A .10 stay inside the face box (0.91 · 1.10 ≈ 1) */
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
    /* the gradient along the ring's diagonal; turns with the shape (gradientTransform) */
    const gid = `cab2-wave-grad-${uid + 1}`;
    const defs = document.createElementNS(NS, "defs");
    const grad = document.createElementNS(NS, "linearGradient");
    grad.setAttribute("id", gid);
    grad.setAttribute("gradientUnits", "userSpaceOnUse");
    grad.setAttribute("x1", String(pad));
    grad.setAttribute("y1", String(pad));
    grad.setAttribute("x2", String(box - pad));
    grad.setAttribute("y2", String(box - pad));
    const anchors = rest.colors.length;
    const stopCount = (anchors - 1) * (SUBSTOPS + 1) + 1;
    const stops = Array.from({ length: stopCount }, (_, k) => {
      const stop = document.createElementNS(NS, "stop");
      stop.setAttribute("offset", (k / (stopCount - 1)).toFixed(4));
      grad.appendChild(stop);
      return stop;
    });
    /* anchors (OKLab) → every stop: anchor j at stop j·(SUBSTOPS+1), the ones between mixed in OKLab */
    const stopLabs = (anchorLabs) => stops.map((_, k) => {
      const j = Math.floor(k / (SUBSTOPS + 1));
      const f = (k % (SUBSTOPS + 1)) / (SUBSTOPS + 1);
      return f === 0 || j >= anchors - 1 ? anchorLabs[Math.min(j, anchors - 1)] : mixLab(anchorLabs[j], anchorLabs[j + 1], f);
    });
    const restStops = stopLabs(keys[keys.length - 1].labs);
    defs.appendChild(grad);
    svg.appendChild(defs);
    const ring = document.createElementNS(NS, "path");
    ring.setAttribute("class", "cab2-wave__path");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke-width", String(stroke));
    ring.setAttribute("stroke-linejoin", "round");
    ring.style.stroke = `url(#${gid})`;
    svg.appendChild(ring);
    host.insertBefore(svg, host.firstChild);
    if (face) face.classList.add("cab2-wave__face");
    const id = ++uid;
    host.dataset.cab2Wave = String(id);

    const fc = size / 2;
    /* `mix` = the anchor OKLab colours during the entrance; null = rest: anchors as var() tokens, sub-stops from OKLab */
    function draw(params, mix) {
      ring.setAttribute("d", path(c, c, Rr, params));
      grad.setAttribute("gradientTransform", `rotate(${((params.rot * 180) / Math.PI).toFixed(2)} ${c} ${c})`);
      if (face) face.style.clipPath = `path("${path(fc, fc, Rm, params)}")`;
      const labsNow = mix ? stopLabs(mix) : restStops;
      stops.forEach((stop, k) => {
        const anchor = k % (SUBSTOPS + 1) === 0 ? rest.colors[k / (SUBSTOPS + 1)] : "";
        stop.style.stopColor = !mix && anchor ? `var(${anchor})` : `rgb(${fromOklab(labsNow[k]).join(",")})`;
      });
    }
    const TURN = (timing.turn * Math.PI) / 180;
    /* the frame at t ms: the first shape during the pop; then step i = morph i → i+1 + one turn + the gradient colours,
       all on ONE in-out curve per step, chained with no hold (the last glides out long) */
    /* step start times: every step `step` ms, the last one `last` ms (a longer glide), `hold` ms still between */
    const lens = keys.slice(1).map((_, k) => (k === steps - 1 ? timing.last || timing.step : timing.step));
    const starts = lens.map((_, k) => timing.pop + lens.slice(0, k).reduce((sum, v) => sum + v + timing.hold, 0));
    function frameAt(t) {
      let i = 0;
      while (i < steps - 1 && t >= starts[i + 1]) i++;
      const x = Math.min(1, Math.max(0, (t - starts[i]) / lens[i]));
      /* v8 (product owner): shape and turn move together — same start, same length, the same expo-out curve */
      const w = (i === steps - 1 ? lastEase : stepEase)(x);
      const p = keys[i];
      const q = keys[i + 1];
      return {
        params: { n0: p.n, n1: q.n, w, a: p.a + (q.a - p.a) * w, rot: TURN * (i + w) },
        lab: p.labs.map((lab, k) => mixLab(lab, q.labs[k], w)),
      };
    }

    const restParams = { n0: rest.n, a: rest.a, rot: TURN * steps };
    let raf = 0;

    /* ---- idle (product owner 2026-11-18): after the entrance only the ring's gradient turns — one full turn per
       `idle.period` ms (10 s), linear, seamless; the outline never moves. Runs only while the tab is visible and the
       host is on screen (IntersectionObserver); none with reduced motion. Default on inside the hero, off elsewhere. ---- */
    const idleOn = !reduced && (options.idle ?? !!host.closest("[data-cab2-hero], [data-wave-idle]"));
    /* the burst: on by default inside the hero, its icons kept inside the hero's box */
    const burstBox = options.burst === false ? null : (options.burstBox || host.closest("[data-cab2-hero]"));
    let burstLayer = null;
    function burst() {
      if (!burstBox || reduced) return;
      const use = document.querySelector('use[href*="sprite.svg"]');
      const sprite = use ? use.getAttribute("href").split("#")[0] : "";
      if (!sprite) return;
      const phone = window.matchMedia("(max-width: 760px)").matches;
      const rows = phone ? BURST_PHONE : BURST_DESKTOP;
      const hb = burstBox.getBoundingClientRect();
      const ab = host.getBoundingClientRect();
      const cx = ab.left + ab.width / 2;
      const cy = ab.top + ab.height / 2;
      /* the reachable area = an ellipse inside the hero: full half-width, but only the avatar's own height band, so the
         icons never land over the name / line under it */
      const rx = Math.max(0, Math.min(cx - hb.left, hb.right - cx) - 24);
      const ry = ab.height / 2 + 8;
      burstLayer = document.createElement("span");
      burstLayer.className = "cab2-wave__burst";
      burstLayer.setAttribute("aria-hidden", "true");
      rows.forEach((row) => {
        const size = parseFloat(tokenText(row.size)) || 32;
        const t = (row.angle * Math.PI) / 180;
        let x = Math.cos(t) * rx * row.reach;
        const y = Math.sin(t) * ry * row.reach;
        /* never rest on the ring: push sideways until clear of the ring + half the icon + 8 */
        const clear = ab.width / 2 + pad / 2 + size / 2 + 8;
        if (Math.hypot(x, y) < clear) x = (Math.cos(t) < 0 ? -1 : 1) * Math.sqrt(Math.max(0, clear * clear - y * y));
        const tilt = row.rotate;
        const icon = document.createElementNS(NS, "svg");
        icon.setAttribute("class", `cab2-wave__ray cab2-wave__ray--${row.tone}`);
        icon.setAttribute("width", String(size));
        icon.setAttribute("height", String(size));
        icon.setAttribute("focusable", "false");
        const ref = document.createElementNS(NS, "use");
        ref.setAttribute("href", `${sprite}#icon-${row.icon}`);
        icon.appendChild(ref);
        burstLayer.appendChild(icon);
        const at = (px, py, scale, rot) => `translate(-50%, -50%) translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${scale})`;
        icon.animate([
          { transform: at(0, 0, 0.9, 0), opacity: 0, offset: 0, easing: OUT_EASE },
          { opacity: 1, offset: BURST.turn * 0.35 },
          { transform: at(x, y, 1, tilt), opacity: 1, offset: BURST.turn, easing: BACK_EASE },
          { opacity: 1, offset: 0.8 },
          { transform: at(0, 0, 0.85, tilt * 0.3), opacity: 0, offset: 1 },
        ], { duration: BURST.length, delay: BURST.start + row.delay, fill: "both" });
      });
      host.insertBefore(burstLayer, host.firstChild);
    }
    function clearBurst() {
      if (!burstLayer) return;
      burstLayer.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      burstLayer.remove();
      burstLayer = null;
    }
    const period = (options.idle && options.idle.period) || 10000;
    const restDeg = (restParams.rot * 180) / Math.PI;
    let idleRaf = 0;
    let idleAngle = 0;
    let idleLast = 0;
    let idleWanted = false;
    let onScreen = true;
    const idleTick = (now) => {
      const dt = idleLast ? Math.min(100, now - idleLast) : 0; /* clamp: no jump after a pause */
      idleLast = now;
      idleAngle = (idleAngle + (360 * dt) / period) % 360;
      grad.setAttribute("gradientTransform", `rotate(${(restDeg + idleAngle).toFixed(2)} ${c} ${c})`);
      idleRaf = requestAnimationFrame(idleTick);
    };
    function idleSync() {
      const run = idleWanted && onScreen && !document.hidden;
      if (run && !idleRaf) { idleLast = 0; idleRaf = requestAnimationFrame(idleTick); }
      if (!run && idleRaf) { cancelAnimationFrame(idleRaf); idleRaf = 0; }
    }
    const io = idleOn && "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => { onScreen = entries.some((e) => e.isIntersecting); idleSync(); })
      : null;
    if (io) io.observe(host);
    if (idleOn) document.addEventListener("visibilitychange", idleSync);
    function startIdle() { if (!idleOn) return; idleWanted = true; idleSync(); }
    function stopIdle() { idleWanted = false; idleSync(); }
    let pop = null;
    let resolveDone;
    /* `duration` / `lastStep` (ms) let a page choreograph around the entrance */
    const instance = { host, duration, lastStep: lens[steps - 1], done: new Promise((r) => { resolveDone = r; }) };

    function settle() {
      cancelAnimationFrame(raf);
      raf = 0;
      if (pop) { pop.cancel(); pop = null; }
      clearBurst();
      draw(restParams, null); /* rest gradient = the tokens */
      startIdle();
      host.classList.remove("is-wave-playing");
      host.classList.add("is-wave-settled");
      resolveDone(true);
    }
    instance.finish = settle;

    instance.play = () => {
      if (reduced || !face) { settle(); return instance.done; }
      stopIdle();
      host.classList.remove("is-wave-settled");
      host.classList.add("is-wave-playing");
      /* v13 (product owner): hover / pointer / focus never end or restart the entrance — it always plays to the end; a
         keyboard focus on the hidden pen shows it (CSS :focus-visible) while the animation keeps going */
      const enter = tokenText("--motion-ease-enter") || "cubic-bezier(0.05, 0.7, 0.1, 1)";
      clearBurst();
      burst();
      pop = host.animate([
        { transform: `scale(${POP.from})`, opacity: 0, easing: enter },
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
      clearBurst();
      stopIdle();
      if (io) io.disconnect();
      if (idleOn) document.removeEventListener("visibilitychange", idleSync);
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
