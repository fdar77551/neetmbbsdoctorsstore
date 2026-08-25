import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
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

// Initialize Firebase App & Services (Auth + Realtime Database)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const rtdb: Database = getDatabase(app);

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


