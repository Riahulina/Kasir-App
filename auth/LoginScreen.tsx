// auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';

type Props = {
  onLogin: (email: string, password: string) => { success: boolean };
  switchToRegister: () => void;
};

export default function LoginScreen({ onLogin, switchToRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [btnScale] = useState(new Animated.Value(1));

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.96, duration: 120, useNativeDriver: false }),
      Animated.timing(btnScale, { toValue: 1, duration: 120, useNativeDriver: false }),
    ]).start();
  };

  const handleSubmit = () => {
    if (!email.trim() || !password.trim()) {
      alert('Email dan password wajib diisi');
      return;
    }
    onLogin(email.trim(), password.trim());
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.logo}>KasirApp</Text>
          <Text style={styles.tagline}>Kelola bisnis lebih cepat & aman</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Masuk ke Akun</Text>

          <View style={[styles.inputContainer, focused === 'email' && styles.focused]}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={[styles.inputContainer, focused === 'password' && styles.focused]}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <TouchableOpacity style={styles.forgot}>
            <Text style={styles.forgotText}>Lupa kata sandi?</Text>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => {
                animatePress();
                handleSubmit();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Masuk</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.or}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>atau</Text>
            <View style={styles.orLine} />
          </View>

          <TouchableOpacity style={styles.btnGoogle}>
            <Text style={styles.btnGoogleText}>Lanjutkan dengan Google</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Belum punya akun? </Text>
            <TouchableOpacity onPress={switchToRegister}>
              <Text style={styles.link}>Pendaftaran pengguna</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fc' },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 80 },
  header: { alignItems: 'left', marginBottom: 48 },
  logo: { fontSize: 44, fontWeight: '800', color: '#1e293b', letterSpacing: -1 },
  tagline: { fontSize: 16, color: '#64748b', marginTop: 8 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 6,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#0f172a', marginBottom: 32 },
  inputContainer: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  focused: {
    borderColor: '#6366f1',
    backgroundColor: '#ffffff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  input: { padding: 16, fontSize: 16, color: '#1e293b' },
  forgot: { alignSelf: 'flex-end', marginBottom: 28 },
  forgotText: { color: '#6366f1', fontWeight: '600', fontSize: 15 },
  btnPrimary: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  or: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  orLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  orText: { color: '#94a3b8', paddingHorizontal: 16, fontSize: 15 },
  btnGoogle: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  btnGoogleText: { color: '#1e293b', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: '#64748b', fontSize: 15 },
  link: { color: '#6366f1', fontWeight: '700', marginLeft: 4 },
});