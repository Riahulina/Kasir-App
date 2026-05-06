import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, Animated, Dimensions, StatusBar, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height } = Dimensions.get('window');
const USERS_KEY = '@kasirapp_users';

type Props = { onBack: () => void; };

export default function ForgotPasswordScreen({ onBack }: Props) {
  const [step,       setStep]       = useState<1|2|3>(1);
  const [email,      setEmail]      = useState('');
  const [newPass,    setNewPass]    = useState('');
  const [confPass,   setConfPass]   = useState('');
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [focused,    setFocused]    = useState<string|null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue:1, duration:400, useNativeDriver:true }),
      Animated.spring(slideAnim, { toValue:0, tension:55, friction:9, useNativeDriver:true }),
    ]).start();
  }, []);

  const shake = () => Animated.sequence([
    Animated.timing(shakeAnim, { toValue:10,  duration:55, useNativeDriver:true }),
    Animated.timing(shakeAnim, { toValue:-10, duration:55, useNativeDriver:true }),
    Animated.timing(shakeAnim, { toValue:7,   duration:55, useNativeDriver:true }),
    Animated.timing(shakeAnim, { toValue:0,   duration:55, useNativeDriver:true }),
  ]).start();

  const transitionTo = (nextStep: 1|2|3) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue:0, duration:150, useNativeDriver:true }),
      Animated.timing(slideAnim, { toValue:20, duration:150, useNativeDriver:true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(-20);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue:1, duration:280, useNativeDriver:true }),
        Animated.spring(slideAnim, { toValue:0, tension:55, friction:9, useNativeDriver:true }),
      ]).start();
    });
  };

  // Step 1 — cek email ada di storage
  const handleCheckEmail = async () => {
    setError('');
    if (!email.trim()) { setError('Email tidak boleh kosong'); shake(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Format email tidak valid'); shake(); return; }
    setLoading(true);
    try {
      const json = await AsyncStorage.getItem(USERS_KEY);
      const users = json ? JSON.parse(json) : {};
      const trimmed = email.trim().toLowerCase();
      if (!users[trimmed]) {
        setError('Email tidak ditemukan'); shake();
      } else {
        transitionTo(2);
      }
    } catch {
      setError('Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — reset password
  const handleResetPassword = async () => {
    setError('');
    if (newPass.length < 6) { setError('Password minimal 6 karakter'); shake(); return; }
    if (newPass !== confPass) { setError('Konfirmasi password tidak cocok'); shake(); return; }
    setLoading(true);
    try {
      const json = await AsyncStorage.getItem(USERS_KEY);
      const users = json ? JSON.parse(json) : {};
      const trimmed = email.trim().toLowerCase();
      users[trimmed] = { ...users[trimmed], password: newPass };
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      transitionTo(3);
    } catch {
      setError('Gagal menyimpan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  const stepTitle = ['Lupa Password', 'Buat Password Baru', 'Password Berhasil Diubah'];
  const stepSub = [
    'Masukkan email yang terdaftar untuk mereset password',
    `Password baru untuk akun ${email}`,
    'Kamu sudah bisa masuk dengan password baru',
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

      {/* Header */}
      <View style={s.header}>
        <View style={[s.circle,{width:220,height:220,top:-80,right:-60,opacity:0.1}]} />
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerContent}>
          <View style={s.headerIcon}>
            <Ionicons name={step===3?'checkmark-circle':'lock-open-outline'} size={28} color="#fff" />
          </View>
          <Text style={s.headerTitle}>{stepTitle[step-1]}</Text>
          <Text style={s.headerSub}>{stepSub[step-1]}</Text>
        </View>
        {/* Progress */}
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${(step/3)*100}%` as any }]} />
        </View>
      </View>

      <ScrollView
        style={{ flex:1 }}
        contentContainerStyle={{ flexGrow:1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="none"
      >
        <Animated.View style={[s.card, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { translateX: shakeAnim }],
        }]}>

          {/* STEP 1 */}
          {step === 1 && (
            <>
              {!!error && <View style={s.errorBox}><Ionicons name="alert-circle" size={16} color="#ef4444" /><Text style={s.errorTxt}>{error}</Text></View>}
              <Text style={s.lbl}>Alamat Email Terdaftar</Text>
              <View style={[s.inputBox, focused==='email'&&s.inputFocus, !!error&&s.inputErr]}>
                <Ionicons name="mail-outline" size={18} color={focused==='email'?'#6366f1':'#94a3b8'} style={s.icoLeft} />
                <TextInput
                  style={s.input}
                  placeholder="nama@domain.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={t=>{ setEmail(t); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleCheckEmail}
                  onFocus={()=>setFocused('email')}
                  onBlur={()=>setFocused(null)}
                />
              </View>
              <View style={s.infoBox}>
                <Ionicons name="information-circle-outline" size={15} color="#6366f1" />
                <Text style={s.infoTxt}>Karena aplikasi offline, password baru akan langsung disimpan di perangkat kamu.</Text>
              </View>
              <TouchableOpacity style={[s.btnPrimary, loading&&{opacity:0.8}]} onPress={handleCheckEmail} disabled={loading}>
                {loading
                  ? <Text style={s.btnTxt}>Memeriksa...</Text>
                  : <><Text style={s.btnTxt}>Lanjut</Text><Ionicons name="arrow-forward" size={18} color="#fff" style={{marginLeft:8}} /></>
                }
              </TouchableOpacity>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              {!!error && <View style={s.errorBox}><Ionicons name="alert-circle" size={16} color="#ef4444" /><Text style={s.errorTxt}>{error}</Text></View>}

              <Text style={s.lbl}>Password Baru</Text>
              <View style={[s.inputBox, focused==='new'&&s.inputFocus, !!error&&s.inputErr]}>
                <Ionicons name="lock-closed-outline" size={18} color={focused==='new'?'#6366f1':'#94a3b8'} style={s.icoLeft} />
                <TextInput
                  style={s.input}
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor="#94a3b8"
                  value={newPass}
                  onChangeText={t=>{ setNewPass(t); setError(''); }}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onFocus={()=>setFocused('new')}
                  onBlur={()=>setFocused(null)}
                />
                <TouchableOpacity onPress={()=>setShowNew(p=>!p)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                  <Ionicons name={showNew?'eye-off-outline':'eye-outline'} size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text style={s.lbl}>Konfirmasi Password Baru</Text>
              <View style={[s.inputBox, focused==='conf'&&s.inputFocus, !!error&&s.inputErr]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={focused==='conf'?'#6366f1':'#94a3b8'} style={s.icoLeft} />
                <TextInput
                  style={s.input}
                  placeholder="Ulangi password baru"
                  placeholderTextColor="#94a3b8"
                  value={confPass}
                  onChangeText={t=>{ setConfPass(t); setError(''); }}
                  secureTextEntry={!showConf}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                  onFocus={()=>setFocused('conf')}
                  onBlur={()=>setFocused(null)}
                />
                <TouchableOpacity onPress={()=>setShowConf(p=>!p)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                  <Ionicons name={showConf?'eye-off-outline':'eye-outline'} size={18} color="#94a3b8" />
                </TouchableOpacity>
                {confPass.length>0 && (
                  <Ionicons name={confPass===newPass?'checkmark-circle':'close-circle'} size={17} color={confPass===newPass?'#22c55e':'#ef4444'} style={{marginLeft:6}} />
                )}
              </View>

              {/* Strength tips */}
              <View style={s.tipRow}>
                {[{lbl:'6+ karakter',ok:newPass.length>=6},{lbl:'Huruf kapital',ok:/[A-Z]/.test(newPass)},{lbl:'Angka',ok:/[0-9]/.test(newPass)}].map((t,i)=>(
                  <View key={i} style={s.tipItem}>
                    <Ionicons name={t.ok?'checkmark-circle':'ellipse-outline'} size={13} color={t.ok?'#22c55e':'#cbd5e1'} />
                    <Text style={[s.tipTxt, t.ok&&{color:'#22c55e',fontWeight:'600'}]}>{t.lbl}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={[s.btnPrimary, loading&&{opacity:0.8}]} onPress={handleResetPassword} disabled={loading}>
                {loading
                  ? <Text style={s.btnTxt}>Menyimpan...</Text>
                  : <><Ionicons name="checkmark-circle" size={19} color="#fff" style={{marginRight:8}} /><Text style={s.btnTxt}>Simpan Password Baru</Text></>
                }
              </TouchableOpacity>
              <TouchableOpacity style={s.backLink} onPress={()=>transitionTo(1)}>
                <Ionicons name="arrow-back" size={15} color="#64748b" />
                <Text style={s.backLinkTxt}>Kembali</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP 3 — Sukses */}
          {step === 3 && (
            <View style={s.successWrap}>
              <View style={s.successIcon}>
                <Ionicons name="checkmark" size={40} color="#fff" />
              </View>
              <Text style={s.successTitle}>Password Berhasil Diubah!</Text>
              <Text style={s.successSub}>Password untuk akun <Text style={{fontWeight:'800',color:'#0f172a'}}>{email}</Text> sudah diperbarui. Silakan masuk kembali.</Text>
              <TouchableOpacity style={s.btnPrimary} onPress={onBack}>
                <Ionicons name="log-in-outline" size={19} color="#fff" style={{marginRight:8}} />
                <Text style={s.btnTxt}>Masuk Sekarang</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:{ flex:1, backgroundColor:'#312e81' },
  header:{ backgroundColor:'#312e81', overflow:'hidden', paddingTop:Platform.OS==='ios'?54:36, paddingHorizontal:24, paddingBottom:22 },
  circle:{ position:'absolute', borderRadius:999, backgroundColor:'#fff' },
  backBtn:{ width:38,height:38,borderRadius:12,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center',marginBottom:16 },
  headerContent:{ marginBottom:14 },
  headerIcon:{ width:52,height:52,borderRadius:16,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center',marginBottom:12 },
  headerTitle:{ fontSize:24,fontWeight:'900',color:'#fff' },
  headerSub:{ fontSize:13,color:'#a5b4fc',marginTop:4,lineHeight:18 },
  progressBar:{ height:5,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:3,overflow:'hidden' },
  progressFill:{ height:5,backgroundColor:'#a5b4fc',borderRadius:3 },
  card:{ backgroundColor:'#fff',borderTopLeftRadius:30,borderTopRightRadius:30,padding:28,paddingTop:30,minHeight:height*0.66 },
  errorBox:{ flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fef2f2',borderRadius:12,padding:12,marginBottom:16,borderLeftWidth:3,borderLeftColor:'#ef4444' },
  errorTxt:{ fontSize:13,color:'#dc2626',flex:1,fontWeight:'500' },
  lbl:{ fontSize:13,fontWeight:'700',color:'#475569',marginBottom:8 },
  inputBox:{ flexDirection:'row',alignItems:'center',backgroundColor:'#f8fafc',borderRadius:14,borderWidth:1.5,borderColor:'#e2e8f0',paddingHorizontal:14,marginBottom:18 },
  inputFocus:{ borderColor:'#6366f1',backgroundColor:'#fff' },
  inputErr:{ borderColor:'#fca5a5' },
  icoLeft:{ marginRight:10 },
  input:{ flex:1,fontSize:15,color:'#0f172a',paddingVertical:Platform.OS==='ios'?14:12 },
  infoBox:{ flexDirection:'row',alignItems:'flex-start',gap:8,backgroundColor:'#eef2ff',borderRadius:12,padding:12,marginBottom:20 },
  infoTxt:{ fontSize:12.5,color:'#4338ca',flex:1,lineHeight:17 },
  btnPrimary:{ flexDirection:'row',backgroundColor:'#6366f1',borderRadius:16,paddingVertical:16,alignItems:'center',justifyContent:'center',shadowColor:'#6366f1',shadowOffset:{width:0,height:6},shadowOpacity:0.35,shadowRadius:12,elevation:7,marginBottom:12 },
  btnTxt:{ fontSize:16,fontWeight:'800',color:'#fff' },
  backLink:{ flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:8 },
  backLinkTxt:{ fontSize:13,color:'#64748b' },
  tipRow:{ flexDirection:'row',gap:12,marginBottom:20 },
  tipItem:{ flexDirection:'row',alignItems:'center',gap:4 },
  tipTxt:{ fontSize:11.5,color:'#94a3b8' },
  successWrap:{ alignItems:'center',paddingTop:16 },
  successIcon:{ width:88,height:88,borderRadius:44,backgroundColor:'#22c55e',alignItems:'center',justifyContent:'center',marginBottom:20,shadowColor:'#22c55e',shadowOffset:{width:0,height:8},shadowOpacity:0.4,shadowRadius:16,elevation:10 },
  successTitle:{ fontSize:24,fontWeight:'800',color:'#0f172a',marginBottom:10 },
  successSub:{ fontSize:14,color:'#64748b',textAlign:'center',lineHeight:22,marginBottom:32 },
});