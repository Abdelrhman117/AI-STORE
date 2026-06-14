// ═══════════════════════════════════════════
//  js/config.js — Firebase Initialization
// ═══════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyB8winiBgRpx66IRemaUHRUljD6ldZ1n48",
  authDomain: "gold-18db0.firebaseapp.com",
  projectId: "gold-18db0",
  storageBucket: "gold-18db0.firebasestorage.app",
  messagingSenderId: "1030823740621",
  appId: "1:1030823740621:web:c0cee33905fed84ec79584",
  measurementId: "G-62CGQ5TYS2"
};

firebase.initializeApp(firebaseConfig);

const db   = firebase.firestore();
const auth = firebase.auth();

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true })
  .catch(err => console.warn('Offline persistence unavailable:', err.code));
