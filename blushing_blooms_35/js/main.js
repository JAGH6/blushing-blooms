/**
 * Blushing Blooms — shared nav, data loading, and utilities.
 * When deployed with Root Directory = blushing_blooms_35, site is at root (no /flowers).
 */

(function () {
  const BASE = '';

  /**
   * Renders the site header and nav; call after DOM ready.
   */
  function initNav() {
    const header = document.querySelector('.site-header .container');
    if (!header) return;

    const cartCount = window.bb35Cart ? window.bb35Cart.getCount() : 0;
    const countEl = document.getElementById('bb35-cart-count');
    if (countEl) countEl.textContent = countEl.dataset.count = String(cartCount);

    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        nav.classList.toggle('is-open');
      });
    }
  }

  /**
   * Fetches JSON from the data folder.
   * @param {string} name - File name (e.g. 'site', 'arrangements', 'gallery').
   * @returns {Promise<object|array>} Parsed JSON.
   */
  function fetchData(name) {
    return fetch(BASE + '/data/' + name + '.json').then(function (r) {
      if (!r.ok) throw new Error('Failed to load ' + name);
      return r.json();
    });
  }

  /**
   * Expose BASE and helpers for other scripts.
   */
  window.bb35 = {
    BASE: BASE,
    fetchData: fetchData,
    initNav: initNav
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
