// Global App State & Utility functions

// Dynamic Toast Notification System
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="toast-close-btn">&times;</button>
  `;

  container.appendChild(toast);

  // Trigger animation reflow
  toast.offsetHeight;
  toast.classList.add('show');

  // Auto-remove after 4 seconds
  const autoRemove = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);

  // Manual close
  toast.querySelector('.toast-close-btn').addEventListener('click', () => {
    clearTimeout(autoRemove);
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });
}

// Shopping Cart Helpers
const Cart = {
  get() {
    return JSON.parse(localStorage.getItem('cart')) || [];
  },

  save(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    this.updateBadge();
  },

  add(product, quantity = 1) {
    let cart = this.get();
    const existingIndex = cart.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
      showToast(`Updated quantity of ${product.name} in cart!`);
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        quantity: quantity
      });
      showToast(`Added ${product.name} to cart!`);
    }
    this.save(cart);
  },

  updateQuantity(productId, quantity) {
    let cart = this.get();
    const itemIndex = cart.findIndex(item => item.id === productId);

    if (itemIndex > -1) {
      if (quantity <= 0) {
        cart.splice(itemIndex, 1);
        showToast('Item removed from cart.');
      } else {
        cart[itemIndex].quantity = quantity;
      }
      this.save(cart);
    }
  },

  remove(productId) {
    let cart = this.get();
    cart = cart.filter(item => item.id !== productId);
    this.save(cart);
    showToast('Item removed from cart.');
  },

  clear() {
    localStorage.removeItem('cart');
    this.updateBadge();
  },

  count() {
    return this.get().reduce((sum, item) => sum + item.quantity, 0);
  },

  total() {
    return this.get().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      const totalCount = this.count();
      badge.textContent = totalCount;
      if (totalCount > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }
};

// Authentication state check and header updating
async function checkAuthState() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    
    const userNav = document.getElementById('user-nav');
    if (!userNav) return null;

    if (data.user) {
      userNav.innerHTML = `
        <div class="user-menu-wrapper">
          <span class="user-welcome">Hello, <strong>${data.user.username}</strong></span>
          <a href="/orders.html" class="nav-btn nav-btn-outline"><i class="fas fa-box"></i> Orders</a>
          <button id="logout-btn" class="nav-btn nav-btn-solid"><i class="fas fa-sign-out-alt"></i> Logout</button>
        </div>
      `;
      
      document.getElementById('logout-btn').addEventListener('click', async () => {
        const logoutRes = await fetch('/api/auth/logout', { method: 'POST' });
        if (logoutRes.ok) {
          showToast('Logged out successfully.');
          setTimeout(() => {
            window.location.href = '/index.html';
          }, 1000);
        }
      });
      return data.user;
    } else {
      userNav.innerHTML = `
        <a href="/auth.html" class="nav-btn nav-btn-solid"><i class="fas fa-user"></i> Login / Register</a>
      `;
      return null;
    }
  } catch (err) {
    console.error('Error fetching auth details:', err);
    return null;
  }
}

// Global Document Initializer
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateBadge();
  checkAuthState();
});
