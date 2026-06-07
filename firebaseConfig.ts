import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBd0ccGEjgcY47Z7z5_D8OiCwsV5Uz5qQw",
  authDomain: "kasir-8339f.firebaseapp.com",
  projectId: "kasir-8339f",
  storageBucket: "kasir-8339f.firebasestorage.app",
  messagingSenderId: "245942772246",
  appId: "1:245942772246:web:fcc05bae1012ac10fb8b37",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
