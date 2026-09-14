document.querySelectorAll("[data-video-embed]").forEach((wrap) => {
  const iframe = wrap.querySelector("iframe");
  if (!iframe) return;

  iframe.addEventListener("load", () => {
    wrap.classList.add("is-loaded");
  });
});
