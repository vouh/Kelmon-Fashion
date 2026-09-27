/**
 * admin-auth.js
 * Include on ALL admin pages after firebase-service.js.
 * Blocks access unless the signed-in Firebase user email is in ADMIN_EMAILS.
 * This file is in /admin/ which is blocked from Google by robots.txt + noindex.
 *
 * To add an admin: add their email to ADMIN_EMAILS below.
 */
(function () {
    'use strict';

    const ADMIN_EMAILS = [
        'peterkelvinkibiru1532@gmail.com',
        'sabastianthuo3@gmail.com',
        // 'another@example.com',
    ];

    // ── Inject full-screen gate immediately to prevent content flash ────────────
    const gate = document.createElement('div');
    gate.id = 'admin-auth-gate';
    gate.style.cssText =
        'position:fixed;inset:0;background:#09090b;z-index:9999;' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;';
    gate.innerHTML =
        '<style>@keyframes _eb_spin{to{transform:rotate(360deg)}}</style>' +
        '<div style="width:28px;height:28px;border:3px solid #ec4913;border-top-color:transparent;' +
        'border-radius:50%;animation:_eb_spin 0.65s linear infinite;"></div>' +
        '<p style="color:#ec4913;font-size:10px;font-weight:900;letter-spacing:0.2em;' +
        'font-family:\'Be Vietnam Pro\',sans-serif;margin:0;">VERIFYING ACCESS</p>';

    if (document.body) {
        document.body.appendChild(gate);
    } else {
        document.addEventListener('DOMContentLoaded', () => document.body.appendChild(gate));
    }

    function allow() {
        const el = document.getElementById('admin-auth-gate');
        if (el) el.remove();
    }

    function deny() {
        window.location.replace('login.html');
    }

    function check(user) {
        if (user && ADMIN_EMAILS.includes(user.email)) {
            allow();
        } else if (user !== undefined) {
            deny();
        }
    }

    document.addEventListener('auth-changed', (e) => check(e.detail));

    if (window.currentUser !== undefined) {
        check(window.currentUser);
    }

    setTimeout(() => {
        if (document.getElementById('admin-auth-gate')) deny();
    }, 10000);
})();
