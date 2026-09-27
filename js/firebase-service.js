import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, onSnapshot, query, where, orderBy, getDocs, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyAUHuu9d7PqI2X3g-_OyGjtnJY6fl_G88s",
    authDomain: "ezybite-d44c5.firebaseapp.com",
    projectId: "ezybite-d44c5",
    storageBucket: "ezybite-d44c5.firebasestorage.app",
    messagingSenderId: "77854577474",
    appId: "1:77854577474:web:1b90df9ccb4b355ec4eedb",
    measurementId: "G-5BVC2DZPXV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

window.fb_signUp = async (email, password, fullName) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: fullName });
        await setDoc(doc(db, "users", user.uid), {
            fullName: fullName,
            email: email,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return user;
    } catch (error) {
        throw error;
    }
}

window.fb_signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
window.fb_signOut = () => signOut(auth);

window.fb_signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    // Create user doc if it doesn't exist yet (first Google sign-in)
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        await setDoc(userRef, {
            fullName: user.displayName || '',
            email: user.email,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
    return user;
};

window.fb_updateDisplayName = async (name) => {
    if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name });
    }
}

window.fb_saveCustomOrder = async (orderData) => {
    const docRef = await addDoc(collection(db, "customOrders"), {
        ...orderData,
        status: "pending",
        userId: auth.currentUser ? auth.currentUser.uid : "guest",
        createdAt: new Date()
    });
    return docRef.id;
}

window.fb_getUserData = async (uid) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
}

window.fb_updateUserProfile = async (uid, data) => {
    const docRef = doc(db, "users", uid);
    await setDoc(docRef, {
        ...data,
        updatedAt: new Date()
    }, { merge: true });
}

window.fb_createOrder = async (orderData) => {
    const docRef = await addDoc(collection(db, "orders"), {
        ...orderData,
        status: "pending",
        createdAt: new Date(),
        userId: auth.currentUser.uid
    });
    return docRef.id;
}

window.fb_getUserOrders = async (uid) => {
    // NOTE: No orderBy here — avoids composite index requirement on Firestore
    const q = query(collection(db, "orders"), where("userId", "==", uid));
    const querySnapshot = await getDocs(q);
    const orders = [];
    querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
    });
    // Sort newest-first client-side
    orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return orders;
}

window.fb_getAllOrders = async () => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const orders = [];
    querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
    });
    return orders;
}

/**
 * Listen to a single order document in real-time.
 * @param {string} orderId
 * @param {function} callback  Called with the order data object (includes id) on every change.
 * @returns {function} Unsubscribe function – call it to stop listening.
 */
window.fb_listenToOrder = (orderId, callback) => {
    const orderRef = doc(db, "orders", orderId);
    return onSnapshot(orderRef, (snap) => {
        if (snap.exists()) {
            callback({ id: snap.id, ...snap.data() });
        }
    });
}

window.fb_updateOrderStatus = async (orderId, newStatus) => {
    const docRef = doc(db, "orders", orderId);
    await setDoc(docRef, {
        status: newStatus,
        updatedAt: new Date()
    }, { merge: true });
}

window.fb_getAdminStats = async () => {
    const ordersSnapshot = await getDocs(collection(db, "orders"));
    let totalRevenue = 0;
    let pendingOrders = 0;
    ordersSnapshot.forEach(doc => {
        const data = doc.data();
        // Revenue: only count orders that have been paid
        const isPaid = data.status === 'paid' || data.paymentStatus === 'paid';
        if (isPaid) totalRevenue += (data.total || 0);
        if (data.status === 'pending' || data.paymentStatus === 'unpaid') pendingOrders++;
    });
    // Users collection requires owner-check — try gracefully
    let totalUsers = 0;
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        totalUsers = usersSnapshot.size;
    } catch (_) { totalUsers = '–'; }
    return {
        totalOrders: ordersSnapshot.size,
        totalUsers,
        totalRevenue,
        pendingOrders
    };
}

// ── Deals ──────────────────────────────────────────────────────────────────

window.fb_getDeals = async () => {
    const q = query(collection(db, "deals"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

window.fb_createDeal = async (dealData) => {
    const docRef = await addDoc(collection(db, "deals"), {
        ...dealData,
        createdAt: new Date()
    });
    return docRef.id;
}

window.fb_deleteDeal = async (dealId) => {
    await deleteDoc(doc(db, "deals", dealId));
}

/** Admin-only: hard-delete an order by ID */
window.fb_deleteOrder = async (orderId) => {
    await deleteDoc(doc(db, 'orders', orderId));
};

/**
 * Real-time listener for all orders belonging to a user.
 * @returns {function} Unsubscribe function.
 */
window.fb_listenUserOrders = (uid, callback) => {
    const q = query(collection(db, 'orders'), where('userId', '==', uid));
    return onSnapshot(q, (snap) => {
        const orders = [];
        snap.forEach(d => orders.push({ id: d.id, ...d.data() }));
        orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        callback(orders);
    });
};

/**
 * User-initiated delete — allowed only after 24 hours.
 */
window.fb_deleteUserOrder = async (orderId, uid) => {
    const orderRef = doc(db, 'orders', orderId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) throw new Error('Order not found.');
    const data = snap.data();
    if (data.userId !== uid) throw new Error('Unauthorized.');
    const createdMs = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now();
    if (Date.now() - createdMs < 24 * 60 * 60 * 1000) {
        throw new Error('Orders can only be deleted after 24 hours.');
    }
    await deleteDoc(orderRef);
};

window.fb_getOrdersWithStats = async () => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Group by day for chart data (last 7 days)
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), date: d.toDateString(), count: 0, revenue: 0 });
    }
    orders.forEach(order => {
        const orderDate = new Date(order.createdAt.seconds * 1000).toDateString();
        const day = days.find(d => d.date === orderDate);
        if (day) { day.count++; day.revenue += (order.total || 0); }
    });
    
    const paid = orders.filter(o => o.status === 'paid' || o.paymentStatus === 'paid').length;
    const failed = orders.filter(o => o.status === 'payment-failed' || o.paymentStatus === 'failed').length;
    const unpaid = orders.filter(o => o.paymentStatus === 'unpaid' || (!o.paymentStatus && o.status === 'pending')).length;

    return { orders, days, paid, failed, unpaid };
}

// ── Bite Points ────────────────────────────────────────────────────────────────

/**
 * Award Bite Points for a paid order. Idempotent — won't double-award.
 * Points scale: total < 50 = 1 pt, 50–199 = 5 pts, >= 200 = 20 pts.
 * @returns {number} Points awarded (0 if already awarded or not eligible)
 */
window.fb_awardBitePoints = async (uid, orderId, orderTotal) => {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return 0;
    const orderData = orderSnap.data();
    // Idempotency check
    if (orderData.pointsAwarded) return 0;
    // Must be paid
    const isPaid = orderData.status === 'paid' || orderData.paymentStatus === 'paid';
    if (!isPaid) return 0;

    const total = orderTotal || orderData.total || 0;
    let pts = 1;
    if (total >= 200) pts = 20;
    else if (total >= 50) pts = 5;

    // Mark order first to prevent race
    await setDoc(orderRef, { pointsAwarded: true, pointsEarned: pts }, { merge: true });

    // Atomically increment user's bite points
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { bitePoints: increment(pts) }, { merge: true });

    return pts;
};

/**
 * Redeem Bite Points. Throws if insufficient balance.
 * @returns {number} Remaining points after redemption
 */
window.fb_redeemBitePoints = async (uid, pointsToSpend) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('User profile not found.');
    const current = userSnap.data().bitePoints || 0;
    if (current < pointsToSpend) throw new Error(`Not enough points. You have ${current} pts.`);
    await setDoc(userRef, { bitePoints: current - pointsToSpend }, { merge: true });
    return current - pointsToSpend;
};

/**
 * Cancel an order. Only the owner can cancel, only within 5 minutes, and only if unpaid.
 */
window.fb_cancelOrder = async (orderId, uid) => {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error('Order not found.');
    const data = orderSnap.data();
    if (data.userId !== uid) throw new Error('Unauthorized.');
    if (data.paymentStatus === 'paid' || data.status === 'paid') {
        throw new Error('Paid orders cannot be cancelled.');
    }
    const createdMs = data.createdAt?.seconds
        ? data.createdAt.seconds * 1000
        : (data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now());
    const elapsed = Date.now() - createdMs;
    if (elapsed > 5 * 60 * 1000) {
        throw new Error('Cancellation window expired (5 minutes).');
    }
    await deleteDoc(orderRef);
};

// ── Reviews ────────────────────────────────────────────────────────────────

/**
 * Add a public review. Anyone (including guests) can submit.
 */
window.fb_addReview = async (reviewData) => {
    const docRef = await addDoc(collection(db, 'reviews'), {
        ...reviewData,
        createdAt: new Date()
    });
    return docRef.id;
};

/**
 * Get all reviews, newest first.
 */
window.fb_getReviews = async () => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Delete a review by id (admin only).
 */
window.fb_deleteReview = async (id) => {
    await deleteDoc(doc(db, 'reviews', id));
};

/**
 * Get rating distribution and average for stats charts.
 * Returns { dist: {1:n, 2:n, 3:n, 4:n, 5:n}, total, avg }
 */
window.fb_getRatingsStats = async () => {
    const snap = await getDocs(collection(db, 'reviews'));
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0, sum = 0;
    snap.forEach(d => {
        const r = d.data().rating;
        if (r >= 1 && r <= 5) { dist[r]++; total++; sum += r; }
    });
    return { dist, total, avg: total ? parseFloat((sum / total).toFixed(1)) : 0 };
};

// ── Admin Direct Orders (on-the-road STK Push) ─────────────────────────────

/**
 * Create a direct order from the admin panel for cash / road sales.
 * Sets source=admin-direct and userId=admin-direct to bypass user-auth rules.
 */
window.fb_createDirectOrder = async (orderData) => {
    const docRef = await addDoc(collection(db, 'orders'), {
        ...orderData,
        status: 'pending',
        paymentStatus: 'unpaid',
        source: 'admin-direct',
        userId: 'admin-direct',
        createdAt: new Date()
    });
    return docRef.id;
};

// ── App Updates (public read, admin write) ─────────────────────────────────

/**
 * Get all updates, newest first.
 */
window.fb_getUpdates = async () => {
    const q = query(collection(db, 'updates'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Create a new update (admin only).
 * @param {{ title: string, body: string, tag: string }} data
 */
window.fb_createUpdate = async (data) => {
    const ref = await addDoc(collection(db, 'updates'), {
        ...data,
        createdAt: new Date()
    });
    return ref.id;
};

/**
 * Delete an update by id (admin only).
 */
window.fb_deleteUpdate = async (id) => {
    await deleteDoc(doc(db, 'updates', id));
};

onAuthStateChanged(auth, async (user) => {
    window.currentUser = user;
    const event = new CustomEvent('auth-changed', { detail: user });
    document.dispatchEvent(event);
});
