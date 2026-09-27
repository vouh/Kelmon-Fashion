/**
 * EzyBite Admin Shell
 * Injects the sidebar, topbar and mobile drawer into every admin page.
 * Usage: Add <script src="admin-shell.js"></script> and the placeholders below to each page.
 *   <div id="admin-sidebar-placeholder"></div>
 */

// Inject thin themed scrollbar + admin-specific overrides
(function injectAdminStyles() {
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

(function () {
    const pages = [
        { href: 'index.html',                icon: 'dashboard',         label: 'Overview' },
        { href: 'orders.html',               icon: 'receipt_long',      label: 'All Orders' },
        { href: 'stats.html',                icon: 'bar_chart',         label: 'Statistics',          color: 'text-blue-400' },
        { href: 'deals.html',                icon: 'local_offer',       label: 'Manage Deals',        color: 'text-yellow-400' },
        { href: 'updates.html',              icon: 'campaign',          label: 'Updates',             color: 'text-blue-400' },
        { href: 'reviews.html',              icon: 'star',              label: 'Reviews',             color: 'text-yellow-300' },
        { href: 'transactions.html',         icon: 'check_circle',      label: 'Successful Payments', color: 'text-green-400' },
        { href: 'transactions-failed.html',  icon: 'cancel',            label: 'Failed Payments',     color: 'text-red-400' },
    ];

    const current = window.location.pathname.split('/').pop() || 'index.html';

    const navLinks = pages.map(p => {
        const active = current === p.href;
        const iconColor = p.color || 'text-white/50';
        return `
        <a href="${p.href}" class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all
            ${active
                ? 'bg-primary text-white shadow shadow-primary/40'
                : 'text-white/50 hover:text-white hover:bg-white/5'}">
            <span class="material-symbols-outlined text-sm filled-icon ${active ? 'text-white' : iconColor}">${p.icon}</span>
            <span>${p.label}</span>
        </a>`;
    }).join('');

    const sidebarHTML = `
    <!-- Mobile Overlay -->
    <div id="sidebar-overlay" class="fixed inset-0 bg-black/60 z-30 hidden md:hidden" onclick="toggleSidebar()"></div>

    <!-- Topbar (mobile only) -->
    <header class="md:hidden fixed top-0 left-0 right-0 z-40 bg-zinc-900 border-b border-white/5 flex items-center justify-between px-4 h-11">
        <button onclick="toggleSidebar()" class="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white">
            <span class="material-symbols-outlined text-lg">menu</span>
        </button>
        <span class="text-[10px] font-black uppercase tracking-widest text-white/60">
            ${pages.find(p => p.href === current)?.label || 'Admin'}
        </span>
        <button onclick="loadPageData && loadPageData()" class="w-7 h-7 flex items-center justify-center rounded-lg text-primary hover:text-white">
            <span class="material-symbols-outlined text-lg">refresh</span>
        </button>
    </header>

    <!-- Sidebar -->
    <aside id="admin-sidebar"
        class="fixed top-0 left-0 h-screen w-44 bg-zinc-950 border-r border-white/5 flex flex-col z-40
               -translate-x-full md:translate-x-0 transition-transform duration-300">

        <!-- Logo -->
        <div class="px-3 py-3 border-b border-white/5 flex items-center gap-2.5">
            <img src="../assets/images/logo.png" alt="Logo" class="w-7 h-7 rounded-full border border-primary/30 shrink-0">
            <div>
                <p class="text-white font-black text-xs leading-none">EzyBite</p>
                <p class="text-[8px] font-black uppercase tracking-widest text-primary/60 mt-0.5">Admin Panel</p>
            </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
            <p class="text-[8px] font-black uppercase tracking-widest text-white/20 px-2 mb-1.5 mt-1">Navigation</p>
            ${navLinks}
        </nav>

        <!-- Footer -->
        <div class="px-2 py-2 border-t border-white/5">
            <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg">
                <div class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-primary text-xs">admin_panel_settings</span>
                </div>
                <div class="min-w-0">
                    <p class="text-white text-[10px] font-bold leading-none truncate" id="admin-email-display">Admin</p>
                    <p class="text-white/30 text-[8px] uppercase tracking-widest mt-0.5">Administrator</p>
                </div>
            </div>
            <a href="../pages/index.html" class="mt-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-white/40 hover:text-primary hover:bg-white/5 transition-all text-[10px] font-bold">
                <span class="material-symbols-outlined text-xs">open_in_new</span> View Site
            </a>
            <button onclick="window.fb_signOut && window.fb_signOut()" class="mt-0.5 w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/5 transition-all text-[10px] font-bold">
                <span class="material-symbols-outlined text-xs">logout</span> Sign Out
            </button>
        </div>
    </aside>`;

    // Inject into placeholder
    document.addEventListener('DOMContentLoaded', () => {
        const placeholder = document.getElementById('admin-sidebar-placeholder');
        if (placeholder) placeholder.innerHTML = sidebarHTML;

        // Set admin email when auth fires
        document.addEventListener('auth-changed', (e) => {
            const el = document.getElementById('admin-email-display');
            if (el && e.detail?.email) el.textContent = e.detail.email;
        });
    });

    window.toggleSidebar = function () {
        const sidebar = document.getElementById('admin-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    };
})();
