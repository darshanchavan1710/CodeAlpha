// Cart and Checkout Interaction Handler

document.addEventListener('DOMContentLoaded', () => {
  const itemsList = document.getElementById('cart-items-list');
  const subtotalEl = document.getElementById('summary-subtotal');
  const shippingEl = document.getElementById('summary-shipping');
  const taxEl = document.getElementById('summary-tax');
  const totalEl = document.getElementById('summary-total');
  const actionBox = document.getElementById('checkout-action-box');
  const cartLayoutView = document.getElementById('cart-layout-view');

  let currentUser = null;

  async function initializeCartPage() {
    // Check authentication status first
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      currentUser = data.user;
    } catch (err) {
      console.error('Failed to resolve auth status on cart page:', err);
    }
    
    renderCart();
  }

  function renderCart() {
    const items = Cart.get();

    if (items.length === 0) {
      // Show empty state for cart items list
      cartLayoutView.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
          <div class="empty-state-icon"><i class="fas fa-shopping-cart"></i></div>
          <h3>Your Cart is Empty</h3>
          <p>Browse our collection to add premium products to your cart.</p>
          <a href="/index.html" class="nav-btn nav-btn-solid mt-2"><i class="fas fa-arrow-left"></i> Start Shopping</a>
        </div>
      `;
      return;
    }

    // Render item rows
    itemsList.innerHTML = items.map(item => `
      <div class="cart-item">
        <div class="cart-item-img">
          <img src="${item.image_url}" alt="${item.name}">
        </div>
        <div class="cart-item-details">
          <h4 class="cart-item-name"><a href="/product.html?id=${item.id}">${item.name}</a></h4>
          <span class="cart-item-category">Product ID: ${item.id}</span>
        </div>
        <div class="cart-item-actions">
          <div class="qty-selector">
            <button class="qty-btn dec-qty-btn" data-id="${item.id}"><i class="fas fa-minus"></i></button>
            <input type="number" class="qty-input" value="${item.quantity}" readonly>
            <button class="qty-btn inc-qty-btn" data-id="${item.id}"><i class="fas fa-plus"></i></button>
          </div>
          <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
          <button class="remove-cart-btn remove-item-btn" data-id="${item.id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    `).join('');

    // Setup listeners for cart adjustments
    document.querySelectorAll('.dec-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const item = items.find(i => i.id === id);
        if (item) {
          Cart.updateQuantity(id, item.quantity - 1);
          renderCart();
        }
      });
    });

    document.querySelectorAll('.inc-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const item = items.find(i => i.id === id);
        if (item) {
          Cart.updateQuantity(id, item.quantity + 1);
          renderCart();
        }
      });
    });

    document.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        Cart.remove(id);
        renderCart();
      });
    });

    // Calculations
    const subtotal = Cart.total();
    const shipping = subtotal > 150 ? 0 : 15; // Free shipping above $150
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    shippingEl.textContent = shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`;
    taxEl.textContent = `$${tax.toFixed(2)}`;
    totalEl.textContent = `$${total.toFixed(2)}`;

    // Render action button depending on auth
    if (currentUser) {
      actionBox.innerHTML = `
        <button id="checkout-submit-btn" class="checkout-btn">
          <i class="fas fa-credit-card"></i> Proceed to Checkout
        </button>
      `;
      
      document.getElementById('checkout-submit-btn').addEventListener('click', submitOrder);
    } else {
      actionBox.innerHTML = `
        <a href="/auth.html" class="checkout-btn">
          <i class="fas fa-sign-in-alt"></i> Log In to Checkout
        </a>
      `;
    }
  }

  async function submitOrder() {
    const items = Cart.get().map(item => ({
      id: item.id,
      quantity: item.quantity
    }));

    const checkoutBtn = document.getElementById('checkout-submit-btn');

    try {
      checkoutBtn.disabled = true;
      checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Order...';

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Checkout failed. Please try again.', 'error');
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = '<i class="fas fa-credit-card"></i> Proceed to Checkout';
        return;
      }

      showToast('Order processed successfully!');
      Cart.clear();

      setTimeout(() => {
        window.location.href = '/orders.html';
      }, 1200);

    } catch (err) {
      console.error(err);
      showToast('Network error during checkout.', 'error');
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = '<i class="fas fa-credit-card"></i> Proceed to Checkout';
    }
  }

  initializeCartPage();
});
