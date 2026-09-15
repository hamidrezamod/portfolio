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

/* =========================
   Article modal (external HTML + loader + scroll lock)
========================= */
(function () {
  const modal = document.getElementById("articleModal");
  const panel = modal?.querySelector(".article-modal__panel");
  const content = document.getElementById("articleModalContent");
  if (!modal || !panel || !content) return;

  const closeEls = modal.querySelectorAll("[data-article-close]");
  let isClosing = false;
  let lockedScrollY = 0;

  function lockPageScroll() {
    lockedScrollY = window.scrollY || 0;

    document.documentElement.classList.add("is-modal-open");
    document.body.classList.add("is-modal-open");

    // robust lock (prevents any background movement)
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockPageScroll() {
    document.documentElement.classList.remove("is-modal-open");
    document.body.classList.remove("is-modal-open");

    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";

    window.scrollTo(0, lockedScrollY);
  }

  function showModalShellWithLoader() {
    // open immediately (no fetch delay)
    lockPageScroll();

    modal.classList.add("is-active");
    modal.setAttribute("aria-hidden", "false");

    // reset panel scroll
    panel.scrollTop = 0;

    content.innerHTML = `
      <div class="article-loader" aria-label="Loading">
        <div class="article-loader__spinner" aria-hidden="true"></div>
      </div>
    `;
  }

  async function loadArticleIntoModal(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error("Failed to load article: " + url);
    const html = await res.text();
    content.innerHTML = html;
    panel.scrollTop = 0;
  }

  async function openArticle(url) {
    try {
      showModalShellWithLoader();
      await loadArticleIntoModal(url);

      // focus close button (optional)
      const closeBtn = modal.querySelector(".article-modal__close");
      closeBtn?.focus();
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

    // wait for transition end, then cleanup
    window.setTimeout(() => {
      content.innerHTML = "";
      unlockPageScroll();
      isClosing = false;
    }, 850);
  }

  // open on click writing cards
  document.querySelectorAll(".writing-list .project[data-article-src]").forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => {
      if (e.target.closest("a")) e.preventDefault();
      const url = card.getAttribute("data-article-src");
      if (!url) return;
      openArticle(url);
    });
  });

  // close
  closeEls.forEach((el) => el.addEventListener("click", closeArticle));

  // ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-active")) {
      closeArticle();
    }
  });
})();


/* =========================
   Theatre modal (external HTML + loader + scroll lock)
========================= */
(function () {
  const modal = document.getElementById("theatreModal");
  const panel = modal?.querySelector(".theatre-modal__panel");
  const content = document.getElementById("theatreModalContent");
  if (!modal || !panel || !content) return;

  const closeEls = modal.querySelectorAll("[data-theatre-close]");
  let isClosing = false;
  let lockedScrollY = 0;

  function lockPageScroll() {
    lockedScrollY = window.scrollY || 0;

    document.documentElement.classList.add("is-modal-open");
    document.body.classList.add("is-modal-open");

    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockPageScroll() {
    document.documentElement.classList.remove("is-modal-open");
    document.body.classList.remove("is-modal-open");

    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";

    window.scrollTo(0, lockedScrollY);
  }

  function showLoaderShell() {
    lockPageScroll();

    modal.classList.add("is-active");
    modal.setAttribute("aria-hidden", "false");

    panel.scrollTop = 0;

    content.innerHTML = `
      <div class="theatre-loader" aria-label="Loading">
        <div class="theatre-loader__spinner" aria-hidden="true"></div>
      </div>
    `;
  }

  async function loadTheatre(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error("Failed to load theatre: " + url);

    const html = await res.text();
    content.innerHTML = html;
    panel.scrollTop = 0;

    const closeBtn = modal.querySelector(".theatre-modal__close");
    closeBtn?.focus();
  }

  async function openTheatre(url) {
    try {
      showLoaderShell();
      await loadTheatre(url);
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

    window.setTimeout(() => {
      content.innerHTML = "";
      unlockPageScroll();
      isClosing = false;
    }, 850);
  }

  // open on click theatre cards
  document.querySelectorAll(".theatre-item[data-theatre-src]").forEach((card) => {
    card.addEventListener("click", () => {
      const url = card.getAttribute("data-theatre-src");
      if (!url) return;
      openTheatre(url);
    });
  });

  // close handlers
  closeEls.forEach((el) => el.addEventListener("click", closeTheatre));

  // ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-active")) {
      closeTheatre();
    }
  });
})();

/* =========================
   PRELOADER: [ Lights Fade In. ]
   - delay 800ms
   - each word 300ms easeOutBack
   - right bracket moves with FLIP
   - after done: wait 500ms
   - then site fades in (800ms)
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
    // position before insertion
    const before = rightBracket.getBoundingClientRect().left;

    // create word
    const w = document.createElement("span");
    w.className = "preloader__word";
    w.textContent = wordText;

    // insert before right bracket
    line.insertBefore(w, rightBracket);

    // new position after insertion
    const after = rightBracket.getBoundingClientRect().left;

    // FLIP: move bracket back by delta then animate to 0
    const delta = before - after;
    rightBracket.style.transition = "none";
    rightBracket.style.transform = `translateX(${delta}px)`;
    // force reflow
    rightBracket.getBoundingClientRect();
    rightBracket.style.transition = "";
    rightBracket.style.transform = "translateX(0)";

    // animate word in
    requestAnimationFrame(() => w.classList.add("is-in"));
  }

  function runSequence(i = 0) {
    insertWord(words[i]);

    if (i < words.length - 1) {
      setTimeout(() => runSequence(i + 1), wordDur);
    } else {
      // after last word finishes
      setTimeout(() => {
        document.body.classList.add("is-site-ready");
        preloader.classList.add("is-hidden");

        // cleanup after fade
        setTimeout(() => {
          document.body.classList.remove("is-preloading");
          preloader.remove();
        }, 900);
      }, wordDur + afterDoneDelay);
    }
  }

  // start
  setTimeout(() => runSequence(0), startDelay);
})();
