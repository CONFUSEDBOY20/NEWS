/**
 * Real-time Firebase Firestore client (Optional multi-tab listener).
 * Active only when VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_API_KEY are defined.
 */

let app = null;
let db = null;

export function isFirebaseConfigured() {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  return Boolean(projectId && apiKey);
}

async function getFirestoreInstance() {
  if (db) return db;
  if (!isFirebaseConfigured()) return null;

  try {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getFirestore } = await import("firebase/firestore");

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const apps = getApps();
    app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    db = getFirestore(app);
    return db;
  } catch (err) {
    console.warn("Failed to initialize Firebase client:", err);
    return null;
  }
}

/**
 * Subscribes to real-time fact-checks collection updates
 * @param {function} onUpdate - callback receiving updated list of verified items
 * @returns {function} unsubscribe function
 */
export function subscribeFactChecks(onUpdate) {
  let unsubscribeFn = () => {};

  if (!isFirebaseConfigured()) {
    return unsubscribeFn;
  }

  getFirestoreInstance().then(async (firestoreDb) => {
    if (!firestoreDb) return;
    try {
      const { collection, onSnapshot, query, orderBy, limit } = await import("firebase/firestore");
      const q = query(collection(firestoreDb, "fact_checks"), orderBy("created_at", "desc"), limit(20));
      unsubscribeFn = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        if (typeof onUpdate === "function") {
          onUpdate(items);
        }
      }, (err) => {
        console.warn("Firestore fact_checks snapshot listener error:", err);
      });
    } catch (err) {
      console.warn("Error setting up fact_checks snapshot listener:", err);
    }
  });

  return () => {
    if (unsubscribeFn) unsubscribeFn();
  };
}

/**
 * Subscribes to real-time fact articles collection updates
 * @param {function} onUpdate - callback receiving updated list of articles
 * @returns {function} unsubscribe function
 */
export function subscribeArticles(onUpdate) {
  let unsubscribeFn = () => {};

  if (!isFirebaseConfigured()) {
    return unsubscribeFn;
  }

  getFirestoreInstance().then(async (firestoreDb) => {
    if (!firestoreDb) return;
    try {
      const { collection, onSnapshot, query, limit } = await import("firebase/firestore");
      const q = query(collection(firestoreDb, "fact_articles"), limit(20));
      unsubscribeFn = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        if (typeof onUpdate === "function") {
          onUpdate(items);
        }
      }, (err) => {
        console.warn("Firestore fact_articles snapshot listener error:", err);
      });
    } catch (err) {
      console.warn("Error setting up fact_articles snapshot listener:", err);
    }
  });

  return () => {
    if (unsubscribeFn) unsubscribeFn();
  };
}
