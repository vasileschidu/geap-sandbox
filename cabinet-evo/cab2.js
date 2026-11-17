/* EVO Cabinet v2 — the flag and the menu groups (cab2-foundations-v1, 2026-11-17).
   Loaded in <head>, not deferred: `?shell=2` puts `.cab2` on <html> before the first paint, so the new surfaces
   (cab2.css) never flash in / out. Without the flag nothing changes — the current Cabinet stays as it is until
   Batch 5 makes the new shell the default.
     ?shell=2            the new shell
     ?motion=reduce      forces the reduced-motion base (`.is-motion-reduced`) — demo / tests; the real switch is the
                         system setting (prefers-reduced-motion)
   window.Cab2 = { on, GROUPS, group(id), groupIcon(id, { size, sprite }) }
   GROUPS = the menu groups in menu order (wiki 02 · Structure): one colour (cab2.css › 4. group identity, by
   `data-cab2-group`) + one sprite icon each. `company` = the label of the same slot in a company context. */
(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const on = params.get("shell") === "2";
  if (on) {
    document.documentElement.classList.add("cab2");
    if (params.get("motion") === "reduce") document.documentElement.classList.add("is-motion-reduced");
  }

  const GROUPS = [
    { id: "acasa", label: "Acasă", icon: "home-line" },
    { id: "cereri", label: "Cereri și acte permisive", icon: "permission" },
    { id: "documente", label: "Documente", icon: "id-card" },
    { id: "bani", label: "Bani și obligații", icon: "wallet" },
    { id: "proprietati", label: "Proprietăți și vehicule", icon: "house" },
    { id: "familie", label: "Familie și sănătate", icon: "health" },
    { id: "munca", label: "Muncă și afaceri", company: "Companie", icon: "business" },
    { id: "acces", label: "Acces și reprezentare", icon: "shield-user" },
  ];
  const group = (id) => GROUPS.find((item) => item.id === id) || null;

  /* the round group icon = the library avatar (40 · icon 20; size "sm" = 32) with the group's two colours */
  const groupIcon = (id, { size = "md", sprite = "../assets/icons/sprite.svg" } = {}) => {
    const item = group(id);
    if (!item) return "";
    return `<span class="avatar avatar--${size === "sm" ? "sm" : "md"} avatar--icon cab2-group-icon" data-cab2-group="${item.id}" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="${sprite}#icon-${item.icon}"></use></svg></span>`;
  };

  window.Cab2 = { on, GROUPS, group, groupIcon };
})();
