/**
 * Blushing Blooms — cart state (localStorage) and drawer UI.
 * Persists across pages; updates nav count and checkout URL.
 */

(function () {
  const STORAGE_KEY = 'blushing_blooms_35_cart';
  const BASE = window.location.pathname.startsWith('/flowers') ? '/flowers' : '';

  function getCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function setCart(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    updateCartUI();
  }

  function updateCartUI() {
    const count = getCart().reduce(function (n, i) { return n + (i.quantity || 1); }, 0);
    const el = document.getElementById('bb35-cart-count');
    if (el) {
      el.textContent = count;
      el.dataset.count = String(count);
      el.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  /**
   * Adds an item to the cart (by product id and optional quantity).
   * @param {{ id: string, name: string, price: number, image: string }} product
   * @param {number} [quantity=1]
   */
  function addItem(product, quantity) {
    if (!product || !product.id) return;
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const cart = getCart();
    const i = cart.findIndex(function (x) { return x.id === product.id; });
    if (i >= 0) cart[i].quantity = (cart[i].quantity || 1) + qty;
    else cart.push({ id: product.id, name: product.name, price: product.price, image: product.image || '', quantity: qty });
    setCart(cart);
  }

  function removeItem(id) {
    setCart(getCart().filter(function (x) { return x.id !== id; }));
  }

  function getCount() {
    return getCart().reduce(function (n, i) { return n + (i.quantity || 1); }, 0);
  }

  function getTotal() {
    return getCart().reduce(function (sum, i) {
      return sum + (i.price || 0) * (i.quantity || 1);
    }, 0);
  }

  function clearCart() {
    setCart([]);
  }

  window.bb35Cart = {
    getCart: getCart,
    addItem: addItem,
    removeItem: removeItem,
    getCount: getCount,
    getTotal: getTotal,
    clearCart: clearCart,
    updateCartUI: updateCartUI
  };

  function renderDrawer() {
    const drawer = document.getElementById('bb35-cart-drawer');
    const overlay = document.getElementById('bb35-cart-overlay');
    if (!drawer) return;

    function openDrawer() {
      drawer.classList.add('is-open');
      if (overlay) overlay.classList.add('is-visible');
      renderDrawerContents();
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-visible');
    }

    function renderDrawerContents() {
      const body = drawer.querySelector('.cart-drawer-body');
      const footer = drawer.querySelector('.cart-drawer-footer');
      if (!body) return;

      const cart = getCart();
      if (cart.length === 0) {
        body.innerHTML = '<p class="cart-drawer-empty">Your cart is empty.</p>';
        if (footer) footer.innerHTML = '';
        return;
      }

      body.innerHTML = cart.map(function (item) {
        return (
          '<div class="cart-item" data-id="' + item.id + '">' +
          '<img class="cart-item-image" src="' + (item.image || '') + '" alt="">' +
          '<div class="cart-item-details">' +
          '<p class="cart-item-name">' + escapeHtml(item.name) + '</p>' +
          '<p class="cart-item-qty">Qty: ' + (item.quantity || 1) + ' &middot; $' + formatMoney((item.price || 0) * (item.quantity || 1)) + '</p>' +
          '</div>' +
          '<button type="button" class="cart-item-remove" aria-label="Remove">Remove</button>' +
          '</div>'
        );
      }).join('');

      if (footer) {
        footer.innerHTML =
          '<p style="margin:0 0 0.5rem 0; font-weight:600;">Total: $' + formatMoney(getTotal()) + '</p>' +
          '<button type="button" class="btn btn-primary js-checkout-btn" style="width:100%;">Checkout</button>';
        footer.querySelector('.js-checkout-btn').addEventListener('click', function () {
          var cartItems = getCart();
          var lineItems = cartItems.map(function (i) {
            return { name: i.name, price: i.price, image: i.image || '', quantity: i.quantity || 1 };
          });
          var origin = window.location.origin || '';
          fetch(origin + '/api/blushing_blooms_35/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lineItems: lineItems,
              successUrl: origin + BASE + '/thank-you?session_id={CHECKOUT_SESSION_ID}',
              cancelUrl: origin + BASE + '/shop'
            })
          }).then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
            .then(function (result) {
              if (result.ok && result.data.url) {
                window.location.href = result.data.url;
              } else {
                window.location.href = BASE + '/contact?from=cart';
              }
            }).catch(function () {
              window.location.href = BASE + '/contact?from=cart';
            });
        });
      }

      body.querySelectorAll('.cart-item-remove').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const id = btn.closest('.cart-item').dataset.id;
          removeItem(id);
          renderDrawerContents();
          if (footer) {
            const cart2 = getCart();
            if (cart2.length === 0) footer.innerHTML = '';
            else footer.querySelector('p').textContent = 'Total: $' + formatMoney(getTotal());
          }
        });
      });
    }

    document.querySelectorAll('.cart-link, .js-open-cart').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (el.getAttribute('href') === '#' || el.classList.contains('js-open-cart')) {
          e.preventDefault();
          openDrawer();
        }
      });
    });

    drawer.querySelector('.cart-drawer-close')?.addEventListener('click', closeDrawer);
    overlay?.addEventListener('click', closeDrawer);
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function formatMoney(dollars) {
    return Number(dollars).toFixed(2);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      renderDrawer();
      updateCartUI();
    });
  } else {
    renderDrawer();
    updateCartUI();
  }
})();
