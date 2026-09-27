/**
 * EzyBite UI Components
 * Handles dynamic injection of Header, Footer, and Modals to reduce code duplication.
 */

// Inject thin themed scrollbar styles globally
(function injectScrollbarStyles() {
    const s = document.createElement('style');
    s.textContent = `
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ec4913; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: #c73d0e; }
        * { scrollbar-width: thin; scrollbar-color: #ec4913 transparent; }
    `;
    document.head.appendChild(s);
})();

// Inject Pacifico font for juicy brand wordmark
(function injectPacificoFont() {
    if (!document.getElementById('pacifico-font')) {
        const link = document.createElement('link');
        link.id = 'pacifico-font';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap';
        document.head.appendChild(link);
        const s = document.createElement('style');
        s.textContent = `
            .ezybite-wordmark {
                font-family: 'Pacifico', cursive;
                letter-spacing: -0.5px;
                line-height: 1;
                display: inline-flex;
                align-items: baseline;
                gap: 0;
            }
            .ezybite-ezy {
                color: #1c1917;
                transition: color 0.2s;
            }
            .dark .ezybite-ezy {
                color: #ffffff;
                text-shadow: 0 1px 8px rgba(255,255,255,0.15);
            }
            .ezybite-bite {
                color: #ec4913;
                text-shadow: 0 1px 6px rgba(236,73,19,0.35);
                transition: color 0.2s;
            }
            .ezybite-wordmark:hover .ezybite-bite {
                text-shadow: 0 2px 12px rgba(236,73,19,0.6);
            }
        `;
        document.head.appendChild(s);
    }
})();

// ── Toast Notification System ──────────────────────────────────────────────
window.showToast = function(message, type = 'success', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] flex flex-col-reverse items-center gap-2 pointer-events-none';
        document.body.appendChild(container);
    }
    const icons  = { success: 'check_circle', error: 'cancel', info: 'info', warning: 'warning' };
    const iclr   = { success: 'text-green-400', error: 'text-red-400', info: 'text-primary', warning: 'text-yellow-400' };
    const border = { success: 'border-green-500/25', error: 'border-red-500/25', info: 'border-primary/25', warning: 'border-yellow-500/25' };
    const toast  = document.createElement('div');
    toast.style.cssText = 'opacity:0; transform:translateY(10px); transition:all 0.25s ease;';
    toast.className = `pointer-events-none flex items-center gap-3 px-4 py-3 bg-zinc-900 rounded-2xl border ${border[type]||border.info} shadow-2xl text-sm font-bold text-white whitespace-nowrap`;
    toast.innerHTML = `<span class="material-symbols-outlined text-base filled-icon shrink-0 ${iclr[type]||iclr.info}">${icons[type]||'info'}</span><span class="max-w-xs text-left">${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    setTimeout(() => {
        toast.style.opacity = '0'; toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

// ── Updates Nudge (menu page only, once per day) ──────────────────────────
window.showUpdatesNudge = function(linkPrefix) {
    const today = new Date().toDateString();
    if (localStorage.getItem('ezybite_updates_nudge_date') === today) return;

    const nudge = document.createElement('div');
    nudge.id = 'updates-nudge';
    nudge.style.cssText = `
        position: fixed; inset: 0; z-index: 9000;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.65);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        opacity: 0; transition: opacity 0.35s ease;
        padding: 20px; font-family: 'Be Vietnam Pro', sans-serif;
    `;
    nudge.innerHTML = `
        <div id="updates-nudge-card" style="
            background: #18120f;
            border: 1.5px solid rgba(236,73,19,0.5);
            border-radius: 24px;
            padding: 36px 32px 28px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px rgba(236,73,19,0.12);
            text-align: center;
            transform: scale(0.88);
            transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
        ">
            <!-- Icon -->
            <div style="
                width:72px; height:72px; border-radius:50%;
                background: rgba(236,73,19,0.12);
                border: 2px solid rgba(236,73,19,0.3);
                display:flex; align-items:center; justify-content:center;
                margin: 0 auto 20px;
                box-shadow: 0 0 24px rgba(236,73,19,0.2);
            ">
                <span class="material-symbols-outlined filled-icon"
                      style="color:#ec4913; font-size:36px;">notifications_active</span>
            </div>

            <!-- Title -->
            <h2 style="color:#fff; font-weight:900; font-size:22px; margin:0 0 10px; line-height:1.2;">
                Check Updates First!
            </h2>

            <!-- Body -->
            <p style="color:rgba(255,255,255,0.55); font-size:14px; font-weight:600; margin:0 0 28px; line-height:1.6;">
                We post daily updates on orders, offers and changes.<br>
                Stay in the loop before you order.
            </p>

            <!-- Buttons -->
            <div style="display:flex; flex-direction:column; gap:10px;">
                <a href="${linkPrefix}updates.html"
                   onclick="localStorage.setItem('ezybite_updates_nudge_date','${today}'); document.getElementById('updates-nudge').remove();"
                   style="
                       display:block; width:100%; padding:14px 20px;
                       background:#ec4913; color:#fff;
                       border-radius:14px; font-weight:900; font-size:15px;
                       text-decoration:none; text-align:center;
                       box-shadow: 0 8px 24px rgba(236,73,19,0.4);
                       transition: background 0.15s;
                   "
                   onmouseenter="this.style.background='#d63d0f'"
                   onmouseleave="this.style.background='#ec4913'">
                    View Updates
                </a>
                <button onclick="localStorage.setItem('ezybite_updates_nudge_date','${today}'); window._dismissNudge();"
                        style="
                            width:100%; padding:13px 20px;
                            background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.5);
                            border:1px solid rgba(255,255,255,0.08); border-radius:14px;
                            font-weight:800; font-size:14px; cursor:pointer;
                            font-family:'Be Vietnam Pro',sans-serif;
                            transition: background 0.15s, color 0.15s;
                        "
                        onmouseenter="this.style.background='rgba(255,255,255,0.1)'; this.style.color='rgba(255,255,255,0.8)'"
                        onmouseleave="this.style.background='rgba(255,255,255,0.06)'; this.style.color='rgba(255,255,255,0.5)'">
                    OK, Got it
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(nudge);

    window._dismissNudge = function() {
        const el = document.getElementById('updates-nudge');
        if (!el) return;
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 350);
    };

    // Animate in
    setTimeout(() => {
        nudge.style.opacity = '1';
        const card = document.getElementById('updates-nudge-card');
        if (card) card.style.transform = 'scale(1)';
    }, 900);

    // Auto-dismiss after 20s
    setTimeout(() => window._dismissNudge && window._dismissNudge(), 20000);
};

// ── Post-Payment Rating Popup ──────────────────────────────────────────────
/**
 * Show a minimalistic star-rating popup after a successful order/payment.
 * The user can pick 1-5 stars (opens reviews page with pre-fill) or dismiss.
 * Only shown once per session.
 */
window.showRatingPopup = function() {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem('rating_popup_shown')) return;
    sessionStorage.setItem('rating_popup_shown', '1');

    const popup = document.createElement('div');
    popup.id = 'rating-popup';
    popup.style.cssText = `
        position: fixed; bottom: 24px; right: 20px;
        z-index: 9000; opacity: 0; transform: translateY(16px) scale(0.95);
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
    `;
    popup.innerHTML = `
        <div style="background: linear-gradient(135deg, #1c1917 0%, #292524 100%);
                    border: 1.5px solid rgba(236,73,19,0.4); border-radius: 18px;
                    padding: 14px 16px 12px;
                    box-shadow: 0 0 0 4px rgba(236,73,19,0.08), 0 16px 48px rgba(0,0,0,0.55);
                    width: 220px; font-family: 'Be Vietnam Pro', sans-serif; text-align: center;">
            <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:6px;">
                <span class="material-symbols-outlined filled-icon" style="color:#ec4913; font-size:16px;">rate_review</span>
                <p style="color: rgba(255,255,255,0.9); font-weight: 800; font-size: 11px; margin:0;">
                    How was your order?
                </p>
            </div>
            <p style="color: rgba(255,255,255,0.35); font-size: 9px; font-weight: 600; margin: 0 0 10px; letter-spacing:0.03em;">
                Tap a star to review
            </p>
            <div id="_rp_stars" style="display: flex; gap: 4px; justify-content: center; margin-bottom: 10px;">
                ${[1,2,3,4,5].map(n => `
                <span data-v="${n}" onclick="window._rpRate(${n})"
                      onmouseenter="window._rpHover(${n})" onmouseleave="window._rpHover(0)"
                      class="material-symbols-outlined"
                      style="font-size: 26px; cursor: pointer; transition: transform 0.1s, color 0.1s;
                             color: rgba(255,255,255,0.15); font-variation-settings: 'FILL' 0;">star</span>
                `).join('')}
            </div>
            <button onclick="window._rpDismiss()"
                    style="color: rgba(255,255,255,0.2); font-size: 9px; font-weight: 700;
                           background: none; border: none; cursor: pointer; padding: 2px 8px;
                           letter-spacing: 0.1em; text-transform: uppercase; transition: color 0.15s;"
                    onmouseenter="this.style.color='rgba(255,255,255,0.5)'"
                    onmouseleave="this.style.color='rgba(255,255,255,0.2)'">
                Later
            </button>
        </div>
    `;
    document.body.appendChild(popup);

    // Animate in
    requestAnimationFrame(() => {
        popup.style.opacity = '1';
        popup.style.transform = 'translateY(0) scale(1)';
        popup.style.pointerEvents = 'auto';
    });

    window._rpHover = function(val) {
        document.querySelectorAll('#_rp_stars span').forEach(s => {
            const sv = parseInt(s.dataset.v);
            if (val > 0 && sv <= val) {
                s.style.color = '#fbbf24';
                s.style.fontVariationSettings = "'FILL' 1";
                s.style.transform = sv === val ? 'scale(1.25)' : 'scale(1.05)';
            } else {
                s.style.color = 'rgba(255,255,255,0.15)';
                s.style.fontVariationSettings = "'FILL' 0";
                s.style.transform = 'scale(1)';
            }
        });
    };

    window._rpRate = function(val) {
        // Store pending
        localStorage.setItem('ezybite_pending_rating', val);
        // Dismiss popup
        window._rpDismiss();
        // Navigate to reviews page
        const isInPages = window.location.pathname.includes('/pages/');
        const base = isInPages ? '' : 'pages/';
        window.location.href = base + 'reviews.html';
    };

    window._rpDismiss = function() {
        const el = document.getElementById('rating-popup');
        if (!el) return;
        el.style.opacity = '0';
        el.style.transform = 'translateY(12px) scale(0.95)';
        el.style.pointerEvents = 'none';
        setTimeout(() => el.remove(), 400);
    };

    // Auto-dismiss after 8 seconds
    setTimeout(() => window._rpDismiss && window._rpDismiss(), 8000);
};

window.showConfirm = function(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm';
    overlay.innerHTML = `
        <div class="bg-white dark:bg-zinc-900 w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl border border-primary/10 animate-in zoom-in-95 duration-200">
            <div class="p-6 text-center">
                <div class="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span class="material-symbols-outlined text-red-500 text-2xl filled-icon">warning</span>
                </div>
                <p class="font-bold text-sm dark:text-white mb-5 leading-relaxed">${message}</p>
                <div class="flex gap-3">
                    <button id="_conf-cancel" class="flex-1 py-2.5 rounded-xl text-sm font-black border border-primary/10 hover:bg-primary/5 transition-all dark:text-white dark:border-white/10">Cancel</button>
                    <button id="_conf-ok" class="flex-1 py-2.5 rounded-xl text-sm font-black bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all">Confirm</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#_conf-ok').onclick    = () => { close(); if (onConfirm) onConfirm(); };
    overlay.querySelector('#_conf-cancel').onclick = () => { close(); if (onCancel) onCancel(); };
    overlay.onclick = e => { if (e.target === overlay) { close(); if (onCancel) onCancel(); } };
};

const UI = {
    getHeader: (basePath, linkPrefix) => {
        const isMenuPage = window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
        return `
        <div class="h-[52px]"></div>
        <header class="fixed top-0 left-0 right-0 w-full z-[70] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-primary/10 px-3 lg:px-8 py-1.5 transition-all shadow-sm">
            <div class="max-w-[1440px] mx-auto flex items-center justify-between">
                
                <!-- Logo Section (Left) -->
                <div class="flex items-center gap-4">
                    <a href="${linkPrefix}index.html" class="flex-shrink-0 flex items-center gap-2 md:gap-2.5 animate-in fade-in slide-in-from-left duration-500 group">
                        <img src="${basePath}assets/images/logo.png" alt="EzyBite Logo" class="h-9 w-9 md:h-11 md:w-11 rounded-full object-cover border-2 border-primary/10 group-hover:border-primary transition-all shadow group-hover:shadow-primary/20 shrink-0">
                        <span class="ezybite-wordmark text-[1.35rem] md:text-[1.65rem]">
                            <span class="ezybite-ezy">Ezy</span><span class="ezybite-bite">Bite</span>
                        </span>
                    </a>
                </div>

                <!-- Centered Navigation (Desktop) -->
                <nav class="hidden lg:flex flex-1 items-center justify-center gap-8 text-[11px] font-black text-primary/80 uppercase tracking-[0.2em]">
                    <a class="hover:text-primary hover:scale-105 transition-all" href="${linkPrefix}index.html">Menu</a>
                    <a class="hover:text-primary transition-colors hover:scale-105" href="${linkPrefix}deals.html">Deals</a>
                    <a class="hover:text-primary transition-colors flex items-center gap-1.5 hover:scale-110 relative group" href="${linkPrefix}cart.html">
                        <span class="material-symbols-outlined text-2xl">shopping_cart</span>
                        <span class="cart-count absolute -top-1.5 -right-2.5 bg-primary text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center shadow-lg font-black animate-in zoom-in border border-white dark:border-zinc-900">0</span>
                    </a>
                    <a href="${linkPrefix}orders.html" class="auth-required hover:text-primary transition-all relative group" id="nav-orders">
                        <span>Orders</span>
                    </a>
                    <a href="${linkPrefix}satisfaction.html" class="auth-required hover:text-primary transition-all flex items-center gap-1.5 group" id="nav-biteclub">
                        <span class="material-symbols-outlined text-base filled-icon text-primary/60 group-hover:text-primary transition-colors">stars</span>
                        <span>Bite Club</span>
                    </a>
                    <a class="hover:text-primary transition-colors hover:scale-105 flex items-center gap-1" href="${linkPrefix}reviews.html">
                        <span class="material-symbols-outlined text-base filled-icon text-primary/60 group-hover:text-primary transition-colors">star</span>
                        <span>Reviews</span>
                    </a>
                    <a class="hover:text-primary transition-colors hover:scale-105" href="${linkPrefix}about.html">About</a>
                </nav>

                <!-- Right Actions Area -->
                <div class="flex items-center gap-1 md:gap-4">


                    <!-- Desktop Actions -->
                    <!-- Updates / Notifications Bell -->
                    <a href="${linkPrefix}updates.html"
                       onclick="window._clearUpdatesBadge && window._clearUpdatesBadge()"
                       class="hidden lg:flex relative p-2.5 hover:bg-primary/10 rounded-full transition-all active:scale-90 text-primary" title="Updates">
                        <span class="material-symbols-outlined filled-icon">notifications</span>
                        <span class="updates-badge hidden absolute -top-0.5 -right-0.5 bg-primary text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center font-black shadow border border-white dark:border-zinc-900 px-0.5 leading-none"></span>
                    </a>

                    <button onclick="toggleTheme()" class="hidden lg:flex p-2.5 hover:bg-primary/10 rounded-full transition-all active:scale-90 group text-primary" title="Toggle Theme">
                        <span id="theme-icon" class="material-symbols-outlined group-hover:rotate-45 transition-transform duration-500">dark_mode</span>
                    </button>
                    
                    <a href="${linkPrefix}profile.html" class="auth-required hidden lg:flex items-center gap-2 p-1 bg-primary/10 rounded-full transition-all border border-primary/20 group hover:scale-105" id="nav-profile">
                        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white overflow-hidden shadow-lg">
                            <span class="material-symbols-outlined text-xl filled-icon">person</span>
                        </div>
                    </a>

                    <!-- Mobile-Only Controls (Theme + Hamburger) -->
                    <div class="lg:hidden flex items-center gap-1">
                        <button onclick="toggleTheme()" class="w-9 h-9 flex items-center justify-center text-primary hover:bg-primary/8 rounded-full transition-all active:scale-90">
                            <span id="theme-icon-mobile" class="material-symbols-outlined text-xl">dark_mode</span>
                        </button>
                        <button onclick="toggleMobileMenu()" class="w-9 h-9 flex items-center justify-center text-primary hover:bg-primary/8 rounded-full transition-all active:scale-90" aria-label="Menu">
                            <span class="material-symbols-outlined text-2xl">menu</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- ── Mobile Sidebar (lives in body to avoid sticky stacking context) ── -->
        <div id="mobile-sidebar"
             style="pointer-events:none"
             class="fixed inset-0 z-[200] flex">

            <!-- Backdrop -->
            <div id="sidebar-backdrop"
                 onclick="toggleMobileMenu()"
                 class="absolute inset-0 bg-black/0 transition-all duration-300 ease-in-out"></div>

            <!-- Panel -->
            <div id="sidebar-panel"
                 class="relative flex flex-col w-72 max-w-[80vw] h-full bg-white dark:bg-zinc-950
                        shadow-2xl -translate-x-full transition-transform duration-300 ease-in-out overflow-hidden">

                <!-- Brand strip -->
                <div class="shrink-0 bg-primary px-5 pt-8 pb-5 relative overflow-hidden">
                    <!-- Decorative circles -->
                    <div class="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10"></div>
                    <div class="absolute -right-2 -bottom-4 w-16 h-16 rounded-full bg-white/5"></div>
                    <div class="flex items-center justify-between relative z-10">
                        <div class="flex items-center gap-3">
                            <img src="${basePath}assets/images/logo.png" class="w-11 h-11 rounded-full border-2 border-white/30 shadow-lg">
                            <div>
                                <p class="text-white font-black text-base leading-none">EzyBite</p>
                                <p class="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">Premium Snacks</p>
                            </div>
                        </div>
                        <button onclick="toggleMobileMenu()"
                                class="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-90">
                            <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                </div>

                <!-- Nav Links -->
                <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                    <p class="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30 px-3 mb-2">Browse</p>
                    <a href="${linkPrefix}index.html"
                       class="sidebar-link flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-[#181311]/70 dark:text-white/60 hover:text-primary hover:bg-primary/8 transition-all group">
                        <span class="material-symbols-outlined text-lg group-hover:scale-110 transition-transform text-primary/50 group-hover:text-primary">restaurant_menu</span>
                        <span>Menu</span>
                    </a>
                    <a href="${linkPrefix}deals.html"
                       class="sidebar-link flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-[#181311]/70 dark:text-white/60 hover:text-primary hover:bg-primary/8 transition-all group">
                        <span class="material-symbols-outlined text-lg group-hover:scale-110 transition-transform text-primary/50 group-hover:text-primary">local_offer</span>
                        <span>Deals</span>
                    </a>
                    <a href="${linkPrefix}cart.html"
                       class="sidebar-link flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-[#181311]/70 dark:text-white/60 hover:text-primary hover:bg-primary/8 transition-all group">
                        <span class="material-symbols-outlined text-lg group-hover:scale-110 transition-transform text-primary/50 group-hover:text-primary">shopping_bag</span>
                        <div class="flex-1 flex items-center justify-between">
                            <span>Basket</span>
                            <span class="cart-count bg-primary text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow border-2 border-white dark:border-zinc-950">0</span>
                        </div>
                    </a>
                    <a href="${linkPrefix}orders.html"
                       class="auth-required sidebar-link flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-[#181311]/70 dark:text-white/60 hover:text-primary hover:bg-primary/8 transition-all group">
                        <span class="material-symbols-outlined text-lg group-hover:scale-110 transition-transform text-primary/50 group-hover:text-primary">receipt_long</span>
                        <span>My Orders</span>
                    </a>
                    <a href="${linkPrefix}satisfaction.html"
                       class="auth-required sidebar-link flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-[#181311]/70 dark:text-white/60 hover:text-primary hover:bg-primary/8 transition-all group">
                        <span class="material-symbols-outlined text-lg group-hover:scale-110 transition-transform text-primary/50 group-hover:text-primary filled-icon">stars</span>
                        <span>Bite Club</span>
                    </a>

                    <div class="h-px bg-primary/8 my-3 mx-2"></div>
                    <p class="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30 px-3 mb-2">Info</p>

                    <a href="${linkPrefix}reviews.html"
                       class="sidebar-link flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-[#181311]/70 dark:text-white/60 hover:text-primary hover:bg-primary/8 transition-all group">
                        <span class="material-symbols-outlined text-lg group-hover:scale-110 transition-transform text-primary/50 group-hover:text-primary filled-icon">star</span>
                        <span>Reviews</span>
                    </a>
                    <a href="${linkPrefix}about.html"
                       class="sidebar-link flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-[#181311]/70 dark:text-white/60 hover:text-primary hover:bg-primary/8 transition-all group">
                        <span class="material-symbols-outlined text-lg group-hover:scale-110 transition-transform text-primary/50 group-hover:text-primary filled-icon">info</span>
                        <span>About Us</span>
                    </a>
                    <a href="${linkPrefix}updates.html"
                       onclick="window._clearUpdatesBadge && window._clearUpdatesBadge()"
                       class="sidebar-link flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-[#181311]/70 dark:text-white/60 hover:text-primary hover:bg-primary/8 transition-all group">
                        <span class="material-symbols-outlined text-lg group-hover:scale-110 transition-transform text-primary/50 group-hover:text-primary filled-icon">notifications</span>
                        <div class="flex-1 flex items-center justify-between">
                            <span>Updates</span>
                            <span class="updates-badge hidden bg-primary text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow border-2 border-white dark:border-zinc-950 leading-none"></span>
                        </div>
                    </a>

                    <div class="h-px bg-primary/8 my-3 mx-2"></div>
                    <p class="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30 px-3 mb-2">Account</p>

                    <a href="${linkPrefix}profile.html"
                       class="auth-required sidebar-link flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm text-[#181311]/70 dark:text-white/60 hover:text-primary hover:bg-primary/8 transition-all group">
                        <span class="material-symbols-outlined text-lg group-hover:scale-110 transition-transform text-primary/50 group-hover:text-primary">manage_accounts</span>
                        <span>My Profile</span>
                    </a>
                </nav>

                <!-- Footer -->
                <div class="shrink-0 border-t border-primary/8 px-3 py-4">
                    <button onclick="toggleTheme()"
                            class="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-primary/8 transition-all group">
                        <div class="flex items-center gap-3">
                            <span id="mobile-theme-icon" class="material-symbols-outlined text-lg text-primary group-hover:rotate-45 transition-transform duration-500">dark_mode</span>
                            <span class="text-sm font-bold text-[#181311]/70 dark:text-white/60 theme-text">Dark Mode</span>
                        </div>
                        <div class="w-8 h-4 bg-primary/20 rounded-full relative">
                            <div class="absolute right-0.5 top-0.5 w-3 h-3 bg-primary rounded-full transition-all"></div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    `;
    },
    getFooter: (basePath, linkPrefix) => `
        <footer class="mt-10 bg-zinc-900 text-white rounded-t-2xl overflow-hidden border-t border-white/5">
            <div class="max-w-[1440px] mx-auto px-6 lg:px-12 py-8">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6 items-start">
                    <div class="space-y-3">
                        <a href="${linkPrefix}index.html" class="inline-block transform hover:scale-105 transition-transform">
                            <img src="${basePath}assets/images/logo.png" alt="EzyBite Logo" class="h-12 w-12 rounded-full border-2 border-primary/20 bg-white">
                        </a>
                        <div>
                            <h3 class="text-lg font-black text-primary leading-none mb-1"><span id="footer-greeting">Good evening</span>!</h3>
                            <div class="flex flex-col gap-0.5 text-xs font-bold opacity-60">
                                <span id="footer-day">Monday, Feb 21</span>
                                <span id="footer-time">10:45 PM</span>
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Contact Us</h4>
                        <div class="space-y-2">
                            <a href="tel:0714516132" class="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 transition-all group text-sm">
                                <span class="material-symbols-outlined text-primary text-base shrink-0">call</span>
                                <span class="font-bold">0714516132</span>
                            </a>
                            <a href="tel:0708242794" class="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 transition-all group text-sm">
                                <span class="material-symbols-outlined text-primary text-base shrink-0">call</span>
                                <span class="font-bold">0708 242794</span>
                            </a>
                            <a href="mailto:info.ezybitesnack@gmail.com" class="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 transition-all group">
                                <span class="material-symbols-outlined text-primary text-base shrink-0">mail</span>
                                <span class="font-bold text-[11px] leading-tight break-all">info.ezybitesnack@gmail.com</span>
                            </a>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Our Journey</h4>
                        <div class="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-orange-500/10 border border-primary/20 text-center">
                            <div class="text-3xl font-black text-primary mb-1" id="day-counter">21</div>
                            <p class="text-[9px] font-black uppercase tracking-widest leading-tight opacity-60">Days delivering<br>Gold & Crispy joy</p>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Information</h4>
                        <div class="space-y-2 text-sm font-bold">
                            <a href="${linkPrefix}terms.html" class="block hover:text-primary transition-colors">Terms of Service</a>
                            <a href="${linkPrefix}privacy.html" class="block hover:text-primary transition-colors">Privacy Policy</a>
                            <a href="${linkPrefix}reviews.html" class="block hover:text-primary transition-colors flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-sm text-primary/50 filled-icon">star</span>Reviews
                            </a>
                            <a href="${linkPrefix}about.html" class="block hover:text-primary transition-colors flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-sm text-primary/50 filled-icon">info</span>About Us
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <div class="border-t border-white/5 px-6 lg:px-12 py-4 flex flex-col items-center gap-1.5">
                <p class="text-xs font-bold text-white/20 text-center">&copy; ${new Date().getFullYear()} EzyBite. All rights reserved.</p>
                <p class="text-sm font-black text-center tracking-wide" style="color:#ec4913;text-shadow:0 0 12px rgba(236,73,19,0.9),0 0 28px rgba(236,73,19,0.6),0 0 50px rgba(236,73,19,0.3);">Powered by Spectre Tech Limited</p>
            </div>
        </footer>
    `,
    getModals: (basePath = '') => `
        <!-- ── Sign In Modal ── -->
        <div class="fixed inset-0 z-[100] hidden items-center justify-center bg-black/60 backdrop-blur-sm" id="signin-modal">
            <div class="bg-white dark:bg-zinc-900 w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200 border border-primary/10">
                <div class="bg-primary px-6 pt-6 pb-8 text-center relative overflow-hidden">
                    <div class="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10"></div>
                    <div class="absolute -left-2 -bottom-2 w-14 h-14 rounded-full bg-white/5"></div>
                    <div class="absolute -bottom-3 left-0 right-0 h-6 bg-white dark:bg-zinc-900 rounded-t-3xl z-10"></div>
                    <button onclick="closeModal('signin-modal')" class="absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition-all z-10">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                    <div class="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-3 border-2 border-white/30 relative z-10 shadow-lg bg-white">
                        <img src="${basePath}assets/images/logo.png" alt="EzyBite" class="w-full h-full object-cover">
                    </div>
                    <h2 class="text-xl font-black text-white leading-none relative z-10">Welcome Back</h2>
                    <p class="text-white/70 text-[11px] font-medium mt-1 relative z-10">Sign in to your EzyBite account</p>
                </div>
                <div class="px-6 pt-5 pb-6">
                    <!-- Inline error banner -->
                    <div id="signin-error" class="hidden mb-3 flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <span class="material-symbols-outlined text-red-400 text-sm shrink-0 mt-0.5 filled-icon">error</span>
                        <span data-msg class="text-xs font-bold text-red-400 leading-snug"></span>
                    </div>
                    <form class="space-y-3" onsubmit="handleSignIn(event)">
                        <div>
                            <label class="text-[10px] font-black uppercase tracking-widest text-primary/40 pl-1 block mb-1.5">Email</label>
                            <div class="flex items-center gap-2 bg-primary/5 dark:bg-zinc-800 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                                <span class="material-symbols-outlined text-primary/40 text-sm shrink-0">mail</span>
                                <input type="email" name="email" class="flex-1 bg-transparent outline-none font-bold text-sm dark:text-white placeholder:text-primary/20" placeholder="email@example.com" autocomplete="email" required>
                            </div>
                        </div>
                        <div>
                            <label class="text-[10px] font-black uppercase tracking-widest text-primary/40 pl-1 block mb-1.5">Password</label>
                            <div class="flex items-center gap-2 bg-primary/5 dark:bg-zinc-800 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                                <span class="material-symbols-outlined text-primary/40 text-sm shrink-0">lock</span>
                                <input type="password" name="password" class="flex-1 bg-transparent outline-none font-bold text-sm dark:text-white placeholder:text-primary/20" placeholder="••••••••" autocomplete="current-password" required>
                            </div>
                        </div>
                        <button type="submit" id="signin-submit-btn" class="w-full bg-primary text-white py-2.5 rounded-2xl font-black hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 mt-1 text-sm">
                            <span class="material-symbols-outlined text-base filled-icon">login</span>
                            Sign In
                        </button>
                    </form>
                    <div class="relative my-3">
                        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-primary/10"></div></div>
                        <div class="relative flex justify-center"><span class="bg-white dark:bg-zinc-900 px-3 text-[10px] font-black text-primary/30 uppercase tracking-widest">or</span></div>
                    </div>
                    <button type="button" onclick="handleGoogleSignIn()" class="w-full flex items-center justify-center gap-2.5 border border-primary/15 dark:border-white/10 py-2.5 rounded-2xl font-black text-sm hover:bg-primary/5 active:scale-95 transition-all dark:text-white">
                        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Continue with Google
                    </button>
                    <p class="mt-4 text-center text-[11px] text-primary/50 font-medium">Don't have an account? <a href="#" onclick="switchModal('signin-modal', 'signup-modal')" class="text-primary font-black hover:underline">Create Account</a></p>
                </div>
            </div>
        </div>

        <!-- ── Sign Up Modal ── -->
        <div class="fixed inset-0 z-[100] hidden items-center justify-center bg-black/60 backdrop-blur-sm" id="signup-modal">
            <div class="bg-white dark:bg-zinc-900 w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200 border border-primary/10">
                <div class="bg-primary px-6 pt-6 pb-8 text-center relative overflow-hidden">
                    <div class="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10"></div>
                    <div class="absolute -left-2 -bottom-2 w-14 h-14 rounded-full bg-white/5"></div>
                    <div class="absolute -bottom-3 left-0 right-0 h-6 bg-white dark:bg-zinc-900 rounded-t-3xl z-10"></div>
                    <button onclick="closeModal('signup-modal')" class="absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition-all z-10">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                    <div class="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-3 border-2 border-white/30 relative z-10 shadow-lg bg-white">
                        <img src="${basePath}assets/images/logo.png" alt="EzyBite" class="w-full h-full object-cover">
                    </div>
                    <h2 class="text-xl font-black text-white leading-none relative z-10">Join EzyBite</h2>
                    <p class="text-white/70 text-[11px] font-medium mt-1 relative z-10">Create your free account today</p>
                </div>
                <div class="px-6 pt-5 pb-6">
                    <!-- Inline error banner -->
                    <div id="signup-error" class="hidden mb-3 flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <span class="material-symbols-outlined text-red-400 text-sm shrink-0 mt-0.5 filled-icon">error</span>
                        <span data-msg class="text-xs font-bold text-red-400 leading-snug"></span>
                    </div>
                    <form class="space-y-3" onsubmit="handleSignUp(event)">
                        <div>
                            <label class="text-[10px] font-black uppercase tracking-widest text-primary/40 pl-1 block mb-1.5">Full Name</label>
                            <div class="flex items-center gap-2 bg-primary/5 dark:bg-zinc-800 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                                <span class="material-symbols-outlined text-primary/40 text-sm shrink-0">badge</span>
                                <input type="text" name="fullName" class="flex-1 bg-transparent outline-none font-bold text-sm dark:text-white placeholder:text-primary/20" placeholder="Your full name" required>
                            </div>
                        </div>
                        <div>
                            <label class="text-[10px] font-black uppercase tracking-widest text-primary/40 pl-1 block mb-1.5">Email</label>
                            <div class="flex items-center gap-2 bg-primary/5 dark:bg-zinc-800 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                                <span class="material-symbols-outlined text-primary/40 text-sm shrink-0">mail</span>
                                <input type="email" name="email" class="flex-1 bg-transparent outline-none font-bold text-sm dark:text-white placeholder:text-primary/20" placeholder="email@example.com" autocomplete="email" required>
                            </div>
                        </div>
                        <div>
                            <label class="text-[10px] font-black uppercase tracking-widest text-primary/40 pl-1 block mb-1.5">Password</label>
                            <div class="flex items-center gap-2 bg-primary/5 dark:bg-zinc-800 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                                <span class="material-symbols-outlined text-primary/40 text-sm shrink-0">lock</span>
                                <input type="password" name="password" class="flex-1 bg-transparent outline-none font-bold text-sm dark:text-white placeholder:text-primary/20" placeholder="••••••••" autocomplete="new-password" required>
                            </div>
                        </div>
                        <button type="submit" id="signup-submit-btn" class="w-full bg-primary text-white py-2.5 rounded-2xl font-black hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 mt-1 text-sm">
                            <span class="material-symbols-outlined text-base filled-icon">rocket_launch</span>
                            Create Account
                        </button>
                    </form>
                    <div class="relative my-3">
                        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-primary/10"></div></div>
                        <div class="relative flex justify-center"><span class="bg-white dark:bg-zinc-900 px-3 text-[10px] font-black text-primary/30 uppercase tracking-widest">or</span></div>
                    </div>
                    <button type="button" onclick="handleGoogleSignIn()" class="w-full flex items-center justify-center gap-2.5 border border-primary/15 dark:border-white/10 py-2.5 rounded-2xl font-black text-sm hover:bg-primary/5 active:scale-95 transition-all dark:text-white">
                        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Continue with Google
                    </button>
                    <p class="mt-4 text-center text-[11px] text-primary/50 font-medium">Already have an account? <a href="#" onclick="switchModal('signup-modal', 'signin-modal')" class="text-primary font-black hover:underline">Sign In</a></p>
                </div>
            </div>
        </div>

        <!-- History Modal -->
        <div class="fixed inset-0 z-[100] hidden items-center justify-center bg-black/50 backdrop-blur-sm" id="history-modal">
            <div class="bg-white dark:bg-zinc-900 p-8 rounded-[40px] w-full max-w-2xl max-h-[80vh] shadow-2xl animate-in zoom-in-95 fade-in duration-300 border border-primary/10 flex flex-col">
                <div class="flex justify-between items-center mb-8 shrink-0">
                    <div>
                        <h2 class="text-3xl font-black dark:text-white">Order History</h2>
                        <p class="text-primary/60 text-xs font-black uppercase tracking-widest mt-1">Your Journey with EzyBite</p>
                    </div>
                    <button onclick="closeModal('history-modal')" class="w-12 h-12 flex items-center justify-center bg-primary/5 hover:bg-primary/10 rounded-full text-primary transition-all">
                        <span class="material-symbols-outlined font-bold text-2xl">close</span>
                    </button>
                </div>
                <div id="user-order-history" class="overflow-y-auto pr-4 space-y-4 flex-1 custom-scrollbar min-h-[300px]">
                    <!-- Populated by app.js -->
                </div>
            </div>
        </div>

        <!-- Profile Settings Modal -->
        <div class="fixed inset-0 z-[100] hidden items-center justify-center bg-black/50 backdrop-blur-sm" id="settings-modal">
            <div class="bg-white dark:bg-zinc-900 p-10 rounded-[40px] w-full max-w-xl shadow-2xl animate-in zoom-in-95 fade-in duration-300 border border-primary/10">
                <div class="flex justify-between items-center mb-10">
                    <div>
                        <h2 class="text-3xl font-black dark:text-white">Profile Settings</h2>
                        <p class="text-primary/60 text-xs font-black uppercase tracking-widest mt-1">Manage your account info</p>
                    </div>
                    <button onclick="closeModal('settings-modal')" class="w-12 h-12 flex items-center justify-center bg-primary/5 hover:bg-primary/10 rounded-full text-primary transition-all">
                        <span class="material-symbols-outlined font-bold text-2xl">close</span>
                    </button>
                </div>
                <form class="space-y-6" onsubmit="event.preventDefault(); handleSaveProfile();">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-1">Full Name</label>
                            <input id="user-display-name" type="text" class="w-full px-6 py-4 rounded-2xl bg-primary/5 dark:bg-zinc-800 border-none font-bold outline-none focus:ring-4 focus:ring-primary/10 dark:text-white" placeholder="John Doe">
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-1">Email (Read-only)</label>
                            <input id="user-email-readonly" type="email" class="w-full px-6 py-4 rounded-2xl bg-primary/5 dark:bg-zinc-800 border-none font-bold outline-none opacity-50 cursor-not-allowed dark:text-white" readonly>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-1">Phone Number</label>
                            <input id="user-phone" type="tel" class="w-full px-6 py-4 rounded-2xl bg-primary/5 dark:bg-zinc-800 border-none font-bold outline-none focus:ring-4 focus:ring-primary/10 dark:text-white" placeholder="+254 7XX XXX XXX">
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black uppercase text-primary/40 tracking-widest ml-1">Delivery Address</label>
                            <textarea id="user-address" class="w-full px-6 py-4 rounded-2xl bg-primary/5 dark:bg-zinc-800 border-none font-bold outline-none focus:ring-4 focus:ring-primary/10 dark:text-white min-h-[100px]" placeholder="Your location..."></textarea>
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-primary text-white py-5 rounded-2xl font-black text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3">
                        <span class="material-symbols-outlined font-black">save</span>
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    `
};

function injectComponents() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');
    const modalsPlaceholder = document.getElementById('modals-placeholder');

    const isInPages = window.location.pathname.includes('/pages/');
    const isInAdmin = window.location.pathname.includes('/admin/');
    const basePath = (isInPages || isInAdmin) ? '../' : './';
    const linkPrefix = (isInPages || isInAdmin) ? '' : 'pages/';

    // Admin Specific Header Adjustment
    if (isInAdmin && headerPlaceholder) {
        headerPlaceholder.innerHTML = UI.getHeader(basePath, '') // No 'pages/' prefix inside admin
            .replace('Menu</a>', 'Dashboard</a>')
            .replace('Deals</a>', 'Order Manager</a>')
            .replace('href="index.html"', 'href="index.html"')
            .replace('href="deals.html"', 'href="orders.html"');
    } else {
        if (headerPlaceholder) headerPlaceholder.innerHTML = UI.getHeader(basePath, linkPrefix);
    }

    if (footerPlaceholder) footerPlaceholder.innerHTML = UI.getFooter(basePath, linkPrefix);
    if (modalsPlaceholder) modalsPlaceholder.innerHTML = UI.getModals(basePath);

    // Move the mobile sidebar OUT of the sticky header to avoid stacking context clipping
    const sidebar = document.getElementById('mobile-sidebar');
    if (sidebar) document.body.appendChild(sidebar);

    // Mark current page link as active in sidebar
    const curPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const href = (link.getAttribute('href') || '').split('/').pop();
        if (href === curPage) {
            link.classList.add('bg-primary/10', 'text-primary', '!text-primary');
            const icon = link.querySelector('.material-symbols-outlined');
            if (icon) icon.classList.add('!text-primary', 'filled-icon');
        }
    });

    // Attach auth interceptors to any element with 'auth-required'
    document.querySelectorAll('.auth-required').forEach(link => {
        link.addEventListener('click', (e) => {
            if (!window.currentUser) {
                e.preventDefault();
                if (typeof openModal === 'function') openModal('signin-modal');
            }
        });
    });

    // Highlight active link
    const path = window.location.pathname.split("/").pop() || 'index.html';
    document.querySelectorAll('nav a, header a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href === path || href.endsWith('/' + path))) {
            link.classList.add('text-primary');
            // Special styling for active "Orders" or "Profile"
            if (link.id === 'nav-orders') link.classList.add('bg-primary/10');
            if (link.id === 'nav-profile') link.parentElement.classList.add('scale-105', 'animate-pulse');
        }
    });

    // Re-bind events that might have been lost or need early binding
    if (typeof updateDynamicFooter === 'function') updateDynamicFooter();
    if (typeof updateCartUI === 'function') updateCartUI();

    // Show updates nudge on menu/index page once per day
    const _curPage = window.location.pathname.split('/').pop() || 'index.html';
    if (_curPage === 'index.html' || _curPage === '' || window.location.pathname.endsWith('/pages/')) {
        setTimeout(() => window.showUpdatesNudge && window.showUpdatesNudge(linkPrefix), 800);
    }

    // ── WhatsApp Bite Club Floating Button ─────────────────────────────────
    if (!document.getElementById('whatsapp-fab')) {
        const fab = document.createElement('a');
        fab.id = 'whatsapp-fab';
        fab.href = 'https://chat.whatsapp.com/KgoKciXKMul0tCWtNj7QjK';
        fab.target = '_blank';
        fab.rel = 'noopener noreferrer';
        fab.title = 'Join Bite Club on WhatsApp';
        fab.style.cssText = `
            position: fixed; bottom: 80px; right: 18px; z-index: 9999;
            width: 52px; height: 52px; border-radius: 50%;
            background: #25D366; color: #fff;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 18px rgba(37,211,102,0.45), 0 2px 8px rgba(0,0,0,0.18);
            transition: transform 0.2s, box-shadow 0.2s;
            text-decoration: none;
        `;
        fab.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="28" height="28">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span style="
                position: absolute; bottom: -1px; right: -1px;
                background: #ec4913; color: #fff; font-size: 7px; font-weight: 900;
                border-radius: 99px; padding: 1px 4px; line-height: 1.4;
                font-family: 'Be Vietnam Pro', sans-serif; white-space: nowrap;
                border: 1.5px solid #fff; letter-spacing: 0.02em;
            ">Bite Club</span>
        `;
        fab.onmouseenter = () => { fab.style.transform = 'scale(1.12)'; fab.style.boxShadow = '0 6px 24px rgba(37,211,102,0.6), 0 2px 10px rgba(0,0,0,0.2)'; };
        fab.onmouseleave = () => { fab.style.transform = 'scale(1)'; fab.style.boxShadow = '0 4px 18px rgba(37,211,102,0.45), 0 2px 8px rgba(0,0,0,0.18)'; };
        document.body.appendChild(fab);
    }

    // ── Updates notification badge ──────────────────────────────────────────
    window._clearUpdatesBadge = function () {
        document.querySelectorAll('.updates-badge').forEach(b => b.classList.add('hidden'));
        localStorage.setItem('ezybite_last_read_updates', Date.now().toString());
    };

    async function setupUpdatesBadge() {
        if (typeof window.fb_getUpdates !== 'function') { setTimeout(setupUpdatesBadge, 300); return; }
        try {
            const updates = await window.fb_getUpdates();
            const lastRead = parseInt(localStorage.getItem('ezybite_last_read_updates') || '0');
            const unread = updates.filter(u => ((u.createdAt?.seconds || 0) * 1000) > lastRead).length;
            if (unread > 0) {
                document.querySelectorAll('.updates-badge').forEach(b => {
                    b.textContent = unread > 9 ? '9+' : String(unread);
                    b.classList.remove('hidden');
                });
            }
        } catch (_) {}
    }
    setupUpdatesBadge();
}

document.addEventListener('DOMContentLoaded', injectComponents);
