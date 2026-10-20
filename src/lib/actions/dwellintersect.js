/**
 * Fires `callback` once after the element has been continuously visible
 * in the viewport for `dwell` ms. Clears the timer on exit and disconnects
 * after the first fire. Returns a no-op destroy when no callback is given.
 *
 * @param {HTMLElement} node
 * @param {{ dwell?: number, rootMargin?: string, callback?: () => void }} [options]
 */
export function dwellintersect(node, options = {}) {
  const { dwell = 1000, rootMargin = "0px", callback } = options;

  if (!callback) {
    return { destroy() {} };
  }

  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        timer = setTimeout(() => {
          observer.disconnect();
          callback();
        }, dwell);
      } else {
        clearTimeout(timer ?? undefined);
        timer = null;
      }
    },
    { rootMargin },
  );

  observer.observe(node);

  return {
    destroy() {
      clearTimeout(timer ?? undefined);
      observer.disconnect();
    },
  };
}
