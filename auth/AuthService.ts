import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export type UserRole = "kasir" | "outlet";

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  namaToko?: string;
  alamat?: string;
  telepon?: string;
  createdAt?: any;
};

// ── REGISTER ─────────────────────────────────────────────────────────────────
export const registerUser = async (
  email: string,
  password: string,
  name: string,
  role: UserRole = "kasir",
): Promise<UserProfile> => {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const uid = credential.user.uid;

  const profile: UserProfile = {
    uid,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role,
    createdAt: serverTimestamp(),
  };

  // Simpan profile ke Firestore collection "users"
  await setDoc(doc(db, "users", uid), profile);

  return profile;
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export const loginUser = async (
  email: string,
  password: string,
): Promise<UserProfile> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  // Ambil profile dari Firestore
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    throw { code: "auth/profile-not-found" };
  }

  return snap.data() as UserProfile;
};

// ── GET PROFILE ───────────────────────────────────────────────────────────────
export const getUserProfile = async (
  uid: string,
): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
};

// ── LOGOUT ────────────────────────────────────────────────────────────────────
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
export const forgotPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
};

// ── AUTH STATE LISTENER ───────────────────────────────────────────────────────
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
