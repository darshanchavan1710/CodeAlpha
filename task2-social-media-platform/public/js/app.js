// Global Social Media Helper Functions

// Toast notification function
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
  toast.offsetHeight; // Reflow
  toast.classList.add('show');

  const removeTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);

  toast.querySelector('.toast-close-btn').addEventListener('click', () => {
    clearTimeout(removeTimer);
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });
}

// Global Auth Check and Dynamic Navbar Header rendering
async function checkAuthState() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();

    const authNav = document.getElementById('auth-nav');
    if (!authNav) return null;

    if (data.user) {
      authNav.innerHTML = `
        <div class="user-header-menu">
          <a href="/profile.html?username=${data.user.username}" class="header-profile-link">
            <i class="fas fa-user-circle"></i>
            <span>@${data.user.username}</span>
          </a>
          <button id="logout-btn" class="nav-btn nav-btn-outline"><i class="fas fa-sign-out-alt"></i> Logout</button>
        </div>
      `;

      document.getElementById('logout-btn').addEventListener('click', async () => {
        const logoutRes = await fetch('/api/auth/logout', { method: 'POST' });
        if (logoutRes.ok) {
          showToast('Logged out successfully.');
          setTimeout(() => {
            window.location.href = '/auth.html';
          }, 1000);
        }
      });
      return data.user;
    } else {
      authNav.innerHTML = `
        <a href="/auth.html" class="nav-btn nav-btn-solid"><i class="fas fa-sign-in-alt"></i> Join Platform</a>
      `;
      return null;
    }
  } catch (err) {
    console.error('Error verifying auth state:', err);
    return null;
  }
}

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
  checkAuthState();
});
