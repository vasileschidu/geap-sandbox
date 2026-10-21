/* ==========================================================================================================
   GEAPTag — Tag · Small = the library status tag (audit-fix-v5, 2026-10-21)
   Every product tag is `span.status-tag.status-tag--{tone}.is-subtle.status-tag--small` (css/tag.css: 20 high,
   12/16 medium, at every width). Product tone names (data, seeds, old renderers) map onto the library tones here,
   once: success · brand · accent (warning) · danger · neutral · muted (+ the product `violet`, no Foundations token).
   GEAPTag.tone(name) → library tone · GEAPTag.cls(name) → class string · GEAPTag.html(label, name, { attrs, icon,
   sprite, className }) → markup (label escaped; `icon` = sprite id without `icon-`, 16).
   ========================================================================================================== */
(function () {
  const TONES = {
    success: "success", ok: "success", positive: "success", teal: "success",
    brand: "brand", info: "brand",
    warning: "accent", warn: "accent", high: "accent", accent: "accent", apricot: "accent",
    danger: "danger", crit: "danger", error: "danger",
    muted: "muted",
    violet: "violet"
  };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const src = document.currentScript?.src || "";
  const SPRITE = src ? src.replace(/js\/tag\.js.*$/, "assets/icons/sprite.svg") : "assets/icons/sprite.svg";

  const tone = (name) => TONES[String(name || "").toLowerCase()] || "neutral";
  const cls = (name) => `status-tag status-tag--${tone(name)} is-subtle status-tag--small`;
  const html = (label, name = "neutral", { attrs = "", icon = "", sprite = SPRITE, className = "", raw = false } = {}) => {
    const iconHtml = icon ? `<svg class="icon" aria-hidden="true"><use href="${sprite}#icon-${esc(icon)}"></use></svg>` : "";
    return `<span class="${cls(name)}${className ? ` ${esc(className)}` : ""}"${attrs ? ` ${attrs}` : ""}>${iconHtml}${raw ? label : esc(label)}</span>`;
  };

  window.GEAPTag = { tone, cls, html };
})();
