import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { onAuthChange, getUserProfile, UserProfile } from "./auth/AuthService";

import LoginScreen from "./auth/LoginScreen";
import RegisterScreen from "./auth/RegisterScreen";
import ForgotPasswordScreen from "./auth/ForgotPasswordScreen";
import HomeScreen from "./auth/HomeScreen";

type Screen = "login" | "register" | "forgot";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [booting, setBooting] = useState(true);

  // ── Firebase Auth State Listener ──────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // User sudah login — ambil profile dari Firestore
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUser(profile);
        } catch (e) {
          console.error("[App] gagal ambil profile:", e);
          setUser(null);
        }
      } else {
        // User logout
        setUser(null);
      }
      setBooting(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Loading splash ────────────────────────────────────────────────────────
  if (booting) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  // ── Sudah login → tampilkan Home ──────────────────────────────────────────
  if (user) {
    return (
      <HomeScreen
        user={user}
        onLogout={() => setUser(null)}
        onUpdateUser={(updates) =>
          setUser((prev) => (prev ? { ...prev, ...updates } : prev))
        }
      />
    );
  }

  // ── Belum login → tampilkan Auth screens ──────────────────────────────────
  switch (screen) {
    case "register":
      return (
        <RegisterScreen
          onRegistered={(profile) => setUser(profile)}
          onBackToLogin={() => setScreen("login")}
        />
      );

    case "forgot":
      return <ForgotPasswordScreen onBack={() => setScreen("login")} />;

    default:
      return (
        <LoginScreen
          onLoggedIn={(profile) => setUser(profile)}
          switchToRegister={() => setScreen("register")}
          switchToForgot={() => setScreen("forgot")}
        />
      );
  }
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#14532d",
  },
});
