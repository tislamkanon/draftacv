/* ============================================
        MADE BY MD TOUHIDUL ISLAM KANON
   ============================================ */

// Firebase Authentication for CMS
// Initialize Firebase
let auth;

// Initialize Firebase when config is loaded
if (typeof firebase !== 'undefined' && window.firebaseConfig) {
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }
  auth = firebase.auth();
}

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', function() {
  // This detects '/admin/login', '/admin/login.html', or '/login' correctly
  const path = window.location.pathname.toLowerCase();
  const isLoginPage = path.includes('login');
  
  if (auth) {
    auth.onAuthStateChanged(function(user) {
      const loadingScreen = document.getElementById('auth-loading-screen');
      
      if (user) {
        // Logged in: if on login page, go to admin dashboard
        if (isLoginPage) {
          window.location.href = '/admin/'; // Points to admin/index.html
        } else if (loadingScreen) {
          loadingScreen.classList.add('hidden');
        }
      } else {
        // NOT logged in: if NOT on login page, send to admin login
        if (!isLoginPage) {
          window.location.href = '/admin/login'; // Firebase handles the .html automatically
        } else if (loadingScreen) {
          // Stay on login page, just hide the loading overlay
          loadingScreen.classList.add('hidden');
        }
      }
    });
  }
});

// Handle login form submission
async function handleLogin(e) {
  e.preventDefault();
  
  if (!auth) {
    showToast('Firebase not ready. Please refresh.', 'error');
    return;
  }
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('remember-me')?.checked || false;
  const loginBtn = document.getElementById('login-btn');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  
  // Validate inputs
  if (!email || !password) {
    showError('Please enter both email and password');
    return;
  }
  
  // Show loading state
  loginBtn.classList.add('loading');
  errorMessage.classList.remove('show');
  
  try {
    // Set persistence based on remember me checkbox
    const persistence = rememberMe 
      ? firebase.auth.Auth.Persistence.LOCAL 
      : firebase.auth.Auth.Persistence.SESSION;
    
    await auth.setPersistence(persistence);
    
    // Sign in with email and password
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    
    showToast('Login successful! Redirecting...', 'success');
    
    // Redirect to CMS dashboard after short delay
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
    
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle specific error codes
    let errorMsg = 'An error occurred. Please try again.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMsg = 'No account found with this email address.';
        break;
      case 'auth/wrong-password':
        errorMsg = 'Incorrect password. Please try again.';
        break;
      case 'auth/invalid-email':
        errorMsg = 'Please enter a valid email address.';
        break;
      case 'auth/user-disabled':
        errorMsg = 'This account has been disabled.';
        break;
      case 'auth/too-many-requests':
        errorMsg = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/invalid-credential':
        errorMsg = 'Invalid email or password. Please try again.';
        break;
      default:
        errorMsg = error.message || 'An error occurred. Please try again.';
    }
    
    showError(errorMsg);
    loginBtn.classList.remove('loading');
  }
}

// Show error message
function showError(message) {
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  
  if (errorText) {
    errorText.textContent = message;
  }
  if (errorMessage) {
    errorMessage.classList.add('show');
  }
}

// Toggle password visibility
function togglePassword() {
  const passwordInput = document.getElementById('password');
  const toggleIcon = document.getElementById('password-toggle-icon');
  
  if (passwordInput && toggleIcon) {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      toggleIcon.classList.remove('fa-eye');
      toggleIcon.classList.add('fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      toggleIcon.classList.remove('fa-eye-slash');
      toggleIcon.classList.add('fa-eye');
    }
  }
}

// Handle forgot password
function handleForgotPassword(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const resetEmail = document.getElementById('reset-email');
  if (resetEmail) {
    resetEmail.value = email;
  }
  
  openResetModal();
}

// Open reset password modal
function openResetModal() {
  const modal = document.getElementById('reset-modal');
  if (modal) {
    modal.classList.add('active');
  }
}

// Close reset password modal
function closeResetModal() {
  const modal = document.getElementById('reset-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Send password reset email
async function sendResetEmail() {
  const email = document.getElementById('reset-email').value.trim();
  
  if (!email) {
    showToast('Please enter your email address', 'warning');
    return;
  }
  
  try {
    await auth.sendPasswordResetEmail(email);
    showToast('Password reset email sent! Check your inbox.', 'success');
    closeResetModal();
  } catch (error) {
    console.error('Password reset error:', error);
    
    let errorMsg = 'Failed to send reset email.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMsg = 'No account found with this email address.';
        break;
      case 'auth/invalid-email':
        errorMsg = 'Please enter a valid email address.';
        break;
      default:
        errorMsg = error.message || 'Failed to send reset email.';
    }
    
    showToast(errorMsg, 'error');
  }
}

// Logout function (can be called from CMS)
async function logout() {
  try {
    await auth.signOut();
    showToast('Logged out successfully', 'success');
    
    // Redirect to login page
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 500);
  } catch (error) {
    console.error('Logout error:', error);
    showToast('Failed to logout. Please try again.', 'error');
  }
}

/* ============================================
        MADE BY MD TOUHIDUL ISLAM KANON
   ============================================ */

// Get current user
function getCurrentUser() {
  return auth ? auth.currentUser : null;
}

// Check if user is authenticated
function isAuthenticated() {
  return auth && auth.currentUser !== null;
}

// Toast notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastSlideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});

// Handle Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeResetModal();
  }
});

/* ============================================
        MADE BY MD TOUHIDUL ISLAM KANON
   ============================================ */