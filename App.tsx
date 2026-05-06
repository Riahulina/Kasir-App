import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen       from './auth/LoginScreen';
import RegisterScreen    from './auth/RegisterScreen';
import ForgotPasswordScreen from './auth/ForgotPasswordScreen';
import ProfileSetupScreen from './auth/ProfileSetupScreen';
import HomeScreen        from './auth/HomeScreen';

const USERS_KEY   = '@kasirapp_users';
const SESSION_KEY = '@kasirapp_session';

type Screen = 'login' | 'register' | 'forgot' | 'setup' | 'home';

type UserData = {
  name: string; email: string; password: string;
  namaToko?: string; alamat?: string; telepon?: string;
  kota?: string; kodePos?: string; kategoriUsaha?: string;
  deskripsiToko?: string; isProfileComplete?: boolean;
};

export default function App() {
  const [screen,       setScreen]       = useState<Screen>('login');
  const [users,        setUsers]        = useState<Record<string, UserData>>({});
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [booting,      setBooting]      = useState(true);

  // ── Boot: cek sesi tersimpan ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [usersJson, sessionEmail] = await Promise.all([
          AsyncStorage.getItem(USERS_KEY),
          AsyncStorage.getItem(SESSION_KEY),
        ]);
        const loadedUsers: Record<string, UserData> = usersJson ? JSON.parse(usersJson) : {};
        setUsers(loadedUsers);
        if (sessionEmail && loadedUsers[sessionEmail]) {
          setCurrentEmail(sessionEmail);
          setScreen(loadedUsers[sessionEmail].isProfileComplete ? 'home' : 'setup');
        }
      } catch (e) {
        console.error('[App] boot error:', e);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const saveUsers = async (u: Record<string, UserData>) => {
    try { await AsyncStorage.setItem(USERS_KEY, JSON.stringify(u)); }
    catch (e) { console.error('[App] saveUsers error:', e); }
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const handleRegister = (name: string, email: string, password: string): boolean => {
    const key = email.trim().toLowerCase();
    if (users[key]) {
      Alert.alert('Gagal', 'Email sudah terdaftar');
      return false;
    }
    const newUser: UserData = { name: name.trim(), email: key, password, isProfileComplete: false };
    const updated = { ...users, [key]: newUser };
    setUsers(updated);
    saveUsers(updated);
    setCurrentEmail(key);
    AsyncStorage.setItem(SESSION_KEY, key).catch(console.error);
    setScreen('setup');
    return true;
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = (email: string, password: string): boolean => {
    const key = email.trim().toLowerCase();
    if (!users[key]) return false;
    if (users[key].password !== password) return false;
    setCurrentEmail(key);
    AsyncStorage.setItem(SESSION_KEY, key).catch(console.error);
    setScreen(users[key].isProfileComplete ? 'home' : 'setup');
    return true;
  };

  // ── Profile setup selesai ─────────────────────────────────────────────────
  const handleProfileComplete = (updates: Partial<UserData>) => {
    if (!currentEmail) return;
    const updated = {
      ...users,
      [currentEmail]: { ...users[currentEmail], ...updates, isProfileComplete: true },
    };
    setUsers(updated);
    saveUsers(updated);
    setScreen('home');
  };

  // ── Update user (dari ProfileScreen) ─────────────────────────────────────
  const handleUpdateUser = (updatedUser: Partial<UserData>) => {
    if (!currentEmail) return;
    const updated = { ...users, [currentEmail]: { ...users[currentEmail], ...updatedUser } };
    setUsers(updated);
    saveUsers(updated);
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await AsyncStorage.removeItem(SESSION_KEY); } catch {}
    setCurrentEmail(null);
    setScreen('login');
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (booting) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const currentUser = currentEmail ? users[currentEmail] : null;

  switch (screen) {
    case 'login':
      return <LoginScreen
        onLogin={handleLogin}
        switchToRegister={() => setScreen('register')}
        switchToForgot={() => setScreen('forgot')}
      />;

    case 'register':
      return <RegisterScreen
        onRegister={handleRegister}
        onBackToLogin={() => setScreen('login')}
      />;

    case 'forgot':
      return <ForgotPasswordScreen onBack={() => setScreen('login')} />;

    case 'setup':
      return currentUser ? (
        <ProfileSetupScreen
          user={currentUser}
          onComplete={handleProfileComplete}
          onLogout={handleLogout}
        />
      ) : null;

    case 'home':
      return currentUser ? (
        <HomeScreen
          user={currentUser}
          onLogout={handleLogout}
          onUpdateUser={handleUpdateUser}
        />
      ) : null;
  }
}

const styles = StyleSheet.create({
  loading: { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#312e81' },
});