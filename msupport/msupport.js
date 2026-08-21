/* ==========================================================================
   MSupport — Incident Reporter
   A portable incident-intake widget. Collects a report plus automatically
   captured context and hands it to the external support desk (MSupport,
   support@egov.md) via MNotify.

   Scope ends at dispatch. No ticketing, no queue, no SLA, no status, no
   in-app thread, no triage fields (Priority/Category/Severity are assigned by
   support at triage, not by the reporter). After submit the interaction
   migrates entirely to email.

   Three decoupled layers:
     Trigger  — launcher + proactive bubble        (surface adapter)
     Core     — form, context capture, validation  (product-agnostic)
     Dispatch — send(payload)                      (transport adapter)

   To reuse in another product, supply a different getContext() and
   dispatch(). Everything else is shared, unmodified.

     MSupport.init({
       getContext: () => ({ surface, route, entityKind, entityRef,
                            entityLabel, entityOptions, actor,
                            authority?, subdivision? }),
       dispatch:   async (payload) => ({ referenceId }),
       sprite?:    "assets/icons/sprite.svg",
     });
   ========================================================================== */

(function (global) {
  "use strict";

  /* ---------- contract constants ---------- */

  /* From the Intake Form spec. Figma's counter reads 0/256 for Détalii — the
     brief is the source of truth for data, so 1000 stands. Flagged to UX. */
  var LIMITS = { name: 80, description: 1000 };

  var MAX_FILE_BYTES = 10 * 1024 * 1024; /* 10 MB per file */
  var ALLOWED_EXT = ["pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx", "txt"];

  /* Adaptive copy — a bug needs reproduction steps, a feature request needs the
     desired outcome. Mixing them produces unusable data. */
  var TYPES = [
    {
      id: "BUG",
      glyph: "BUG",
      card: "Ceva nu funcționează",
      nameLabel: "Subiect",
      descLabel: "Detalii",
      namePlaceholder: "ex: Plată efectuată, dar statut nu s-a modificat",
      descPlaceholder:
        "ex: Am achitat taxa prin MPay pe 28 iulie și am primit confirmarea, dar dosarul arată în continuare „Plată în așteptare”.",
    },
    {
      id: "FEATURE",
      glyph: "BULB",
      card: "Propunere de îmbunătățire",
      nameLabel: "Subiect",
      descLabel: "Detalii",
      namePlaceholder: "ex: Export în Excel al listei de dosare",
      descPlaceholder:
        "ex: Aș vrea să pot exporta lista dosarelor filtrate, ca să pregătesc raportul lunar fără să copiez manual fiecare rând.",
    },
    {
      id: "INFORMATION",
      glyph: null,
      icon: "icon-bubble-question",
      card: "Am o întrebare",
      nameLabel: "Subiect",
      descLabel: "Detalii",
      namePlaceholder: "ex: Ce documente sunt necesare pentru reînnoire",
      descPlaceholder:
        "ex: Vreau să reînnoiesc autorizația sanitară. Ce documente trebuie să pregătesc și cu cât timp înainte de expirare?",
    },
  ];


  /* exact 20px stroke glyphs from Figma; currentColor so states can tint them */
  var GLYPH = {
    BUG:
      '<svg class="msup-glyph" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M4.47526 8.17197L2.49996 7.50008M4.47526 11.4584H2.29163M4.47526 14.5365L2.49996 15.2084M15.525 8.17197L17.5 7.50008M15.525 11.4584H17.7086M15.525 14.5365L17.5 15.2084M9.99996 11.4584V17.2917M6.45829 6.25008V5.83341C6.45829 3.87741 8.04395 2.29175 9.99996 2.29175C11.956 2.29175 13.5416 3.87741 13.5416 5.83341V6.25008M4.79163 12.5001V8.12508C4.79163 7.20461 5.53782 6.45841 6.45829 6.45841H13.5416C14.4621 6.45841 15.2083 7.20461 15.2083 8.12508V12.5001C15.2083 15.3766 12.8764 17.7084 9.99996 17.7084C7.12348 17.7084 4.79163 15.3766 4.79163 12.5001Z" ' +
      'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    BULB:
      '<svg class="msup-glyph" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M7.29 12.9031V14.3749C7.29 14.8352 7.66309 15.2083 8.12333 15.2083H11.8753C12.3355 15.2083 12.7086 14.8352 12.7086 14.3749V12.9031M7.29 12.9031C6.94623 12.7303 6.62123 12.5258 6.31886 12.2932C4.88256 11.1885 3.95691 9.4527 3.95691 7.50066C3.95691 4.16353 6.66219 1.45825 9.99931 1.45825C13.3364 1.45825 16.0417 4.16353 16.0417 7.50066C16.0417 9.4527 15.1161 11.1885 13.6798 12.2932C13.3774 12.5258 13.0524 12.7303 12.7086 12.9031M7.29 12.9031H12.7086M8.12505 17.7083H11.8751" ' +
      'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  var ERRORS = {
    name: "Adaugă un rezumat scurt — devine subiectul sesizării.",
    description: "Descrie situația, ca să putem investiga fără să revenim cu întrebări.",
  };

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function findType(id) {
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i];
    return TYPES[0];
  }

  function ext(filename) {
    var parts = String(filename).toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() : "";
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
  }

  /* INC-2026-XXXXXX — 6 uppercase alphanumerics, ambiguous I/O/0/1 excluded */
  function referenceId(now) {
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var out = "";
    for (var i = 0; i < 6; i++) {
      out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return "INC-" + now.getFullYear() + "-" + out;
  }

  function two(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function clientTimestamp(now) {
    return (
      two(now.getDate()) + "." + two(now.getMonth() + 1) + "." + now.getFullYear() +
      " " + two(now.getHours()) + ":" + two(now.getMinutes())
    );
  }

  function browserName() {
    var ua = navigator.userAgent;
    var m =
      ua.match(/(Edg|OPR)\/(\d+)/) ||
      ua.match(/(Chrome)\/(\d+)/) ||
      ua.match(/(Firefox)\/(\d+)/) ||
      ua.match(/Version\/(\d+).*(Safari)/);
    if (!m) return "Necunoscut";
    if (m[2] === "Safari") return "Safari " + m[1];
    var names = { Edg: "Edge", OPR: "Opera" };
    return (names[m[1]] || m[1]) + " " + m[2];
  }

  function osName() {
    var ua = navigator.userAgent;
    if (/Windows NT 10/.test(ua)) return "Windows 10/11";
    if (/Windows/.test(ua)) return "Windows";
    if (/Mac OS X/.test(ua)) return "macOS";
    if (/Android/.test(ua)) return "Android";
    if (/iPhone|iPad/.test(ua)) return "iOS";
    if (/Linux/.test(ua)) return "Linux";
    return "Necunoscut";
  }

  function randomId(prefix, length) {
    var out = "";
    for (var i = 0; i < length; i++) out += "0123456789abcdef".charAt(Math.floor(Math.random() * 16));
    return prefix + out;
  }

  /* =========================================================================
     Core — diagnostics capture
     Collected automatically so the reporter is never asked "what browser were
     you using?", which closes off the commonest clarification round-trip.
     ========================================================================= */

  function captureDiagnostics(ctx, session) {
    var now = new Date();
    var diag = {
      "Aplicație": ctx.surface || "—",
      "Pagina": ctx.route || location.pathname,
      "Browser": browserName(),
      "Sistem": osName(),
      "Ecran": window.screen.width + "×" + window.screen.height,
      "Ora (client)": clientTimestamp(now),
      "Sesiune": session.sessionId,
      "Trace ID": session.traceId,
    };
    /* IP cannot be read in the browser — the host supplies it if the payload
       needs it. See the open question in §5 of the brief: Session + Trace may
       be enough for MLog correlation, keeping IP out of email entirely. */
    if (ctx.ip) diag["IP"] = ctx.ip;
    /* business users only — end users have no authority affiliation */
    if (ctx.authority) diag["Autoritate"] = ctx.authority;
    if (ctx.subdivision) diag["Subdiviziune"] = ctx.subdivision;
    return diag;
  }

  /* =========================================================================
     Markup
     ========================================================================= */

  function icon(sprite, id, cls) {
    return (
      '<svg class="icon' + (cls ? " " + cls : "") + '" aria-hidden="true">' +
      '<use href="' + sprite + "#" + id + '"></use></svg>'
    );
  }

  function requiredMark() {
    return (
      '<span class="e-permits-fo-required" aria-label="obligatoriu">' +
      '<svg class="icon" width="12" height="12" aria-hidden="true">' +
      '<use href="SPRITE#icon-asterisk"></use></svg></span>'
    );
  }


  /* the library copy-value component used across the flows, with its tooltip */
  function copyValueHtml(sprite, value) {
    var safe = esc(value);
    return (
      '<button class="e-permits-fo-copy-value msup-ref" type="button"' +
      ' data-fo-copy-value="' + safe + '" aria-label="Copiază numărul de referință ' + safe + '">' +
        '<span data-msup-ref>' + safe + "</span>" +
        icon(sprite, "icon-copy") +
        '<span class="e-permits-fo-copy-value__tooltip" aria-hidden="true">' +
          '<span class="e-permits-fo-copy-value__tooltip-default">Copiază</span>' +
          '<span class="e-permits-fo-copy-value__tooltip-copied">' +
            icon(sprite, "icon-checkmark-small") + "<span>Copiat</span>" +
          "</span>" +
        "</span>" +
      "</button>"
    );
  }

  function widgetHtml(sprite, ctx, type) {
    var kind = ctx.entityKind || "Dosar";
    var contextLabel = ctx.entityLabel
      ? (ctx.entityRef ? ctx.entityRef + " — " + ctx.entityLabel : ctx.entityLabel)
      : "Fără legătură cu un dosar anume";
    var req = requiredMark().split("SPRITE").join(sprite);

    var entries = (ctx.entityOptions || []).map(function (o) {
      return { value: o.ref || "", label: o.ref ? o.ref + " — " + o.label : o.label };
    });
    entries.push({ value: "", label: "Fără legătură cu un dosar anume" });
    var options = entries.map(function (o) {
      var on = o.value === (ctx.entityRef || "");
      return '<li class="e-permits-fo-select__option' + (on ? " is-selected" : "") + '" role="option"' +
        ' aria-selected="' + on + '" data-value="' + esc(o.value) + '" tabindex="-1">' + esc(o.label) + "</li>";
    }).join("");

    return (
      /* ---- mobile scrim (inert on desktop) ---- */
      '<div class="msup-scrim" data-msup-scrim></div>' +

      /* ---- proactive bubble ---- */
      '<div class="msup-bubble" role="button" tabindex="0" data-msup-bubble>' +
        '<span class="msup-bubble__avatar" aria-hidden="true">' +
          '<img src="' + esc(ctx.bubbleAvatar || "") + '" alt="">' +
        "</span>" +
        '<span class="msup-bubble__copy">' +
          '<span class="msup-bubble__title">Salut! 👋</span>' +
          '<span class="msup-bubble__text">Dacă întâmpini vreo problemă sau dificultate, poți s-o raportezi aici.</span>' +
          '<span class="msup-bubble__from">Suport eGov</span>' +
        "</span>" +
        '<button class="msup-bubble__close" type="button" aria-label="Închide mesajul" data-msup-bubble-close>' +
          '<svg class="msup-x" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
            '<path fill-rule="evenodd" clip-rule="evenodd" d="M4.06965 4.06965C4.36254 3.77675 4.83741 3.77675 5.13031 4.06965L7.99998 6.93932L10.8696 4.06965C11.1625 3.77675 11.6374 3.77675 11.9303 4.06965C12.2232 4.36254 12.2232 4.83741 11.9303 5.13031L9.06064 7.99998L11.9303 10.8696C12.2232 11.1625 12.2232 11.6374 11.9303 11.9303C11.6374 12.2232 11.1625 12.2232 10.8696 11.9303L7.99998 9.06064L5.13031 11.9303C4.83741 12.2232 4.36254 12.2232 4.06965 11.9303C3.77675 11.6374 3.77675 11.1625 4.06965 10.8696L6.93932 7.99998L4.06965 5.13031C3.77675 4.83741 3.77675 4.36254 4.06965 4.06965Z" fill="currentColor"/></svg>' +
        "</button>" +
      "</div>" +

      /* ---- panel: anchored popover, NOT a modal drawer; no scrim ---- */
      '<div class="msup-panel" role="dialog" aria-modal="false" aria-label="Ajutor și suport" hidden data-msup-panel>' +
        '<div class="msup-panel__header">' +
          '<button class="msup-panel__back" type="button" aria-label="Înapoi" hidden data-msup-back>' +
            icon(sprite, "icon-chevron-left") +
          "</button>" +
          '<div class="msup-panel__heading">' +
            '<h2 class="msup-panel__title" data-msup-title>Ce s-a întâmplat?</h2>' +
          "</div>" +
          '<button class="msup-panel__close" type="button" aria-label="Închide" data-msup-close>' +
            icon(sprite, "icon-cross-large") +
          "</button>" +
        "</div>" +

        /* ---- state: type chooser (step 1) ---- */
        '<div class="msup-state" data-msup-state="type">' +
          '<div class="msup-panel__body">' +
            '<div class="msup-choices" role="group" aria-label="Tipul sesizării">' +
              TYPES.map(function (t) {
                return (
                  '<button class="msup-choice" type="button" data-msup-type="' + t.id + '">' +
                    '<span class="msup-choice__main">' +
                      (t.glyph ? GLYPH[t.glyph] : icon(sprite, t.icon)) +
                      '<span class="msup-choice__label">' + esc(t.card) + "</span>" +
                    "</span>" +
                    '<span class="msup-choice__arrow">' + icon(sprite, "icon-chevron-right") + "</span>" +
                  "</button>"
                );
              }).join("") +
            "</div>" +
          "</div>" +
        "</div>" +

        /* ---- state: form (step 2) ---- */
        '<div class="msup-state" data-msup-state="form" hidden>' +
          '<div class="msup-panel__body">' +
            '<div class="e-permits-fo-field">' +
              '<div class="e-permits-fo-field__label-row">' +
                "<label>La ce se referă " + req + "</label>" +
              "</div>" +
              '<div class="msup-context" data-msup-context>' +
                icon(sprite, "icon-card-link") +
                '<span class="msup-context__label" data-msup-context-label>' + esc(contextLabel) + "</span>" +
                '<button class="msup-context__change" type="button" data-msup-context-change>Schimbă</button>' +
              "</div>" +
              '<div class="msup-context__edit" hidden data-msup-context-picker>' +
                '<div class="e-permits-fo-select" data-fo-select data-msup-entity>' +
                  '<button class="e-permits-fo-select__button" id="msup-entity" type="button"' +
                  ' aria-haspopup="listbox" aria-expanded="false" aria-controls="msup-entity-list">' +
                    '<span class="e-permits-fo-select__value" data-fo-select-value>' + esc(contextLabel) + "</span>" +
                    icon(sprite, "icon-chevron-bottom") +
                  "</button>" +
                  '<ul class="e-permits-fo-select__list" id="msup-entity-list" role="listbox"' +
                  ' aria-labelledby="msup-entity" hidden>' + options + "</ul>" +
                "</div>" +
                '<div class="msup-context__actions">' +
                  '<button class="btn btn-primary btn-sm" type="button" data-msup-context-save>Salvează</button>' +
                  '<button class="btn btn-text-strict btn-sm" type="button" data-msup-context-cancel>Anulează</button>' +
                "</div>" +
              "</div>" +
            "</div>" +

            '<div class="e-permits-fo-field" data-msup-field="name">' +
              '<div class="e-permits-fo-field__label-row">' +
                '<label for="msup-name" data-msup-name-label>' + esc(type.nameLabel) + " " + req + "</label>" +
              "</div>" +
              '<div class="e-permits-fo-input">' +
                '<input id="msup-name" type="text" maxlength="' + LIMITS.name + '"' +
                ' placeholder="' + esc(type.namePlaceholder) + '" data-msup-name>' +
              "</div>" +
              '<div class="message message--inline message--error message--small" hidden data-msup-error="name">' +
                icon(sprite, "icon-circle-error", "small") +
                "<span></span>" +
              "</div>" +
            "</div>" +

            '<div class="e-permits-fo-field" data-msup-field="description">' +
              '<div class="e-permits-fo-field__label-row">' +
                '<label for="msup-desc" data-msup-desc-label>' + esc(type.descLabel) + " " + req + "</label>" +
              "</div>" +
              '<div class="e-permits-fo-textarea">' +
                '<textarea id="msup-desc" rows="3" maxlength="' + LIMITS.description + '"' +
                ' placeholder="' + esc(type.descPlaceholder) + '" data-msup-desc></textarea>' +
                icon(sprite, "icon-resize") +
              "</div>" +
              '<div class="message message--inline message--error message--small" hidden data-msup-error="description">' +
                icon(sprite, "icon-circle-error", "small") +
                "<span></span>" +
              "</div>" +
            "</div>" +

            '<div class="e-permits-fo-field">' +
              '<div class="e-permits-fo-field__label-row">' +
                "<label>Capturi de ecran sau documente</label>" +
              "</div>" +
              '<div class="dropzone" tabindex="0" data-msup-dropzone>' +
                '<div class="dropzone__content">' +
                  '<span class="p-12 bg-gray-200 radius-full d-inline-flex">' +
                    icon(sprite, "icon-cloud-upload", "large") +
                  "</span>" +
                  "<p>Drag and drop or <span class=\"dropzone__link\">choose files</span></p>" +
                "</div>" +
              "</div>" +
              '<input type="file" multiple hidden data-msup-file-input' +
              ' accept="' + ALLOWED_EXT.map(function (e) { return "." + e; }).join(",") + '">' +
              '<div class="dropzone__details">' +
                "<p>Supported formats: " + ALLOWED_EXT.join(", ") + "</p>" +
                "<p>Maximum size: 10 MB</p>" +
              "</div>" +
              '<div class="msup-files" data-msup-files></div>' +
            "</div>" +

            /* Diagnostics — collapsed by default; the note is a GDPR /
               Law 133 transparency requirement, not a nice-to-have. */
            '<div class="msup-diag">' +
              '<button class="msup-diag__toggle" type="button" aria-expanded="false" data-msup-diag-toggle>' +
                icon(sprite, "icon-circle-info") +
                '<span class="msup-diag__toggle-label">Informații tehnice atașate automat</span>' +
                icon(sprite, "icon-chevron-bottom-small", "msup-diag__chevron") +
              "</button>" +
              '<div class="msup-diag__panel" hidden data-msup-diag-panel>' +
                '<p class="msup-diag__note">Le colectăm automat ca să putem investiga fără să-ți cerem detalii ' +
                "suplimentare. Identificatorul de sesiune ne ajută să corelăm sesizarea cu jurnalele platformei.</p>" +
                '<dl class="msup-diag__list" data-msup-diag-list></dl>' +
              "</div>" +
            "</div>" +
          "</div>" +

          '<div class="msup-panel__footer">' +
            '<button class="btn btn-primary" type="button" data-msup-submit>Trimite</button>' +
          "</div>" +
        "</div>" +

        /* ---- state: submitting — same layout as the confirmation, loader for the tick ---- */
        '<div class="msup-state" data-msup-state="submitting" hidden>' +
          '<div class="msup-panel__body">' +
            '<div class="msup-done">' +
              '<span class="msup-done__tick msup-done__loader">' +
                '<span class="spinner spinner--medium spinner--brand"></span>' +
              "</span>" +
              '<div class="msup-done__copy">' +
                '<div class="msup-done__heading">' +
                  '<h3 class="msup-done__title">Se trimite sesizarea…</h3>' +
                "</div>" +
                '<p class="msup-done__text">Durează doar câteva momente.</p>' +
              "</div>" +
            "</div>" +
          "</div>" +
        "</div>" +

        /* ---- state: confirmation ---- */
        '<div class="msup-state" data-msup-state="confirmation" hidden>' +
          /* Figma ".content-slot": padding 20, gap 20 */
          '<div class="msup-panel__body">' +
            /* Figma "Container": padding 32/24, gap 12, centred */
            '<div class="msup-done">' +
              icon(sprite, "icon-circle-checkmark-filled", "msup-done__tick") +
              '<div class="msup-done__copy">' +
                '<div class="msup-done__heading">' +
                  '<h3 class="msup-done__title">Am primit sesizarea ta</h3>' +
                "</div>" +
                '<p class="msup-done__text">Ți-am trimis o confirmare pe email. Păstrează numărul de ' +
                "referință — folosește-l în orice mesaj despre această sesizare.</p>" +
              "</div>" +
              '<span class="msup-done__ref" data-msup-ref-slot></span>' +
              '<div class="msup-next">' +
                '<div class="msup-next__box">' +
                  '<div class="msup-next__row">' +
                    icon(sprite, "icon-envelope") +
                    "<p>Discuția continuă pe email, la adresa din contul tău. Răspunde direct la acel " +
                    "email dacă mai ai detalii sau capturi de ecran.</p>" +
                  "</div>" +
                "</div>" +
              "</div>" +
            "</div>" +
          "</div>" +
          '<div class="msup-panel__footer">' +
            '<button class="btn btn-primary msup-done__close" type="button" data-msup-close data-msup-done-close>Închide</button>' +
            '<button class="btn btn-primary msup-done__close" type="button" hidden data-msup-restart>Trimite o sesizare nouă</button>' +
          "</div>" +
        "</div>" +
      "</div>" +

      /* ---- launcher ---- */
      '<button class="msup-launcher" type="button" aria-expanded="false" aria-label="Raportează o problemă" data-msup-launcher>' +
        '<span class="msup-launcher__tip">Raportează o problemă</span>' +
        '<span class="msup-launcher__glyph msup-launcher__glyph--closed">' +
          icon(sprite, "icon-bubble-alert") + "</span>" +
        '<span class="msup-launcher__glyph msup-launcher__glyph--open">' +
          icon(sprite, "icon-cross-large") + "</span>" +
        '<span class="msup-launcher__badge" data-msup-badge></span>' +
        '<span class="msup-launcher__done" data-msup-done-badge hidden>' +
          icon(sprite, "icon-checkmark-small") +
        "</span>" +
      "</button>"
    );
  }

  /* =========================================================================
     Widget
     ========================================================================= */

  function init(options) {
    options = options || {};
    var getContext = options.getContext;
    var dispatch = options.dispatch;
    var sprite = options.sprite || "assets/icons/sprite.svg";

    if (typeof getContext !== "function") throw new Error("MSupport: getContext() is required");
    if (typeof dispatch !== "function") throw new Error("MSupport: dispatch() is required");

    var session = { sessionId: randomId("sess-", 6), traceId: randomId("trc-", 8) };
    var ctx = getContext();
    var state = {
      submitted: false,
      reference: null,
      type: findType("BUG"),
      entityRef: ctx.entityRef || null,
      entityLabel: ctx.entityLabel || null,
      files: [],
      open: false,
    };

    var root = document.createElement("div");
    root.className = "msup";
    root.innerHTML = widgetHtml(sprite, ctx, state.type);
    (options.mount || document.body).appendChild(root);

    var q = function (sel) { return root.querySelector(sel); };
    var el = {
      header: q(".msup-panel__header"),
      back: q("[data-msup-back]"),
      title: q("[data-msup-title]"),
      launcher: q("[data-msup-launcher]"),
      badge: q("[data-msup-badge]"),
      doneBadge: q("[data-msup-done-badge]"),
      doneClose: q("[data-msup-done-close]"),
      restart: q("[data-msup-restart]"),
      bubble: q("[data-msup-bubble]"),
      panel: q("[data-msup-panel]"),
      name: q("[data-msup-name]"),
      desc: q("[data-msup-desc]"),
      nameLabel: q("[data-msup-name-label]"),
      descLabel: q("[data-msup-desc-label]"),
      context: q("[data-msup-context]"),
      contextLabel: q("[data-msup-context-label]"),
      contextPicker: q("[data-msup-context-picker]"),
      entity: q("[data-msup-entity]"),
      entityButton: q(".e-permits-fo-select__button"),
      entityValue: q("[data-fo-select-value]"),
      entityList: q(".e-permits-fo-select__list"),
      fileInput: q("[data-msup-file-input]"),
      dropzone: q("[data-msup-dropzone]"),
      files: q("[data-msup-files]"),
      diagToggle: q("[data-msup-diag-toggle]"),
      diagPanel: q("[data-msup-diag-panel]"),
      diagList: q("[data-msup-diag-list]"),
      refSlot: q("[data-msup-ref-slot]"),
    };

    /* ---------- state machine: form → submitting → confirmation ---------- */

    function showState(name) {
      var states = root.querySelectorAll("[data-msup-state]");
      for (var i = 0; i < states.length; i++) {
        states[i].hidden = states[i].getAttribute("data-msup-state") !== name;
      }
      /* step 1 titles itself; step 2 shows the chosen type with a back control;
         the loader and confirmation stand on their own with no header at all */
      var chrome = name === "type" || name === "form";
      el.header.hidden = !chrome;
      if (chrome) {
        el.back.hidden = name !== "form";
        el.title.textContent = name === "form" ? state.type.card : "Ce s-a întâmplat?";
      }
    }

    var closeTimer = null;
    var mobile = window.matchMedia("(max-width: 640px)");

    function syncModality() {
      var isModal = mobile.matches && state.open;
      /* on mobile the sheet covers the page, so it genuinely is modal */
      el.panel.setAttribute("aria-modal", String(isModal));
      document.body.classList.toggle("msup-locked", isModal);
    }

    function setOpen(open) {
      state.open = open;
      window.clearTimeout(closeTimer);
      if (open) {
        el.panel.classList.remove("is-closing");
        el.panel.hidden = false;
      } else if (!el.panel.hidden) {
        /* let the exit animation run before hiding, as the repo's dropdowns do */
        el.panel.classList.add("is-closing");
        closeTimer = window.setTimeout(function () {
          el.panel.hidden = true;
          el.panel.classList.remove("is-closing");
        }, 140);
      }
      el.launcher.setAttribute("aria-expanded", String(open));
      el.launcher.setAttribute("aria-label", open ? "Închide" : "Raportează o problemă");
      root.classList.toggle("is-open", open);
      syncModality();
      if (!open && state.submitted) el.doneBadge.hidden = false;
      if (open) {
        dismissBubble();
        el.contextPicker.hidden = true;
        el.context.hidden = false;
        if (state.submitted) {
          /* revisiting a sent report — offer to start another rather than close */
          el.doneClose.hidden = true;
          el.restart.hidden = false;
          showState("confirmation");
        } else {
          showState("type");
        }
        renderDiagnostics();
        window.requestAnimationFrame(function () {
          var first = root.querySelector('[data-msup-state="type"] .msup-choice');
          if (first) first.focus();
        });
      }
    }

    function dismissBubble() {
      el.bubble.hidden = true;
      el.badge.hidden = true;
      /* the tooltip is suppressed while the bubble is up — it would duplicate it */
      root.classList.remove("has-bubble");
    }

    /* ---------- adaptive copy ---------- */

    function applyType(id) {
      state.type = findType(id);
      el.nameLabel.innerHTML = esc(state.type.nameLabel) + " " +
        requiredMark().split("SPRITE").join(sprite);
      el.descLabel.innerHTML = esc(state.type.descLabel) + " " +
        requiredMark().split("SPRITE").join(sprite);
      el.name.placeholder = state.type.namePlaceholder;
      el.desc.placeholder = state.type.descPlaceholder;
    }


    /* ---------- validation ---------- */

    function setError(field, message) {
      var box = root.querySelector('[data-msup-error="' + field + '"]');
      box.querySelector("span").textContent = message || "";
      box.hidden = !message;
      var control = field === "name" ? el.name : el.desc;
      control.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function validate() {
      var ok = true;
      if (!el.name.value.trim()) { setError("name", ERRORS.name); ok = false; } else setError("name", "");
      if (!el.desc.value.trim()) { setError("description", ERRORS.description); ok = false; } else setError("description", "");
      if (el.name.value.length > LIMITS.name || el.desc.value.length > LIMITS.description) ok = false;
      /* an invalid attachment blocks submit until it is removed */
      for (var i = 0; i < state.files.length; i++) if (state.files[i].error) ok = false;
      return ok;
    }

    /* ---------- attachments ---------- */

    function addFiles(list) {
      for (var i = 0; i < list.length; i++) {
        var file = list[i];
        var error = "";
        if (ALLOWED_EXT.indexOf(ext(file.name)) === -1) error = "Format neacceptat";
        else if (file.size > MAX_FILE_BYTES) error = "Depășește 10 MB";
        state.files.push({ file: file, name: file.name, size: file.size, error: error });
      }
      renderFiles();
    }

    function renderFiles() {
      el.files.innerHTML = state.files.map(function (entry, index) {
        return (
          '<div class="msup-file' + (entry.error ? " is-invalid" : "") + '">' +
            '<span class="msup-file__name">' + esc(entry.name) + "</span>" +
            '<span class="msup-file__meta">' + esc(entry.error || formatBytes(entry.size)) + "</span>" +
            '<button class="msup-file__remove" type="button" aria-label="Elimină ' + esc(entry.name) + '"' +
            ' data-msup-file-remove="' + index + '">' + icon(sprite, "icon-cross-small") + "</button>" +
          "</div>"
        );
      }).join("");
    }

    /* ---------- diagnostics ---------- */

    function renderDiagnostics() {
      var diag = captureDiagnostics(getContext(), session);
      el.diagList.innerHTML = Object.keys(diag).map(function (key) {
        return "<dt>" + esc(key) + "</dt><dd>" + esc(diag[key]) + "</dd>";
      }).join("");
      return diag;
    }

    /* ---------- events ---------- */

    el.launcher.addEventListener("click", function () { setOpen(!state.open); });

    el.bubble.addEventListener("click", function (event) {
      if (event.target.closest("[data-msup-bubble-close]")) return;
      setOpen(true);
    });
    el.bubble.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen(true); }
    });
    q("[data-msup-bubble-close]").addEventListener("click", function (event) {
      event.stopPropagation();
      dismissBubble();
    });

    root.addEventListener("click", function (event) {
      if (event.target.closest("[data-msup-close], [data-msup-cancel], [data-msup-scrim]")) setOpen(false);

      var typeButton = event.target.closest("[data-msup-type]");
      if (typeButton) {
        applyType(typeButton.getAttribute("data-msup-type"));
        showState("form");
      }

      if (event.target.closest("[data-msup-restart]")) {
        resetReport();
        showState("type");
        var firstChoice = root.querySelector('[data-msup-state="type"] .msup-choice');
        if (firstChoice) firstChoice.focus();
      }

      if (event.target.closest("[data-msup-back]")) {
        showState("type");
        var current = root.querySelector('[data-msup-type="' + state.type.id + '"]');
        if (current) current.focus();
      }

      if (event.target.closest("[data-msup-context-change]")) openContextEditor();
      if (event.target.closest("[data-msup-context-save]")) commitContext();
      if (event.target.closest("[data-msup-context-cancel]")) closeContextEditor();

      if (event.target.closest(".e-permits-fo-select__button")) {
        setListboxOpen(el.entityList.hidden);
      } else if (!event.target.closest(".e-permits-fo-select")) {
        setListboxOpen(false);
      }

      var option = event.target.closest(".e-permits-fo-select__option");
      if (option) {
        setListboxValue(option.getAttribute("data-value"), option.textContent);
        setListboxOpen(false);
        el.entityButton.focus();
      }

      var remove = event.target.closest("[data-msup-file-remove]");
      if (remove) {
        state.files.splice(Number(remove.getAttribute("data-msup-file-remove")), 1);
        renderFiles();
      }
    });

    /* Esc closes the panel — it is not modal, so the page stays usable */
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && state.open) {
        setOpen(false);
        el.launcher.focus();
      }
    });

    /* the select is a draft until Salvează — Anulează restores the committed value */
    var draft = { ref: null, label: null };

    function setListboxValue(value, label) {
      draft.ref = value || null;
      draft.label = value ? label : null;
      el.entityValue.textContent = label;
      el.entityList.querySelectorAll(".e-permits-fo-select__option").forEach(function (o) {
        var on = o.getAttribute("data-value") === value;
        o.classList.toggle("is-selected", on);
        o.setAttribute("aria-selected", String(on));
      });
    }

    function setListboxOpen(open) {
      el.entityList.hidden = !open;
      el.entityButton.setAttribute("aria-expanded", String(open));
    }

    function openContextEditor() {
      var current = el.entityList.querySelector('[data-value="' + (state.entityRef || "") + '"]');
      setListboxValue(state.entityRef || "", current ? current.textContent : el.contextLabel.textContent);
      setListboxOpen(false);
      el.context.hidden = true;
      el.contextPicker.hidden = false;
      el.entityButton.focus();
    }

    function closeContextEditor() {
      setListboxOpen(false);
      el.contextPicker.hidden = true;
      el.context.hidden = false;
      root.querySelector("[data-msup-context-change]").focus();
    }

    function commitContext() {
      state.entityRef = draft.ref;
      state.entityLabel = draft.label;
      el.contextLabel.textContent = el.entityValue.textContent;
      closeContextEditor();
    }

    el.name.addEventListener("input", function () { setError("name", ""); });
    el.desc.addEventListener("input", function () { setError("description", ""); });

    el.diagToggle.addEventListener("click", function () {
      var expanded = el.diagToggle.getAttribute("aria-expanded") === "true";
      el.diagToggle.setAttribute("aria-expanded", String(!expanded));
      el.diagPanel.hidden = expanded;
      /* the revealed rows sit below the fold of the scrolling body — bring the
         disclosure to the top so it reads from its heading down */
      if (!expanded) {
        window.requestAnimationFrame(function () {
          el.diagToggle.closest(".msup-diag").scrollIntoView({ block: "start", behavior: "smooth" });
        });
      }
    });

    el.dropzone.addEventListener("click", function () { el.fileInput.click(); });
    el.dropzone.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); el.fileInput.click(); }
    });
    el.dropzone.addEventListener("dragover", function (event) {
      event.preventDefault();
      el.dropzone.classList.add("is-dragover");
    });
    el.dropzone.addEventListener("dragleave", function () { el.dropzone.classList.remove("is-dragover"); });
    el.dropzone.addEventListener("drop", function (event) {
      event.preventDefault();
      el.dropzone.classList.remove("is-dragover");
      addFiles(event.dataTransfer.files);
    });
    el.fileInput.addEventListener("change", function () {
      addFiles(el.fileInput.files);
      el.fileInput.value = "";
    });

    q("[data-msup-submit]").addEventListener("click", function () {
      if (!validate()) {
        var firstError = root.querySelector('[data-msup-error]:not([hidden])');
        if (firstError) firstError.closest("[data-msup-field]").querySelector("input, textarea").focus();
        return;
      }
      submit();
    });

    /* same contract as the front-office copy handler */
    root.addEventListener("click", async function (event) {
      var button = event.target.closest("[data-fo-copy-value]");
      if (!button) return;
      event.preventDefault();
      window.clearTimeout(button._foCopyTimer);
      try {
        await navigator.clipboard.writeText(button.dataset.foCopyValue || "");
        button.classList.add("is-copied");
        button.setAttribute("aria-label", "Copiat");
        button._foCopyTimer = window.setTimeout(function () {
          button.classList.remove("is-copied");
          var text = button.querySelector("span")?.textContent?.trim() || "";
          button.setAttribute("aria-label", text ? "Copiază " + text : "Copiază");
        }, 1500);
      } catch {
        /* clipboard unavailable (insecure context) — the value stays selectable */
      }
    });

    function resetReport() {
      state.submitted = false;
      state.reference = null;
      state.files = [];
      el.name.value = "";
      el.desc.value = "";
      setError("name", "");
      setError("description", "");
      renderFiles();
      el.doneBadge.hidden = true;
      el.doneClose.hidden = false;
      el.restart.hidden = true;
      el.diagToggle.setAttribute("aria-expanded", "false");
      el.diagPanel.hidden = true;
    }

    /* ---------- dispatch ---------- */

    function submit() {
      showState("submitting");
      var current = getContext();
      var payload = {
        name: el.name.value.trim(),
        description: el.desc.value.trim(),
        requestType: state.type.id,
        relatedEntity: state.entityRef ? { ref: state.entityRef, label: state.entityLabel } : null,
        attachments: state.files.map(function (f) { return { name: f.name, size: f.size }; }),
        diagnostics: renderDiagnostics(),
        actor: current.actor,
        submittedAt: new Date().toISOString(),
      };

      /* floor the loader at 2.5s regardless of how fast dispatch resolves,
         so the state change never flashes past */
      var settled = new Promise(function (resolve) { window.setTimeout(resolve, 2500); });

      Promise.all([Promise.resolve(dispatch(payload)), settled]).then(function (results) {
        var result = results[0];
        var reference = (result && result.referenceId) || referenceId(new Date());
        state.reference = reference;
        state.submitted = true;
        el.refSlot.innerHTML = copyValueHtml(sprite, reference);
        showState("confirmation");
      }, function () {
        settled.then(function () {
          showState("form");
          setError("name", "Nu am putut trimite sesizarea. Încearcă din nou.");
        });
      });
    }

    /* ---------- boot ---------- */

    mobile.addEventListener("change", syncModality);
    root.classList.add("has-bubble");
    applyType(state.type.id);
    showState("type");

    return {
      open: function () { setOpen(true); },
      close: function () { setOpen(false); },
      destroy: function () { root.remove(); },
    };
  }

  global.MSupport = { init: init, LIMITS: LIMITS, TYPES: TYPES, referenceId: referenceId };
})(window);
