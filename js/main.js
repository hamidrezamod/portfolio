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
    menu.hidden = false;
  }

  function closeMenu() {
    dock.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    menu.hidden = true;
  }

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    isOpen ? closeMenu() : openMenu();
  });

  // close when clicking outside
  document.addEventListener("click", (e) => {
    if (!dock.contains(e.target)) closeMenu();
  });

  // close when selecting a works link
  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => closeMenu());
  });
})();
