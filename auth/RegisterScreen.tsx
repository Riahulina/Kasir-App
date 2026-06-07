import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { registerUser, UserProfile, UserRole } from "../auth/AuthService";

const { height } = Dimensions.get("window");

const C = {
  primary: "#16a34a",
  primaryDark: "#14532d",
  primaryLight: "#bbf7d0",
};

type Props = {
  onRegistered: (profile: UserProfile) => void;
  onBackToLogin: () => void;
};

export default function RegisterScreen({ onRegistered, onBackToLogin }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [role, setRole] = useState<UserRole>("kasir");
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(36)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 480,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 55,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const shake = () =>
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 7,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 55,
        useNativeDriver: true,
      }),
    ]).start();

  const handleRegister = async () => {
    setError("");
    if (!name.trim()) {
      setError("Nama tidak boleh kosong");
      shake();
      return;
    }
    if (!email.trim()) {
      setError("Email tidak boleh kosong");
      shake();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Format email tidak valid");
      shake();
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      shake();
      return;
    }
    if (password !== password2) {
      setError("Konfirmasi password tidak cocok");
      shake();
      return;
    }

    setLoading(true);
    try {
      const profile = await registerUser(
        email.trim().toLowerCase(),
        password,
        name.trim(),
        role,
      );
      onRegistered(profile);
    } catch (e: any) {
      const code = e?.code ?? "";
      if (code === "auth/email-already-in-use") {
        setError("Email sudah terdaftar");
      } else if (code === "auth/invalid-email") {
        setError("Format email tidak valid");
      } else if (code === "auth/weak-password") {
        setError("Password terlalu lemah");
      } else {
        setError("Registrasi gagal: " + (e?.message ?? "coba lagi"));
      }
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={onBackToLogin}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View
          style={[
            s.circle,
            { width: 220, height: 220, top: -80, right: -60, opacity: 0.1 },
          ]}
        />
        <Animated.View
          style={[
            s.brand,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={s.brandIcon}>
            <Ionicons name="person-add" size={26} color="#fff" />
          </View>
          <Text style={s.brandName}>Daftar Akun</Text>
          <Text style={s.brandTagline}>
            Buat akun baru untuk mulai berjualan
          </Text>
        </Animated.View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            s.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { translateX: shakeAnim }],
            },
          ]}
        >
          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          {/* ── Pilih Role ── */}
          <Text style={s.lbl}>Daftar sebagai</Text>
          <View style={s.roleRow}>
            {(["kasir", "outlet"] as UserRole[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.roleBtn, role === r && s.roleBtnActive]}
                onPress={() => setRole(r)}
              >
                <Ionicons
                  name={
                    r === "kasir" ? "calculator-outline" : "storefront-outline"
                  }
                  size={20}
                  color={role === r ? "#fff" : C.primary}
                />
                <Text style={[s.roleTxt, role === r && s.roleTxtActive]}>
                  {r === "kasir" ? "Kasir" : "Outlet"}
                </Text>
                <Text style={[s.roleDesc, role === r && { color: "#d1fae5" }]}>
                  {r === "kasir" ? "Operator transaksi" : "Pemilik toko"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Nama */}
          <Text style={s.lbl}>Nama Lengkap</Text>
          <View style={[s.inputBox, focused === "name" && s.inputFocus]}>
            <Ionicons
              name="person-outline"
              size={18}
              color={focused === "name" ? C.primary : "#94a3b8"}
              style={s.icoLeft}
            />
            <TextInput
              style={s.input}
              placeholder="Nama lengkap"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError("");
              }}
              autoCapitalize="words"
              returnKeyType="next"
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
            />
          </View>

          {/* Email */}
          <Text style={s.lbl}>Email</Text>
          <View style={[s.inputBox, focused === "email" && s.inputFocus]}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={focused === "email" ? C.primary : "#94a3b8"}
              style={s.icoLeft}
            />
            <TextInput
              style={s.input}
              placeholder="nama@domain.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
            />
          </View>

          {/* Password */}
          <Text style={s.lbl}>Password</Text>
          <View style={[s.inputBox, focused === "pass" && s.inputFocus]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={focused === "pass" ? C.primary : "#94a3b8"}
              style={s.icoLeft}
            />
            <TextInput
              style={s.input}
              placeholder="Minimal 6 karakter"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError("");
              }}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              returnKeyType="next"
              onFocus={() => setFocused("pass")}
              onBlur={() => setFocused(null)}
            />
            <TouchableOpacity
              onPress={() => setShowPass((p) => !p)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPass ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#94a3b8"
              />
            </TouchableOpacity>
          </View>

          {/* Konfirmasi Password */}
          <Text style={s.lbl}>Konfirmasi Password</Text>
          <View style={[s.inputBox, focused === "pass2" && s.inputFocus]}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={focused === "pass2" ? C.primary : "#94a3b8"}
              style={s.icoLeft}
            />
            <TextInput
              style={s.input}
              placeholder="Ulangi password"
              placeholderTextColor="#94a3b8"
              value={password2}
              onChangeText={(t) => {
                setPassword2(t);
                setError("");
              }}
              secureTextEntry={!showPass2}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              onFocus={() => setFocused("pass2")}
              onBlur={() => setFocused(null)}
            />
            <TouchableOpacity
              onPress={() => setShowPass2((p) => !p)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPass2 ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#94a3b8"
              />
            </TouchableOpacity>
          </View>

          {/* Tombol Daftar */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[s.btnPrimary, loading && { opacity: 0.8 }]}
              onPress={handleRegister}
              onPressIn={() =>
                Animated.spring(btnScale, {
                  toValue: 0.97,
                  useNativeDriver: true,
                  tension: 300,
                }).start()
              }
              onPressOut={() =>
                Animated.spring(btnScale, {
                  toValue: 1,
                  useNativeDriver: true,
                  tension: 300,
                }).start()
              }
              disabled={loading}
              activeOpacity={1}
            >
              {loading ? (
                <Text style={s.btnTxt}>Mendaftarkan...</Text>
              ) : (
                <Text style={s.btnTxt}>Daftar Sekarang</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={s.backToLogin} onPress={onBackToLogin}>
            <Ionicons
              name="arrow-back-outline"
              size={16}
              color={C.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={s.backToLoginTxt}>Kembali ke Login</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#14532d" },
  header: {
    height: height * 0.26,
    backgroundColor: "#14532d",
    overflow: "hidden",
    justifyContent: "flex-end",
    paddingBottom: 28,
    paddingHorizontal: 28,
  },
  backBtn: {
    position: "absolute",
    top: 48,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: 8,
  },
  circle: { position: "absolute", borderRadius: 999, backgroundColor: "#fff" },
  brand: { alignItems: "flex-start" },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  brandName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  brandTagline: { fontSize: 13, color: "#bbf7d0", marginTop: 3 },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 28,
    paddingTop: 28,
    minHeight: height * 0.78,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#ef4444",
  },
  errorTxt: { fontSize: 13, color: "#dc2626", flex: 1, fontWeight: "500" },
  lbl: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  // Role selector
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  roleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#16a34a",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  roleBtnActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  roleTxt: { fontSize: 14, fontWeight: "700", color: "#16a34a" },
  roleTxtActive: { color: "#fff" },
  roleDesc: { fontSize: 11, color: "#64748b", textAlign: "center" },
  // Inputs
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inputFocus: { borderColor: "#16a34a", backgroundColor: "#fff" },
  icoLeft: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
  },
  btnPrimary: {
    flexDirection: "row",
    backgroundColor: "#16a34a",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 7,
    marginBottom: 16,
  },
  btnTxt: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  backToLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  backToLoginTxt: { fontSize: 14, fontWeight: "600", color: "#16a34a" },
});
