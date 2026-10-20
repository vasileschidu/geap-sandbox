/* Notificări — EVO Cabinet (minimal stand-in, 2026-10-17)
   The compartment itself (EC3) is out of scope of Feature 90817; the GEAP v2 events that reach it are not:
   US-19 AC-20 / AC-21 (every business event of a request → MNotify + a push notification in „Notificări”, with
   a contextual action button — Feature 90817 §4), US-135 AC-01 (the payment notification carries the link to
   MPay), AC-09 (payment confirmed), AC-11 (pay again from the notification while the fee has not expired),
   AC-14 (an expired fee → „Taxa a expirat. Achitarea nu mai este posibilă.”, no redirect), US-24 AC-19 / US-28
   AC-03 (suplinire done), US-24 AC-03 + Feature 95770 (suplinire term expired → examination resumed), US-126
   AC-16 (the suspension notice carries the reason + „Neconformități depistate”), US-29 AC-02 (a draft removed
   automatically). Wording of every event = PO question 12 (no story fixes the texts). Built from the perspective's requests (data/cabinet-evo-solicitari.json): one row per
   event, newest first — the app's stacked list (title 16/24 · text · meta date · nr) with ONE labelled action;
   „Nou” = the Small brand tag for the last 3 days. A representative whose MPower expired gets nothing new after
   that date and no actions (US-19 AC-21). */
(() => {
  "use strict";

  const C = window.CabEvo;
  if (!C || C.VIEW !== "notificari") return;

  const root = document.querySelector('[data-cab-view="notificari"]');
  const { icon, escape, longDate, longDateTime, cabUrl } = C;
  const FO = "../e-permits-acte-permisive.html";
  const TODAY = "2026-10-12";
  const money = (amount) => `${Number(amount || 0).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MDL`;
  const day = (iso) => String(iso || "").slice(0, 10);
  const daysAgo = (iso) => Math.round((new Date(`${TODAY}T00:00:00Z`) - new Date(`${day(iso)}T00:00:00Z`)) / 86400000);
  const supplementUrl = (dosar) => `${FO}?${new URLSearchParams({ flow: "full", solicitant: C.SUBJECT, suplinire: dosar.nr }).toString()}#request-step-2`;
  const draftUrl = (dosar) => `${FO}?${new URLSearchParams({ flow: "full", solicitant: C.SUBJECT, schita: dosar.nr }).toString()}#request`;
  const dosarUrl = (dosar) => cabUrl("solicitari", {}, `#dosar/${dosar.id}`);
  /* the same rules as solicitari.js: a draft past its removal day is removed; an expired suplinire = resumed */
  const removedDraft = (dosar) => dosar.status === "schita" && dosar.draft?.expires && dosar.draft.expires < TODAY;
  const nextDay = (iso) => { const [y, m, d] = day(iso).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10); };

  /* the events of one request → notifications { at, icon, tone, title, text, action: { label, href | pay } } */
  function eventsOf(dosar, services) {
    const service = services[dosar.service] || {};
    const what = `${dosar.object} · ${service.title || ""}`;
    const list = [];
    const open = { label: "Vezi dosarul", href: dosarUrl(dosar) };
    if (dosar.status === "schita") {
      const removed = removedDraft(dosar);
      list.push({ kind: "draft-saved", at: dosar.created, icon: "icon-cloud-upload-success", tone: "neutral", title: "Schița a fost salvată", text: `${what}. O puteți continua până pe ${longDate(dosar.draft?.expires)}, apoi se elimină automat.`, action: removed ? null : { label: "Continuă schița", href: draftUrl(dosar) } });
      /* US-29 AC-02: removed automatically → the applicant is notified (the link explains it in Solicitările mele) */
      if (removed) list.push({ kind: "draft-removed", at: `${nextDay(dosar.draft.expires)}T00:00`, icon: "icon-delete", tone: "neutral", title: "Schița a fost eliminată automat", text: `${what}. Termenul de păstrare a schiței a expirat pe ${longDate(dosar.draft.expires)}; datele nu mai pot fi recuperate.`, action: { label: "Vezi detalii", href: dosarUrl(dosar) } });
      return list;
    }
    if (dosar.submitted) list.push({ at: dosar.submitted, icon: "icon-circle-checkmark-filled", tone: "success", title: "Solicitarea a fost depusă", text: `${what}. Certificatul constatator este în profilul dosarului.`, action: open });
    if (dosar.payment?.paid && !dosar.feeDuringExam) list.push({ at: dosar.payment.paid, icon: "icon-credit-card", tone: "success", title: "Plata a fost confirmată", text: `${money(dosar.payment.amount)} pentru nota de plată ${dosar.payment.nr}.`, action: open });
    /* US-126 AC-16: the suspension notice carries the reason chosen by the specialist + „Neconformități depistate”;
       kept in the history after the suspension ends (suplinire sent / term expired) */
    if (dosar.suspended) {
      const active = dosar.status === "info" && dosar.info?.until >= TODAY;
      list.push({
        kind: "info-requested", at: dosar.suspended, icon: "icon-warning-filled", tone: "warning", title: "Autoritatea a cerut informații suplimentare",
        text: `${what}. Trimiteți-le până la ${longDate(dosar.info?.until)}.`,
        details: [["Motivul suspendării", dosar.info?.category], ["Neconformități depistate", dosar.info?.reason]].filter(([, value]) => value),
        action: active ? { label: "Suplinire informații", href: supplementUrl(dosar) } : open,
      });
    }
    /* US-24 AC-19 / US-28 AC-03: suplinire sent → „actualizare cu succes” */
    if (dosar.supplemented) list.push({ kind: "supplement-done", at: dosar.supplemented, icon: "icon-circle-checkmark-filled", tone: "success", title: "Informațiile au fost transmise", text: `${what}. Autoritatea a reluat examinarea${dosar.examTerm ? `; termenul nou este ${longDate(dosar.examTerm)}` : ""}.`, action: open });
    /* US-24 AC-03 / Feature 95770: the suplinire term expired → the BO resumed the examination; the applicant is notified */
    const expired = dosar.resumed?.kind === "expirat" || (dosar.status === "info" && dosar.info?.until < TODAY);
    if (expired) list.push({ kind: "supplement-expired", at: dosar.resumed?.at || `${nextDay(dosar.info.until)}T00:00`, icon: "icon-time", tone: "neutral", title: "Termenul de suplinire a expirat", text: `${what}. Informațiile cerute nu au fost transmise până pe ${longDate(dosar.info?.until)}; autoritatea a reluat examinarea cu documentele depuse.`, action: open });
    if (dosar.status === "achitare" && dosar.payment) list.push({ at: dosar.payment.created, icon: "icon-credit-card", tone: "warning", title: "Aveți o notă de plată de achitat", text: `${money(dosar.payment.amount)} · nota ${dosar.payment.nr} · până la ${longDate(dosar.payment.due)}.`, action: { label: "Achitare", pay: dosar } });
    if (dosar.payment?.paid && dosar.feeDuringExam) list.push({ at: dosar.payment.paid, icon: "icon-credit-card", tone: "success", title: "Plata a fost confirmată", text: `${money(dosar.payment.amount)} · nota ${dosar.payment.nr}. Dosarul a revenit în examinare.`, action: open });
    if (dosar.status === "finalizat" && dosar.result === "aprobat") list.push({ at: dosar.finalized, icon: "icon-page-text", tone: "success", title: dosar.decisionOnly ? "Decizia a fost emisă" : "Actul permisiv a fost emis", text: what, action: dosar.actId && !dosar.decisionOnly ? { label: "Vezi actul", href: cabUrl("acte", { act: dosar.actId }) } : open });
    if (dosar.status === "finalizat" && dosar.result === "respins") list.push({ at: dosar.finalized, icon: "icon-circle-error-filled", tone: "danger", title: "Solicitarea a fost respinsă", text: `${what}. Motivul este în decizia din profilul dosarului.`, action: open });
    return list;
  }

  function itemHtml(note, index, readOnly) {
    const fresh = daysAgo(note.at) <= 3;
    const action = readOnly || !note.action ? "" : note.action.pay
      ? `<button class="btn btn-neutral btn-sm" type="button" data-nt-pay="${index}">${escape(note.action.label)}</button>`
      : `<a class="btn btn-neutral btn-sm" href="${escape(note.action.href)}">${escape(note.action.label)}</a>`;
    return `
      <li class="e-permits-stack__item sm-item nt-item${fresh ? " is-fresh" : ""}" data-nt-item="${index}"${note.kind ? ` data-nt-kind="${note.kind}"` : ""}>
        <span class="nt-item__icon nt-item__icon--${note.tone}" aria-hidden="true">${icon(note.icon, "medium")}</span>
        <div class="e-permits-stack__main">
          <div class="e-permits-stack__title-row">
            <h2 class="e-permits-stack__title">${escape(note.title)}</h2>
            ${fresh ? C.tagHtml("Nou", "info") : ""}
          </div>
          <p class="nt-item__text">${escape(note.text)}</p>
          ${note.details?.length ? `<p class="nt-item__text nt-item__details">${note.details.map(([label, value]) => `<strong>${escape(label)}:</strong> ${escape(value)}`).join("<br>")}</p>` : ""}
          <div class="e-permits-stack__meta"><span class="e-permits-stack__part">${escape(longDateTime(note.at))}</span><span class="e-permits-stack__part">${escape(note.nr)}</span></div>
        </div>
        ${action ? `<div class="e-permits-stack__actions">${action}</div>` : ""}
      </li>`;
  }

  async function init() {
    const data = await (await fetch("../data/cabinet-evo-solicitari.json")).json();
    const perspective = data.perspectives?.[C.SUBJECT] || { dosare: [] };
    const ro = perspective.readOnly || null;
    const notes = (perspective.dosare || [])
      .flatMap((dosar) => eventsOf(dosar, data.services || {}).map((note) => ({ ...note, nr: dosar.nr, dosar })))
      .filter((note) => note.at && (!ro || day(note.at) <= ro.since))
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));
    C.setHeaderTitle("Notificări");
    root.innerHTML = `
      <section class="cab-intro" aria-labelledby="nt-title">
        <h1 class="text-heading-h2" id="nt-title" tabindex="-1">Notificări</h1>
        <p class="text-body-sm">Evenimentele solicitărilor dumneavoastră — le primiți și prin e-mail / SMS (MNotify).</p>
      </section>
      ${ro ? C.restrictionHtml(ro, "Nu mai primiți notificări noi pentru solicitările acestui beneficiar; vedeți doar notificările primite până la acea dată, fără acțiuni.") : ""}
      <div class="nt-lead" data-nt-lead></div>
      ${notes.length
        ? `<section class="e-permits-stack sm-list nt-list" aria-label="Notificări"><ul class="e-permits-stack__list" role="list">${notes.map((note, index) => itemHtml(note, index, Boolean(ro))).join("")}</ul></section>`
        : `<div class="cab-state">${window.GEAPEmptyState.render({ title: "Nu aveți notificări", text: "Evenimentele solicitărilor apar aici.", icon: "notification" })}</div>`}`;

    /* US-135 AC-02 / AC-11: the notification's link → MPay (the Solicitările mele stand-in); AC-14: an expired
       fee shows the message and nothing is redirected */
    root.addEventListener("click", (event) => {
      const pay = event.target.closest("[data-nt-pay]");
      if (!pay) return;
      const note = notes[Number(pay.dataset.ntPay)];
      const dosar = note?.dosar;
      if (!dosar) return;
      const expired = (params.get("nota") === "expirata") || (dosar.payment?.due && dosar.payment.due < TODAY);
      const item = pay.closest(".nt-item");
      item.querySelector("[data-nt-error]")?.remove();
      if (expired) {
        item.querySelector(".e-permits-stack__main").insertAdjacentHTML("beforeend", `
          <div class="message message--subtle banner--error message--small cab-message" role="alert" data-nt-error>
            <span class="banner__icon">${icon("icon-circle-error-filled", "medium")}</span>
            <div class="banner__content"><p>Taxa a expirat. Achitarea nu mai este posibilă.</p></div>
          </div>`);
        return;
      }
      window.location.assign(cabUrl("solicitari", { achita: dosar.id }));
    });
    document.documentElement.dataset.ntReady = "true";
  }

  const params = C.params;
  init().catch((error) => {
    console.warn("[notificari]", error);
    root.innerHTML = `<div class="cab-state" role="alert">${window.GEAPEmptyState.render({ title: "A apărut o eroare", text: "Notificările nu au fost încărcate. Încercați din nou.", icon: "circle-error" })}</div>`;
    document.documentElement.dataset.ntReady = "true";
  });
})();
