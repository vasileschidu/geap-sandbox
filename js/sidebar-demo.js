document.addEventListener("DOMContentLoaded", () => {
  const interactiveSidebars = document.querySelectorAll('[data-sidebar-demo="interactive"]');
  const iconPairs = new Map([
    ["icon-group", "icon-group-filled"],
    ["icon-group-filled", "icon-group"],
    ["icon-document", "icon-document-filled"],
    ["icon-document-filled", "icon-document"],
  ]);

  interactiveSidebars.forEach((sidebar) => {
    sidebar.addEventListener("click", (event) => {
      const item = event.target.closest(".sidebar__link");
      if (!item || !sidebar.contains(item)) return;

      if (item.tagName === "A") {
        const href = item.getAttribute("href");
        if (!href || href === "#") {
          event.preventDefault();
        }
      }

      setActiveItem(sidebar, item);
    });
  });

  function setActiveItem(sidebar, nextActiveItem) {
    if (nextActiveItem.tagName !== "A") {
      return;
    }

    sidebar.querySelectorAll(".sidebar__link--active").forEach((item) => {
      item.classList.remove("sidebar__link--active");
      if (item.tagName === "A") {
        item.removeAttribute("aria-current");
      }
      updateIconVariant(item, false);
    });

    nextActiveItem.classList.add("sidebar__link--active");
    if (nextActiveItem.tagName === "A") {
      nextActiveItem.setAttribute("aria-current", "page");
    }
    updateIconVariant(nextActiveItem, true);
  }

  function updateIconVariant(item, isActive) {
    const useEl = item.querySelector(".sidebar__icon use");
    if (!useEl) return;

    const href = useEl.getAttribute("href");
    if (!href) return;

    const [spritePath, iconId] = href.split("#");
    if (!iconId || !iconPairs.has(iconId)) return;

    const nextIconId = isActive
      ? iconId.endsWith("-filled")
        ? iconId
        : iconPairs.get(iconId)
      : iconId.endsWith("-filled")
        ? iconPairs.get(iconId)
        : iconId;

    if (!nextIconId) return;
    useEl.setAttribute("href", `${spritePath}#${nextIconId}`);
  }
});
