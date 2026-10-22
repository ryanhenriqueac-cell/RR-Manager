/* Shared return navigation. Only same-origin pages can become return destinations. */
(function () {
  "use strict";
  const key = "rr_navigation_history";
  const current = () => location.pathname + location.search + location.hash;
  function safePath(value) {
    try {
      const url = new URL(value, location.href);
      return url.origin === location.origin && /^https?:$/.test(url.protocol)
        ? url.pathname + url.search + url.hash : "";
    } catch (_) { return ""; }
  }
  function advance(stack, here, source, back) {
    stack = Array.isArray(stack) ? stack.filter(item => typeof item === "string" && safePath(item) === item).slice(-30) : [];
    if (stack[stack.length - 1] === here) return stack;
    if (back && stack.includes(here)) return stack.slice(0, stack.lastIndexOf(here) + 1);
    if (source && source !== here && stack[stack.length - 1] !== source) stack.push(source);
    stack.push(here);
    return stack.slice(-30);
  }
  let stack = [];
  try { stack = JSON.parse(sessionStorage.getItem(key) || "[]"); } catch (_) {}
  function store() {
    try { sessionStorage.setItem(key, JSON.stringify(stack)); } catch (_) {}
  }
  function destination() { return stack.length > 1 ? stack[stack.length - 2] : ""; }
  function isReturn(link) {
    return link.matches("a[href]") && (/^voltar$/i.test(link.textContent.trim()) || link.id === "inspectionBackLink"
      || link.textContent.trim() === "Voltar ao meu cadastro");
  }
  function updateLinks() {
    const target = destination();
    if (!target) return;
    document.querySelectorAll("a[href]").forEach(link => {
      if (isReturn(link) && link.getAttribute("href") !== target) link.setAttribute("href", target);
    });
  }
  function record(back) {
    const source = document.referrer ? safePath(document.referrer) : "";
    stack = advance(stack, current(), source, back);
    store();
    updateLinks();
  }
  function init() {
    const navigation = performance.getEntriesByType("navigation")[0];
    let returning = false;
    try { returning = sessionStorage.getItem("rr_navigation_return") === current(); sessionStorage.removeItem("rr_navigation_return"); } catch (_) {}
    record(returning || navigation?.type === "back_forward");
    new MutationObserver(updateLinks).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    document.addEventListener("click", event => {
      const link = event.target.closest?.("a[href]");
      if (!link || !isReturn(link) || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      updateLinks();
      const target = destination();
      if (target && safePath(link.href) === target) {
        try { sessionStorage.setItem("rr_navigation_return", target); } catch (_) {}
      }
      // Existing inspection handlers still confirm saving before following link.href.
    }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.addEventListener("pageshow", event => { if (event.persisted) record(true); });
})();
