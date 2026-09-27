// Authentication Handlers for EzyBite

/**
 * Maps Firebase Auth error codes to friendly, user-facing messages.
 * Add new codes here as needed — never expose raw Firebase errors to users.
 */
function getAuthErrorMessage(error) {
    const code = error?.code || '';
    const map = {
        // Sign-in errors
        'auth/invalid-email':            'That doesn\'t look like a valid email address.',
        'auth/user-not-found':           'No account found with that email.',
        'auth/wrong-password':           'Incorrect password. Please try again.',
        'auth/invalid-credential':       'Invalid email or password.',
        'auth/user-disabled':            'This account has been disabled. Contact support.',
        // Sign-up errors
        'auth/email-already-in-use':     'An account with this email already exists. Try signing in.',
        'auth/weak-password':            'Password is too weak. Use at least 6 characters.',
        'auth/operation-not-allowed':    'Email/password sign-up is not enabled.',
        // General errors
        'auth/too-many-requests':        'Too many failed attempts. Please wait a moment and try again.',
        'auth/network-request-failed':   'Network error. Check your internet connection.',
        'auth/popup-closed-by-user':     'Sign-in popup was closed. Please try again.',
        'auth/popup-blocked':            'Sign-in popup was blocked by your browser. Please allow popups.',
        'auth/cancelled-popup-request':  'Another sign-in is in progress. Please wait.',
        'auth/requires-recent-login':    'Please sign out and sign back in to continue.',
        'auth/timeout':                  'The request timed out. Please try again.',
        'auth/app-not-authorized':       'This app is not authorised to use Firebase Authentication.',
    };
    return map[code] || 'Something went wrong. Please try again.';
}

/** Shows an inline error banner inside a modal and clears it on next submit */
function _showModalError(errorElId, message) {
    const el = document.getElementById(errorElId);
    if (!el) { if (typeof showToast === 'function') showToast(message, 'error', 5000); return; }
    el.querySelector('span[data-msg]').textContent = message;
    el.classList.remove('hidden');
}
function _clearModalError(errorElId) {
    const el = document.getElementById(errorElId);
    if (el) el.classList.add('hidden');
}

async function handleSignIn(event) {
    event.preventDefault();
    _clearModalError('signin-error');
    const formData = new FormData(event.target);
    const email    = formData.get('email')    || event.target.querySelector('input[type="email"]').value;
    const password = formData.get('password') || event.target.querySelector('input[type="password"]').value;
    const btn = document.getElementById('signin-submit-btn');
    const orig = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="animate-spin material-symbols-outlined text-base">sync</span> Signing in…'; }
    try {
        if (typeof window.fb_signIn !== 'function') throw new Error('Firebase Auth not initialized. Please refresh.');
        await window.fb_signIn(email, password);
        if (typeof showToast === 'function') showToast('Signed in successfully!', 'success');
        closeModal('signin-modal');
    } catch (error) {
        _showModalError('signin-error', getAuthErrorMessage(error));
        console.error('Sign in error:', error);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
}

async function handleSignUp(event) {
    event.preventDefault();
    _clearModalError('signup-error');
    const formData = new FormData(event.target);
    const fullName = formData.get('fullName') || event.target.querySelector('input[type="text"]').value;
    const email    = formData.get('email')    || event.target.querySelector('input[type="email"]').value;
    const password = formData.get('password') || event.target.querySelector('input[type="password"]').value;
    const btn = document.getElementById('signup-submit-btn');
    const orig = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="animate-spin material-symbols-outlined text-base">sync</span> Creating account…'; }
    try {
        if (typeof window.fb_signUp !== 'function') throw new Error('Firebase Auth not initialized. Please refresh.');
        await window.fb_signUp(email, password, fullName);
        if (typeof showToast === 'function') showToast('Account created! Welcome to EzyBite 🎉', 'success');
        closeModal('signup-modal');
    } catch (error) {
        _showModalError('signup-error', getAuthErrorMessage(error));
        console.error('Sign up error:', error);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
    }
}

async function handleGoogleSignIn() {
    try {
        if (typeof window.fb_signInWithGoogle !== 'function') throw new Error('Google auth not initialized. Please refresh.');
        await window.fb_signInWithGoogle();
        if (typeof closeModal === 'function') { closeModal('signin-modal'); closeModal('signup-modal'); }
        if (typeof showToast === 'function') showToast('Signed in with Google! Welcome 🎉', 'success');
    } catch (error) {
        // Google popup errors — show in whichever modal is open, fallback to toast
        const msg = getAuthErrorMessage(error);
        if (document.getElementById('signup-modal')?.classList.contains('flex')) {
            _showModalError('signup-error', msg);
        } else {
            _showModalError('signin-error', msg);
        }
        console.error('Google sign-in error:', error);
    }
}

async function handleSignOut() {
    try {
        await window.fb_signOut();
        if (typeof showToast === 'function') showToast('Signed out. See you soon!', 'info');
        setTimeout(() => { window.location.href = window.location.pathname.includes('/pages/') ? 'index.html' : 'pages/index.html'; }, 800);
    } catch (error) {
        if (typeof showToast === 'function') showToast('Sign out failed: ' + (error.message || error), 'error');
    }
}
