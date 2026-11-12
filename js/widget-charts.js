/* =====================================================================================
   Widget charts (widget-v1, 2026-11-06) — Feature 96501 „Configurarea widget-urilor”: the 11 widget types drawn as
   hand-made SVG / HTML in EXACTLY the eKYC dashboard chart style (user decision 2026-11-06: no chart library).
   Reused classes: `.e-permits-chart__plot` (160 high, baseline border, clip) · `rect.e-permits-chart__bar--{tone}`
   (rounded tops rx 4, stacked = top segment first, extended under the baseline) · `.e-permits-chart__axis` ·
   `.e-permits-meter(--lg)` + `__fill--{tone}` + `__gap` · `.e-permits-meter-legend(--tray)` + `__dot` ·
   `.e-permits-ekyc-band__label(.is-threshold)` (axis / value / target labels) · `.e-permits-wid-stat` (tile, wid-card-v2) ·
   `.e-permits-reg-table` (tables). Drill-down targets are always real buttons (category rows, column slots, legend
   lines, heat-map cells, the tile, table values) — never role=button on SVG. New (css/widget.css, components.md › „Widgete — chart types”): the series palette
   `.e-permits-wid-s1…s6` (one custom property `--wid-series`, read by `.e-permits-wid-fill` / `-line` / `-arc` and the
   legend dots), plot heights, line / area / dots, target line, control limits, category rows, donut, heat map,
   funnel, treemap, the type glyphs of the gallery.

   GEAPWidgetCharts.render(model) → HTML of the widget body. The model comes from the aggregation in
   js/widget-admin.js (US-409): { type, fmt(v), cats: [{ key, label, value, prev, parts: [{ key, value }] }],
   series: [{ key, label }], dateAxis, tone(v) → success | warning | danger | null, target: { value, label } | null,
   drill (bool), height, rows / columns (row table), single (tile), limits (control chart), measureLabel,
   kpi (bool) + kpiCurrent (the KPI's overall value) — a KPI works on EVERY type (Feature 96501 rev 18): axis charts draw
   the target line, tables add a „Zona” tag column, every type without an axis gets the value + „Ținta” legend line }.
   GEAPWidgetCharts.glyph(type) → the 24 glyph of a type card.
   ===================================================================================== */
(function () {
  "use strict";

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (v) => `${Number(v).toFixed(2)}%`;
  const SERIES = 6;
  /* the series palette: categorical (s1 = brand … s6 = neutral „Altele”); zones = the calmer --wid-zone-* tones (css/widget.css, chart-palette-v1) */
  const sClass = (i) => `e-permits-wid-s${(i % SERIES) + 1}`;
  /* Status dimensions = fixed colours (chart-status-v1, 2026-11-09): a status value keeps ONE colour system-wide, the tone
     of its tag in the tables at chart weight (css/widget.css `.e-permits-wid-st-<tone>`); key = „<source>.<field>”. Not
     per widget, not editable; a palette never changes them; unknown values keep the palette order, „Altele” = s6 */
  const STATUS_COLOURS = {
    "reg-dosare.statut": { "Depus": "info", "În examinare": "brand", "Suspendat": "warning", "Finalizat": "success", "Respins": "danger", "Retras": "neutral" },
    "reg-acte.status": { "Valabil": "success", "Aprobare tacită": "brand", "Suspendat": "warning", "Retras": "danger", "Anulat": "danger-light", "Expirat": "neutral" },
    "reg-note.statutNota": { "Emisă": "brand", "Achitată": "success", "Parțial achitată": "warning", "Neachitată": "danger", "Anulată": "neutral" },
    "reg-avize.statut": { "Solicitat": "brand", "Emis": "success", "Refuzat": "danger" }
  };
  const isStatusDim = (source, field) => Boolean(source && field && STATUS_COLOURS[`${source}.${field}`]);
  const statusClass = (source, field, value) => { const t = STATUS_COLOURS[`${source}.${field}`]?.[value]; return t ? `e-permits-wid-st-${t}` : ""; };
  /* the colour class of series j / category i: the fixed status colour when the model carries one, else the palette */
  const serCls = (m, j) => m.seriesStatus?.[j] || (m.series?.[j]?.label === "Altele" ? sClass(SERIES - 1) : sClass(j));
  const catCls = (m, i) => m.catStatus?.[i] || (m.cats?.[i]?.label === "Altele" ? sClass(SERIES - 1) : sClass(i));
  const max = (list) => Math.max(0, ...list.filter((v) => Number.isFinite(v)));
  const nf = (v) => Number(v).toLocaleString("ro-MD", { maximumFractionDigits: 0 });
  const share = (v, total) => (total ? `${Math.round((v / total) * 100)}%` : "0%");
  const PLOT = (m, extra = "") => `e-permits-chart__plot e-permits-wid-plot e-permits-wid-plot--${m.height || "compact"}${extra ? ` ${extra}` : ""}`;
  /* a drill-down target: a real button (HTML) or an SVG element with role=button; „fără acces” = plain */
  const drillAttrs = (m, label, value) => (m.drill ? ` data-wid-drill="${esc(label)}" data-wid-drill-value="${esc(m.fmt(value))}"` : "");

  const legend = (items, { vertical = false, wrap = false } = {}) => `
    <ul class="e-permits-meter-legend e-permits-meter-legend--tray${vertical ? " e-permits-wid-legend--list" : ""}${wrap ? " e-permits-wid-legend--wrap" : ""}" role="list">
      ${items.map((it) => {
        const inner = `<span class="e-permits-meter-legend__dot ${it.dot}" aria-hidden="true"></span><span${vertical ? ` data-tooltip-label="${esc(it.label)}"` : ""}>${esc(it.label)}</span>${it.value ? `<strong>${esc(it.value)}</strong>` : ""}${it.pct ? `<span class="e-permits-meter-legend__pct">${esc(it.pct)}</span>` : ""}`;
        /* donut-hover-v1: a donut legend line is tied to its slice (`data-wid-slice`) — a drill button, else a focusable line */
        const slice = Number.isInteger(it.slice) ? ` data-wid-slice="${it.slice}"` : "";
        if (it.button) return `<li><button class="e-permits-wid-legend__btn" type="button"${slice}${it.button}>${inner}</button></li>`;
        if (slice) return `<li><span class="e-permits-wid-legend__btn e-permits-wid-legend__btn--static" tabindex="0"${slice}>${inner}</span></li>`;
        return `<li>${inner}</li>`;
      }).join("")}
    </ul>`;
  const toneDot = (tone) => `e-permits-meter-legend__dot--${tone}`;
  /* the legend of a single-series chart: thresholds (zones) or the measure, + the KPI target */
  function baseLegend(m) {
    if (m.catStatus?.some(Boolean) && !m.zones?.length) return legend([...m.cats.map((c, i) => ({ label: c.label, dot: catCls(m, i) })), ...(m.target ? [{ label: m.target.label, dot: "e-permits-wid-legend__target" }] : [])], { wrap: true });
    const items = m.zones?.length ? m.zones.map(([label, tone]) => ({ label, dot: toneDot(tone) })) : [{ label: m.measureLabel || "Valoare", dot: toneDot("brand") }];
    if (m.target) items.push({ label: m.target.label, dot: "e-permits-wid-legend__target" });
    return legend(items);
  }
  /* KPI on a type without an axis (sectors, heat map, funnel, treemap, tables): the KPI's overall value + „Ținta …” */
  const kpiLegend = (m) => (m.target || m.kpi ? legend([
    ...(Number.isFinite(m.kpiCurrent) ? [{ label: "Valoarea KPI", value: m.fmt(m.kpiCurrent), dot: toneDot(m.tone?.(m.kpiCurrent) || "brand") }] : []),
    ...(m.target ? [{ label: m.target.label, dot: "e-permits-wid-legend__target" }] : [])
  ]) : "");
  const zoneOf = (m, v) => { const tone = m.tone?.(v); const z = (m.zones || []).find(([, t]) => t === tone); return z && m.kpi ? window.GEAPTag?.html(z[0], tone) || esc(z[0]) : ""; };
  const seriesLegend = (m) => legend([...m.series.map((s, i) => ({ label: s.label, dot: serCls(m, i) })), ...(m.target ? [{ label: m.target.label, dot: "e-permits-wid-legend__target" }] : [])]);
  /* the category axis: one label per slot, centred under it (the slots' flex); `fit()` thins them to every k-th so two
     neighbours are ≥ 8 apart, and keeps the end labels inside the plot — never rotated, never overlapping */
  const axis = (cats) => (cats.length ? `<div class="e-permits-chart__axis e-permits-wid-axis" aria-hidden="true">${cats.map((c) => `<span class="e-permits-wid-axis__tick"><span>${esc(c.label)}</span></span>`).join("")}</div>` : "");
  const ariaOf = (m) => esc(m.cats.map((c) => `${c.label} ${m.fmt(c.value)}`).join(", "));
  const targetSvg = (m, top) => (m.target ? `<line class="e-permits-wid-target" x1="0" x2="100%" y1="${pct(top)}" y2="${pct(top)}"></line>` : "");

  /* ---------------------------------------------------------------- vertical columns (date axis): Bare / Bare suprapuse
     the plot = a row of slots, one per category: a real <button> when it drills (hover = the list band behind the bar +
     the darker bar), a plain span otherwise; each slot holds its own SVG bar (x 22–78 % of the slot, eKYC proportions) */
  const slot = (m, c, value, inner, label = c.label) => (m.drill
    ? `<button class="e-permits-wid-cols__slot" type="button"${drillAttrs(m, label, value)} aria-label="${esc(`${label}: ${m.fmt(value)} — deschide înregistrările`)}" data-tooltip-label="${esc(`${label}: ${m.fmt(value)}`)}">${inner}</button>`
    : `<span class="e-permits-wid-cols__slot">${inner}</span>`);
  function columns(m, { stacked = false } = {}) {
    const n = m.cats.length;
    const totals = m.cats.map((c) => (stacked ? c.parts.reduce((s, p) => s + p.value, 0) : c.value));
    const top = max([...totals, m.target ? m.target.value : 0]) * 1.15 || 1;
    const slots = m.cats.map((c, i) => {
      let bars;
      if (!stacked) {
        const y = 100 - (c.value / top) * 100;
        const tone = m.tone?.(c.value) || "brand";
        const label = `<text class="e-permits-ekyc-band__label" data-wid-fit="value" x="50%" y="${pct(Math.max(8, y - 3))}" text-anchor="middle">${esc(m.fmt(c.value))}</text>`;
        const st = !m.tone && m.catStatus?.[i];
        bars = `<rect class="${st ? `e-permits-wid-fill ${st}` : `e-permits-chart__bar--${tone}`}" x="22%" y="${pct(y)}" width="56%" height="200%" rx="4"></rect>${label}`;
      } else {
        /* stacked: the top segment first (rounded top; its rect runs 200% = far under the baseline, clipped by the plot, so the bottom corners never show), the lower ones square on top */
        let acc = 0;
        const segs = c.parts.map((p, j) => { const from = acc; acc += p.value; return { ...p, j, from, to: acc }; }).filter((sg) => sg.value > 0);
        const rect = (sg, rounded) => `<rect class="e-permits-wid-fill ${serCls(m, sg.j)}" x="22%" y="${pct(100 - (sg.to / top) * 100)}" width="56%" height="${rounded ? "200%" : pct(((sg.to - sg.from) / top) * 100)}"${rounded ? ' rx="4"' : ""}></rect>`;
        bars = segs.length ? rect(segs[segs.length - 1], true) + segs.slice(0, -1).reverse().map((sg) => rect(sg, false)).join("") : "";
      }
      return slot(m, c, totals[i], `<svg class="e-permits-wid-cols__svg" aria-hidden="true" focusable="false">${bars}</svg>`);
    }).join("");
    const t = m.target ? 100 - (m.target.value / top) * 100 : 0;
    return `
      <div class="e-permits-wid-plot-wrap">
        <div class="e-permits-wid-cols e-permits-wid-plot--${m.height || "compact"}" role="img" aria-label="${ariaOf(m)}">${slots}</div>
        ${m.target ? `<svg class="e-permits-wid-layer" aria-hidden="true" focusable="false">${targetSvg(m, t)}</svg>` : ""}
      </div>
      ${axis(m.cats)}
      ${stacked ? seriesLegend(m) : baseLegend(m)}`;
  }

  /* ---------------------------------------------------------------- horizontal rows (categories): Bare / Bare suprapuse */
  function rows(m, { stacked = false } = {}) {
    const totals = m.cats.map((c) => (stacked ? c.parts.reduce((s, p) => s + p.value, 0) : c.value));
    const top = max([...totals, m.target ? m.target.value : 0]) || 1;
    const items = m.cats.map((c, i) => {
      const total = totals[i];
      let x = 0;
      const cuts = [];
      const fills = stacked
        ? c.parts.map((p, j) => { if (p.value <= 0) return ""; const width = (p.value / top) * 100; const r = `<rect class="e-permits-wid-fill ${serCls(m, j)}" x="${pct(x)}" y="0" width="${pct(width)}" height="100%"></rect>`; x += width; cuts.push(x); return r; }).join("")
        : `<rect class="${!m.tone && m.catStatus?.[i] ? `e-permits-wid-fill ${m.catStatus[i]}` : `e-permits-meter__fill--${m.tone?.(c.value) || "brand"}`}" x="0" y="0" width="${pct((c.value / top) * 100)}" height="100%"></rect>`;
      const gaps = stacked ? cuts.slice(0, -1).map((at) => `<line class="e-permits-meter__gap" x1="${pct(at)}" x2="${pct(at)}" y1="0" y2="100%"></line>`).join("") : "";
      const target = m.target ? `<line class="e-permits-wid-target e-permits-wid-target--v" x1="${pct((m.target.value / top) * 100)}" x2="${pct((m.target.value / top) * 100)}" y1="0" y2="100%"></line>` : "";
      const inner = `
        <span class="e-permits-wid-rows__label" data-cell-tooltip="${esc(c.label)}">${esc(c.label)}</span>
        <span class="e-permits-meter e-permits-meter--lg" role="img" aria-label="${esc(`${c.label}: ${m.fmt(total)}`)}"><svg class="e-permits-meter__svg" aria-hidden="true" focusable="false"><rect class="e-permits-meter__track" x="0" y="0" width="100%" height="100%"></rect>${fills}${gaps}${target}</svg></span>
        <span class="e-permits-wid-rows__value">${esc(m.fmt(total))}</span>`;
      return `<li>${m.drill ? `<button class="e-permits-wid-rows__row" type="button"${drillAttrs(m, c.label, total)} aria-label="${esc(`${c.label}: ${m.fmt(total)} — deschide înregistrările`)}">${inner}</button>` : `<div class="e-permits-wid-rows__row">${inner}</div>`}</li>`;
    }).join("");
    return `
      <ul class="e-permits-wid-rows e-permits-wid-rows--${m.height || "compact"}" role="list">${items}</ul>
      ${stacked ? seriesLegend(m) : baseLegend(m)}`;
  }

  /* ---------------------------------------------------------------- Linie sau arie / Diagramă de control
     the slots of the columns chart carry the drill-down (hover band); the lines (a stretched viewBox layer, widths kept by
     non-scaling-stroke), the dots, the target and the control lines are drawn in pointer-transparent layers above */
  function line(m, { control = false } = {}) {
    const n = m.cats.length;
    const lines = m.series.length ? m.series.map((sr, j) => m.cats.map((c) => c.parts[j]?.value || 0)) : [m.cats.map((c) => c.value)];
    const lim = control ? m.limits : null;
    const top = max([...lines.flat(), m.target ? m.target.value : 0, lim ? lim.ucl : 0]) * 1.15 || 1;
    const X = (i) => ((i + 0.5) / n) * 100;
    const Y = (v) => 100 - (v / top) * 100;
    const layers = lines.map((vals, j) => {
      const pts = vals.map((v, i) => `${X(i).toFixed(2)},${Y(v).toFixed(2)}`).join(" ");
      const area = lines.length === 1 && !control ? `<polygon class="e-permits-wid-area" points="${X(0).toFixed(2)},100 ${pts} ${X(n - 1).toFixed(2)},100"></polygon>` : "";
      return `<svg class="e-permits-wid-layer ${m.series.length ? serCls(m, j) : sClass(j)}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">${area}<polyline class="e-permits-wid-line" points="${pts}" vector-effect="non-scaling-stroke"></polyline></svg>`;
    }).join("");
    const dots = lines.map((vals, j) => vals.map((v, i) => {
      const out = lim && (v > lim.ucl || v < lim.lcl);
      return `<circle class="e-permits-wid-dot ${m.series.length ? serCls(m, j) : sClass(j)}${out ? " is-out" : ""}" cx="${pct(X(i))}" cy="${pct(Y(v))}" r="3"></circle>`;
    }).join("")).join("");
    const limits = lim ? `
      <line class="e-permits-wid-limit" x1="0" x2="100%" y1="${pct(Y(lim.ucl))}" y2="${pct(Y(lim.ucl))}"></line>
      <line class="e-permits-wid-mean" x1="0" x2="100%" y1="${pct(Y(lim.mean))}" y2="${pct(Y(lim.mean))}"></line>
      ${lim.lcl > 0 ? `<line class="e-permits-wid-limit" x1="0" x2="100%" y1="${pct(Y(lim.lcl))}" y2="${pct(Y(lim.lcl))}"></line>` : ""}` : "";
    const totals = m.cats.map((c, i) => (lines.length === 1 ? c.value : lines.reduce((a, l) => a + l[i], 0)));
    const slots = m.cats.map((c, i) => slot(m, c, totals[i], "")).join("");
    const legendHtml = control
      ? legend([{ label: m.measureLabel || "Valoare", dot: sClass(0) }, { label: `Media ${m.fmt(lim.mean)}`, dot: "e-permits-wid-legend__mean" }, { label: `Limitele de control ${m.fmt(lim.lcl)} – ${m.fmt(lim.ucl)}`, dot: "e-permits-wid-legend__limit" }, ...(lim.out ? [{ label: `${lim.out} ${lim.out === 1 ? "valoare" : "valori"} în afara limitelor`, dot: toneDot("danger") }] : [])])
      : m.series.length ? seriesLegend(m) : baseLegend(m);
    return `
      <div class="e-permits-wid-plot-wrap">
        <div class="e-permits-wid-cols e-permits-wid-plot--${m.height || "compact"}" role="img" aria-label="${ariaOf(m)}">${slots}</div>
        ${layers}
        <svg class="e-permits-wid-layer" aria-hidden="true" focusable="false">${limits}${targetSvg(m, m.target ? Y(m.target.value) : 0)}${dots}</svg>
      </div>
      ${axis(m.cats)}
      ${legendHtml}`;
  }

  /* ---------------------------------------------------------------- Sectoare sau inel */
  function donut(m) {
    const total = m.cats.reduce((s, c) => s + c.value, 0);
    let off = 0;
    /* donut-hover-v1: each arc carries its sweep (from / len, % of the ring, clockwise from 12 o'clock) and its tooltip
       text; the hover runtime below hit-tests the ring by angle and draws the grey halo (`__halo`) over the active one */
    const tipOf = (c) => `${c.label} · ${m.fmt(c.value)} · ${share(c.value, total)}`;
    const ariaSlice = (c) => `${c.label}: ${m.fmt(c.value)} (${share(c.value, total)})`;
    const arcs = m.cats.map((c, i) => {
      const len = total ? (c.value / total) * 100 : 0;
      const dash = Math.max(0, len - (m.cats.length > 1 ? 0.8 : 0));
      const arc = `<circle class="e-permits-wid-arc ${catCls(m, i)}" cx="21" cy="21" r="15.9155" stroke-width="6" pathLength="100" stroke-dasharray="${dash.toFixed(2)} ${(100 - dash).toFixed(2)}" stroke-dashoffset="${(25 - off).toFixed(2)}" data-wid-slice="${i}" data-wid-from="${off.toFixed(3)}" data-wid-len="${len.toFixed(3)}" data-wid-tip="${esc(tipOf(c))}"></circle>`;
      off += len;
      return arc;
    }).join("");
    const halo = total ? '<circle class="e-permits-wid-donut__halo" cx="21" cy="21" r="20" pathLength="100" stroke-dasharray="0 100"></circle>' : "";
    return `
      <div class="e-permits-wid-donut e-permits-wid-donut--${m.height || "compact"}${total ? "" : " e-permits-wid-donut--empty"}">
        <div class="e-permits-wid-donut__chart">
          <svg class="e-permits-wid-donut__svg" viewBox="0 0 42 42" role="img" aria-label="${ariaOf(m)}" focusable="false"><circle class="e-permits-wid-donut__track" cx="21" cy="21" r="15.9155" stroke-width="6"></circle>${arcs}${halo}</svg>
          <span class="e-permits-wid-donut__center"><strong>${esc(m.fmt(m.kpi && Number.isFinite(m.kpiCurrent) ? m.kpiCurrent : total))}</strong><span>${m.kpi ? "KPI" : "total"}</span></span>
        </div>
        ${legend(m.cats.map((c, i) => ({ label: c.label, value: m.fmt(c.value), pct: share(c.value, total), dot: catCls(m, i), slice: total ? i : undefined, button: m.drill ? `${drillAttrs(m, c.label, c.value)} aria-label="${esc(`${ariaSlice(c)} — deschide înregistrările`)}"` : "" })), { vertical: true })}
      </div>`;
  }

  /* „Vezi tot” (wid-heights-v1): shown by fit() when a fixed-height card hides table rows; opens the whole widget */
  const allBtn = () => '<button class="btn btn-text-primary btn-sm e-permits-wid-all is-fit-hidden" type="button" aria-haspopup="dialog" data-wid-all>Vezi tot</button>';

  /* ---------------------------------------------------------------- Tabel agregat */
  function aggTable(m) {
    const hasSeries = m.series.length > 0;
    const zones = Boolean(m.kpi && m.zones?.length);
    const head = [m.axisLabel || "Categorie", ...(hasSeries ? m.series.map((s) => s.label) : []), hasSeries && !m.kpi ? "Total" : m.kpi ? "Valoare" : m.measureLabel || "Valoare", ...(zones ? ["Zona"] : []), ...(m.compareLabel ? [m.compareLabel] : [])];
    const cell = (c, v) => (m.drill ? `<button class="link link-primary link-sm e-permits-wid-table__drill" type="button"${drillAttrs(m, c, v)}>${esc(m.fmt(v))}</button>` : esc(m.fmt(v)));
    const body = m.cats.map((c) => {
      const total = hasSeries && !m.kpi ? c.parts.reduce((s, p) => s + p.value, 0) : c.value;
      const prev = c.prev;
      const delta = m.compareLabel && prev ? `${total >= prev ? "▲" : "▼"} ${Math.abs(Math.round(((total - prev) / prev) * 100))}%` : "—";
      return `<tr><th scope="row"><span data-cell-tooltip="${esc(c.label)}">${esc(c.label)}</span></th>${hasSeries ? c.parts.map((p, j) => `<td>${cell(`${c.label} · ${m.series[j].label}`, p.value)}</td>`).join("") : ""}<td><strong>${cell(c.label, total)}</strong></td>${zones ? `<td>${zoneOf(m, total) || '<span class="e-permits-workplace__dash">—</span>'}</td>` : ""}${m.compareLabel ? `<td>${esc(delta)}</td>` : ""}</tr>`;
    }).join("");
    return `
      <div class="e-permits-workplace__table-wrap e-permits-reg-table e-permits-wid-table-wrap e-permits-wid-table-wrap--${m.height || "compact"}">
        <table class="e-permits-workplace__table e-permits-reg-table__table e-permits-wid-table e-permits-wid-table--agg">
          <caption class="u-visually-hidden">${esc(m.caption || "Tabel agregat")}</caption>
          <thead><tr>${head.map((h, i) => `<th scope="col"${i ? ' class="e-permits-wid-table__num"' : ""}><span class="e-permits-workplace__th-content"><span>${esc(h)}</span></span></th>`).join("")}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${allBtn()}`;
  }

  /* ---------------------------------------------------------------- Hartă de căldură */
  function heatmap(m) {
    const all = m.cats.flatMap((c) => c.parts.map((p) => p.value));
    const hi = max(all) || 1;
    /* a KPI (a rate close to its peers): the ramp spans its own min … max, else every cell is dark; the cell shows the
       rounded value (the exact one is in the label) so the 6 columns fit a half-width card */
    const lo = m.kpi ? Math.min(...all.filter((v) => Number.isFinite(v))) : 0;
    const level = (v) => (v <= 0 ? 0 : m.kpi ? (hi === lo ? 3 : 1 + Math.min(4, Math.floor(((v - lo) / (hi - lo)) * 5))) : Math.min(5, Math.max(1, Math.ceil((v / hi) * 5))));
    const show = (v) => (m.kpi ? m.fmt(Math.round(v)) : m.fmt(v));
    return `
      <div class="e-permits-wid-heat-wrap">
        <table class="e-permits-wid-heat">
          <caption class="u-visually-hidden">${esc(m.caption || "Hartă de căldură")}</caption>
          <thead><tr><th scope="col"><span class="u-visually-hidden">${esc(m.axisLabel || "")}</span></th>${m.series.map((s) => `<th scope="col">${esc(s.label)}</th>`).join("")}</tr></thead>
          <tbody>${m.cats.map((c) => `<tr><th scope="row"><span data-cell-tooltip="${esc(c.label)}">${esc(c.label)}</span></th>${c.parts.map((p, j) => {
            const cls = `e-permits-wid-heat__cell is-l${level(p.value)}`;
            const label = `${c.label} · ${m.series[j].label}`;
            /* the colour is the data: it sits on the cell; the drill button inside is transparent (never a painted button) */
            return `<td><span class="${cls}">${m.drill ? `<button class="e-permits-wid-heat__btn" type="button"${drillAttrs(m, label, p.value)} aria-label="${esc(`${label}: ${m.fmt(p.value)} — deschide înregistrările`)}">${esc(show(p.value))}</button>` : esc(show(p.value))}</span></td>`;
          }).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
      ${allBtn()}
      <ul class="e-permits-meter-legend e-permits-meter-legend--tray" role="list">
        <li><span>Mai puține</span>${[1, 2, 3, 4, 5].map((l) => `<span class="e-permits-wid-heat__key is-l${l}" aria-hidden="true"></span>`).join("")}<span>Mai multe</span></li>
      </ul>`;
  }

  /* ---------------------------------------------------------------- Pâlnie */
  function funnel(m) {
    const first = m.cats[0]?.value || 0;
    const top = max(m.cats.map((c) => c.value)) || 1;
    return `
      <ol class="e-permits-wid-funnel" role="list">${m.cats.map((c, i) => {
        const w = (c.value / top) * 100;
        const inner = `
          <span class="e-permits-wid-rows__label" data-cell-tooltip="${esc(c.label)}">${esc(c.label)}</span>
          <svg class="e-permits-wid-funnel__bar" role="img" aria-label="${esc(`${c.label}: ${m.fmt(c.value)}`)}" focusable="false"><rect class="e-permits-wid-fill ${sClass(0)}" x="${pct((100 - w) / 2)}" y="0" width="${pct(w)}" height="100%" rx="4"></rect></svg>
          <span class="e-permits-wid-rows__value">${esc(m.fmt(c.value))}<span class="e-permits-meter-legend__pct">${i ? share(c.value, first) : "100%"}</span></span>`;
        return `<li>${m.drill ? `<button class="e-permits-wid-rows__row" type="button"${drillAttrs(m, c.label, c.value)} aria-label="${esc(`${c.label}: ${m.fmt(c.value)} — deschide înregistrările`)}">${inner}</button>` : `<div class="e-permits-wid-rows__row">${inner}</div>`}</li>`;
      }).join("")}</ol>
      ${legend([{ label: `Procentul față de prima etapă (${m.cats[0]?.label || ""})`, dot: sClass(0) }])}`;
  }

  /* ---------------------------------------------------------------- Treemap (binary split on the longer side) */
  function treemap(m) {
    const items = m.cats.map((c, i) => ({ ...c, i })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
    const total = items.reduce((s, c) => s + c.value, 0) || 1;
    const out = [];
    const ASPECT = 2.5; /* the plot is ~2.5 times wider than tall: split the visually longer side */
    const split = (list, x, y, w, h) => {
      if (!list.length) return;
      if (list.length === 1) { out.push({ ...list[0], x, y, w, h }); return; }
      const sum = list.reduce((s, c) => s + c.value, 0);
      let acc = 0; let k = 0;
      while (k < list.length - 1 && acc + list[k].value <= sum / 2) { acc += list[k].value; k += 1; }
      if (k === 0) { acc = list[0].value; k = 1; }
      const a = list.slice(0, k); const b = list.slice(k);
      const r = acc / sum;
      if (w * ASPECT >= h * 1) { split(a, x, y, w * r, h); split(b, x + w * r, y, w * (1 - r), h); }
      else { split(a, x, y, w, h * r); split(b, x, y + h * r, w, h * (1 - r)); }
    };
    split(items, 0, 0, 100, 100);
    /* labels only where they fit: ~2 characters per percent of a ~300 px preview plot (wider dashboards fit more) */
    const fit = (text, w) => { const n = Math.floor(w * 0.42); return n < 6 ? "" : text.length > n ? `${text.slice(0, n - 1)}…` : text; };
    const tiles = out.map((t) => {
      const name = t.h > 30 ? fit(t.label, t.w) : "";
      const val = t.h > 30 ? fit(`${m.fmt(t.value)} · ${share(t.value, total)}`, t.w) : "";
      return `<rect class="e-permits-wid-fill e-permits-wid-tile-rect ${catCls(m, t.i)}" data-wid-tile="${t.i}" x="${pct(t.x)}" y="${pct(t.y)}" width="${pct(t.w)}" height="${pct(t.h)}"></rect>${name ? `<text class="e-permits-wid-treemap__label ${catCls(m, t.i)}" data-wid-fit="tile" data-wid-tile="${t.i}" x="${pct(t.x + 1.5)}" y="${pct(t.y + 14)}">${esc(name)}</text>` : ""}${val ? `<text class="e-permits-wid-treemap__value ${catCls(m, t.i)}" data-wid-fit="tile" data-wid-tile="${t.i}" x="${pct(t.x + 1.5)}" y="${pct(t.y + 28)}">${esc(val)}</text>` : ""}`;
    }).join("");
    return `
      <svg class="${PLOT(m, "e-permits-wid-plot--bare e-permits-wid-treemap")}" role="img" aria-label="${ariaOf(m)}" focusable="false">${tiles}</svg>
      ${legend(m.cats.map((c, i) => ({ label: c.label, value: m.fmt(c.value), dot: catCls(m, i), button: m.drill ? `${drillAttrs(m, c.label, c.value)} aria-label="${esc(`${c.label}: ${m.fmt(c.value)} — deschide înregistrările`)}"` : "" })), { wrap: true })}`;
  }

  /* ---------------------------------------------------------------- Plăcuță simplă
     wid-card-v2 (2026-11-11, user: Metronic stat tile): the number (Heading H2, phones Mobile H2) + the delta as a Small subtle
     success / danger tag („+4,3%”) on one line, then „față de luna precedentă (2.190)” and the KPI target as tertiary lines.
     The title + „ⓘ” sit above, in the card head (js/widget-admin.js cardHtml). Compact only — no tall mode, no sparkline.
     Drill: one button over the number block whose ::after covers the whole card (card hover = border + shadow). */
  function tile(m) {
    const s = m.single;
    const tone = m.tone?.(s.value);
    const d = s.delta;
    const tag = d ? window.GEAPTag?.html(`${d.up ? "+" : "−"}${d.pct}%`, (d.good ?? d.up) ? "success" : "danger", { className: "e-permits-wid-stat__delta" }) || "" : "";
    /* dsh-kpi-zone-v1 (Feature 96498 „Culoare”: Favorabilă / Avertizare / Critică, „însoțită de text”): a KPI tile with a target
       colours its value by the zone and says it in words on the target line — dot + „Favorabil · Ținta 90%” */
    const zone = m.kpi && m.target && tone ? (m.zones || []).find(([, t]) => t === tone)?.[0] || "" : "";
    const targetLine = zone
      ? `<span class="e-permits-wid-stat__meta e-permits-wid-stat__zone" data-cell-tooltip="${esc(`${zone} · ${m.target.label}`)}"><span class="e-permits-meter-legend__dot e-permits-meter-legend__dot--${tone}" aria-hidden="true"></span>${esc(`${zone} · Ținta ${m.fmt(m.target.value)}`)}</span>`
      : m.target ? `<span class="e-permits-wid-stat__meta">${esc(m.target.label)}</span>` : "";
    const inner = `
      <span class="e-permits-wid-stat__line"><span class="e-permits-wid-stat__value${zone || tone === "warning" || tone === "danger" ? ` e-permits-wid-stat__value--${tone}` : ""}">${esc(m.fmt(s.value))}</span>${tag}</span>
      ${d?.text ? `<span class="e-permits-wid-stat__meta" data-cell-tooltip="${esc(d.text)}">${esc(d.text)}</span>` : ""}
      ${targetLine}`;
    return m.drill
      ? `<div class="e-permits-wid-stat"><button class="e-permits-wid-stat__btn" type="button"${drillAttrs(m, m.caption || "Valoarea", s.value)} aria-label="${esc(`${m.fmt(s.value)}${zone ? `, ${zone.toLocaleLowerCase("ro")}, ținta ${m.fmt(m.target.value)}` : ""}${d ? ` (${d.up ? "+" : "−"}${d.pct}% ${d.text})` : ""} — deschide înregistrările`)}">${inner}</button></div>`
      : `<div class="e-permits-wid-stat">${inner}</div>`;
  }

  /* ---------------------------------------------------------------- Tabel cu filtru pe sursa de date */
  /* dsh-dosare-table-v1 (2026-11-11, user: „why doesn't the table use the exact table from Dosare?”): rows of the Dosare
     source = the BO dossier list rows — the number as the compact copy value (GEAPCopyValue, as „Nr. dosar”), the status
     as the product status tag (GEAPTag tones of data/e-permits-workplace.json), the date as the date stack „8 octombrie
     2026” over the time; the whole row opens the dosar (`tr[data-workplace-row-open]` = pointer, row band, focus ring,
     Enter / Space — css/e-permits-shell.css) with the chevron at the row end as the cue; no blue link */
  const DOSAR_TONE = { "Depus": "info", "În examinare": "teal", "Suspendat": "warning", "Așteaptă plata": "warning", "Spre coordonare": "violet", "Spre semnare": "high", "Semnat": "ok", "Eliberat": "ok", "Finalizat": "ok", "Respins": "crit", "Retras": "neutral", "Arhivat": "neutral" };
  const hashStr = (str) => [...String(str)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  function dosarCell(m, key, v, nr) {
    if (key === "nr") return window.GEAPCopyValue ? window.GEAPCopyValue.html(v, { compact: true, className: "cell__primary" }) : `<span class="cell__primary">${esc(v)}</span>`;
    if (key === "statut") return `<span class="${window.GEAPTag?.cls(DOSAR_TONE[v] || "neutral") || "tag"}">${esc(v)}</span>`;
    if (key === "date") {
      const h = hashStr(nr);
      return `<span class="e-permits-workplace__date-stack"><span>${esc(v)}</span><span class="e-permits-workplace__date-meta">${String(8 + (h % 9)).padStart(2, "0")}:${String(h % 60).padStart(2, "0")}</span></span>`;
    }
    return `<span data-cell-tooltip="${esc(v)}">${esc(v)}</span>`;
  }
  function dosareTable(m) {
    const open = m.drill;
    return `
      <div class="e-permits-workplace__table-wrap e-permits-reg-table e-permits-wid-table-wrap e-permits-wid-table-wrap--${m.height || "compact"}">
        <table class="e-permits-workplace__table e-permits-reg-table__table e-permits-wid-table e-permits-wid-table--dosare">
          <caption class="u-visually-hidden">${esc(m.caption || "Dosarele")}</caption>
          <thead><tr>${m.columns.map((c) => `<th scope="col"><span class="e-permits-workplace__th-content"><span>${esc(c)}</span></span></th>`).join("")}${open ? '<th scope="col" class="e-permits-wid-table__open-cell"><span class="u-visually-hidden">Deschide</span></th>' : ""}</tr></thead>
          <tbody>${m.rows.map((r) => {
            const nr = r[m.colKeys.indexOf("nr")] || r[0];
            return `<tr${open ? ` tabindex="0" data-workplace-row-open data-wid-open="${esc(nr)}" aria-label="Deschide dosarul ${esc(nr)}"` : ""}>${r.map((v, i) => `<td>${dosarCell(m, m.colKeys[i], v, nr)}</td>`).join("")}${open ? `<td class="e-permits-wid-table__open-cell"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-right"></use></svg></td>` : ""}</tr>`;
          }).join("")}</tbody>
        </table>
      </div>
      ${allBtn()}`;
  }
  function rowTable(m) {
    if (m.dosare && m.colKeys) return dosareTable(m);
    return `
      <div class="e-permits-workplace__table-wrap e-permits-reg-table e-permits-wid-table-wrap e-permits-wid-table-wrap--${m.height || "compact"}">
        <table class="e-permits-workplace__table e-permits-reg-table__table e-permits-wid-table">
          <caption class="u-visually-hidden">${esc(m.caption || "Înregistrările sursei")}</caption>
          <thead><tr>${m.columns.map((c) => `<th scope="col"><span class="e-permits-workplace__th-content"><span>${esc(c)}</span></span></th>`).join("")}</tr></thead>
          <tbody>${m.rows.map((r) => `<tr>${r.map((v, i) => `<td>${i === 0 && m.drill ? `<button class="link link-primary link-sm e-permits-wid-table__drill" type="button" data-wid-drill="${esc(v)}" data-wid-drill-value="1">${esc(v)}</button>` : `<span data-cell-tooltip="${esc(v)}">${esc(v)}</span>`}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
      ${allBtn()}`;
  }

  /* the types without an axis show a KPI as its value + „Ținta” under the chart (the axis types draw the target line) */
  const NO_AXIS = ["pie", "aggTable", "heatmap", "funnel", "treemap", "rowTable"];
  function render(m) {
    const body = draw(m);
    return m.kpi && NO_AXIS.includes(m.type) ? `${body}${kpiLegend(m)}` : body;
  }
  function draw(m) {
    switch (m.type) {
      case "bars": return m.dateAxis ? columns(m) : rows(m);
      case "stacked": return !m.series.length ? (m.dateAxis ? columns(m) : rows(m)) : m.dateAxis ? columns(m, { stacked: true }) : rows(m, { stacked: true });
      case "line": return line(m);
      case "control": return line(m, { control: true });
      case "pie": return donut(m);
      case "aggTable": return aggTable(m);
      case "heatmap": return heatmap(m);
      case "funnel": return funnel(m);
      case "treemap": return treemap(m);
      case "tile": return tile(m);
      case "rowTable": return rowTable(m);
      default: return "";
    }
  }

  /* ---------------------------------------------------------------- the 24 glyphs of the type gallery */
  const G = {
    bars: '<rect class="e-permits-wid-glyph__a" x="3" y="12" width="4" height="9" rx="1"/><rect class="e-permits-wid-glyph__a" x="10" y="6" width="4" height="15" rx="1"/><rect class="e-permits-wid-glyph__a" x="17" y="9" width="4" height="12" rx="1"/>',
    stacked: '<rect class="e-permits-wid-glyph__b" x="3" y="8" width="4" height="13" rx="1"/><rect class="e-permits-wid-glyph__a" x="3" y="14" width="4" height="7"/><rect class="e-permits-wid-glyph__b" x="10" y="4" width="4" height="17" rx="1"/><rect class="e-permits-wid-glyph__a" x="10" y="12" width="4" height="9"/><rect class="e-permits-wid-glyph__b" x="17" y="10" width="4" height="11" rx="1"/><rect class="e-permits-wid-glyph__a" x="17" y="15" width="4" height="6"/>',
    line: '<polygon class="e-permits-wid-glyph__b" points="3,21 3,15 9,10 14,13 21,5 21,21"/><polyline class="e-permits-wid-glyph__line" points="3,15 9,10 14,13 21,5"/>',
    pie: '<circle class="e-permits-wid-glyph__ring-b" cx="12" cy="12" r="7"/><circle class="e-permits-wid-glyph__ring-a" cx="12" cy="12" r="7" pathLength="100" stroke-dasharray="62 38" stroke-dashoffset="25"/>',
    aggTable: '<rect class="e-permits-wid-glyph__b" x="3" y="4" width="18" height="4" rx="1"/><rect class="e-permits-wid-glyph__a" x="3" y="10" width="8" height="3" rx="1"/><rect class="e-permits-wid-glyph__a" x="13" y="10" width="8" height="3" rx="1"/><rect class="e-permits-wid-glyph__a" x="3" y="15" width="8" height="3" rx="1"/><rect class="e-permits-wid-glyph__a" x="13" y="15" width="8" height="3" rx="1"/>',
    heatmap: '<rect class="e-permits-wid-glyph__a" x="3" y="3" width="5" height="5" rx="1"/><rect class="e-permits-wid-glyph__b" x="9.5" y="3" width="5" height="5" rx="1"/><rect class="e-permits-wid-glyph__a" x="16" y="3" width="5" height="5" rx="1"/><rect class="e-permits-wid-glyph__b" x="3" y="9.5" width="5" height="5" rx="1"/><rect class="e-permits-wid-glyph__a" x="9.5" y="9.5" width="5" height="5" rx="1"/><rect class="e-permits-wid-glyph__b" x="16" y="9.5" width="5" height="5" rx="1"/><rect class="e-permits-wid-glyph__a" x="3" y="16" width="5" height="5" rx="1"/><rect class="e-permits-wid-glyph__b" x="9.5" y="16" width="5" height="5" rx="1"/><rect class="e-permits-wid-glyph__b" x="16" y="16" width="5" height="5" rx="1"/>',
    funnel: '<rect class="e-permits-wid-glyph__a" x="3" y="4" width="18" height="4" rx="1"/><rect class="e-permits-wid-glyph__a" x="6" y="10" width="12" height="4" rx="1"/><rect class="e-permits-wid-glyph__a" x="9" y="16" width="6" height="4" rx="1"/>',
    treemap: '<rect class="e-permits-wid-glyph__a" x="3" y="3" width="10" height="18" rx="1"/><rect class="e-permits-wid-glyph__b" x="14" y="3" width="7" height="10" rx="1"/><rect class="e-permits-wid-glyph__a" x="14" y="14" width="7" height="7" rx="1"/>',
    control: '<line class="e-permits-wid-glyph__limit" x1="2" x2="22" y1="6" y2="6"/><line class="e-permits-wid-glyph__limit" x1="2" x2="22" y1="18" y2="18"/><polyline class="e-permits-wid-glyph__line" points="3,13 8,10 12,14 16,9 21,12"/>',
    tile: '<rect class="e-permits-wid-glyph__b" x="3" y="5" width="18" height="14" rx="3"/><rect class="e-permits-wid-glyph__a" x="6" y="9" width="9" height="4" rx="1"/><rect class="e-permits-wid-glyph__a" x="6" y="15" width="5" height="1.5" rx="0.75"/>',
    rowTable: '<rect class="e-permits-wid-glyph__b" x="3" y="4" width="18" height="16" rx="2"/><rect class="e-permits-wid-glyph__a" x="5" y="7" width="14" height="2" rx="1"/><rect class="e-permits-wid-glyph__a" x="5" y="11" width="14" height="2" rx="1"/><rect class="e-permits-wid-glyph__a" x="5" y="15" width="10" height="2" rx="1"/>'
  };
  const glyph = (type) => `<svg class="e-permits-wid-glyph" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">${G[type] || ""}</svg>`;

  /* ---------------------------------------------------------------- fit(): no overlapping labels, at any width
     (components.md › „Charts: no overlapping labels”). Measured after every render / resize:
     · axis: the smallest step k (1, 2, 3, 4, 6, 12) for which the widest label + 8 fits k slots; the others hidden; the
       first / last visible label aligned to the plot edge when wider than its slot (never sticks out of the card);
     · bar value labels: shown only when every one fits its slot (−4) and clears the top; else none (the slot tooltip has it);
     · treemap labels: shown only inside their tile (−4). */
  const GAP = 8;
  /* wid-heights-v1 — a fixed-height card (Compactă / Înaltă, desktop): lists keep the rows that fit, the rest collapse into
     „+N altele” (bars, funnel, the donut legend); tables and the heat map keep the rows that fit + „Vezi tot”. Never a row
     cut in half; phones (natural height) show everything. */
  const PHONE = "(max-width: 760px)";
  const isFixed = (card) => Boolean(card?.classList.contains("e-permits-wid-card--fixed")) && !window.matchMedia?.(PHONE).matches;
  const bottomOf = (el) => el.getBoundingClientRect().bottom;
  function fitList(list, fixed) {
    const items = [...list.children].filter((li) => !li.classList.contains("e-permits-wid-more"));
    items.forEach((li) => li.classList.remove("is-fit-hidden"));
    let more = list.querySelector(":scope > .e-permits-wid-more");
    if (more) more.classList.add("is-fit-hidden");
    if (!fixed || items.length < 2) return;
    const limit = bottomOf(list) + 0.5;
    if (bottomOf(items[items.length - 1]) <= limit) return;
    if (!more) {
      more = document.createElement("li");
      more.className = "e-permits-wid-more";
      list.appendChild(more);
    }
    more.classList.remove("is-fit-hidden");
    let shown = items.length;
    do {
      shown -= 1;
      items[shown].classList.add("is-fit-hidden");
      more.textContent = `+${items.length - shown} ${items.length - shown === 1 ? "altul" : "altele"}`;
    } while (shown > 1 && bottomOf(more) > limit);
  }
  function fitRows(wrap, fixed) {
    const rows = [...wrap.querySelectorAll("tbody > tr")];
    const btn = wrap.nextElementSibling?.matches?.("[data-wid-all]") ? wrap.nextElementSibling : null;
    rows.forEach((tr) => tr.classList.remove("is-fit-hidden"));
    btn?.classList.add("is-fit-hidden");
    if (!fixed || rows.length < 2) return;
    const limit = () => bottomOf(wrap) + 0.5;
    if (bottomOf(rows[rows.length - 1]) <= limit()) return;
    btn?.classList.remove("is-fit-hidden");
    let shown = rows.length;
    do { shown -= 1; rows[shown].classList.add("is-fit-hidden"); } while (shown > 1 && bottomOf(rows[shown - 1]) > limit());
  }
  /* donut-aspect-v1 (2026-11-11, user: „narrow + tall — it should already switch to vertical”): a fixed card picks the donut
     layout from its body's SHAPE, live (ResizeObserver): stacked (ring on top, as large as the free height, legend under)
     when that gives a bigger ring than side by side, else ring + legend side by side — `.is-stacked` on the card */
  function fitDonut(card) {
    const donut = card.querySelector(".e-permits-wid-card__body > .e-permits-wid-donut");
    if (!donut) return;
    const body = donut.parentElement;
    const legend = donut.querySelector(":scope > .e-permits-wid-legend--list");
    const cs = getComputedStyle(body);
    const w = body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const legendH = legend ? legend.scrollHeight : 0;
    const gap = parseFloat(getComputedStyle(donut).columnGap) || 0;
    const side = Math.min(h, (w - gap) / 2);
    const stacked = h - legendH - gap > side;
    card.classList.toggle("is-stacked", stacked);
  }
  function fitHeight(root) {
    const cards = root.matches?.(".e-permits-wid-card") ? [root] : [...root.querySelectorAll(".e-permits-wid-card")];
    cards.forEach((card) => {
      const fixed = isFixed(card);
      if (fixed) fitDonut(card); else card.classList.remove("is-stacked");
      card.querySelectorAll(":is(.e-permits-wid-rows, .e-permits-wid-funnel, .e-permits-wid-legend--list)").forEach((list) => fitList(list, fixed));
      card.querySelectorAll(":is(.e-permits-wid-table-wrap, .e-permits-wid-heat-wrap)").forEach((wrap) => fitRows(wrap, fixed));
    });
  }
  function fit(root) {
    if (!root) return;
    fitHeight(root);
    root.querySelectorAll(".e-permits-wid-axis").forEach((ax) => {
      const ticks = [...ax.children];
      if (!ticks.length) return;
      ticks.forEach((t) => t.classList.remove("is-thinned", "is-start", "is-end"));
      const slotW = ax.clientWidth / ticks.length;
      const widest = Math.max(...ticks.map((t) => t.firstElementChild.getBoundingClientRect().width));
      /* an edge label aligned to the plot edge reaches (widest − slot / 2) further in: its neighbour must clear that too */
      const edge = widest > slotW;
      const fits = (step) => widest + GAP <= step * slotW && (!edge || step * slotW + slotW / 2 - widest / 2 >= widest + GAP);
      const k = [1, 2, 3, 4, 6, 12].find((step) => step < ticks.length && fits(step)) || ticks.length;
      const shownIdx = ticks.map((t, i) => i).filter((i) => i % k === 0);
      ticks.forEach((t, i) => t.classList.toggle("is-thinned", i % k !== 0));
      if (edge) {
        ticks[0].classList.add("is-start");
        const last = shownIdx[shownIdx.length - 1];
        /* the last shown label: to the end edge when it would stick out (its neighbour cleared by the same rule) */
        if (shownIdx.length > 1 && last * slotW + slotW / 2 + widest / 2 > ax.clientWidth) ticks[last].classList.add("is-end");
      }
    });
    root.querySelectorAll(".e-permits-wid-cols").forEach((plot) => {
      const values = [...plot.querySelectorAll('[data-wid-fit="value"]')];
      values.forEach((t) => t.classList.remove("is-hidden"));
      const top = plot.getBoundingClientRect().top;
      const fits = values.every((t) => { const b = t.getBoundingClientRect(); const slotW = t.closest(".e-permits-wid-cols__slot").getBoundingClientRect().width; return b.width <= slotW - 4 && b.top >= top; });
      if (!fits) values.forEach((t) => t.classList.add("is-hidden"));
    });
    root.querySelectorAll('text[data-wid-fit="tile"]').forEach((t) => {
      t.classList.remove("is-hidden");
      const tile = t.ownerSVGElement.querySelector(`rect[data-wid-tile="${t.dataset.widTile}"]`);
      const a = t.getBoundingClientRect();
      const b = tile.getBoundingClientRect();
      if (a.left < b.left || a.right > b.right - 4 || a.top < b.top || a.bottom > b.bottom - 4) t.classList.add("is-hidden");
    });
  }
  /* every card re-fits when its width changes (preview width, window, „Mărește”) */
  const observer = "ResizeObserver" in window ? new ResizeObserver((entries) => entries.forEach((e) => fit(e.target))) : null;
  const watch = (scope = document) => scope.querySelectorAll(".e-permits-wid-card").forEach((card) => { fit(card); if (observer && !card.dataset.widFitWatched) { card.dataset.widFitWatched = "1"; observer.observe(card); } });
  if ("MutationObserver" in window) {
    let queued = false;
    new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; watch(); donutReconnect(); }); } }).observe(document.documentElement, { childList: true, subtree: true });
  }

  /* ---------------------------------------------------------------- donut-hover-v1 (2026-11-12, user: „the pie should also
     have hover and show the numbers in a tooltip; a nice grey ring”) — Recharts / Stripe pattern:
     · the ring is hit-tested by ANGLE (pointer over the band ± the halo) — no SVG hit targets, no role on SVG;
     · the active slice keeps its colour and gets a grey halo arc just outside it (`__halo`: gap --spacing-2, width
       --spacing-4, in screen px whatever the ring size); the other slices + legend lines dim (`.is-hovering`);
     · the library Small tooltip (GEAPTooltip, edge-aligned) shows „Etichetă · valoare · %”, anchored at the slice's
       outer midpoint (left / right of the ring for side slices, above / below for top / bottom ones);
     · two-way: a legend line (drill button or focusable line) activates its slice on hover / focus; Arrow keys walk
       the lines; a slice click drills through its legend button (pointer cursor only then); touch: a tap shows the
       tooltip, a second tap on the same slice drills; the centre total never changes. */
  const R_MID = 15.9155;
  const R_OUT = R_MID + 3;
  const tokenPx = (name, fallback) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || fallback;
  let donutActive = null; /* { donut, i } */
  const donutOf = (el) => el?.closest?.(".e-permits-wid-donut");
  const arcsOf = (donut) => [...donut.querySelectorAll(".e-permits-wid-arc[data-wid-slice]")];
  const legendItem = (donut, i) => donut.querySelector(`.e-permits-wid-legend--list [data-wid-slice="${i}"]`);
  function donutAnchor(chart) {
    let a = chart.querySelector(":scope > .e-permits-wid-donut__anchor");
    if (!a) {
      a = document.createElement("span");
      a.className = "e-permits-wid-donut__anchor";
      a.setAttribute("aria-hidden", "true");
      chart.appendChild(a);
    }
    return a;
  }
  function donutClear() {
    if (!donutActive) return;
    const { donut } = donutActive;
    donutActive = null;
    donut.classList.remove("is-hovering", "is-drillable");
    donut.querySelectorAll(".is-active[data-wid-slice]").forEach((n) => n.classList.remove("is-active"));
    donut.querySelector(".e-permits-wid-donut__halo")?.classList.remove("is-shown");
    window.GEAPTooltip?.hide();
  }
  function donutActivate(donut, i, overRing = false) {
    if (donutActive && donutActive.donut === donut && donutActive.i === i) {
      donut.classList.toggle("is-drillable", overRing && Boolean(legendItem(donut, i)?.matches("[data-wid-drill]")));
      return;
    }
    if (donutActive) donutClear();
    const arc = donut.querySelector(`.e-permits-wid-arc[data-wid-slice="${i}"]`);
    const svg = donut.querySelector(".e-permits-wid-donut__svg");
    const chart = donut.querySelector(".e-permits-wid-donut__chart");
    if (!arc || !svg || !chart) return;
    donutActive = { donut, i };
    donut.classList.add("is-hovering");
    arc.classList.add("is-active");
    const item = legendItem(donut, i);
    item?.classList.add("is-active");
    /* the pointer cursor only while the mouse is over a slice that drills */
    donut.classList.toggle("is-drillable", overRing && Boolean(item?.matches("[data-wid-drill]")));
    /* the halo: the slice's own dash pattern on a wider circle, its gap + width in screen px */
    const box = svg.getBoundingClientRect();
    const scale = box.width / 42 || 1;
    const gap = tokenPx("--spacing-2", 2);
    const width = tokenPx("--spacing-4", 4);
    const halo = svg.querySelector(".e-permits-wid-donut__halo");
    if (halo) {
      halo.setAttribute("r", (R_OUT + (gap + width / 2) / scale).toFixed(3));
      halo.setAttribute("stroke-width", (width / scale).toFixed(3));
      halo.setAttribute("stroke-dasharray", arc.getAttribute("stroke-dasharray"));
      halo.setAttribute("stroke-dashoffset", arc.getAttribute("stroke-dashoffset"));
      halo.classList.add("is-shown");
    }
    /* the tooltip anchor: the slice's outer midpoint (outside the halo) */
    const from = Number(arc.dataset.widFrom) || 0;
    const len = Number(arc.dataset.widLen) || 0;
    const ang = ((from + len / 2) / 100) * Math.PI * 2;
    const rPx = R_OUT * scale + gap + width;
    const cb = chart.getBoundingClientRect();
    const cx = box.left - cb.left + box.width / 2;
    const cy = box.top - cb.top + box.height / 2;
    const dx = Math.sin(ang);
    const dy = -Math.cos(ang);
    const a = donutAnchor(chart);
    a.style.left = `${Math.round(cx + dx * rPx)}px`;
    a.style.top = `${Math.round(cy + dy * rPx)}px`;
    a.dataset.tooltipText = arc.dataset.widTip || "";
    a.dataset.tooltipPlacement = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "bottom" : "top");
    window.GEAPTooltip?.show(a);
    /* no room beside the ring (a card at the screen edge): above / below the slice instead of flipping onto the ring */
    const tip = document.getElementById("icon-tooltip");
    if (tip && !tip.hidden && /left|right/.test(a.dataset.tooltipPlacement) && tip.dataset.side !== a.dataset.tooltipPlacement) {
      a.dataset.tooltipPlacement = dy > 0 ? "bottom" : "top";
      a.style.top = `${Math.round(cy + (dy > 0 ? rPx : -rPx))}px`; /* just past the ring's top / bottom, at the slice's x */
      window.GEAPTooltip.refresh();
    }
  }
  /* which slice is under a viewport point (null = off the ring / in the hole) */
  function sliceAt(donut, x, y) {
    const svg = donut.querySelector(".e-permits-wid-donut__svg");
    if (!svg || donut.classList.contains("e-permits-wid-donut--empty")) return null;
    const box = svg.getBoundingClientRect();
    const scale = box.width / 42 || 1;
    const dx = x - (box.left + box.width / 2);
    const dy = y - (box.top + box.height / 2);
    const r = Math.hypot(dx, dy) / scale;
    if (r < R_MID - 3 || r > R_OUT + (tokenPx("--spacing-2", 2) + tokenPx("--spacing-4", 4)) / scale) return null;
    const p = (((Math.atan2(dx, -dy) / (Math.PI * 2)) * 100) + 100) % 100;
    const hit = arcsOf(donut).find((arc) => { const f = Number(arc.dataset.widFrom); return p >= f && p < f + Number(arc.dataset.widLen); });
    return hit && Number(hit.dataset.widLen) > 0 ? Number(hit.dataset.widSlice) : null;
  }
  let donutPt = null; /* the last mouse point: a re-rendered card (dashboard editor, preview refresh) re-picks its slice */
  function donutHit(t, x, y) {
    const chart = t?.closest(".e-permits-wid-donut__chart");
    const item = t?.closest(".e-permits-wid-donut .e-permits-wid-legend--list [data-wid-slice]");
    if (chart) {
      const i = sliceAt(donutOf(chart), x, y);
      if (i === null) donutClear(); else donutActivate(donutOf(chart), i, true);
      return true;
    }
    if (item) { donutActivate(donutOf(item), Number(item.dataset.widSlice)); return true; }
    return false;
  }
  function donutReconnect() {
    if (!donutActive || donutActive.donut.isConnected) return;
    donutActive = null;
    window.GEAPTooltip?.hide();
    if (donutPt) donutHit(document.elementFromPoint(donutPt.x, donutPt.y), donutPt.x, donutPt.y);
  }
  document.addEventListener("pointermove", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    donutPt = { x: event.clientX, y: event.clientY };
    donutReconnect();
    const t = event.target instanceof Element ? event.target : null;
    if (donutHit(t, event.clientX, event.clientY)) return;
    /* off the donut: clear, unless a legend line of it holds the keyboard focus */
    if (donutActive && !(donutActive.donut.contains(document.activeElement) && document.activeElement.matches(":focus-visible"))) donutClear();
  }, { passive: true });
  /* a slice click drills like its legend line; touch: first tap = tooltip, second tap on the same slice = drill */
  document.addEventListener("click", (event) => {
    const chart = event.target instanceof Element ? event.target.closest(".e-permits-wid-donut__chart") : null;
    if (!chart) return;
    const donut = donutOf(chart);
    const i = sliceAt(donut, event.clientX, event.clientY);
    if (i === null) { donutClear(); return; }
    const touch = event.pointerType ? event.pointerType !== "mouse" : false;
    const again = donutActive && donutActive.donut === donut && donutActive.i === i;
    if (touch && !again) { donutActivate(donut, i); return; }
    const btn = legendItem(donut, i);
    if (btn?.matches("button[data-wid-drill]")) { donutClear(); btn.click(); return; }
    donutActivate(donut, i);
  });
  document.addEventListener("pointerdown", (event) => {
    if (donutActive && !(event.target instanceof Element && event.target.closest(".e-permits-wid-donut__chart"))) donutClear();
  }, true);
  document.addEventListener("focusin", (event) => {
    const item = event.target instanceof Element ? event.target.closest(".e-permits-wid-donut .e-permits-wid-legend--list [data-wid-slice]") : null;
    if (item) { donutClear(); donutActivate(donutOf(item), Number(item.dataset.widSlice)); }
  });
  document.addEventListener("focusout", (event) => {
    const item = event.target instanceof Element ? event.target.closest(".e-permits-wid-legend--list [data-wid-slice]") : null;
    if (item && !(event.relatedTarget instanceof Element && event.relatedTarget.closest(".e-permits-wid-legend--list [data-wid-slice]"))) donutClear();
  });
  document.addEventListener("keydown", (event) => {
    const item = event.target instanceof Element ? event.target.closest(".e-permits-wid-donut .e-permits-wid-legend--list [data-wid-slice]") : null;
    if (!item) return;
    if (event.key === "Escape") { donutClear(); return; }
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    const items = [...item.closest(".e-permits-wid-legend--list").querySelectorAll("[data-wid-slice]")].filter((n) => !n.closest(".is-fit-hidden"));
    const next = items[(items.indexOf(item) + step + items.length) % items.length];
    if (next) { event.preventDefault(); next.focus(); }
  });
  document.addEventListener("pointerleave", donutClear);
  window.addEventListener("scroll", () => { if (donutActive && !donutActive.donut.isConnected) donutClear(); }, true);

  window.matchMedia?.(PHONE).addEventListener?.("change", () => document.querySelectorAll(".e-permits-wid-card").forEach((card) => fit(card)));
  window.GEAPWidgetCharts = { render, glyph, series: sClass, nf, fit, watch, STATUS_COLOURS, isStatusDim, statusClass, donutActivate, donutClear };
})();
