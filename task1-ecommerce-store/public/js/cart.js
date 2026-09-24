// Cart and Multi-Step Checkout Interaction Handler

document.addEventListener('DOMContentLoaded', () => {
  const itemsList = document.getElementById('cart-items-list');
  const subtotalEl = document.getElementById('summary-subtotal');
  const shippingEl = document.getElementById('summary-shipping');
  const taxEl = document.getElementById('summary-tax');
  const totalEl = document.getElementById('summary-total');
  const actionBox = document.getElementById('checkout-action-box');
  const cartLayoutView = document.getElementById('cart-layout-view');
  const checkoutStepsBar = document.getElementById('checkout-steps-bar');

  const step1View = document.getElementById('step-1-view');
  const step2View = document.getElementById('step-2-view');
  const step3View = document.getElementById('step-3-view');
  const stepPanelTitle = document.getElementById('step-panel-title');

  let currentStep = 1;
  let currentUser = null;

  // Form State
  let shippingData = { name: '', address: '', city: '', zip: '' };
  let paymentData = { method: 'card', cardNumber: '', upiId: '' };

  async function initializeCartPage() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      currentUser = data.user;
      if (currentUser) {
        shippingData.name = currentUser.username || '';
      }
    } catch (err) {
      console.error('Failed to resolve auth status on cart page:', err);
    }
    
    setupPaymentMethodListeners();
    renderStep(1);
  }

  function setupPaymentMethodListeners() {
    const radioBtns = document.querySelectorAll('input[name="paymentMethod"]');
    const cardFields = document.getElementById('card-fields');
    const upiFields = document.getElementById('upi-fields');
    
    radioBtns.forEach(radio => {
      radio.addEventListener('change', (e) => {
        paymentData.method = e.target.value;
        document.querySelectorAll('.payment-option-card').forEach(c => c.classList.remove('active'));
        e.target.closest('.payment-option-card').classList.add('active');

        if (paymentData.method === 'card') {
          cardFields.classList.remove('hidden');
          upiFields.classList.add('hidden');
        } else if (paymentData.method === 'upi') {
          cardFields.classList.add('hidden');
          upiFields.classList.remove('hidden');
        } else {
          cardFields.classList.add('hidden');
          upiFields.classList.add('hidden');
        }
      });
    });
  }

  function renderStep(step) {
    currentStep = step;
    const items = Cart.get();

    // Update Step Indicators
    [1, 2, 3].forEach(s => {
      const navItem = document.getElementById(`step-nav-${s}`);
      if (s === step) {
        navItem.className = 'step-item active';
      } else if (s < step) {
        navItem.className = 'step-item completed';
      } else {
        navItem.className = 'step-item';
      }
    });

    if (items.length === 0) {
      checkoutStepsBar.classList.add('hidden');
      cartLayoutView.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
          <div class="empty-state-icon"><i class="fas fa-shopping-cart"></i></div>
          <h3>Your Cart is Empty</h3>
          <p>Browse our collection to add premium products to your cart.</p>
          <a href="/index.html" class="nav-btn nav-btn-solid mt-2"><i class="fas fa-arrow-left"></i> Start Shopping</a>
        </div>
      `;
      return;
    } else {
      checkoutStepsBar.classList.remove('hidden');
    }

    // Toggle View Panels
    if (step === 1) {
      stepPanelTitle.textContent = 'Shopping Cart';
      step1View.classList.remove('hidden');
      step2View.classList.add('hidden');
      step3View.classList.add('hidden');
      renderCartItems(items);
    } else if (step === 2) {
      stepPanelTitle.textContent = 'Shipping & Delivery Address';
      step1View.classList.add('hidden');
      step2View.classList.remove('hidden');
      step3View.classList.add('hidden');
      
      // Auto pre-fill if available
      if (shippingData.name) document.getElementById('ship-name').value = shippingData.name;
      if (shippingData.address) document.getElementById('ship-address').value = shippingData.address;
      if (shippingData.city) document.getElementById('ship-city').value = shippingData.city;
      if (shippingData.zip) document.getElementById('ship-zip').value = shippingData.zip;
    } else if (step === 3) {
      stepPanelTitle.textContent = 'Payment & Order Review';
      step1View.classList.add('hidden');
      step2View.classList.add('hidden');
      step3View.classList.remove('hidden');
    }

    updateSummaryCalculations(items);
    renderActionButton();
  }

  function renderCartItems(items) {
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

    document.querySelectorAll('.dec-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const item = items.find(i => i.id === id);
        if (item) {
          Cart.updateQuantity(id, item.quantity - 1);
          renderStep(1);
        }
      });
    });

    document.querySelectorAll('.inc-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const item = items.find(i => i.id === id);
        if (item) {
          Cart.updateQuantity(id, item.quantity + 1);
          renderStep(1);
        }
      });
    });

    document.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        Cart.remove(id);
        renderStep(1);
      });
    });
  }

  function updateSummaryCalculations(items) {
    const subtotal = Cart.total();
    const shipping = subtotal > 150 ? 0 : 15;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    shippingEl.textContent = shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`;
    taxEl.textContent = `$${tax.toFixed(2)}`;
    totalEl.textContent = `$${total.toFixed(2)}`;
  }

  function renderActionButton() {
    if (!currentUser) {
      actionBox.innerHTML = `
        <a href="/auth.html" class="checkout-btn">
          <i class="fas fa-sign-in-alt"></i> Log In to Checkout
        </a>
      `;
      return;
    }

    if (currentStep === 1) {
      actionBox.innerHTML = `
        <button id="next-step-btn" class="checkout-btn">
          Proceed to Address <i class="fas fa-arrow-right"></i>
        </button>
      `;
      document.getElementById('next-step-btn').addEventListener('click', () => {
        renderStep(2);
      });
    } else if (currentStep === 2) {
      actionBox.innerHTML = `
        <div style="display: flex; gap: 10px;">
          <button id="back-step-btn" class="nav-btn nav-btn-outline" style="flex: 1;">
            <i class="fas fa-arrow-left"></i> Back
          </button>
          <button id="next-step-btn" class="checkout-btn" style="flex: 2;">
            Proceed to Payment <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      `;
      document.getElementById('back-step-btn').addEventListener('click', () => renderStep(1));
      document.getElementById('next-step-btn').addEventListener('click', validateAndGoToPayment);
    } else if (currentStep === 3) {
      actionBox.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button id="checkout-submit-btn" class="checkout-btn">
            <i class="fas fa-check-circle"></i> Confirm & Place Order
          </button>
          <button id="back-step-btn" class="nav-btn nav-btn-outline">
            <i class="fas fa-arrow-left"></i> Edit Address
          </button>
        </div>
      `;
      document.getElementById('back-step-btn').addEventListener('click', () => renderStep(2));
      document.getElementById('checkout-submit-btn').addEventListener('click', submitFinalOrder);
    }
  }

  function validateAndGoToPayment() {
    const name = document.getElementById('ship-name').value.trim();
    const address = document.getElementById('ship-address').value.trim();
    const city = document.getElementById('ship-city').value.trim();
    const zip = document.getElementById('ship-zip').value.trim();

    if (!name || !address || !city || !zip) {
      showToast('Please fill out all shipping address fields.', 'error');
      return;
    }

    shippingData = { name, address, city, zip };
    renderStep(3);
  }

  async function submitFinalOrder() {
    const items = Cart.get().map(item => ({
      id: item.id,
      quantity: item.quantity
    }));

    if (paymentData.method === 'card') {
      paymentData.cardNumber = document.getElementById('pay-card-num').value.trim();
    } else if (paymentData.method === 'upi') {
      paymentData.upiId = document.getElementById('pay-upi-id').value.trim();
    }

    const checkoutBtn = document.getElementById('checkout-submit-btn');

    try {
      checkoutBtn.disabled = true;
      checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Payment...';

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          shipping: shippingData,
          payment: paymentData
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Checkout failed. Please try again.', 'error');
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm & Place Order';
        return;
      }

      showToast('Order confirmed and placed successfully!');
      Cart.clear();

      setTimeout(() => {
        window.location.href = '/orders.html';
      }, 1200);

    } catch (err) {
      console.error(err);
      showToast('Network error during order placement.', 'error');
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm & Place Order';
    }
  }

  initializeCartPage();
});
