document.addEventListener("DOMContentLoaded", () => {
  const togglers = document.querySelectorAll("[data-toggle]");
  const slideDurationMs = 300;

  togglers.forEach(toggle => {
    const targetSelector = toggle.dataset.toggle;
    if (!targetSelector) return; // 🔒 protecție împotriva selector gol

    const target = document.querySelector(targetSelector);
    if (!target) return;

    const animation = toggle.dataset.animation || "fade";
    const position = toggle.dataset.position || "static";
    const closeMode = toggle.dataset.close || "outside";
    const exclusive = toggle.dataset.exclusive === "true";

    toggle.setAttribute("aria-expanded", "false");
    if (animation === "slide" && target.classList.contains("hidden")) {
      target.hidden = true;
      target.style.overflow = "hidden";
      target.style.maxHeight = "0px";
    }

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();

      if (exclusive) {
        togglers.forEach(other => {
          if (other !== toggle) {
            const otherSelector = other.dataset.toggle;
            if (!otherSelector) return;
            const otherTarget = document.querySelector(otherSelector);
            if (otherTarget) closePanel(other, otherTarget);
          }
        });
      }

      const isHidden = target.classList.contains("hidden");
      if (isHidden) {
        openPanel(toggle, target, animation);
      } else {
        closePanel(toggle, target, animation);
      }
    });

    if (closeMode === "outside") {
      document.addEventListener("click", (e) => {
        if (!target.contains(e.target) && !toggle.contains(e.target)) {
          closePanel(toggle, target, animation);
        }
      });
    }
  });

  function openPanel(toggle, target, animation) {
    applyAnimation(target, animation);
    target.hidden = false;
    target.classList.remove("hidden");
    if (animation === "slide") {
      target.style.maxHeight = `${target.scrollHeight}px`;
    }
    toggle.classList.add("is-active");
    toggle.setAttribute("aria-expanded", "true");
  }

  function closePanel(toggle, target, animation = "fade") {
    applyAnimation(target, animation);
    if (animation === "slide") {
      target.style.maxHeight = `${target.scrollHeight}px`;
      requestAnimationFrame(() => {
        target.style.maxHeight = "0px";
      });
      window.setTimeout(() => {
        target.hidden = true;
        target.classList.add("hidden");
      }, slideDurationMs);
    } else {
      target.hidden = true;
      target.classList.add("hidden");
    }
    toggle.classList.remove("is-active");
    toggle.setAttribute("aria-expanded", "false");
  }

  function applyAnimation(el, type) {
    switch (type) {
      case "fade":
        el.style.transition = "opacity 0.25s ease, transform 0.25s ease";
        break;
      case "slide":
        el.style.transition = "max-height 0.3s ease";
        el.style.overflow = "hidden";
        el.style.maxHeight = el.classList.contains("hidden") ? "0" : "500px";
        break;
      default:
        el.style.transition = "none";
    }
  }
});
