import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  setPersistence,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut as fbSignOut, 
  onAuthStateChanged, 
  updateProfile,
  User 
} from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  push,
  update,
  remove,
  child,
  Database
} from "firebase/database";

export const firebaseConfig = {
  apiKey: "AIzaSyABxbxhkujqHg0MXxJzk00ftfBOX7anKLM",
  authDomain: "ncertify-neet-master-tests.firebaseapp.com",
  databaseURL: "https://ncertify-neet-master-tests-default-rtdb.firebaseio.com",
  projectId: "ncertify-neet-master-tests",
  storageBucket: "ncertify-neet-master-tests.firebasestorage.app",
  messagingSenderId: "922447526824",
  appId: "1:922447526824:web:f6c2d00bd590241f2c3b9d",
  measurementId: "G-ME8LBD185V"
};

// Admin email list specified by user
export const ADMIN_EMAILS = [
  "fdar77551@gmail.com",
  "shahzaibhusain6@gmail.com"
].map(e => e.toLowerCase().trim());

// Designated admin master passwords
export const ADMIN_REQUIRED_PASSWORDS: Record<string, string> = {
  "fdar77551@gmail.com": "FAISAL6005",
  "shahzaibhusain6@gmail.com": "Mansoori"
};

export function getAdminRequiredPassword(email?: string | null): string | null {
  if (!email) return null;
  const clean = email.toLowerCase().trim();
  return ADMIN_REQUIRED_PASSWORDS[clean] || null;
}

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with multi-tiered resilience (IndexedDB -> LocalStorage -> SessionStorage -> Memory)
function initializeResilientAuth(firebaseApp: any) {
  try {
    return initializeAuth(firebaseApp, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence]
    });
  } catch (initErr) {
    try {
      return getAuth(firebaseApp);
    } catch (fallbackErr) {
      console.warn("Auth initialization notice:", fallbackErr);
      return getAuth(firebaseApp);
    }
  }
}

export const auth = initializeResilientAuth(app);
export const rtdb: Database = getDatabase(app);

/**
 * Robust sign in wrapper that automatically recovers if IndexedDB is in a closing or corrupted state
 */
export async function safeSignIn(email: string, pass: string) {
  try {
    return await signInWithEmailAndPassword(auth, email, pass);
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('database is closing') || msg.includes('closing') || msg.includes('indexeddb') || msg.includes('invalidstateerror')) {
      console.warn('Recovering from IndexedDB closing state with browserLocalPersistence fallback...');
      try {
        await setPersistence(auth, browserLocalPersistence);
        return await signInWithEmailAndPassword(auth, email, pass);
      } catch (retryErr) {
        try {
          await setPersistence(auth, inMemoryPersistence);
          return await signInWithEmailAndPassword(auth, email, pass);
        } catch (memErr) {
          throw err;
        }
      }
    }
    throw err;
  }
}

/**
 * Robust account creation wrapper that automatically recovers if IndexedDB is closing
 */
export async function safeCreateUser(email: string, pass: string) {
  try {
    return await createUserWithEmailAndPassword(auth, email, pass);
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('database is closing') || msg.includes('closing') || msg.includes('indexeddb') || msg.includes('invalidstateerror')) {
      console.warn('Recovering from IndexedDB closing state during user creation...');
      try {
        await setPersistence(auth, browserLocalPersistence);
        return await createUserWithEmailAndPassword(auth, email, pass);
      } catch (retryErr) {
        try {
          await setPersistence(auth, inMemoryPersistence);
          return await createUserWithEmailAndPassword(auth, email, pass);
        } catch (memErr) {
          throw err;
        }
      }
    }
    throw err;
  }
}

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  fbSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
  getDatabase,
  ref,
  set,
  get,
  onValue,
  push,
  update,
  remove,
  child
};


