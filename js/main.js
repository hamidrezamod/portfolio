document.querySelectorAll("[data-video-embed]").forEach((wrap) => {
  const iframe = wrap.querySelector("iframe");
  if (!iframe) return;

  iframe.addEventListener("load", () => {
    wrap.classList.add("is-loaded");
  });
});

(function () {
  const dock = document.querySelector(".dock-nav");
  if (!dock) return;

  const toggle = dock.querySelector(".dock-nav__toggle");
  const menu = dock.querySelector("#worksMenu");
  if (!toggle || !menu) return;

  function openMenu() {
    dock.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    dock.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    dock.classList.contains("is-open") ? closeMenu() : openMenu();
  });

  // Smooth scroll for all nav links (no jump)
  dock.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", href);

      closeMenu();
    });
  });

  // close when clicking outside
  document.addEventListener("click", (e) => {
    if (!dock.contains(e.target)) closeMenu();
  });
})();
