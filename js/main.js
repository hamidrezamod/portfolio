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
   Exposed as window.SmoothScrollEngine
========================= */
window.SmoothScrollEngine = (() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const enabled = !(reduceMotion || isCoarse);

  let current = window.scrollY;
  let target = window.scrollY;
  let rafId = null;
  let paused = false;

  const EASE = 0.12;
  const WHEEL_MULT = 1.0;

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function clampTarget() {
    target = Math.max(0, Math.min(target, maxScroll()));
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function sync() {
    current = window.scrollY;
    target = window.scrollY;
  }

  function animate() {
    if (paused) {
      rafId = null;
      return;
    }

    const diff = target - current;

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

  function to(y) {
    if (!enabled) {
      window.scrollTo(0, y);
      return;
    }
    if (paused) return;

    target = y;
    clampTarget();
    requestTick();
  }

  function pause() {
    paused = true;
    stop();
  }

  function resume() {
    paused = false;
    sync();
  }

  if (enabled) {
    window.addEventListener(
      "wheel",
      (e) => {
        if (paused) return;
        if (document.body.classList.contains("is-modal-open")) return;
        if (document.body.classList.contains("is-preloading")) return;

        const scrollable = e.target.closest("[data-native-scroll]");
        if (scrollable) return;

        e.preventDefault();
        target += e.deltaY * WHEEL_MULT;
        clampTarget();
        requestTick();
      },
      { passive: false }
    );

    window.addEventListener("scroll", () => {
      if (rafId) return;
      if (paused) return;
      sync();
    });

    window.addEventListener("keydown", (e) => {
      if (paused) return;
      if (document.body.classList.contains("is-modal-open")) return;
      if (document.body.classList.contains("is-preloading")) return;

      const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "];
      if (!keys.includes(e.key)) return;

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
  }

  return { to, pause, resume, sync, stop };
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

  dock.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const targetEl = document.querySelector(href);
      if (!targetEl) return;

      e.preventDefault();

      const y = targetEl.getBoundingClientRect().top + window.scrollY;
      window.SmoothScrollEngine.to(y);

      history.pushState(null, "", href);
      closeMenu();
    });
  });

  document.addEventListener("click", (e) => {
    if (!dock.contains(e.target)) closeMenu();
  });
})();


/* =========================
   Scroll guard while any modal is open
   - blocks background wheel/touch scroll
   - allows scroll inside [data-native-scroll]
========================= */
(function () {
  function shouldBlock(e) {
    if (!document.body.classList.contains("is-modal-open")) return false;
    if (e.target.closest("[data-native-scroll]")) return false;
    return true;
  }

  window.addEventListener(
    "wheel",
    (e) => {
      if (!shouldBlock(e)) return;
      e.preventDefault();
    },
    { passive: false, capture: true }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (!shouldBlock(e)) return;
      e.preventDefault();
    },
    { passive: false, capture: true }
  );
})();


/* =========================
   Helpers: lock/unlock page scroll (no jump)
========================= */
function lockPageScroll() {
  const y = window.scrollY || 0;

  // stop inertial engine so it doesn't "remember" old target
  window.SmoothScrollEngine.stop();
  window.SmoothScrollEngine.pause();

  document.documentElement.classList.add("is-modal-open");
  document.body.classList.add("is-modal-open", "is-modal-blur");

  document.body.dataset.lockedScrollY = String(y);
  document.body.style.position = "fixed";
  document.body.style.top = `-${y}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockPageScroll() {
  const y = parseInt(document.body.dataset.lockedScrollY || "0", 10) || 0;

  document.documentElement.classList.remove("is-modal-open");
  document.body.classList.remove("is-modal-open");
  document.body.classList.remove("is-modal-blur");

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  delete document.body.dataset.lockedScrollY;

  window.scrollTo(0, y);

  // re-sync inertial engine to restored position
  window.SmoothScrollEngine.stop();
  window.SmoothScrollEngine.sync();
  window.SmoothScrollEngine.resume();
}


/* =========================
   Article modal (external HTML + loader)
========================= */
(function () {
  const modal = document.getElementById("articleModal");
  const panel = modal?.querySelector(".article-modal__panel");
  const content = document.getElementById("articleModalContent");
  if (!modal || !panel || !content) return;

  const closeEls = modal.querySelectorAll("[data-article-close]");
  let isClosing = false;

  function showLoader() {
    content.innerHTML = `
      <div class="article-loader" aria-label="Loading">
        <div class="article-loader__spinner" aria-hidden="true"></div>
      </div>
    `;
  }

  async function openArticle(url) {
    lockPageScroll();

    modal.classList.add("is-active");
    modal.setAttribute("aria-hidden", "false");
    panel.scrollTop = 0;

    showLoader();

    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error("Failed to load article: " + url);
      content.innerHTML = await res.text();
      panel.scrollTop = 0;

      modal.querySelector(".article-modal__close")?.focus();
    } catch (err) {
      console.error(err);
      content.innerHTML = `<div style="padding:40px">Could not load this article.</div>`;
    }
  }

  function closeArticle() {
    if (isClosing) return;
    isClosing = true;

    modal.classList.remove("is-active");
    modal.setAttribute("aria-hidden", "true");

    // unlock immediately (no annoying wait)
    unlockPageScroll();

    // clear after transition
    window.setTimeout(() => {
      content.innerHTML = "";
      isClosing = false;
    }, 650);
  }

  document.querySelectorAll(".writing-list .project[data-article-src]").forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => {
      if (e.target.closest("a")) e.preventDefault();
      const url = card.getAttribute("data-article-src");
      if (!url) return;
      openArticle(url);
    });
  });

  closeEls.forEach((el) => el.addEventListener("click", closeArticle));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-active")) closeArticle();
  });
})();


/* =========================
   Theatre modal (external HTML + loader)
========================= */
(function () {
  const modal = document.getElementById("theatreModal");
  const panel = modal?.querySelector(".theatre-modal__panel");
  const content = document.getElementById("theatreModalContent");
  if (!modal || !panel || !content) return;

  const closeEls = modal.querySelectorAll("[data-theatre-close]");
  let isClosing = false;

  function showLoader() {
    content.innerHTML = `
      <div class="theatre-loader" aria-label="Loading">
        <div class="theatre-loader__spinner" aria-hidden="true"></div>
      </div>
    `;
  }

  async function openTheatre(url) {
    lockPageScroll();

    modal.classList.add("is-active");
    modal.setAttribute("aria-hidden", "false");
    panel.scrollTop = 0;

    showLoader();

    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error("Failed to load theatre: " + url);
      content.innerHTML = await res.text();
      panel.scrollTop = 0;

      modal.querySelector(".theatre-modal__close")?.focus();
    } catch (err) {
      console.error(err);
      content.innerHTML = `<div style="padding:40px">Could not load this project.</div>`;
    }
  }

  function closeTheatre() {
    if (isClosing) return;
    isClosing = true;

    modal.classList.remove("is-active");
    modal.setAttribute("aria-hidden", "true");

    unlockPageScroll();

    window.setTimeout(() => {
      content.innerHTML = "";
      isClosing = false;
    }, 650);
  }

  document.querySelectorAll(".theatre-item[data-theatre-src]").forEach((card) => {
    card.addEventListener("click", () => {
      const url = card.getAttribute("data-theatre-src");
      if (!url) return;
      openTheatre(url);
    });
  });

  closeEls.forEach((el) => el.addEventListener("click", closeTheatre));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-active")) closeTheatre();
  });
})();


/* =========================
   PRELOADER: [ Lights Fade In. ]
========================= */
(function () {
  const preloader = document.getElementById("preloader");
  const rightBracket = document.getElementById("preloaderRightBracket");
  const line = preloader?.querySelector(".preloader__line");
  if (!preloader || !rightBracket || !line) return;

  const words = ["Lights", "Fade", "In."];

  const startDelay = 800;
  const wordDur = 300;
  const afterDoneDelay = 500;

  function insertWord(wordText) {
    const before = rightBracket.getBoundingClientRect().left;

    const w = document.createElement("span");
    w.className = "preloader__word";
    w.textContent = wordText;

    line.insertBefore(w, rightBracket);

    const after = rightBracket.getBoundingClientRect().left;

    const delta = before - after;
    rightBracket.style.transition = "none";
    rightBracket.style.transform = `translateX(${delta}px)`;
    rightBracket.getBoundingClientRect();
    rightBracket.style.transition = "";
    rightBracket.style.transform = "translateX(0)";

    requestAnimationFrame(() => w.classList.add("is-in"));
  }

  function runSequence(i = 0) {
    insertWord(words[i]);

    if (i < words.length - 1) {
      setTimeout(() => runSequence(i + 1), wordDur);
    } else {
      setTimeout(() => {
        document.body.classList.add("is-site-ready");
        preloader.classList.add("is-hidden");

        setTimeout(() => {
          document.body.classList.remove("is-preloading");
          preloader.remove();
        }, 900);
      }, wordDur + afterDoneDelay);
    }
  }

  setTimeout(() => runSequence(0), startDelay);
})();
