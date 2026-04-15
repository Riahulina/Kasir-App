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
  Alert,
  Animated,
} from 'react-native';

type Props = {
  onRegister: (name: string, email: string, password: string) => boolean;
  onBackToLogin: () => void;
};

export default function RegisterScreen({ onRegister, onBackToLogin }: Props) {
  const [name, setName] = useState('');
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
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Perhatian', 'Semua field wajib diisi');
      return;
    }
    onRegister(name.trim(), email.trim(), password.trim());
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.logo}>Pendaftaran</Text>
          <Text style={styles.tagline}>Mulai perjalanan bisnis Anda</Text>
        </View>

        
          

          <View style={[styles.inputContainer, focused === 'name' && styles.focused]}>
            <TextInput
              style={styles.input}
              placeholder="Nama"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholderTextColor="#9ca3af"
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
            />
          </View>

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
 <Text style={styles.footerText}>Pastikan data yang anda masukkan adalah benar </Text>
 <br/>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => {
                animatePress();
                handleSubmit();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Daftar</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Sudah punya akun? </Text>
            <TouchableOpacity onPress={onBackToLogin}>
              <Text style={styles.link}>Masuk</Text>
            </TouchableOpacity>
          </View>
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Gunakan styles yang sama seperti LoginScreen (copy saja)
const styles = StyleSheet.create({
  // ... copy semua styles dari LoginScreen di atas
  container: { flex: 1, backgroundColor: '#f8f9fc' },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 80 },
  header: { alignItems: 'left', marginBottom: 48 },
  logo: { fontSize: 44, fontWeight: '800', color: '#1e293b' },
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
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dfeaf4',
  },
  focused: {
    borderColor: '#6366f1',
    backgroundColor: '#ffffff',
    shadowColor: '#6366f1',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  input: { padding: 16, fontSize: 16, color: '#1e293b' },
  btnPrimary: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: '#64748b', fontSize: 15 },
  link: { color: '#6366f1', fontWeight: '700', marginLeft: 4 },
});