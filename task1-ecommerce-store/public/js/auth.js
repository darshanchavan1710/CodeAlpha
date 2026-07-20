// Auth Form Interaction Handler

document.addEventListener('DOMContentLoaded', () => {
  const loginTabBtn = document.getElementById('login-tab-btn');
  const registerTabBtn = document.getElementById('register-tab-btn');
  const usernameGroup = document.getElementById('username-group');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('submit-btn');
  const authForm = document.getElementById('auth-form');

  let currentMode = 'login'; // or 'register'

  // Tab switching logic
  loginTabBtn.addEventListener('click', () => {
    if (currentMode === 'login') return;
    currentMode = 'login';
    loginTabBtn.classList.add('active');
    registerTabBtn.classList.remove('active');
    usernameGroup.classList.add('hidden');
    usernameInput.removeAttribute('required');
    submitBtn.textContent = 'Log In';
  });

  registerTabBtn.addEventListener('click', () => {
    if (currentMode === 'register') return;
    currentMode = 'register';
    registerTabBtn.classList.add('active');
    loginTabBtn.classList.remove('active');
    usernameGroup.classList.remove('hidden');
    usernameInput.setAttribute('required', 'true');
    submitBtn.textContent = 'Create Account';
  });

  // Handle Form Submission
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    let payload = { email, password };
    let endpoint = '/api/auth/login';

    if (currentMode === 'register') {
      const username = usernameInput.value.trim();
      payload.username = username;
      endpoint = '/api/auth/register';
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = currentMode === 'login' ? 'Logging in...' : 'Registering...';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Authentication failed. Please check inputs.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = currentMode === 'login' ? 'Log In' : 'Create Account';
        return;
      }

      showToast(currentMode === 'login' ? 'Login successful!' : 'Account registered successfully!');
      
      // Store user info local reference (if needed) and redirect
      setTimeout(() => {
        // Redirect back to index page or referring page
        window.location.href = '/index.html';
      }, 1000);

    } catch (err) {
      console.error('Authentication request error:', err);
      showToast('Network error. Unable to connect to server.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = currentMode === 'login' ? 'Log In' : 'Create Account';
    }
  });
});
