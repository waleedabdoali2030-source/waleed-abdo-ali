import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Check if config is valid
export const isFirebaseConfigured = firebaseConfig.apiKey !== "TODO_KEYHERE" && firebaseConfig.apiKey !== "";

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

export const db = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined) : null as any;
export const auth = app ? getAuth(app) : null as any;

export const loginWithGoogle = async () => {
  if (!auth) throw new Error("Firebase is not configured");
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const logout = async () => {
  if (!auth) throw new Error("Firebase is not configured");
  return signOut(auth);
};
