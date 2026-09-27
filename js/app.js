// Main Application Logic for EzyBite
const VERCEL_API_URL = 'https://ezy-bite.vercel.app'; // Replace with your actual Vercel URL
let cart = JSON.parse(localStorage.getItem('ezybite_cart')) || [];
let isDark = localStorage.getItem('ezybite_theme') === 'dark';
const DELIVERY_FEE = 0; // Ksh — set to 0, change here to update globally

async function initiateMpesaPayment(orderId, amount, phoneNumber) {
    try {
        const response = await fetch(`${VERCEL_API_URL}/api/stkpush`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                orderId: orderId,
                amount: amount,
                phoneNumber: phoneNumber
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Payment initiation failed:', error);
        throw error;
    }
}

function saveCart() {
    localStorage.setItem('ezybite_cart', JSON.stringify(cart));
    updateCartUI();
}

function toggleTheme() {
    isDark = !isDark;
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('ezybite_theme', isDark ? 'dark' : 'light');
    updateThemeIcons();
}

function initTheme() {
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeIcons();
}

function updateThemeIcons() {
    const icons = ['theme-icon', 'mobile-theme-icon', 'theme-icon-mobile'];
    icons.forEach(id => {
        const icon = document.getElementById(id);
        if (icon) icon.innerText = isDark ? 'light_mode' : 'dark_mode';
    });
    
    // Update theme text in sidebar if present
    const themeText = document.querySelector('.theme-text');
    if (themeText) themeText.innerText = isDark ? 'Light Mode' : 'Dark Mode';
}

function updateCartUI() {
    const cartCountTexts = document.querySelectorAll('.cart-count');
    const totalItems = cart.reduce((acc, item) => acc + item.count, 0);
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.count), 0);
    
    // Update floating card badge
    const floatingCartBadge = document.getElementById('floating-cart-badge');
    if (floatingCartBadge) {
        floatingCartBadge.innerText = totalItems;
        floatingCartBadge.classList.toggle('hidden', totalItems === 0);
    }
    
    const floatingCartTotal = document.getElementById('floating-cart-total');
    if (floatingCartTotal) {
        floatingCartTotal.innerText = `Ksh ${Math.round(subtotal)}`;
    }
    
    const floatingCart = document.getElementById('floating-cart');
    if (floatingCart) {
        floatingCart.classList.toggle('hidden', totalItems === 0);
    }
    
    cartCountTexts.forEach(el => el.innerText = totalItems);
    
    // Update individual card buttons if on menu page
    const cardButtons = document.querySelectorAll('.cart-btn');
    cardButtons.forEach(btn => {
        const onClickAttr = btn.getAttribute('onclick');
        if (onClickAttr && onClickAttr.includes('addToCart')) {
            const match = onClickAttr.match(/'([^']+)'/);
            if (match) {
                const name = match[1];
                const badge = btn.querySelector('.cart-count-badge');
                if (!badge) return; // Skip if badge element is missing
                const item = cart.find(i => i.name === name);
                if (item && item.count > 0) {
                    badge.innerText = item.count;
                    badge.classList.remove('hidden');
                    badge.classList.add('flex');
                } else {
                    badge.classList.add('hidden');
                    badge.classList.remove('flex');
                }
            }
        }
    });

    // Update cart page specific elements
    const cartItemsList = document.getElementById('cart-items');
    if (cartItemsList) {
        if (cart.length === 0) {
            cartItemsList.innerHTML = '<div class="text-center py-12 text-primary/40"><span class="material-symbols-outlined text-6xl mb-4">shopping_basket</span><p class="font-bold">Your basket is empty</p></div>';
        } else {
            cartItemsList.innerHTML = cart.map(item => `
                <div class="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-primary/10 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                    <div class="flex items-center gap-4">
                        <div class="w-16 h-16 bg-primary/5 rounded-xl flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary">restaurant</span>
                        </div>
                        <div>
                            <p class="font-bold text-black dark:text-white">${item.name}</p>
                            <p class="text-primary font-bold">Ksh ${item.price}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-3 bg-primary/5 px-3 py-1.5 rounded-lg">
                            <button onclick="removeFromCart('${item.name}')" class="text-primary font-bold hover:scale-110 transition-transform">-</button>
                            <span class="font-bold w-4 text-center text-black dark:text-white">${item.count}</span>
                            <button onclick="addToCart('${item.name}', ${item.price})" class="text-primary font-bold hover:scale-110 transition-transform">+</button>
                        </div>
                        <button onclick="deleteFromCart('${item.name}')" class="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors">
                            <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        const subtotalEl = document.getElementById('cart-subtotal');
        if (subtotalEl) subtotalEl.innerText = `Ksh ${Math.round(subtotal)}`;
        
        const totalEl = document.getElementById('cart-total');
        if (totalEl) totalEl.innerText = `Ksh ${Math.round(subtotal + DELIVERY_FEE)}`;

        // Enable/disable Place Order button based on cart state only.
        // Auth is handled inside openPlaceOrderModal() — it prompts sign-in if not logged in.
        const placeBtn = document.getElementById('place-order-btn');
        if (placeBtn) {
            placeBtn.disabled = cart.length === 0;
            placeBtn.innerHTML = '<span class="material-symbols-outlined text-base filled-icon">rocket_launch</span> Place Order';
        }
    }
}

function addToCart(name, price) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
        existing.count++;
    } else {
        cart.push({ name, price, count: 1 });
    }
    saveCart();
}

function removeFromCart(name) {
    const item = cart.find(i => i.name === name);
    if (item) {
        item.count--;
        if (item.count <= 0) {
            cart = cart.filter(i => i.name !== name);
        }
    }
    saveCart();
}

function deleteFromCart(name) {
    cart = cart.filter(i => i.name !== name);
    saveCart();
}

function clearCart() {
    showConfirm('Clear your entire basket?', () => {
        cart = [];
        saveCart();
    });
}

// ── Place Order (Pay on Delivery) ────────────────────────────────────────────
function openPlaceOrderModal() {
    if (cart.length === 0) return;
    if (!window.currentUser) {
        if (typeof openModal === 'function') openModal('signin-modal');
        return;
    }
    // Pre-fill saved details
    const nameInput  = document.getElementById('order-name');
    const locInput   = document.getElementById('order-location');
    const phoneInput = document.getElementById('order-phone');
    if (nameInput  && window._savedUserName    && !nameInput.value)  nameInput.value  = window._savedUserName;
    if (locInput   && window._savedUserAddress && !locInput.value)   locInput.value   = window._savedUserAddress;
    if (phoneInput && window._savedUserPhone   && !phoneInput.value) phoneInput.value = window._savedUserPhone;
    const modal = document.getElementById('place-order-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closePlaceOrderModal() {
    const modal = document.getElementById('place-order-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

async function placeOrder() {
    if (cart.length === 0) return;

    if (!window.currentUser) {
        if (typeof openModal === 'function') openModal('signin-modal');
        return;
    }

    const nameInput     = document.getElementById('order-name');
    const locationInput = document.getElementById('order-location');
    const phoneInput    = document.getElementById('order-phone');
    const customerName = nameInput     ? nameInput.value.trim()     : '';
    const location     = locationInput ? locationInput.value.trim() : '';
    const phone        = phoneInput    ? phoneInput.value.trim()    : '';

    if (!customerName) {
        if (nameInput) { nameInput.classList.add('ring-2', 'ring-red-400'); nameInput.focus(); }
        return;
    }
    if (!location) {
        if (locationInput) { locationInput.classList.add('ring-2', 'ring-red-400'); locationInput.focus(); }
        return;
    }
    if (!phone) {
        if (phoneInput) { phoneInput.classList.add('ring-2', 'ring-red-400'); phoneInput.focus(); }
        return;
    }

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.count), 0);
    const total = subtotal + DELIVERY_FEE;
    const orderData = {
        type: cart.map(i => `${i.count}x ${i.name}`).join(', '),
        quantity: cart.reduce((acc, i) => acc + i.count, 0),
        total: Math.round(total),
        items: [...cart],
        paymentStatus: 'unpaid',
        status: 'pending',
        customerName,
        location,
        phone,
    };

    const btn = document.getElementById('place-order-submit-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="animate-spin material-symbols-outlined text-base">sync</span> Placing…';
    }

    try {
        await window.fb_createOrder(orderData);
        cart = [];
        saveCart();
        closePlaceOrderModal();
        if (typeof window.showRatingPopup === 'function') window.showRatingPopup();
        window.location.href = 'orders.html';
    } catch (error) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined text-base filled-icon">rocket_launch</span> Confirm Order';
        }
        showToast('Failed to place order: ' + error.message, 'error');
    }
}

// ── M-Pesa Payment State ─────────────────────────────────────────────────────
let _pendingOrderId = null;
let _unsubscribeOrderListener = null;
let _userOrdersUnsubscribe = null;

function processOrder() {
    if (cart.length === 0) { showToast('Your basket is empty!', 'warning'); return; }

    if (!window.currentUser) {
        if (typeof openModal === 'function') openModal('signin-modal');
        return;
    }

    // Pre-fill phone from saved profile if available
    const phoneInput = document.getElementById('mpesa-phone');
    if (phoneInput && window._savedUserPhone) {
        phoneInput.value = window._savedUserPhone;
    }

    // Show the total in the modal
    const total = cart.reduce((acc, item) => acc + (item.price * item.count), 0) + DELIVERY_FEE;
    const modalTotal = document.getElementById('mpesa-modal-total');
    if (modalTotal) modalTotal.textContent = `Ksh ${Math.round(total)}`;

    // Reset modal to initial state
    _mpesaModalState('form');

    if (typeof openModal === 'function') openModal('mpesa-payment-modal');
}

async function submitMpesaPayment() {
    if (cart.length === 0) return;

    if (!window.currentUser) {
        if (typeof cancelMpesaPayment === 'function') cancelMpesaPayment();
        if (typeof openModal === 'function') openModal('signin-modal');
        return;
    }

    const phoneInput = document.getElementById('mpesa-phone');
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!phone) {
        phoneInput.classList.add('ring-2', 'ring-red-400');
        return;
    }
    phoneInput.classList.remove('ring-2', 'ring-red-400');

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.count), 0);
    const total = subtotal + DELIVERY_FEE;
    const amountKES = Math.max(1, Math.round(total));

    const orderData = {
        type: cart.map(i => `${i.count}x ${i.name}`).join(', '),
        quantity: cart.reduce((acc, i) => acc + i.count, 0),
        total: amountKES,
        items: [...cart],
        paymentStatus: 'pending',
    };

    try {
        // 1 – Create the order in Firestore (pending payment)
        _mpesaModalState('loading', 'Creating your order…');
        _pendingOrderId = await window.fb_createOrder(orderData);

        // 2 – Trigger STK Push
        _mpesaModalState('loading', 'Sending payment request to your phone…');
        const res = await fetch(`${VERCEL_API_URL}/api/stkpush`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amountKES, phoneNumber: phone, orderId: _pendingOrderId }),
        });

        const data = await res.json();
        if (!res.ok) {
            // Extract the most useful error message from the server response
            const msg = data.details?.errorMessage 
                     || data.details?.error_description 
                     || data.hint 
                     || data.error 
                     || 'STK push failed';
            console.error('STK Push API error:', JSON.stringify(data));
            throw new Error(msg);
        }

        // 3 – Wait for M-Pesa callback via Firestore real-time listener
        _mpesaModalState('waiting', 'Check your phone and enter your M-Pesa PIN to confirm payment.');

        // Stop any previous listener
        if (_unsubscribeOrderListener) _unsubscribeOrderListener();

        // Timeout: if no response in 2 minutes show a hint
        const timeoutId = setTimeout(() => {
            const hint = document.getElementById('mpesa-waiting-hint');
            if (hint) hint.textContent = 'Taking long? Make sure you entered your PIN. You can retry if needed.';
        }, 90000);

        _unsubscribeOrderListener = window.fb_listenToOrder(_pendingOrderId, (order) => {
            if (order.paymentStatus === 'paid' || order.status === 'paid') {
                clearTimeout(timeoutId);
                _unsubscribeOrderListener();
                _mpesaModalState('success', `Payment confirmed! Receipt: ${order.paymentDetails?.mpesaReceiptNumber || 'N/A'}`);
                cart = [];
                saveCart();
                // Award Bite Points
                if (window.currentUser && typeof window.fb_awardBitePoints === 'function') {
                    window.fb_awardBitePoints(window.currentUser.uid, _pendingOrderId, amountKES)
                        .then(pts => { if (pts > 0) showToast(`+${pts} Bite Points earned! 🌟`, 'success', 4000); })
                        .catch(() => {});
                }
                setTimeout(() => {
                    if (typeof closeModal === 'function') closeModal('mpesa-payment-modal');
                    if (typeof window.showRatingPopup === 'function') window.showRatingPopup();
                    window.location.href = 'orders.html';
                }, 2500);
            } else if (order.paymentStatus === 'failed' || order.status === 'payment-failed') {
                clearTimeout(timeoutId);
                _unsubscribeOrderListener();
                _mpesaModalState('error', order.paymentError || 'Payment failed or cancelled. Please try again.');
            }
        });

    } catch (error) {
        console.error('Payment error:', error);
        _mpesaModalState('error', error.message || 'Payment initiation failed. Please try again.');
    }
}

/** Switch the M-Pesa modal between states: form | loading | waiting | success | error */
function _mpesaModalState(state, message = '') {
    const ids = ['mpesa-state-form', 'mpesa-state-loading', 'mpesa-state-waiting', 'mpesa-state-success', 'mpesa-state-error'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const active = document.getElementById(`mpesa-state-${state}`);
    if (active) active.classList.remove('hidden');

    const msgEl = document.getElementById(`mpesa-msg-${state}`);
    if (msgEl && message) msgEl.textContent = message;
}

function cancelMpesaPayment() {
    if (_unsubscribeOrderListener) {
        _unsubscribeOrderListener();
        _unsubscribeOrderListener = null;
    }
    if (typeof closeModal === 'function') closeModal('mpesa-payment-modal');
    _mpesaModalState('form');
}

// Legacy handler kept for other callers (e.g. New Order modal)
async function _legacyCreateOrder() {
    const total = cart.reduce((acc, item) => acc + (item.price * item.count), 0);
    const orderData = {
        type: cart.map(i => `${i.count}x ${i.name}`).join(', '),
        quantity: cart.reduce((acc, i) => acc + i.count, 0),
        total: total,
        items: cart,
        isGuest: !window.currentUser
    };
    try {
        if (window.currentUser) {
            await window.fb_createOrder(orderData);
        }
        cart = [];
        saveCart();
        window.location.href = 'orders.html';
    } catch (error) {
        showToast('Failed to place order: ' + error.message, 'error');
    }
}

// Modal Logic
function openModal(id) {
    const el = document.getElementById(id);
    if (!el) { console.warn('openModal: element not found:', id); return; }
    el.classList.remove('hidden');
    el.classList.add('flex');
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('flex');
}
function switchModal(oldId, newId) { closeModal(oldId); openModal(newId); }

function toggleMobileMenu() {
    const sidebar = document.getElementById('mobile-sidebar');
    const panel = document.getElementById('sidebar-panel');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar || !panel || !backdrop) return;

    const isOpen = !panel.classList.contains('-translate-x-full');

    if (!isOpen) {
        // Open: show overlay, slide panel in
        sidebar.style.pointerEvents = 'auto';
        backdrop.classList.replace('bg-black/0', 'bg-black/50');
        backdrop.style.backdropFilter = 'blur(2px)';
        panel.classList.remove('-translate-x-full');
        document.body.style.overflow = 'hidden';
    } else {
        // Close: fade out backdrop, slide panel out
        backdrop.classList.replace('bg-black/50', 'bg-black/0');
        backdrop.style.backdropFilter = '';
        panel.classList.add('-translate-x-full');
        document.body.style.overflow = '';
        setTimeout(() => { sidebar.style.pointerEvents = 'none'; }, 310);
    }
}

function updateDynamicFooter() {
    const greetingEl = document.getElementById('footer-greeting');
    const timeEl = document.getElementById('footer-time');
    const dayEl = document.getElementById('footer-day');
    const dayCountEl = document.getElementById('day-counter');

    if (!greetingEl && !timeEl && !dayEl) return;

    const now = new Date();
    const hours = now.getHours();
    let greeting = "Good evening";
    if (hours < 12) greeting = "Good morning";
    else if (hours < 17) greeting = "Good afternoon";

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (greetingEl) greetingEl.innerText = greeting;
    if (timeEl) timeEl.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (dayEl) dayEl.innerText = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
    
    // Simple "operating days" counter - (Days since project "started" - let's say Feb 1, 2026)
    if (dayCountEl) {
        const start = new Date('2026-02-01');
        const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        dayCountEl.innerText = diff > 0 ? diff : 1;
    }
}

async function handleSaveProfile() {
    if (!window.currentUser) return;
    try {
        const phone = document.getElementById('user-phone').value;
        const address = document.getElementById('user-address').value;
        const displayName = document.getElementById('user-display-name')?.value;
        const submitBtn = document.querySelector('button[type="submit"]') || document.querySelector('button[onclick="handleSaveProfile()"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="animate-spin material-symbols-outlined">sync</span> Saving...';

        // Update Firestore
        await window.fb_updateUserProfile(window.currentUser.uid, {
            phone: phone,
            address: address,
            fullName: displayName
        });

        // Update Firebase Auth Display Name if available
        if (displayName && typeof window.fb_updateDisplayName === 'function') {
            await window.fb_updateDisplayName(displayName);
        }

        showToast('Profile saved!', 'success');
        if (typeof closeModal === 'function') closeModal('settings-modal');
        
        // Refresh local data
        const event = new CustomEvent('auth-changed', { detail: window.currentUser });
        document.dispatchEvent(event);

        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        showToast('Failed to save profile: ' + error.message, 'error');
        console.error(error);
    }
}

async function handleCreateOrder(event) {
    event.preventDefault();
    if (!window.currentUser) {
        openModal('signin-modal');
        return;
    }
    const formData = new FormData(event.target);
    const orderData = Object.fromEntries(formData.entries());
    
    // Price lookup for order total estimate
    const prices = { 'Beef Samosa': 20, 'Ndengu Samosa': 10, 'Potato Samosa': 10, 'Mixed Meat Samosa': 150, 'Samosa Mix Pack': 130, 'Party Pack': 400 };
    const unitPrice = prices[orderData.type] || 20;
    const qty = parseInt(orderData.quantity) || 1;
    orderData.total = (unitPrice * qty) + DELIVERY_FEE;
    orderData.paymentStatus = 'unpaid';

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="animate-spin material-symbols-outlined text-base">sync</span> Placing...';

    try {
        await window.fb_createOrder(orderData);
        closeModal('new-order-modal');
        event.target.reset();
        updateOrdersList(window.currentUser.uid);
    } catch (error) {
        submitBtn.innerHTML = '<span class="material-symbols-outlined text-base font-black text-red-400">error</span> Error — try again';
        setTimeout(() => { submitBtn.innerHTML = originalText; submitBtn.disabled = false; }, 2500);
        return;
    }
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
}

async function updateOrdersList(uid, prefetchedOrders = null) {
    const listEl = document.getElementById('orders-list');
    const historyEl = document.getElementById('user-order-history');
    const orderCountEl = document.getElementById('user-order-count');
    const pendingEl = document.getElementById('pending-orders-list');
    if (!listEl && !historyEl && !orderCountEl && !pendingEl) return;

    try {
        const orders = prefetchedOrders || await window.fb_getUserOrders(uid);
        // Cache for detail modal lookups
        window._userOrdersMap = {};
        orders.forEach(o => { window._userOrdersMap[o.id] = o; });
        if (orderCountEl) orderCountEl.innerText = orders.length;

        // ── Award Bite Points for any newly-paid orders ───────────────────────────
        if (typeof window.fb_awardBitePoints === 'function') {
            for (const o of orders) {
                if ((o.status === 'paid' || o.paymentStatus === 'paid') && !o.pointsAwarded) {
                    window.fb_awardBitePoints(uid, o.id, o.total)
                        .then(pts => { if (pts > 0) showToast(`+${pts} Bite Points earned! 🌟`, 'success', 4000); })
                        .catch(() => {});
                }
            }
        }

        // --- Pending orders panel (profile page) ---
        if (pendingEl) {
            const pending = orders.filter(o =>
                o.status === 'pending' ||
                o.status === 'paid' ||
                o.paymentStatus === 'pending'
            );
            const section = document.getElementById('pending-orders-section');
            if (pending.length === 0) {
                pendingEl.innerHTML = `
                    <div class="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900/50 rounded-2xl border border-primary/5 text-primary/30">
                        <span class="material-symbols-outlined text-2xl">check_circle</span>
                        <p class="text-xs font-bold">No active orders right now</p>
                    </div>`;
            } else {
                pendingEl.innerHTML = pending.map(order => {
                    const isPaid = order.status === 'paid' || order.paymentStatus === 'paid';
                    const isAcceptedP = order.status === 'accepted';
                    const statusLabel = isPaid ? 'Paid — Preparing' : isAcceptedP ? 'Accepted — Awaiting Dispatch' : 'Pending Acceptance';
                    const statusColor = isPaid
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : isAcceptedP
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
                    const icon = isPaid ? 'payments' : isAcceptedP ? 'local_shipping' : 'hourglass_top';
                    const receipt = order.paymentDetails?.mpesaReceiptNumber;
                    return `
                    <div class="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900/50 rounded-2xl border border-primary/5 hover:border-primary/20 transition-all">
                        <div class="w-11 h-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span class="material-symbols-outlined filled-icon text-xl">${icon}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-black dark:text-white truncate">${order.type}</p>
                            <p class="text-[10px] font-bold text-primary/40 uppercase tracking-wide">Qty: ${order.quantity}${receipt ? ' • ' + receipt : ''}</p>
                        </div>
                        <span class="shrink-0 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${statusColor}">${statusLabel}</span>
                    </div>`;
                }).join('');
            }
        }
        const orderHtml = orders.length === 0 
            ? '<div class="col-span-full py-16 text-center opacity-30"><span class="material-symbols-outlined text-5xl block mb-3">folder_off</span><p class="text-base font-bold uppercase tracking-widest">No orders yet</p><p class="text-xs mt-1">Tap the + button to place your first order</p></div>'
            : orders.map(order => {
                const isUnpaid = order.paymentStatus === 'unpaid' || (!order.paymentStatus && order.status === 'pending');
                const isPaid = order.status === 'paid' || order.paymentStatus === 'paid';
                const isDelivered = order.status === 'delivered';
                const isAccepted = order.status === 'accepted';
                const isRejected = order.status === 'rejected';
                const icon = isDelivered ? 'task_alt' : isPaid ? 'payments' : isAccepted ? 'local_shipping' : isRejected ? 'do_not_disturb_on' : isUnpaid ? 'hourglass_top' : 'receipt_long';
                const iconColor = isRejected ? 'text-red-400' : isPaid || isDelivered ? 'text-green-500' : isAccepted ? 'text-blue-400' : isUnpaid ? 'text-orange-500' : 'text-primary';
                const progressWidth = isDelivered ? '100%' : isPaid ? '60%' : isAccepted ? '45%' : isRejected ? '0%' : isUnpaid ? '10%' : '25%';
                const badgeBg = isPaid || isDelivered ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                              : isAccepted ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : isRejected ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                              : isUnpaid ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'
                              : 'bg-primary/10 text-primary';
                const statusLabel = isDelivered ? 'Delivered ✓' : isPaid ? 'Paid' : isAccepted ? 'Accepted — Awaiting Dispatch' : isRejected ? 'Rejected' : isUnpaid ? 'Pending Acceptance' : order.status;
                const receipt = order.paymentDetails?.mpesaReceiptNumber;
                const total = Math.round(order.total || 0);
                const payBtn = isUnpaid ? `
                    <p class="text-[9px] font-bold text-orange-500/70 flex items-center gap-1 mt-1 mb-1">
                        <span class="material-symbols-outlined text-xs filled-icon">delivery_dining</span> Pay on delivery or via M-Pesa
                    </p>
                    <button onclick="payOrderDirectly('${order.id}', ${total})"
                            class="mt-1 w-full bg-primary text-white py-2.5 rounded-xl font-black text-xs hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-1.5 animate-pulse hover:animate-none">
                        <span class="material-symbols-outlined text-sm filled-icon">payments</span> Pay Now — Ksh ${total}
                    </button>`
                    : '';
                // Cancel button: only for unpaid orders within 5 minutes of placing
                const createdMs = order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now();
                const canCancel = isUnpaid && (Date.now() - createdMs) < 5 * 60 * 1000;
                const cancelBtn = canCancel ? `
                    <button onclick="cancelUserOrder('${order.id}')"
                            class="mt-1 w-full border border-red-400/20 text-red-400 hover:bg-red-500 hover:text-white py-2 rounded-xl font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5">
                        <span class="material-symbols-outlined text-sm">cancel</span> Cancel Order
                    </button>` : '';
                // Delete button: only after 24 hours
                const canDelete = (Date.now() - createdMs) >= 24 * 60 * 60 * 1000;
                const deleteBtn = canDelete ? `
                    <button onclick="deleteUserOrder('${order.id}')"
                            class="mt-1 w-full border border-red-300/20 text-red-400/50 hover:bg-red-500/80 hover:text-white py-2 rounded-xl font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5">
                        <span class="material-symbols-outlined text-sm">delete</span> Delete Record
                    </button>` : '';
                return `
                <div class="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-primary/10 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <div class="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center ${iconColor} group-hover:scale-110 transition-transform shrink-0">
                                <span class="material-symbols-outlined text-lg font-black">${icon}</span>
                            </div>
                            <span class="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full ${badgeBg}">${statusLabel}</span>
                        </div>
                        <button onclick="openOrderDetailModal('${order.id}')"
                                title="View details"
                                class="w-8 h-8 flex items-center justify-center rounded-xl bg-primary/5 hover:bg-primary/10 text-primary/50 hover:text-primary transition-colors">
                            <span class="material-symbols-outlined text-base">visibility</span>
                        </button>
                    </div>
                    <h3 class="text-sm font-black dark:text-white mb-0.5 truncate">${order.type}</h3>
                    <p class="text-xs font-bold text-primary/60 mb-0.5">Qty: ${order.quantity} • Ksh ${total} • ${new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</p>
                    ${receipt ? `<p class="text-[10px] font-bold text-green-600 mb-1.5">Receipt: ${receipt}</p>` : `<div class="mb-1.5"></div>`}
                    <div class="flex items-center gap-2">
                        <div class="flex-1 h-1.5 bg-primary/5 rounded-full overflow-hidden">
                            <div class="h-full ${isRejected ? 'bg-red-400' : isUnpaid ? 'bg-orange-400' : isAccepted ? 'bg-blue-400' : 'bg-primary'} rounded-full transition-all duration-1000" style="width: ${progressWidth}"></div>
                        </div>
                        <span class="text-[9px] font-black uppercase text-primary/40">${statusLabel}</span>
                    </div>
                    ${payBtn}
                    ${cancelBtn}
                    ${deleteBtn}
                </div>`;
            }).join('');

        const historyHtml = orders.length === 0
            ? '<div class="text-center py-10 opacity-40"><span class="material-symbols-outlined text-4xl mb-2">event_busy</span><p class="text-sm font-bold">No orders found yet</p></div>'
            : orders.map(order => `
                <div class="p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-primary/5 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span class="material-symbols-outlined text-xl">shopping_bag</span>
                        </div>
                        <div>
                            <p class="text-sm font-black dark:text-white">${order.type}</p>
                            <p class="text-[10px] font-bold text-primary/40 uppercase tracking-widest">${new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <p class="text-sm font-black text-primary">Qty: ${order.quantity}</p>
                </div>
            `).join('');

        if (listEl) listEl.innerHTML = orderHtml;
        if (historyEl) historyEl.innerHTML = historyHtml;
    } catch (error) {
        console.error("Error fetching orders:", error);
    }
}

// ── User Order Detail Modal ────────────────────────────────────────────────
function openOrderDetailModal(orderId) {
    const order = (window._userOrdersMap || {})[orderId];
    if (!order) return;

    const isUnpaid = order.paymentStatus === 'unpaid' || (!order.paymentStatus && order.status === 'pending');
    const isPaid   = order.status === 'paid' || order.paymentStatus === 'paid';
    const isDeliveredD = order.status === 'delivered';
    const isAccepted = order.status === 'accepted';
    const isRejected = order.status === 'rejected';
    const receipt  = order.paymentDetails?.mpesaReceiptNumber;
    const total    = Math.round(order.total || 0);
    const dateStr  = order.createdAt?.seconds
        ? new Date(order.createdAt.seconds * 1000).toLocaleString()
        : '—';
    const createdMsD = order.createdAt?.seconds ? order.createdAt.seconds * 1000 : 0;
    const canDeleteD = createdMsD > 0 && (Date.now() - createdMsD) >= 24 * 60 * 60 * 1000;
    const badgeBg  = isPaid || isDeliveredD ? 'bg-green-100 text-green-700' : isAccepted ? 'bg-blue-100 text-blue-700' : isRejected ? 'bg-red-100 text-red-600' : isUnpaid ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary';
    const statusLabel = isDeliveredD ? 'Delivered ✓' : isPaid ? 'Paid ✓' : isAccepted ? 'Accepted — Awaiting Dispatch' : isRejected ? 'Rejected' : isUnpaid ? 'Pending Acceptance' : (order.status || '—');

    const itemsList = (order.items || []).map(i =>
        `<div class="flex justify-between text-xs"><span class="font-bold text-primary/70">${i.name}</span><span class="font-black">×${i.count}</span></div>`
    ).join('') || `<p class="text-xs text-primary/40">${order.type || '—'}</p>`;

    const paySection = isUnpaid ? `
        <button onclick="closeOrderDetailModal(); payOrderDirectly('${order.id}', ${total})"
                class="w-full bg-primary text-white py-2.5 rounded-xl font-black text-sm hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 mt-1">
            <span class="material-symbols-outlined text-base filled-icon">payments</span>
            Pay via M-Pesa — Ksh ${total}
        </button>` : '';

    const bodyEl = document.getElementById('order-detail-body');
    if (bodyEl) bodyEl.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h3 class="font-black text-base dark:text-white truncate pr-2">${order.type || 'Order'}</h3>
            <span class="shrink-0 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full ${badgeBg}">${statusLabel}</span>
        </div>
        <div class="space-y-1 mb-4 bg-primary/5 dark:bg-zinc-800 rounded-xl p-3">
            ${itemsList}
        </div>
        <div class="space-y-2 text-xs">
            <div class="flex justify-between"><span class="font-bold text-primary/50">Quantity</span><span class="font-black dark:text-white">${order.quantity || 1}</span></div>
            <div class="flex justify-between"><span class="font-bold text-primary/50">Total</span><span class="font-black text-primary">Ksh ${total}</span></div>
            <div class="flex justify-between"><span class="font-bold text-primary/50">Location</span><span class="font-black dark:text-white text-right max-w-[60%]">${order.location || '—'}</span></div>
            <div class="flex justify-between"><span class="font-bold text-primary/50">Phone</span><span class="font-black dark:text-white">${order.phone || '—'}</span></div>
            ${receipt ? `<div class="flex justify-between"><span class="font-bold text-primary/50">Receipt</span><span class="font-black text-green-600">${receipt}</span></div>` : ''}
            ${order.notes ? `<div class="flex justify-between"><span class="font-bold text-primary/50">Notes</span><span class="font-black dark:text-white text-right max-w-[60%]">${order.notes}</span></div>` : ''}
            <div class="flex justify-between"><span class="font-bold text-primary/50">Placed</span><span class="font-black dark:text-white text-right">${dateStr}</span></div>
        </div>
        ${paySection}
        ${canDeleteD ? `<button onclick="closeOrderDetailModal(); deleteUserOrder('${order.id}')" class="w-full mt-2 border border-red-300/20 text-red-400/50 hover:bg-red-500/80 hover:text-white py-2 rounded-xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2"><span class="material-symbols-outlined text-base">delete</span> Delete Record</button>` : ''}
    `;

    const modal = document.getElementById('order-detail-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closeOrderDetailModal() {
    const modal = document.getElementById('order-detail-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

// ── Cancel Order (within 5-minute window) ────────────────────────────────────
async function cancelUserOrder(orderId) {
    if (!window.currentUser) return;
    showConfirm(
        'Cancel this order? This cannot be undone.',
        async () => {
            try {
                await window.fb_cancelOrder(orderId, window.currentUser.uid);
                showToast('Order cancelled successfully.', 'success');
                updateOrdersList(window.currentUser.uid);
            } catch (err) {
                showToast(err.message || 'Could not cancel order.', 'error');
            }
        }
    );
}

// ── Delete Order (allowed after 24 hours) ─────────────────────────────────────
async function deleteUserOrder(orderId) {
    if (!window.currentUser) return;
    showConfirm(
        'Permanently delete this order record? This cannot be undone.',
        async () => {
            try {
                await window.fb_deleteUserOrder(orderId, window.currentUser.uid);
                showToast('Order deleted.', 'success');
            } catch (err) {
                showToast(err.message || 'Could not delete order.', 'error');
            }
        }
    );
}

// ── Live Orders Listener ───────────────────────────────────────────────────────
function watchUserOrders(uid) {
    if (_userOrdersUnsubscribe) { _userOrdersUnsubscribe(); _userOrdersUnsubscribe = null; }
    if (typeof window.fb_listenUserOrders === 'function') {
        _userOrdersUnsubscribe = window.fb_listenUserOrders(uid, (orders) => {
            updateOrdersList(uid, orders);
        });
    } else {
        updateOrdersList(uid);
    }
}

function handleProfileClick(event) {
    if (!window.currentUser) {
        event.preventDefault();
        openModal('signin-modal');
    }
}

// Listen for Auth changes from firebase-service.js
document.addEventListener('auth-changed', async (e) => {
    const user = e.detail;
    const authStatusEls = document.querySelectorAll('.auth-status-text');
    
    // Profile Elements
    const greetingName = document.getElementById('user-display-name-greeting');
    const userProfileName = document.getElementById('user-display-name');
    const userProfileEmailReadonly = document.getElementById('user-email-readonly');
    const userPointsEl = document.getElementById('user-points');
    
    if (user) {
        authStatusEls.forEach(el => el.innerText = 'Sign Out');
        
        // Populate Dashboard/Settings
        if (greetingName) greetingName.innerText = user.displayName?.split(' ')[0] || 'User';
        if (userProfileName) userProfileName.value = user.displayName || '';
        if (userProfileEmailReadonly) userProfileEmailReadonly.value = user.email;
        
        // Load extra data from Firestore
        const userData = await window.fb_getUserData(user.uid);
        if (userData) {
            const phoneEl = document.getElementById('user-phone');
            const addressEl = document.getElementById('user-address');

            if (phoneEl) phoneEl.value = userData.phone || '';
            if (addressEl) addressEl.value = userData.address || '';
            if (userPointsEl) userPointsEl.innerText = userData.bitePoints || userData.points || '0';
            if (userProfileName && !userProfileName.value) userProfileName.value = userData.fullName || '';

            // Cache phone for M-Pesa modal pre-fill
            window._savedUserPhone = userData.phone || '';
            window._savedUserAddress = userData.address || '';
        }

        watchUserOrders(user.uid);
        renderCart(); // refresh Place Order button text/state

        // Pre-fill M-Pesa phone from saved profile
        const mpesaPhone = document.getElementById('mpesa-phone');
        const payPhone = document.getElementById('order-pay-phone');
        if (mpesaPhone && window._savedUserPhone) mpesaPhone.value = window._savedUserPhone;
        if (payPhone && window._savedUserPhone) payPhone.value = window._savedUserPhone;

        // Pre-fill cart delivery details
        const cartPhone    = document.getElementById('order-phone');
        const cartLocation = document.getElementById('order-location');
        if (cartPhone && window._savedUserPhone && !cartPhone.value) cartPhone.value = window._savedUserPhone;
        if (cartLocation && window._savedUserAddress && !cartLocation.value) cartLocation.value = window._savedUserAddress;

        // Pre-fill new-order modal fields
        const newOrderPhone    = document.getElementById('new-order-phone');
        const newOrderLocation = document.getElementById('new-order-location');
        if (newOrderPhone && window._savedUserPhone && !newOrderPhone.value) newOrderPhone.value = window._savedUserPhone;
        if (newOrderLocation && window._savedUserAddress && !newOrderLocation.value) newOrderLocation.value = window._savedUserAddress;
    } else {
        if (window.location.pathname.includes('profile.html')) window.location.href = 'index.html';
        if (window.location.pathname.includes('orders.html')) {
            const listEl = document.getElementById('orders-list');
            if (listEl) listEl.innerHTML = '<div class="col-span-full py-16 text-center opacity-40"><span class="material-symbols-outlined text-5xl block mb-3">lock</span><p class="text-base font-bold">Sign in to view your orders</p></div>';
        }
        if (_userOrdersUnsubscribe) { _userOrdersUnsubscribe(); _userOrdersUnsubscribe = null; }
        authStatusEls.forEach(el => el.innerText = 'Sign In');
        if (userPointsEl) userPointsEl.innerText = '0';
        renderCart(); // refresh Place Order button to "Login to Order"
    }
});

// ── Pay Order Directly (from orders page) ────────────────────────────────────
let _payOrderId = null;
let _payOrderTotal = 0;
let _unsubscribePayListener = null;

function payOrderDirectly(orderId, amount) {
    _payOrderId = orderId;
    _payOrderTotal = amount;
    const totalEl = document.getElementById('order-pay-total');
    if (totalEl) totalEl.value = amount || '';

    // Pre-fill phone if available
    const payPhone = document.getElementById('order-pay-phone');
    if (payPhone && window._savedUserPhone && !payPhone.value) {
        payPhone.value = window._savedUserPhone;
    }

    _payModalState('form');
    const modal = document.getElementById('order-pay-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closeOrderPayModal() {
    if (_unsubscribePayListener) { _unsubscribePayListener(); _unsubscribePayListener = null; }
    const modal = document.getElementById('order-pay-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    _payModalState('form');
}

function _payModalState(state, message = '') {
    ['form', 'loading', 'waiting', 'success', 'error'].forEach(s => {
        const el = document.getElementById(`pay-state-${s}`);
        if (el) el.classList.add('hidden');
    });
    const active = document.getElementById(`pay-state-${state}`);
    if (active) active.classList.remove('hidden');
    const msgEl = document.getElementById(`pay-msg-${state}`);
    if (msgEl && message) msgEl.textContent = message;
}

async function submitOrderPayment() {
    if (!_payOrderId) return;
    const phoneInput = document.getElementById('order-pay-phone');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    if (!phone) { if (phoneInput) phoneInput.classList.add('ring-2', 'ring-red-400'); return; }
    phoneInput.classList.remove('ring-2', 'ring-red-400');

    const amountKES = Math.max(1, Math.round(parseFloat(document.getElementById('order-pay-total')?.value || _payOrderTotal) || _payOrderTotal));

    try {
        _payModalState('loading', 'Sending payment request to your phone…');
        const res = await fetch(`${VERCEL_API_URL}/api/stkpush`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amountKES, phoneNumber: phone, orderId: _payOrderId }),
        });
        const data = await res.json();
        if (!res.ok) {
            const msg = data.details?.errorMessage || data.details?.error_description || data.hint || data.error || 'STK push failed';
            throw new Error(msg);
        }

        _payModalState('waiting', 'Check your phone and enter your M-Pesa PIN.');

        if (_unsubscribePayListener) _unsubscribePayListener();
        _unsubscribePayListener = window.fb_listenToOrder(_payOrderId, (order) => {
            if (order.paymentStatus === 'paid' || order.status === 'paid') {
                if (_unsubscribePayListener) _unsubscribePayListener();
                _payModalState('success', `Payment confirmed! Receipt: ${order.paymentDetails?.mpesaReceiptNumber || 'N/A'}`);
                // Award Bite Points
                if (window.currentUser && typeof window.fb_awardBitePoints === 'function') {
                    window.fb_awardBitePoints(window.currentUser.uid, _payOrderId, amountKES)
                        .then(pts => { if (pts > 0) showToast(`+${pts} Bite Points earned! 🌟`, 'success', 4000); })
                        .catch(() => {});
                }
                setTimeout(() => {
                    closeOrderPayModal();
                    if (window.currentUser) updateOrdersList(window.currentUser.uid);
                }, 2500);
            } else if (order.paymentStatus === 'failed' || order.status === 'payment-failed') {
                if (_unsubscribePayListener) _unsubscribePayListener();
                _payModalState('error', order.paymentError || 'Payment failed or cancelled. Please try again.');
            }
        });
    } catch (error) {
        _payModalState('error', error.message || 'Payment initiation failed. Please try again.');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateCartUI();
    updateDynamicFooter();
    setInterval(updateDynamicFooter, 60000); // Update every minute
});
