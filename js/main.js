/* =========================
   Vimeo poster fallback
========================= */
document.querySelectorAll("[data-video-embed]").forEach((wrap) => {
  const iframe = wrap.querySelector("iframe");
  if (!iframe) return;

  iframe.addEventListener("load", () => {
    wrap.classList.add("is-loaded");
  });
});


/* =========================
   Smooth scroll (inertial) — desktop only
========================= */
const SmoothScroll = (() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarse = window.matchMedia("(pointer: coarse)").matches; // avoid on touch devices
  if (reduceMotion || isCoarse) {
    return { to: (y) => window.scrollTo(0, y) };
  }

  let current = window.scrollY;
  let target = window.scrollY;
  let rafId = null;

  // tuning
  const EASE = 0.12;          // smaller = slower, larger = snappier (0.08–0.18 good range)
  const WHEEL_MULT = 1.0;     // wheel sensitivity

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function clampTarget() {
    target = Math.max(0, Math.min(target, maxScroll()));
  }

  function animate() {
    const diff = target - current;

    // stop condition
    if (Math.abs(diff) < 0.5) {
      current = target;
      window.scrollTo(0, Math.round(current));
      rafId = null;
      return;
    }

    current += diff * EASE;
    window.scrollTo(0, Math.round(current));
    rafId = requestAnimationFrame(animate);
  }

  function requestTick() {
    if (rafId) return;
    rafId = requestAnimationFrame(animate);
  }

  // wheel -> target
  window.addEventListener(
    "wheel",
    (e) => {
      // allow normal scroll inside scrollable elements if any
      // (if later you add a popup with its own scroll, this prevents breaking it)
      const scrollable = e.target.closest("[data-native-scroll]");
      if (scrollable) return;

      e.preventDefault();
      target += e.deltaY * WHEEL_MULT;
      clampTarget();
      requestTick();
    },
    { passive: false }
  );

  // keyboard (optional, helps feel consistent)
  window.addEventListener("keydown", (e) => {
    const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "];
    if (!keys.includes(e.key)) return;

    // if focused on input/textarea, do nothing
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    e.preventDefault();

    const vh = window.innerHeight;
    const step = 120;

    if (e.key === "ArrowDown") target += step;
    if (e.key === "ArrowUp") target -= step;
    if (e.key === "PageDown") target += vh * 0.9;
    if (e.key === "PageUp") target -= vh * 0.9;
    if (e.key === "Home") target = 0;
    if (e.key === "End") target = maxScroll();
    if (e.key === " ") target += (e.shiftKey ? -1 : 1) * vh * 0.9;

    clampTarget();
    requestTick();
  });

  // keep in sync if user drags scrollbar
  window.addEventListener("scroll", () => {
    if (rafId) return; // during our animation, ignore
    current = window.scrollY;
    target = window.scrollY;
  });

  // public API: scroll to y
  function to(y) {
    target = y;
    clampTarget();
    requestTick();
  }

  return { to };
})();


/* =========================
   Dock nav (toggle + smooth anchor)
========================= */
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

  // smooth scroll for ALL hash links in navbar
  dock.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const targetEl = document.querySelector(href);
      if (!targetEl) return;

      e.preventDefault();

      const y = targetEl.getBoundingClientRect().top + window.scrollY;
      SmoothScroll.to(y);

      history.pushState(null, "", href);
      closeMenu();
    });
  });

  document.addEventListener("click", (e) => {
    if (!dock.contains(e.target)) closeMenu();
  });
})();
