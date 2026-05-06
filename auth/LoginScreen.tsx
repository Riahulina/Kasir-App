import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Platform, ScrollView, Animated, Dimensions, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

type Props = {
  onLogin: (email: string, password: string) => boolean;
  switchToRegister: () => void;
  switchToForgot?: () => void;
};

export default function LoginScreen({ onLogin, switchToRegister, switchToForgot }: Props) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focused,  setFocused]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(36)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const btnScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const shake = () => Animated.sequence([
    Animated.timing(shakeAnim, { toValue: 10,  duration: 55, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: 7,   duration: 55, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: 0,   duration: 55, useNativeDriver: true }),
  ]).start();

  const handleLogin = () => {
    setError('');
    if (!email.trim())    { setError('Email tidak boleh kosong'); shake(); return; }
    if (!password.trim()) { setError('Password tidak boleh kosong'); shake(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Format email tidak valid'); shake(); return;
    }
    setLoading(true);
    setTimeout(() => {
      const ok = onLogin(email.trim().toLowerCase(), password);
      if (!ok) { setError('Email atau password salah'); shake(); }
      setLoading(false);
    }, 500);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

      {/* Header */}
      <View style={s.header}>
        <View style={[s.circle, { width:280, height:280, top:-100, right:-80, opacity:0.1 }]} />
        <View style={[s.circle, { width:160, height:160, top:30, left:-50, opacity:0.07 }]} />
        <Animated.View style={[s.brand, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={s.brandIcon}>
            <Ionicons name="storefront" size={30} color="#fff" />
          </View>
          <Text style={s.brandName}>KasirApp</Text>
          <Text style={s.brandTagline}>Kelola bisnis lebih cepat & aman</Text>
        </Animated.View>
      </View>

      {/* Form — ScrollView saja tanpa KeyboardAvoidingView di Android */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="none"
      >
        <Animated.View style={[s.card, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { translateX: shakeAnim }],
        }]}>
          <Text style={s.cardTitle}>Masuk ke Akun</Text>
          <Text style={s.cardSub}>Selamat datang kembali 👋</Text>

          {/* Error */}
          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          {/* Email */}
          <Text style={s.lbl}>Email</Text>
          <View style={[s.inputBox, focused==='email' && s.inputFocus, !!error && s.inputErr]}>
            <Ionicons name="mail-outline" size={18} color={focused==='email'?'#6366f1':'#94a3b8'} style={s.icoLeft} />
            <TextInput
              style={s.input}
              placeholder="nama@domain.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
            {email.length > 0 && (
              <TouchableOpacity onPress={() => setEmail('')} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
                <Ionicons name="close-circle" size={17} color="#cbd5e1" />
              </TouchableOpacity>
            )}
          </View>

          {/* Password */}
          <View style={s.lblRow}>
            <Text style={s.lbl}>Password</Text>
            {switchToForgot && (
              <TouchableOpacity onPress={switchToForgot} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
                <Text style={s.forgotTxt}>Lupa password?</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[s.inputBox, focused==='pass' && s.inputFocus, !!error && s.inputErr]}>
            <Ionicons name="lock-closed-outline" size={18} color={focused==='pass'?'#6366f1':'#94a3b8'} style={s.icoLeft} />
            <TextInput
              style={s.input}
              placeholder="Masukkan password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={t => { setPassword(t); setError(''); }}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              onFocus={() => setFocused('pass')}
              onBlur={() => setFocused(null)}
            />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <Ionicons name={showPass?'eye-off-outline':'eye-outline'} size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Tombol Masuk */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[s.btnPrimary, loading && { opacity: 0.8 }]}
              onPress={handleLogin}
              onPressIn={() => Animated.spring(btnScale,{toValue:0.97,useNativeDriver:true,tension:300}).start()}
              onPressOut={() => Animated.spring(btnScale,{toValue:1,useNativeDriver:true,tension:300}).start()}
              disabled={loading}
              activeOpacity={1}
            >
              {loading
                ? <><LoadingDots /><Text style={s.btnTxt}>Memeriksa...</Text></>
                : <Text style={s.btnTxt}>Masuk</Text>
              }
            </TouchableOpacity>
          </Animated.View>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>belum punya akun?</Text>
            <View style={s.dividerLine} />
          </View>

          <TouchableOpacity style={s.btnOutline} onPress={switchToRegister}>
            <Ionicons name="person-add-outline" size={18} color="#6366f1" style={{ marginRight: 8 }} />
            <Text style={s.btnOutlineTxt}>Daftar Sekarang</Text>
          </TouchableOpacity>

          <Text style={s.footerNote}>
            Dengan masuk, Anda menyetujui{' '}
            <Text style={{ color:'#6366f1' }}>Syarat & Ketentuan</Text>
            {' '}dan{' '}
            <Text style={{ color:'#6366f1' }}>Kebijakan Privasi</Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function LoadingDots() {
  const d = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    d.forEach((v,i) => Animated.loop(Animated.sequence([
      Animated.delay(i*140),
      Animated.timing(v,{toValue:-5,duration:220,useNativeDriver:true}),
      Animated.timing(v,{toValue:0, duration:220,useNativeDriver:true}),
    ])).start());
  }, []);
  return (
    <View style={{flexDirection:'row',alignItems:'center',marginRight:8}}>
      {d.map((v,i)=>(
        <Animated.View key={i} style={{width:6,height:6,borderRadius:3,backgroundColor:'#fff',marginHorizontal:2,transform:[{translateY:v}]}} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex:1, backgroundColor:'#312e81' },
  header: { height:height*0.3, backgroundColor:'#312e81', overflow:'hidden', justifyContent:'flex-end', paddingBottom:28, paddingHorizontal:28 },
  circle: { position:'absolute', borderRadius:999, backgroundColor:'#fff' },
  brand: { alignItems:'flex-start' },
  brandIcon: { width:54,height:54,borderRadius:16,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center',marginBottom:12 },
  brandName: { fontSize:32,fontWeight:'900',color:'#fff',letterSpacing:-1 },
  brandTagline: { fontSize:14,color:'#a5b4fc',marginTop:4 },
  card: { backgroundColor:'#fff',borderTopLeftRadius:30,borderTopRightRadius:30,padding:28,paddingTop:30,minHeight:height*0.74 },
  cardTitle: { fontSize:26,fontWeight:'800',color:'#0f172a',marginBottom:4 },
  cardSub: { fontSize:15,color:'#64748b',marginBottom:24 },
  errorBox: { flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fef2f2',borderRadius:12,padding:12,marginBottom:16,borderLeftWidth:3,borderLeftColor:'#ef4444' },
  errorTxt: { fontSize:13,color:'#dc2626',flex:1,fontWeight:'500' },
  lbl: { fontSize:13,fontWeight:'700',color:'#475569',marginBottom:8,letterSpacing:0.2 },
  lblRow: { flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8 },
  forgotTxt: { fontSize:13,color:'#6366f1',fontWeight:'600' },
  inputBox: { flexDirection:'row',alignItems:'center',backgroundColor:'#f8fafc',borderRadius:14,borderWidth:1.5,borderColor:'#e2e8f0',paddingHorizontal:14,marginBottom:18 },
  inputFocus: { borderColor:'#6366f1',backgroundColor:'#fff' },
  inputErr: { borderColor:'#fca5a5' },
  icoLeft: { marginRight:10 },
  input: { flex:1,fontSize:15,color:'#0f172a',paddingVertical:Platform.OS==='ios'?14:12 },
  btnPrimary: { flexDirection:'row',backgroundColor:'#6366f1',borderRadius:16,paddingVertical:16,alignItems:'center',justifyContent:'center',shadowColor:'#6366f1',shadowOffset:{width:0,height:6},shadowOpacity:0.35,shadowRadius:12,elevation:7,marginBottom:20 },
  btnTxt: { fontSize:17,fontWeight:'800',color:'#fff',letterSpacing:0.3 },
  divider: { flexDirection:'row',alignItems:'center',marginBottom:16 },
  dividerLine: { flex:1,height:1,backgroundColor:'#e2e8f0' },
  dividerTxt: { fontSize:13,color:'#94a3b8',paddingHorizontal:12 },
  btnOutline: { flexDirection:'row',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'#6366f1',borderRadius:16,paddingVertical:14,marginBottom:24 },
  btnOutlineTxt: { fontSize:15,fontWeight:'700',color:'#6366f1' },
  footerNote: { fontSize:11.5,color:'#94a3b8',textAlign:'center',lineHeight:18 },
});