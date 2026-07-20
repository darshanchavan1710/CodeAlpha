// Product Detail Handler

document.addEventListener('DOMContentLoaded', () => {
  const detailsContainer = document.getElementById('product-details-view');
  
  // Get product ID from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    showErrorState('No product specified.');
    return;
  }

  async function fetchProductDetails() {
    try {
      const res = await fetch(`/api/products/${productId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch product details.');
      }

      renderProductDetails(data.product);
    } catch (err) {
      console.error(err);
      showErrorState(err.message);
    }
  }

  function renderProductDetails(product) {
    const isOutOfStock = product.stock <= 0;
    
    detailsContainer.innerHTML = `
      <div class="detail-grid">
        <div class="detail-image-box">
          <img src="${product.image_url}" alt="${product.name}">
        </div>
        <div class="detail-info-box">
          <span class="detail-category">${product.category}</span>
          <h1 class="detail-title">${product.name}</h1>
          <div class="detail-price">$${product.price.toFixed(2)}</div>
          <p class="detail-desc">${product.description}</p>
          
          <div class="stock-status ${isOutOfStock ? 'stock-out' : 'stock-in'}">
            <span class="stock-dot"></span>
            <span>${isOutOfStock ? 'Out of Stock' : `In Stock (${product.stock} units available)`}</span>
          </div>

          <div class="action-row mt-2">
            ${!isOutOfStock ? `
              <div class="qty-selector">
                <button class="qty-btn" id="qty-dec"><i class="fas fa-minus"></i></button>
                <input type="number" class="qty-input" id="qty-val" value="1" min="1" max="${product.stock}" readonly>
                <button class="qty-btn" id="qty-inc"><i class="fas fa-plus"></i></button>
              </div>
              <button class="nav-btn nav-btn-solid" id="add-to-cart-large-btn">
                <i class="fas fa-shopping-cart"></i> Add to Cart
              </button>
            ` : `
              <button class="nav-btn nav-btn-outline" disabled style="cursor: not-allowed; opacity: 0.5;">
                Sold Out
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    // Hook up interactive controls if in stock
    if (!isOutOfStock) {
      const qtyVal = document.getElementById('qty-val');
      const qtyDec = document.getElementById('qty-dec');
      const qtyInc = document.getElementById('qty-inc');
      const addToCartLargeBtn = document.getElementById('add-to-cart-large-btn');

      qtyDec.addEventListener('click', () => {
        let val = parseInt(qtyVal.value);
        if (val > 1) {
          qtyVal.value = val - 1;
        }
      });

      qtyInc.addEventListener('click', () => {
        let val = parseInt(qtyVal.value);
        if (val < product.stock) {
          qtyVal.value = val + 1;
        } else {
          showToast('Cannot exceed available stock.', 'error');
        }
      });

      addToCartLargeBtn.addEventListener('click', () => {
        const qty = parseInt(qtyVal.value);
        Cart.add(product, qty);
      });
    }
  }

  function showErrorState(message) {
    detailsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fas fa-exclamation-triangle" style="color: var(--error);"></i></div>
        <h3>Product Not Found</h3>
        <p>${message}</p>
        <a href="/index.html" class="nav-btn nav-btn-solid mt-2"><i class="fas fa-arrow-left"></i> Back to Catalog</a>
      </div>
    `;
  }

  // Execute detail loading
  fetchProductDetails();
});
