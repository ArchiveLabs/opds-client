/**
 * This action calls a callback when the node enters the viewport.
 * It's designed for one-off events like infinite scrolling.
 *
 * @param {HTMLElement} node The element to observe.
 * @param {object} [options]
 * @param {string} [options.rootMargin='400px'] - Eager-loads content when it's 400px away from the viewport.
 * @param {() => void} [options.callback] - Called when the node intersects the viewport.
 */
export function intersect(node, options = {}) {
  const { rootMargin = "400px", callback } = options;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && callback) queueMicrotask(callback);
    },
    {
      rootMargin,
    },
  );

  observer.observe(node);

  return {
    destroy() {
      observer.disconnect();
    },
  };
}
