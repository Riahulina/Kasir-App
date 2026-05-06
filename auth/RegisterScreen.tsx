import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Platform, ScrollView, Animated, Dimensions, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

type Props = {
  onRegister: (name: string, email: string, password: string) => boolean;
  onBackToLogin: () => void;
};

const passStrength = (pw: string) => {
  if (!pw) return { level:0, label:'', color:'#e2e8f0' };
  if (pw.length < 6)  return { level:1, label:'Lemah',     color:'#ef4444' };
  if (pw.length < 8)  return { level:2, label:'Cukup',     color:'#f97316' };
  const extras = [/[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  if (extras >= 2) return { level:4, label:'Sangat Kuat', color:'#16a34a' };
  if (extras >= 1) return { level:3, label:'Kuat',        color:'#22c55e' };
  return { level:2, label:'Cukup', color:'#f97316' };
};

export default function RegisterScreen({ onRegister, onBackToLogin }: Props) {
  const [step,    setStep]    = useState<1|2>(1);
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [phone,   setPhone]   = useState('');
  const [pass,    setPass]    = useState('');
  const [conf,    setConf]    = useState('');
  const [agree,   setAgree]   = useState(false);
  const [showP,   setShowP]   = useState(false);
  const [showC,   setShowC]   = useState(false);
  const [focused, setFocused] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<Record<string,string>>({});

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(36)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const btnScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue:1, duration:480, useNativeDriver:true }),
      Animated.spring(slideAnim, { toValue:0, tension:55, friction:9, useNativeDriver:true }),
    ]).start();
  }, []);

  const shake = () => Animated.sequence([
    Animated.timing(shakeAnim, { toValue:10,  duration:55, useNativeDriver:true }),
    Animated.timing(shakeAnim, { toValue:-10, duration:55, useNativeDriver:true }),
    Animated.timing(shakeAnim, { toValue:7,   duration:55, useNativeDriver:true }),
    Animated.timing(shakeAnim, { toValue:0,   duration:55, useNativeDriver:true }),
  ]).start();

  const clearErr = (k: string) => setErrors(p => { const n={...p}; delete n[k]; return n; });

  const goStep2 = () => {
    const e: Record<string,string> = {};
    if (name.trim().length < 3)  e.name  = 'Nama minimal 3 karakter';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Format email tidak valid';
    if (Object.keys(e).length) { setErrors(e); shake(); return; }
    setErrors({});
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue:0, duration:150, useNativeDriver:true }),
      Animated.timing(slideAnim, { toValue:20, duration:150, useNativeDriver:true }),
    ]).start(() => {
      setStep(2); slideAnim.setValue(-20);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue:1, duration:280, useNativeDriver:true }),
        Animated.spring(slideAnim, { toValue:0, tension:55, friction:9, useNativeDriver:true }),
      ]).start();
    });
  };

  const doRegister = () => {
    const e: Record<string,string> = {};
    if (pass.length < 6)   e.pass = 'Password minimal 6 karakter';
    if (pass !== conf)     e.conf = 'Konfirmasi tidak cocok';
    if (!agree)            e.agree = 'Setujui syarat & ketentuan';
    if (Object.keys(e).length) { setErrors(e); shake(); return; }
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      const ok = onRegister(name.trim(), email.trim().toLowerCase(), pass);
      if (!ok) {
        setErrors({ email:'Email sudah terdaftar' });
        Animated.parallel([
          Animated.timing(fadeAnim,  { toValue:0, duration:150, useNativeDriver:true }),
          Animated.timing(slideAnim, { toValue:20, duration:150, useNativeDriver:true }),
        ]).start(() => {
          setStep(1); slideAnim.setValue(-20);
          Animated.parallel([
            Animated.timing(fadeAnim,  { toValue:1, duration:280, useNativeDriver:true }),
            Animated.spring(slideAnim, { toValue:0, tension:55, friction:9, useNativeDriver:true }),
          ]).start();
        });
        shake();
      }
      setLoading(false);
    }, 600);
  };

  const pw = passStrength(pass);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

      {/* Header */}
      <View style={s.header}>
        <View style={[s.circle,{width:240,height:240,top:-80,right:-65,opacity:0.1}]} />
        <View style={[s.circle,{width:150,height:150,top:20,left:-45,opacity:0.07}]} />
        <Animated.View style={{ opacity:fadeAnim }}>
          <View style={s.headerTop}>
            <TouchableOpacity style={s.backBtn} onPress={onBackToLogin}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={s.headerTitle}>Daftar Akun</Text>
              <Text style={s.headerTagline}>KasirApp · Gratis selamanya</Text>
            </View>
          </View>
          {/* Step indicator */}
          <View style={s.stepRow}>
            <View style={s.stepItem}>
              <View style={[s.stepCircle, s.stepActive]}>
                {step===2 ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Text style={s.stepNum}>1</Text>}
              </View>
              <Text style={[s.stepLbl, {color:'#fff'}]}>Info Dasar</Text>
            </View>
            <View style={[s.stepLine, step===2&&s.stepLineActive]} />
            <View style={s.stepItem}>
              <View style={[s.stepCircle, step===2?s.stepActive:s.stepInactive]}>
                <Text style={[s.stepNum, step===1&&{color:'#a5b4fc'}]}>2</Text>
              </View>
              <Text style={[s.stepLbl, step===2&&{color:'#fff'}]}>Password</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Form */}
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
          {step===1 && (
            <>
              <Text style={s.cardTitle}>Siapa nama kamu?</Text>
              <Text style={s.cardSub}>Isi data dasar untuk membuat akun</Text>

              {errors.name && <Text style={s.errTxt}>{errors.name}</Text>}
              <Field label="Nama Lengkap *" icon="person-outline" placeholder="Contoh: Budi Santoso"
                value={name} onChange={t=>{ setName(t); clearErr('name'); }}
                fieldKey="name" focused={focused} onFocus={setFocused}
                hasError={!!errors.name} autoCapitalize="words" />

              {errors.email && <Text style={s.errTxt}>{errors.email}</Text>}
              <Field label="Alamat Email *" icon="mail-outline" placeholder="nama@domain.com"
                value={email} onChange={t=>{ setEmail(t); clearErr('email'); }}
                fieldKey="email" focused={focused} onFocus={setFocused}
                hasError={!!errors.email} keyboard="email-address" />

              <Field label="Nomor HP (opsional)" icon="phone-portrait-outline" placeholder="08xxxxxxxxxx"
                value={phone} onChange={setPhone}
                fieldKey="phone" focused={focused} onFocus={setFocused}
                keyboard="phone-pad" />

              <View style={s.infoBox}>
                <Ionicons name="shield-checkmark-outline" size={15} color="#6366f1" />
                <Text style={s.infoTxt}>Data tersimpan aman di perangkat Anda. Tidak dikirim ke server manapun.</Text>
              </View>

              <Animated.View style={{ transform:[{scale:btnScale}] }}>
                <TouchableOpacity style={s.btnPrimary} onPress={goStep2}
                  onPressIn={()=>Animated.spring(btnScale,{toValue:0.97,useNativeDriver:true,tension:300}).start()}
                  onPressOut={()=>Animated.spring(btnScale,{toValue:1,useNativeDriver:true,tension:300}).start()}
                  activeOpacity={1}>
                  <Text style={s.btnTxt}>Lanjut</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{marginLeft:8}} />
                </TouchableOpacity>
              </Animated.View>
            </>
          )}

          {/* STEP 2 */}
          {step===2 && (
            <>
              <Text style={s.cardTitle}>Buat Password</Text>
              <Text style={s.cardSub}>Gunakan kombinasi huruf, angka, dan simbol</Text>

              {/* Summary akun */}
              <View style={s.summary}>
                <View style={s.summaryAvatar}><Text style={s.summaryAvatarTxt}>{name.charAt(0).toUpperCase()}</Text></View>
                <View style={{flex:1}}>
                  <Text style={s.summaryName}>{name}</Text>
                  <Text style={s.summaryEmail}>{email}</Text>
                </View>
                <TouchableOpacity onPress={()=>{ Animated.parallel([Animated.timing(fadeAnim,{toValue:0,duration:150,useNativeDriver:true}),Animated.timing(slideAnim,{toValue:20,duration:150,useNativeDriver:true})]).start(()=>{ setStep(1); slideAnim.setValue(-20); Animated.parallel([Animated.timing(fadeAnim,{toValue:1,duration:280,useNativeDriver:true}),Animated.spring(slideAnim,{toValue:0,tension:55,friction:9,useNativeDriver:true})]).start(); }); }} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                  <Ionicons name="create-outline" size={18} color="#6366f1" />
                </TouchableOpacity>
              </View>

              {errors.pass && <Text style={s.errTxt}>{errors.pass}</Text>}
              <Text style={s.lbl}>Password *</Text>
              <View style={[s.inputBox, focused==='pass'&&s.inputFocus, !!errors.pass&&s.inputErr]}>
                <Ionicons name="lock-closed-outline" size={18} color={focused==='pass'?'#6366f1':'#94a3b8'} style={s.icoLeft} />
                <TextInput style={s.input} placeholder="Min. 6 karakter" placeholderTextColor="#94a3b8"
                  value={pass} onChangeText={t=>{ setPass(t); clearErr('pass'); }}
                  secureTextEntry={!showP} autoCapitalize="none" returnKeyType="next"
                  onFocus={()=>setFocused('pass')} onBlur={()=>setFocused(null)} />
                <TouchableOpacity onPress={()=>setShowP(p=>!p)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                  <Ionicons name={showP?'eye-off-outline':'eye-outline'} size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {pass.length > 0 && (
                <View style={s.strengthRow}>
                  <View style={s.bars}>
                    {[1,2,3,4].map(i=>(
                      <View key={i} style={[s.bar, {backgroundColor:i<=pw.level?pw.color:'#e2e8f0'}]} />
                    ))}
                  </View>
                  <Text style={[s.strengthLbl,{color:pw.color}]}>{pw.label}</Text>
                </View>
              )}

              <View style={s.tipRow}>
                {[{lbl:'6+ karakter',ok:pass.length>=6},{lbl:'Huruf kapital',ok:/[A-Z]/.test(pass)},{lbl:'Angka (0-9)',ok:/[0-9]/.test(pass)},{lbl:'Simbol',ok:/[^A-Za-z0-9]/.test(pass)}].map((t,i)=>(
                  <View key={i} style={s.tipItem}>
                    <Ionicons name={t.ok?'checkmark-circle':'ellipse-outline'} size={13} color={t.ok?'#22c55e':'#cbd5e1'} />
                    <Text style={[s.tipTxt,t.ok&&{color:'#22c55e',fontWeight:'600'}]}>{t.lbl}</Text>
                  </View>
                ))}
              </View>

              {errors.conf && <Text style={s.errTxt}>{errors.conf}</Text>}
              <Text style={s.lbl}>Konfirmasi Password *</Text>
              <View style={[s.inputBox, focused==='conf'&&s.inputFocus, !!errors.conf&&s.inputErr]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={focused==='conf'?'#6366f1':'#94a3b8'} style={s.icoLeft} />
                <TextInput style={s.input} placeholder="Ulangi password" placeholderTextColor="#94a3b8"
                  value={conf} onChangeText={t=>{ setConf(t); clearErr('conf'); }}
                  secureTextEntry={!showC} autoCapitalize="none" returnKeyType="done"
                  onSubmitEditing={doRegister}
                  onFocus={()=>setFocused('conf')} onBlur={()=>setFocused(null)} />
                <TouchableOpacity onPress={()=>setShowC(p=>!p)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                  <Ionicons name={showC?'eye-off-outline':'eye-outline'} size={18} color="#94a3b8" />
                </TouchableOpacity>
                {conf.length>0 && <Ionicons name={conf===pass?'checkmark-circle':'close-circle'} size={17} color={conf===pass?'#22c55e':'#ef4444'} style={{marginLeft:6}} />}
              </View>

              {/* Agree */}
              <TouchableOpacity style={[s.agreeRow, !!errors.agree&&{backgroundColor:'#fef2f2'}]} onPress={()=>{ setAgree(a=>!a); clearErr('agree'); }}>
                <View style={[s.checkbox, agree&&s.checkboxActive]}>
                  {agree && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={s.agreeTxt}>Saya menyetujui <Text style={{color:'#6366f1',fontWeight:'700'}}>Syarat & Ketentuan</Text> dan <Text style={{color:'#6366f1',fontWeight:'700'}}>Kebijakan Privasi</Text> KasirApp</Text>
              </TouchableOpacity>
              {errors.agree && <Text style={[s.errTxt,{marginTop:-10,marginBottom:12}]}>{errors.agree}</Text>}

              <Animated.View style={{ transform:[{scale:btnScale}] }}>
                <TouchableOpacity style={[s.btnPrimary, loading&&{opacity:0.8}]} onPress={doRegister} disabled={loading}
                  onPressIn={()=>Animated.spring(btnScale,{toValue:0.97,useNativeDriver:true,tension:300}).start()}
                  onPressOut={()=>Animated.spring(btnScale,{toValue:1,useNativeDriver:true,tension:300}).start()}
                  activeOpacity={1}>
                  {loading
                    ? <Text style={s.btnTxt}>Mendaftarkan...</Text>
                    : <><Text style={s.btnTxt}>Buat Akun</Text><Ionicons name="checkmark-circle" size={18} color="#fff" style={{marginLeft:8}} /></>
                  }
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity style={s.backLink} onPress={()=>{ Animated.parallel([Animated.timing(fadeAnim,{toValue:0,duration:150,useNativeDriver:true}),Animated.timing(slideAnim,{toValue:20,duration:150,useNativeDriver:true})]).start(()=>{ setStep(1); slideAnim.setValue(-20); Animated.parallel([Animated.timing(fadeAnim,{toValue:1,duration:280,useNativeDriver:true}),Animated.spring(slideAnim,{toValue:0,tension:55,friction:9,useNativeDriver:true})]).start(); }); }}>
                <Ionicons name="arrow-back" size={15} color="#64748b" />
                <Text style={s.backLinkTxt}>Kembali ke langkah sebelumnya</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={s.loginRow}>
            <Text style={s.loginTxt}>Sudah punya akun? </Text>
            <TouchableOpacity onPress={onBackToLogin}>
              <Text style={s.loginLink}>Masuk Sekarang</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        <Text style={s.footerNote}>Data disimpan lokal di perangkat Anda · Offline & Aman</Text>
      </ScrollView>
    </View>
  );
}

function Field({ label, icon, placeholder, value, onChange, fieldKey, focused, onFocus, hasError, keyboard, autoCapitalize }: {
  label:string; icon:string; placeholder:string; value:string; onChange:(t:string)=>void;
  fieldKey:string; focused:string|null; onFocus:(k:string|null)=>void;
  hasError?:boolean; keyboard?:any; autoCapitalize?:any;
}) {
  return (
    <View style={{marginBottom:16}}>
      <Text style={s.lbl}>{label}</Text>
      <View style={[s.inputBox, focused===fieldKey&&s.inputFocus, hasError&&s.inputErr]}>
        <Ionicons name={icon as any} size={18} color={focused===fieldKey?'#6366f1':'#94a3b8'} style={s.icoLeft} />
        <TextInput style={s.input} placeholder={placeholder} placeholderTextColor="#94a3b8"
          value={value} onChangeText={onChange}
          keyboardType={keyboard||'default'} autoCapitalize={autoCapitalize||'none'} autoCorrect={false}
          returnKeyType="next"
          onFocus={()=>onFocus(fieldKey)} onBlur={()=>onFocus(null)} />
        {value.length>0&&!hasError && <Ionicons name="checkmark-circle" size={16} color="#22c55e" />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:{ flex:1,backgroundColor:'#312e81' },
  header:{ backgroundColor:'#312e81',overflow:'hidden',paddingTop:Platform.OS==='ios'?54:36,paddingHorizontal:24,paddingBottom:18 },
  circle:{ position:'absolute',borderRadius:999,backgroundColor:'#fff' },
  headerTop:{ flexDirection:'row',alignItems:'center',gap:14,marginBottom:14 },
  backBtn:{ width:38,height:38,borderRadius:12,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center' },
  headerTitle:{ fontSize:22,fontWeight:'900',color:'#fff' },
  headerTagline:{ fontSize:12,color:'#a5b4fc',marginTop:1 },
  stepRow:{ flexDirection:'row',alignItems:'center',paddingBottom:4 },
  stepItem:{ alignItems:'center',gap:4 },
  stepCircle:{ width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center' },
  stepActive:{ backgroundColor:'#6366f1' },
  stepInactive:{ backgroundColor:'rgba(255,255,255,0.15)' },
  stepNum:{ fontSize:13,fontWeight:'800',color:'#fff' },
  stepLbl:{ fontSize:11,color:'#a5b4fc',fontWeight:'500' },
  stepLine:{ flex:1,height:2,backgroundColor:'rgba(255,255,255,0.2)',marginBottom:14,marginHorizontal:8 },
  stepLineActive:{ backgroundColor:'#6366f1' },
  card:{ backgroundColor:'#fff',borderTopLeftRadius:30,borderTopRightRadius:30,padding:28,paddingTop:30,minHeight:height*0.74 },
  cardTitle:{ fontSize:24,fontWeight:'800',color:'#0f172a',marginBottom:4 },
  cardSub:{ fontSize:14,color:'#64748b',marginBottom:22 },
  errTxt:{ fontSize:12,color:'#ef4444',marginBottom:6,marginLeft:4 },
  lbl:{ fontSize:13,fontWeight:'700',color:'#475569',marginBottom:8,letterSpacing:0.2 },
  inputBox:{ flexDirection:'row',alignItems:'center',backgroundColor:'#f8fafc',borderRadius:14,borderWidth:1.5,borderColor:'#e2e8f0',paddingHorizontal:14 },
  inputFocus:{ borderColor:'#6366f1',backgroundColor:'#fff' },
  inputErr:{ borderColor:'#fca5a5' },
  icoLeft:{ marginRight:10 },
  input:{ flex:1,fontSize:15,color:'#0f172a',paddingVertical:Platform.OS==='ios'?14:12 },
  infoBox:{ flexDirection:'row',alignItems:'flex-start',gap:8,backgroundColor:'#eef2ff',borderRadius:12,padding:12,marginBottom:20 },
  infoTxt:{ fontSize:12.5,color:'#4338ca',flex:1,lineHeight:18 },
  btnPrimary:{ flexDirection:'row',backgroundColor:'#6366f1',borderRadius:16,paddingVertical:16,alignItems:'center',justifyContent:'center',shadowColor:'#6366f1',shadowOffset:{width:0,height:6},shadowOpacity:0.35,shadowRadius:12,elevation:7,marginBottom:12 },
  btnTxt:{ fontSize:17,fontWeight:'800',color:'#fff' },
  summary:{ flexDirection:'row',alignItems:'center',backgroundColor:'#f8fafc',borderRadius:14,padding:14,marginBottom:20,borderWidth:1,borderColor:'#e2e8f0',gap:12 },
  summaryAvatar:{ width:44,height:44,borderRadius:22,backgroundColor:'#6366f1',alignItems:'center',justifyContent:'center' },
  summaryAvatarTxt:{ fontSize:18,fontWeight:'800',color:'#fff' },
  summaryName:{ fontSize:14,fontWeight:'700',color:'#0f172a' },
  summaryEmail:{ fontSize:12,color:'#64748b',marginTop:1 },
  strengthRow:{ flexDirection:'row',alignItems:'center',marginBottom:10,gap:8 },
  bars:{ flexDirection:'row',gap:4,flex:1 },
  bar:{ flex:1,height:4,borderRadius:2 },
  strengthLbl:{ fontSize:12,fontWeight:'700',minWidth:72,textAlign:'right' },
  tipRow:{ flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:18 },
  tipItem:{ flexDirection:'row',alignItems:'center',gap:4,width:'47%' },
  tipTxt:{ fontSize:11.5,color:'#94a3b8' },
  agreeRow:{ flexDirection:'row',alignItems:'flex-start',gap:10,marginBottom:16,padding:10,borderRadius:12 },
  agreeTxt:{ fontSize:13,color:'#475569',flex:1,lineHeight:19 },
  checkbox:{ width:20,height:20,borderRadius:6,borderWidth:2,borderColor:'#cbd5e1',alignItems:'center',justifyContent:'center',marginTop:1 },
  checkboxActive:{ backgroundColor:'#6366f1',borderColor:'#6366f1' },
  backLink:{ flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:8,marginBottom:8 },
  backLinkTxt:{ fontSize:13,color:'#64748b' },
  loginRow:{ flexDirection:'row',justifyContent:'center',marginTop:10,marginBottom:8 },
  loginTxt:{ fontSize:14,color:'#64748b' },
  loginLink:{ fontSize:14,fontWeight:'800',color:'#6366f1' },
  footerNote:{ fontSize:11.5,color:'#94a3b8',textAlign:'center',padding:14,backgroundColor:'#fff',lineHeight:18 },
});