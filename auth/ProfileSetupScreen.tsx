import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Platform, ScrollView, Animated, Dimensions, StatusBar, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height, width } = Dimensions.get('window');

type User = { name: string; email: string; };
type Props = {
  user: User;
  onComplete: (updates: {
    namaToko?: string; alamat?: string; telepon?: string;
    kategoriUsaha?: string; deskripsiToko?: string; kota?: string; kodePos?: string;
  }) => void;
  onLogout: () => void;
};

const KATEGORI = [
  { id:'fnb',        label:'Makanan & Minuman', icon:'restaurant-outline' },
  { id:'retail',     label:'Toko Retail',        icon:'storefront-outline' },
  { id:'fashion',    label:'Fashion',             icon:'shirt-outline' },
  { id:'elektronik', label:'Elektronik',           icon:'phone-portrait-outline' },
  { id:'jasa',       label:'Jasa & Layanan',     icon:'briefcase-outline' },
  { id:'lainnya',    label:'Lainnya',             icon:'apps-outline' },
];

export default function ProfileSetupScreen({ user, onComplete, onLogout }: Props) {
  const [step,         setStep]         = useState<1|2>(1);
  const [namaToko,     setNamaToko]     = useState('');
  const [kategoriUsaha,setKategoriUsaha]= useState('');
  const [deskripsiToko,setDeskripsiToko]= useState('');
  const [telepon,      setTelepon]      = useState('');
  const [alamat,       setAlamat]       = useState('');
  const [kota,         setKota]         = useState('');
  const [kodePos,      setKodePos]      = useState('');
  const [focused,      setFocused]      = useState<string|null>(null);
  const [errors,       setErrors]       = useState<Record<string,string>>({});
  const [showSuccess,  setShowSuccess]  = useState(false);

  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const slideAnim    = useRef(new Animated.Value(36)).current;
  const shakeAnim    = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.5)).current;
  const successFade  = useRef(new Animated.Value(0)).current;
  const checkAnim    = useRef(new Animated.Value(0)).current;

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

  const transition = (next: 1|2) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue:0, duration:150, useNativeDriver:true }),
      Animated.timing(slideAnim, { toValue:20, duration:150, useNativeDriver:true }),
    ]).start(() => {
      setStep(next); slideAnim.setValue(-20);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue:1, duration:280, useNativeDriver:true }),
        Animated.spring(slideAnim, { toValue:0, tension:55, friction:9, useNativeDriver:true }),
      ]).start();
    });
  };

  const clearErr = (k: string) => setErrors(p => { const n={...p}; delete n[k]; return n; });

  const goStep2 = () => {
    const e: Record<string,string> = {};
    if (!namaToko.trim())   e.namaToko      = 'Nama toko wajib diisi';
    if (!kategoriUsaha)     e.kategoriUsaha = 'Pilih kategori usaha';
    if (Object.keys(e).length) { setErrors(e); shake(); return; }
    setErrors({});
    transition(2);
  };

  const handleSubmit = () => {
    const e: Record<string,string> = {};
    if (!telepon.trim()) e.telepon = 'Nomor telepon wajib diisi';
    if (!alamat.trim())  e.alamat  = 'Alamat wajib diisi';
    if (!kota.trim())    e.kota    = 'Kota wajib diisi';
    if (Object.keys(e).length) { setErrors(e); shake(); return; }
    setErrors({});
    openSuccess();
  };

  const openSuccess = () => {
    setShowSuccess(true);
    successScale.setValue(0.5); successFade.setValue(0); checkAnim.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(successScale, { toValue:1, tension:80, friction:8, useNativeDriver:true }),
        Animated.timing(successFade,  { toValue:1, duration:300, useNativeDriver:true }),
      ]),
      Animated.delay(200),
      Animated.spring(checkAnim, { toValue:1, tension:100, friction:6, useNativeDriver:true }),
    ]).start();
  };

  const handleFinish = () => {
    setShowSuccess(false);
    onComplete({ namaToko:namaToko.trim(), kategoriUsaha, deskripsiToko:deskripsiToko.trim()||undefined, telepon:telepon.trim(), alamat:alamat.trim(), kota:kota.trim(), kodePos:kodePos.trim()||undefined });
  };

  const selectedKat = KATEGORI.find(k => k.id === kategoriUsaha);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <View style={[s.circle,{width:220,height:220,top:-80,right:-60,opacity:0.1}]} />
        <View style={[s.circle,{width:140,height:140,bottom:-30,left:-40,opacity:0.07}]} />
        <Animated.View style={{ opacity:fadeAnim, gap:8 }}>
          <View style={s.hiBadge}><Text style={s.hiBadgeTxt}>👋  Halo, {user.name}!</Text></View>
          <Text style={s.headerTitle}>Atur Toko Kamu</Text>
          <Text style={s.headerSub}>Langkah {step} dari 2 — {step===1?'Info Toko':'Lokasi & Kontak'}</Text>
        </Animated.View>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: step===1?'50%':'100%' as any }]} />
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
          opacity:fadeAnim,
          transform:[{translateY:slideAnim},{translateX:shakeAnim}],
        }]}>

          {/* STEP 1 */}
          {step===1 && <>
            <Text style={s.cardTitle}>Info Toko</Text>
            <Text style={s.cardSub}>Ceritakan sedikit tentang usaha kamu</Text>

            {errors.namaToko && <Text style={s.errTxt}>{errors.namaToko}</Text>}
            <SField label="Nama Toko / Usaha *" icon="storefront-outline" placeholder="Contoh: Warung Makan Bu Sari"
              value={namaToko} onChange={t=>{ setNamaToko(t); clearErr('namaToko'); }}
              fieldKey="namaToko" focused={focused} onFocus={setFocused}
              hasError={!!errors.namaToko} autoCapitalize="words" />

            <SField label="Deskripsi Singkat (opsional)" icon="document-text-outline" placeholder="Contoh: Nasi padang dengan menu lengkap"
              value={deskripsiToko} onChange={setDeskripsiToko}
              fieldKey="deskripsiToko" focused={focused} onFocus={setFocused} multiline />

            <Text style={s.lbl}>Kategori Usaha *</Text>
            {errors.kategoriUsaha && <Text style={s.errTxt}>{errors.kategoriUsaha}</Text>}
            <View style={s.katGrid}>
              {KATEGORI.map(k => (
                <TouchableOpacity key={k.id}
                  style={[s.katCard, kategoriUsaha===k.id&&s.katCardActive]}
                  onPress={()=>{ setKategoriUsaha(k.id); clearErr('kategoriUsaha'); }}>
                  <View style={[s.katIcon, {backgroundColor:kategoriUsaha===k.id?'#6366f1':'#f1f5f9'}]}>
                    <Ionicons name={k.icon as any} size={20} color={kategoriUsaha===k.id?'#fff':'#64748b'} />
                  </View>
                  <Text style={[s.katLbl, kategoriUsaha===k.id&&{color:'#6366f1',fontWeight:'700'}]} numberOfLines={2}>{k.label}</Text>
                  {kategoriUsaha===k.id && <View style={s.katCheck}><Ionicons name="checkmark" size={10} color="#fff" /></View>}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.btnPrimary} onPress={goStep2}>
              <Text style={s.btnTxt}>Lanjut</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{marginLeft:8}} />
            </TouchableOpacity>

            <View style={s.bottomLinks}>
              <TouchableOpacity onPress={openSuccess}><Text style={s.skipTxt}>Lewati, atur nanti</Text></TouchableOpacity>
              <Text style={s.dot}>·</Text>
              <TouchableOpacity onPress={onLogout}><Text style={s.logoutTxt}>Keluar</Text></TouchableOpacity>
            </View>
          </>}

          {/* STEP 2 */}
          {step===2 && <>
            <Text style={s.cardTitle}>Lokasi & Kontak</Text>
            <Text style={s.cardSub}>Agar pelanggan mudah menemukan toko kamu</Text>

            {/* Summary */}
            <View style={s.summaryBadge}>
              <View style={[s.summaryIcon,{backgroundColor:'#eef2ff'}]}>
                <Ionicons name={selectedKat?.icon as any||'storefront-outline'} size={16} color="#6366f1" />
              </View>
              <View style={{flex:1}}>
                <Text style={s.summaryName}>{namaToko}</Text>
                <Text style={s.summaryCat}>{selectedKat?.label}</Text>
              </View>
              <TouchableOpacity onPress={()=>transition(1)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Ionicons name="create-outline" size={18} color="#6366f1" />
              </TouchableOpacity>
            </View>

            {errors.telepon && <Text style={s.errTxt}>{errors.telepon}</Text>}
            <SField label="Nomor Telepon / WhatsApp *" icon="call-outline" placeholder="08xxxxxxxxxx"
              value={telepon} onChange={t=>{ setTelepon(t); clearErr('telepon'); }}
              fieldKey="telepon" focused={focused} onFocus={setFocused}
              hasError={!!errors.telepon} keyboard="phone-pad" />

            {errors.alamat && <Text style={s.errTxt}>{errors.alamat}</Text>}
            <SField label="Alamat Lengkap *" icon="location-outline" placeholder="Jl. Contoh No. 1, Kelurahan"
              value={alamat} onChange={t=>{ setAlamat(t); clearErr('alamat'); }}
              fieldKey="alamat" focused={focused} onFocus={setFocused}
              hasError={!!errors.alamat} multiline />

            <View style={{flexDirection:'row',gap:12}}>
              <View style={{flex:1.5}}>
                {errors.kota && <Text style={s.errTxt}>{errors.kota}</Text>}
                <SField label="Kota *" icon="business-outline" placeholder="Medan"
                  value={kota} onChange={t=>{ setKota(t); clearErr('kota'); }}
                  fieldKey="kota" focused={focused} onFocus={setFocused}
                  hasError={!!errors.kota} autoCapitalize="words" />
              </View>
              <View style={{flex:1}}>
                <SField label="Kode Pos" icon="mail-outline" placeholder="20111"
                  value={kodePos} onChange={setKodePos}
                  fieldKey="kodePos" focused={focused} onFocus={setFocused}
                  keyboard="numeric" />
              </View>
            </View>

            <View style={s.infoBox}>
              <Ionicons name="information-circle-outline" size={15} color="#06b6d4" />
              <Text style={s.infoTxt}>Info ini dipakai untuk tampilan nota transaksi.</Text>
            </View>

            <TouchableOpacity style={s.btnPrimary} onPress={handleSubmit}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" style={{marginRight:8}} />
              <Text style={s.btnTxt}>Selesaikan Pengaturan</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.backLink} onPress={()=>transition(1)}>
              <Ionicons name="arrow-back" size={15} color="#64748b" />
              <Text style={s.backLinkTxt}>Kembali ke langkah sebelumnya</Text>
            </TouchableOpacity>

            <View style={s.bottomLinks}>
              <TouchableOpacity onPress={openSuccess}><Text style={s.skipTxt}>Lewati, atur nanti</Text></TouchableOpacity>
              <Text style={s.dot}>·</Text>
              <TouchableOpacity onPress={onLogout}><Text style={s.logoutTxt}>Keluar</Text></TouchableOpacity>
            </View>
          </>}
        </Animated.View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="none">
        <Animated.View style={[s.successOverlay, { opacity:successFade }]}>
          <Animated.View style={[s.successCard, { transform:[{scale:successScale}] }]}>
            {[{t:-18,l:20,r:undefined,sz:14,c:'#f97316'},{t:-12,l:undefined,r:30,sz:10,c:'#6366f1'},{t:10,l:-15,r:undefined,sz:12,c:'#22c55e'},{t:10,l:undefined,r:-12,sz:8,c:'#f59e0b'}].map((d,i)=>(
              <Animated.View key={i} style={{position:'absolute',top:d.t,left:d.l,right:d.r,width:d.sz,height:d.sz,borderRadius:99,backgroundColor:d.c,transform:[{scale:checkAnim}]}} />
            ))}
            <Animated.View style={[s.successIcon,{transform:[{scale:checkAnim}]}]}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </Animated.View>
            <Text style={s.successTitle}>Toko Siap! 🎉</Text>
            <Text style={s.successSub}>Selamat, <Text style={{fontWeight:'800',color:'#0f172a'}}>{user.name}</Text>!{'\n'}Akun KasirApp kamu sudah siap digunakan.</Text>
            <View style={s.successSummary}>
              {[{icon:'storefront',lbl:'Toko',val:namaToko||'-',c:'#6366f1'},{icon:'location',lbl:'Kota',val:kota||'-',c:'#f97316'},{icon:'call',lbl:'Telepon',val:telepon||'-',c:'#22c55e'}].map((row,i)=>(
                <View key={i} style={s.successRow}>
                  <View style={[s.successRowIcon,{backgroundColor:row.c+'18'}]}><Ionicons name={row.icon as any} size={14} color={row.c} /></View>
                  <Text style={s.successRowLbl}>{row.lbl}</Text>
                  <Text style={s.successRowVal} numberOfLines={1}>{row.val}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={s.successBtn} onPress={handleFinish}>
              <Text style={s.successBtnTxt}>Mulai Pakai KasirApp</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{marginLeft:8}} />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

function SField({ label, icon, placeholder, value, onChange, fieldKey, focused, onFocus, hasError, keyboard, autoCapitalize, multiline }: {
  label:string; icon:string; placeholder:string; value:string; onChange:(t:string)=>void;
  fieldKey:string; focused:string|null; onFocus:(k:string|null)=>void;
  hasError?:boolean; keyboard?:any; autoCapitalize?:any; multiline?:boolean;
}) {
  return (
    <View style={{marginBottom:14}}>
      <Text style={s.lbl}>{label}</Text>
      <View style={[s.inputBox, focused===fieldKey&&s.inputFocus, hasError&&s.inputErr, multiline&&{alignItems:'flex-start',paddingTop:4}]}>
        <Ionicons name={icon as any} size={18} color={focused===fieldKey?'#6366f1':'#94a3b8'} style={[s.icoLeft, multiline&&{marginTop:10}]} />
        <TextInput style={[s.input, multiline&&{height:72,textAlignVertical:'top',paddingTop:10}]}
          placeholder={placeholder} placeholderTextColor="#94a3b8"
          value={value} onChangeText={onChange}
          keyboardType={keyboard||'default'} autoCapitalize={autoCapitalize||'sentences'}
          autoCorrect={false} multiline={multiline}
          returnKeyType={multiline?'default':'next'}
          onFocus={()=>onFocus(fieldKey)} onBlur={()=>onFocus(null)} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:{ flex:1,backgroundColor:'#312e81' },
  header:{ backgroundColor:'#312e81',overflow:'hidden',paddingTop:Platform.OS==='ios'?56:40,paddingHorizontal:24,paddingBottom:22,gap:10 },
  circle:{ position:'absolute',borderRadius:999,backgroundColor:'#fff' },
  hiBadge:{ backgroundColor:'rgba(255,255,255,0.15)',alignSelf:'flex-start',paddingHorizontal:14,paddingVertical:6,borderRadius:20 },
  hiBadgeTxt:{ fontSize:13,color:'#fff',fontWeight:'600' },
  headerTitle:{ fontSize:26,fontWeight:'900',color:'#fff',letterSpacing:-0.5 },
  headerSub:{ fontSize:13,color:'#a5b4fc' },
  progressBg:{ height:5,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:3,overflow:'hidden' },
  progressFill:{ height:5,backgroundColor:'#a5b4fc',borderRadius:3 },
  card:{ backgroundColor:'#fff',borderTopLeftRadius:30,borderTopRightRadius:30,padding:26,paddingTop:30,minHeight:height*0.7 },
  cardTitle:{ fontSize:22,fontWeight:'800',color:'#0f172a',marginBottom:4 },
  cardSub:{ fontSize:14,color:'#64748b',marginBottom:18 },
  errTxt:{ fontSize:12,color:'#ef4444',marginBottom:4,marginLeft:2 },
  lbl:{ fontSize:12.5,fontWeight:'700',color:'#475569',marginBottom:7 },
  inputBox:{ flexDirection:'row',alignItems:'center',backgroundColor:'#f8fafc',borderRadius:14,borderWidth:1.5,borderColor:'#e2e8f0',paddingHorizontal:13 },
  inputFocus:{ borderColor:'#6366f1',backgroundColor:'#fff' },
  inputErr:{ borderColor:'#fca5a5' },
  icoLeft:{ marginRight:10 },
  input:{ flex:1,fontSize:15,color:'#0f172a',paddingVertical:Platform.OS==='ios'?14:12 },
  katGrid:{ flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:18 },
  katCard:{ width:(width-52-20)/3,alignItems:'center',backgroundColor:'#f8fafc',borderRadius:14,padding:12,borderWidth:1.5,borderColor:'#e2e8f0',position:'relative' },
  katCardActive:{ borderColor:'#6366f1',backgroundColor:'#eef2ff' },
  katIcon:{ width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center',marginBottom:8 },
  katLbl:{ fontSize:11,color:'#64748b',textAlign:'center',lineHeight:14 },
  katCheck:{ position:'absolute',top:6,right:6,width:16,height:16,borderRadius:8,backgroundColor:'#6366f1',alignItems:'center',justifyContent:'center' },
  summaryBadge:{ flexDirection:'row',alignItems:'center',backgroundColor:'#f8fafc',borderRadius:14,padding:12,marginBottom:18,borderWidth:1,borderColor:'#e2e8f0',gap:10 },
  summaryIcon:{ width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center' },
  summaryName:{ fontSize:14,fontWeight:'700',color:'#0f172a' },
  summaryCat:{ fontSize:12,color:'#64748b',marginTop:2 },
  infoBox:{ flexDirection:'row',alignItems:'flex-start',gap:8,backgroundColor:'#ecfeff',borderRadius:12,padding:12,marginBottom:18 },
  infoTxt:{ fontSize:12,color:'#0e7490',flex:1,lineHeight:17 },
  btnPrimary:{ flexDirection:'row',backgroundColor:'#6366f1',borderRadius:16,paddingVertical:16,alignItems:'center',justifyContent:'center',shadowColor:'#6366f1',shadowOffset:{width:0,height:6},shadowOpacity:0.35,shadowRadius:12,elevation:7,marginBottom:12 },
  btnTxt:{ fontSize:16,fontWeight:'800',color:'#fff' },
  backLink:{ flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:6,marginBottom:8 },
  backLinkTxt:{ fontSize:13,color:'#64748b' },
  bottomLinks:{ flexDirection:'row',justifyContent:'center',alignItems:'center',gap:10,marginTop:4,paddingBottom:24 },
  skipTxt:{ fontSize:13,color:'#94a3b8' },
  dot:{ color:'#cbd5e1',fontSize:16 },
  logoutTxt:{ fontSize:13,color:'#ef4444',fontWeight:'600' },
  successOverlay:{ flex:1,backgroundColor:'rgba(10,15,40,0.85)',alignItems:'center',justifyContent:'center',padding:24 },
  successCard:{ backgroundColor:'#fff',borderRadius:28,padding:28,width:'100%',alignItems:'center',overflow:'visible' },
  successIcon:{ width:88,height:88,borderRadius:44,backgroundColor:'#22c55e',alignItems:'center',justifyContent:'center',marginBottom:20,shadowColor:'#22c55e',shadowOffset:{width:0,height:8},shadowOpacity:0.4,shadowRadius:16,elevation:10 },
  successTitle:{ fontSize:26,fontWeight:'900',color:'#0f172a',marginBottom:8 },
  successSub:{ fontSize:14,color:'#64748b',textAlign:'center',lineHeight:22,marginBottom:22 },
  successSummary:{ width:'100%',backgroundColor:'#f8fafc',borderRadius:16,padding:4,marginBottom:22 },
  successRow:{ flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:10,gap:10 },
  successRowIcon:{ width:30,height:30,borderRadius:8,alignItems:'center',justifyContent:'center' },
  successRowLbl:{ fontSize:13,color:'#64748b',width:56 },
  successRowVal:{ flex:1,fontSize:13,fontWeight:'700',color:'#0f172a' },
  successBtn:{ flexDirection:'row',backgroundColor:'#6366f1',borderRadius:16,paddingVertical:15,alignItems:'center',justifyContent:'center',width:'100%',shadowColor:'#6366f1',shadowOffset:{width:0,height:6},shadowOpacity:0.35,shadowRadius:12,elevation:7 },
  successBtnTxt:{ fontSize:16,fontWeight:'800',color:'#fff' },
});