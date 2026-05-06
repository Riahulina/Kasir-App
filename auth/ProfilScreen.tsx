import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Modal, Switch, Alert, Image, Platform,
  StatusBar, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

// ─── Types ─────────────────────────────────────────────────────────────────────
type UserProfile = {
  name: string; email: string; password?: string; phone?: string;
  namaToko?: string; alamat?: string; telepon?: string;
  kota?: string; kodePos?: string; kategoriUsaha?: string;
  photoUri?: string;
};
type AppSettings = {
  notifikasi: boolean; suara: boolean; cetakOtomatis: boolean; tampilkanStok: boolean;
  defaultDiskon: string;
};
type Receipt = {
  noNota: string; tanggal: string; jam: string; items: any[];
  total: number; bayar: number; kembalian: number; kasir: string;
};
type Props = {
  user: UserProfile;
  onLogout: () => void;
  onUpdateUser?: (u: Partial<UserProfile>) => void;
};

// ─── Storage keys ──────────────────────────────────────────────────────────────
const SETTINGS_KEY  = '@kasirapp_settings';
const PROFILE_KEY   = '@kasirapp_profile';
const RIWAYAT_KEY   = '@kasirapp_riwayat';
const USERS_KEY     = '@kasirapp_users';

const DEFAULT_SETTINGS: AppSettings = {
  notifikasi:true, suara:true, cetakOtomatis:false, tampilkanStok:true, defaultDiskon:'0',
};

const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

// ═══════════════════════════════════════════════════════════════════════════════
export default function ProfileScreen({ user, onLogout, onUpdateUser }: Props) {
  const [profile,   setProfile]   = useState<UserProfile>(user);
  const [settings,  setSettings]  = useState<AppSettings>(DEFAULT_SETTINGS);
  const [receipts,  setReceipts]  = useState<Receipt[]>([]);

  // Modal visibility
  const [editModal,    setEditModal]    = useState(false);
  const [passModal,    setPassModal]    = useState(false);
  const [tokoModal,    setTokoModal]    = useState(false);
  const [txModal,      setTxModal]      = useState(false);
  const [detailModal,  setDetailModal]  = useState<Receipt|null>(null);

  // Edit profil form
  const [fName,    setFName]    = useState('');
  const [fEmail,   setFEmail]   = useState('');
  const [fPhone,   setFPhone]   = useState('');
  // Ganti password form
  const [fOldPass, setFOldPass] = useState('');
  const [fNewPass, setFNewPass] = useState('');
  const [fConfPass,setFConfPass]= useState('');
  const [showOld,  setShowOld]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);
  // Edit toko form
  const [fNamaToko, setFNamaToko] = useState('');
  const [fAlamat,   setFAlamat]   = useState('');
  const [fTelepon,  setFTelepon]  = useState('');
  const [fKota,     setFKota]     = useState('');
  // Focus
  const [focused,  setFocused]  = useState<string|null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [sJson, pJson, rJson] = await Promise.all([
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(RIWAYAT_KEY),
        ]);
        if (sJson) setSettings(JSON.parse(sJson));
        if (pJson) setProfile(p => ({ ...p, ...JSON.parse(pJson) }));
        if (rJson) setReceipts(JSON.parse(rJson));
      } catch (e) { console.error('[ProfileScreen]', e); }
    })();
  }, []);

  const saveSettings = async (s: AppSettings) => {
    setSettings(s);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s)).catch(console.error);
  };

  const saveProfile = async (p: UserProfile) => {
    setProfile(p);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p)).catch(console.error);
    // Sync ke users storage
    try {
      const uJson = await AsyncStorage.getItem(USERS_KEY);
      if (uJson) {
        const users = JSON.parse(uJson);
        const key = p.email.toLowerCase();
        if (users[key]) {
          users[key] = { ...users[key], ...p };
          await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
        }
      }
    } catch {}
    onUpdateUser?.(p);
  };

  const toggle = (k: keyof AppSettings) =>
    saveSettings({ ...settings, [k]: !settings[k] });

  // ── Foto profil ────────────────────────────────────────────────────────────
  const handleChangePhoto = () => Alert.alert('Ganti Foto Profil', 'Pilih sumber', [
    { text:'Galeri',  onPress: pickGallery },
    { text:'Kamera',  onPress: pickCamera },
    { text:'Hapus Foto', style:'destructive', onPress: ()=>saveProfile({...profile,photoUri:undefined}) },
    { text:'Batal', style:'cancel' },
  ]);

  const pickGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Izin diperlukan','Berikan izin akses galeri'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes:ImagePicker.MediaTypeOptions.Images, allowsEditing:true, aspect:[1,1], quality:0.7 });
    if (!res.canceled && res.assets[0]) saveProfile({...profile, photoUri:res.assets[0].uri});
  };

  const pickCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Izin diperlukan','Berikan izin akses kamera'); return; }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing:true, aspect:[1,1], quality:0.7 });
    if (!res.canceled && res.assets[0]) saveProfile({...profile, photoUri:res.assets[0].uri});
  };

  // ── Edit profil ────────────────────────────────────────────────────────────
  const openEditModal = () => {
    setFName(profile.name); setFEmail(profile.email); setFPhone(profile.phone||'');
    setEditModal(true);
  };
  const handleSaveProfile = () => {
    if (!fName.trim()) { Alert.alert('Perhatian','Nama tidak boleh kosong'); return; }
    if (!fEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fEmail.trim())) { Alert.alert('Perhatian','Format email tidak valid'); return; }
    saveProfile({...profile, name:fName.trim(), email:fEmail.trim().toLowerCase(), phone:fPhone.trim()});
    setEditModal(false);
    Alert.alert('✅ Berhasil','Profil berhasil diperbarui');
  };

  // ── Ganti password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!fOldPass.trim()) { Alert.alert('Perhatian','Masukkan password lama'); return; }
    if (fNewPass.length < 6) { Alert.alert('Perhatian','Password baru minimal 6 karakter'); return; }
    if (fNewPass !== fConfPass) { Alert.alert('Perhatian','Konfirmasi password tidak cocok'); return; }
    // Verifikasi password lama dari storage
    try {
      const uJson = await AsyncStorage.getItem(USERS_KEY);
      if (uJson) {
        const users = JSON.parse(uJson);
        const key = profile.email.toLowerCase();
        if (users[key]?.password !== fOldPass) { Alert.alert('Gagal','Password lama salah'); return; }
        users[key].password = fNewPass;
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
    } catch {}
    setPassModal(false);
    setFOldPass(''); setFNewPass(''); setFConfPass('');
    Alert.alert('✅ Berhasil','Password berhasil diubah');
  };

  // ── Edit toko ─────────────────────────────────────────────────────────────
  const openTokoModal = () => {
    setFNamaToko(profile.namaToko||''); setFAlamat(profile.alamat||'');
    setFTelepon(profile.telepon||''); setFKota(profile.kota||'');
    setTokoModal(true);
  };
  const handleSaveToko = () => {
    if (!fNamaToko.trim()) { Alert.alert('Perhatian','Nama toko wajib diisi'); return; }
    saveProfile({...profile, namaToko:fNamaToko.trim(), alamat:fAlamat.trim(), telepon:fTelepon.trim(), kota:fKota.trim()});
    setTokoModal(false);
    Alert.alert('✅ Berhasil','Info toko berhasil diperbarui');
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => Alert.alert('Keluar', 'Yakin ingin logout dari akun ini?', [
    { text:'Batal', style:'cancel' },
    { text:'Logout', style:'destructive', onPress: onLogout },
  ]);

  // Stats
  const totalTx = receipts.length;
  const totalPendapatan = receipts.reduce((s,r)=>s+r.total,0);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Profil & Pengaturan</Text>
        <TouchableOpacity style={s.logoutHeaderBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#fca5a5" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:100}}>

        {/* Kartu Profil */}
        <View style={s.profileCard}>
          <TouchableOpacity style={s.avatarWrap} onPress={handleChangePhoto} activeOpacity={0.85}>
            {profile.photoUri
              ? <Image source={{uri:profile.photoUri}} style={s.avatar} />
              : <View style={s.avatarPlaceholder}><Text style={s.avatarInitial}>{(profile.name||'U').charAt(0).toUpperCase()}</Text></View>
            }
            <View style={s.cameraBadge}><Ionicons name="camera" size={13} color="#fff" /></View>
          </TouchableOpacity>
          <Text style={s.profileName}>{profile.name}</Text>
          <Text style={s.profileEmail}>{profile.email}</Text>
          {profile.namaToko && (
            <View style={s.tokoBadge}>
              <Ionicons name="storefront-outline" size={13} color="#6366f1" />
              <Text style={s.tokoBadgeTxt}>{profile.namaToko}</Text>
            </View>
          )}
          <TouchableOpacity style={s.editBtn} onPress={openEditModal}>
            <Ionicons name="create-outline" size={16} color="#6366f1" />
            <Text style={s.editBtnTxt}>Edit Profil</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { lbl:'Transaksi', val:String(totalTx),          icon:'receipt-outline',   c:'#6366f1' },
            { lbl:'Pendapatan',val:formatRp(totalPendapatan), icon:'cash-outline',      c:'#22c55e' },
          ].map((st,i)=>(
            <View key={i} style={s.statCard}>
              <View style={[s.statIconBox,{backgroundColor:st.c+'18'}]}>
                <Ionicons name={st.icon as any} size={18} color={st.c} />
              </View>
              <Text style={[s.statVal,{color:st.c}]} numberOfLines={1}>{st.val}</Text>
              <Text style={s.statLbl}>{st.lbl}</Text>
            </View>
          ))}
        </View>

        {/* ─ Akun ─ */}
        <SectionHeader title="Pengaturan Akun" icon="person-circle-outline" color="#6366f1" />
        <View style={s.menuGroup}>
          <MenuItem icon="create-outline"      bg="#eef2ff" color="#6366f1" label="Edit Profil"     sub="Ubah nama, email, nomor HP"      onPress={openEditModal} />
          <MenuItem icon="lock-closed-outline" bg="#fff7ed" color="#f97316" label="Ganti Password"  sub="Ubah kata sandi akun"            onPress={()=>{ setPassModal(true); }} />
          <MenuItem icon="camera-outline"      bg="#f0fdf4" color="#22c55e" label="Foto Profil"     sub="Ubah foto dari galeri atau kamera" onPress={handleChangePhoto} last />
        </View>

        {/* ─ Toko ─ */}
        <SectionHeader title="Informasi Toko" icon="storefront-outline" color="#f97316" />
        <View style={s.menuGroup}>
          <MenuItem icon="storefront-outline" bg="#fff7ed" color="#f97316" label="Nama & Lokasi Toko" sub={profile.namaToko||'Belum diisi'} onPress={openTokoModal} />
          <MenuItem icon="location-outline"   bg="#f0fdf4" color="#22c55e" label="Kota"              sub={profile.kota||'Belum diisi'}    onPress={openTokoModal} last />
        </View>

        {/* ─ Kasir ─ */}
        <SectionHeader title="Pengaturan Kasir" icon="calculator-outline" color="#22c55e" />
        <View style={s.menuGroup}>
          {/* Diskon default */}
          <View style={[s.menuItem,s.menuRow]}>
            <View style={[s.menuIconBox,{backgroundColor:'#f0fdf4'}]}><Ionicons name="pricetag-outline" size={18} color="#22c55e" /></View>
            <View style={{flex:1,marginLeft:12}}>
              <Text style={s.menuLbl}>Diskon Default (Rp)</Text>
              <Text style={s.menuSub}>Diterapkan otomatis saat transaksi</Text>
            </View>
            <TextInput
              style={s.inlineInput}
              value={settings.defaultDiskon}
              onChangeText={v => saveSettings({...settings, defaultDiskon:v.replace(/[^0-9]/g,'')})}
              keyboardType="numeric" placeholder="0" placeholderTextColor="#94a3b8"
            />
          </View>
          {/* Cetak otomatis */}
          <ToggleItem icon="receipt-outline" bg="#faf5ff" color="#a855f7" label="Cetak Nota Otomatis" sub="Langsung cetak setelah transaksi" value={settings.cetakOtomatis} onToggle={()=>toggle('cetakOtomatis')} toggleColor="#a855f7" />
          {/* Tampilkan stok */}
          <ToggleItem icon="cube-outline" bg="#f0fdf4" color="#22c55e" label="Tampilkan Stok di Kasir" sub="Stok produk terlihat saat transaksi" value={settings.tampilkanStok} onToggle={()=>toggle('tampilkanStok')} toggleColor="#22c55e" last />
        </View>

        {/* ─ Transaksi ─ */}
        <SectionHeader title="Riwayat Transaksi" icon="receipt-outline" color="#06b6d4" />
        <View style={s.menuGroup}>
          <MenuItem icon="list-outline" bg="#ecfeff" color="#06b6d4" label="Semua Transaksi" sub={`${totalTx} transaksi tersimpan`} onPress={()=>setTxModal(true)} last />
        </View>

        {/* Preview 3 transaksi terbaru */}
        {receipts.length > 0 && (
          <View style={s.recentCard}>
            <Text style={s.recentTitle}>Transaksi Terbaru</Text>
            {receipts.slice(0,3).map((r,i)=>(
              <TouchableOpacity key={i} style={[s.txItem, i===Math.min(2,receipts.length-1)&&{borderBottomWidth:0}]} onPress={()=>setDetailModal(r)}>
                <View style={s.txIcon}><Ionicons name="receipt" size={18} color="#06b6d4" /></View>
                <View style={{flex:1,marginLeft:12}}>
                  <Text style={s.txNota}>{r.noNota}</Text>
                  <Text style={s.txMeta}>{r.tanggal} · {r.jam}</Text>
                </View>
                <Text style={s.txTotal}>{formatRp(r.total)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.lihatBtn} onPress={()=>setTxModal(true)}>
              <Text style={s.lihatTxt}>Lihat Semua</Text>
              <Ionicons name="arrow-forward" size={14} color="#6366f1" />
            </TouchableOpacity>
          </View>
        )}

        {/* ─ Aplikasi ─ */}
        <SectionHeader title="Pengaturan Aplikasi" icon="settings-outline" color="#a855f7" />
        <View style={s.menuGroup}>
          <ToggleItem icon="notifications-outline" bg="#faf5ff" color="#a855f7" label="Notifikasi" sub="Tampilkan notifikasi aplikasi" value={settings.notifikasi} onToggle={()=>toggle('notifikasi')} toggleColor="#a855f7" />
          <ToggleItem icon="volume-high-outline"   bg="#fff7ed" color="#f97316" label="Suara"      sub="Suara saat transaksi berhasil" value={settings.suara}       onToggle={()=>toggle('suara')}       toggleColor="#f97316" last />
        </View>

        {/* ─ Lainnya ─ */}
        <SectionHeader title="Lainnya" icon="ellipsis-horizontal-circle-outline" color="#64748b" />
        <View style={s.menuGroup}>
          <MenuItem icon="help-circle-outline"         bg="#f8fafc" color="#64748b" label="Bantuan & FAQ"   sub="Panduan penggunaan aplikasi"    onPress={()=>Alert.alert('Bantuan','Hubungi: support@kasirapp.id')} />
          <MenuItem icon="information-circle-outline"  bg="#f8fafc" color="#64748b" label="Tentang Aplikasi" sub="KasirApp v1.0.0"               onPress={()=>Alert.alert('KasirApp','Versi 1.0.0\nPoliteknik Negeri Medan')} last />
        </View>

        {/* Tombol Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" style={{marginRight:10}} />
          <Text style={s.logoutBtnTxt}>Keluar dari Akun</Text>
        </TouchableOpacity>
        <Text style={s.versionTxt}>KasirApp v1.0.0 · Politeknik Negeri Medan</Text>
      </ScrollView>

      {/* ══ MODAL: EDIT PROFIL ══ */}
      <BottomSheet visible={editModal} onClose={()=>setEditModal(false)} title="Edit Profil" icon="create-outline" iconColor="#6366f1">
        <SField label="Nama Lengkap *" value={fName} onChange={setFName} placeholder="Nama kamu" fieldKey="ep_name" focused={focused} onFocus={setFocused} autoCapitalize="words" />
        <SField label="Email *" value={fEmail} onChange={setFEmail} placeholder="nama@domain.com" fieldKey="ep_email" focused={focused} onFocus={setFocused} keyboard="email-address" />
        <SField label="Nomor HP" value={fPhone} onChange={setFPhone} placeholder="08xxxxxxxxxx" fieldKey="ep_phone" focused={focused} onFocus={setFocused} keyboard="phone-pad" />
        <ModalActions onCancel={()=>setEditModal(false)} onSave={handleSaveProfile} saveLabel="Simpan Profil" />
      </BottomSheet>

      {/* ══ MODAL: GANTI PASSWORD ══ */}
      <BottomSheet visible={passModal} onClose={()=>setPassModal(false)} title="Ganti Password" icon="lock-closed-outline" iconColor="#f97316">
        <View style={s.passWarn}>
          <Ionicons name="information-circle-outline" size={15} color="#f97316" />
          <Text style={s.passWarnTxt}>Password baru minimal 6 karakter</Text>
        </View>
        <SField label="Password Lama *" value={fOldPass} onChange={setFOldPass} placeholder="Masukkan password lama" fieldKey="pw_old" focused={focused} onFocus={setFocused} secure showSecure={showOld} toggleSecure={()=>setShowOld(p=>!p)} />
        <SField label="Password Baru *" value={fNewPass} onChange={setFNewPass} placeholder="Minimal 6 karakter" fieldKey="pw_new" focused={focused} onFocus={setFocused} secure showSecure={showNew} toggleSecure={()=>setShowNew(p=>!p)} />
        <SField label="Konfirmasi Password *" value={fConfPass} onChange={setFConfPass} placeholder="Ulangi password baru" fieldKey="pw_conf" focused={focused} onFocus={setFocused} secure showSecure={showConf} toggleSecure={()=>setShowConf(p=>!p)} />
        <ModalActions onCancel={()=>setPassModal(false)} onSave={handleChangePassword} saveLabel="Ubah Password" saveColor="#f97316" />
      </BottomSheet>

      {/* ══ MODAL: EDIT TOKO ══ */}
      <BottomSheet visible={tokoModal} onClose={()=>setTokoModal(false)} title="Informasi Toko" icon="storefront-outline" iconColor="#f97316">
        <SField label="Nama Toko *" value={fNamaToko} onChange={setFNamaToko} placeholder="Contoh: Warung Bu Sari" fieldKey="tk_nama" focused={focused} onFocus={setFocused} autoCapitalize="words" />
        <SField label="Alamat" value={fAlamat} onChange={setFAlamat} placeholder="Jl. Contoh No. 1" fieldKey="tk_alamat" focused={focused} onFocus={setFocused} multiline />
        <SField label="Telepon" value={fTelepon} onChange={setFTelepon} placeholder="08xxxxxxxxxx" fieldKey="tk_telp" focused={focused} onFocus={setFocused} keyboard="phone-pad" />
        <SField label="Kota" value={fKota} onChange={setFKota} placeholder="Medan" fieldKey="tk_kota" focused={focused} onFocus={setFocused} autoCapitalize="words" />
        <ModalActions onCancel={()=>setTokoModal(false)} onSave={handleSaveToko} saveLabel="Simpan Info Toko" saveColor="#f97316" />
      </BottomSheet>

      {/* ══ MODAL: DAFTAR TRANSAKSI ══ */}
      <Modal visible={txModal} animationType="slide" onRequestClose={()=>setTxModal(false)}>
        <View style={s.fullModal}>
          <View style={s.fullHeader}>
            <TouchableOpacity style={s.fullBackBtn} onPress={()=>setTxModal(false)}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{flex:1,alignItems:'center'}}>
              <Text style={s.fullTitle}>Riwayat Transaksi</Text>
              <Text style={s.fullSub}>{totalTx} transaksi</Text>
            </View>
            <View style={{width:40}} />
          </View>
          <View style={s.txSummaryBar}>
            <View style={s.txSumItem}><Text style={[s.txSumVal,{color:'#6366f1'}]}>{totalTx}</Text><Text style={s.txSumLbl}>Transaksi</Text></View>
            <View style={s.txSumDiv} />
            <View style={s.txSumItem}><Text style={[s.txSumVal,{color:'#22c55e',fontSize:13}]} numberOfLines={1}>{formatRp(totalPendapatan)}</Text><Text style={s.txSumLbl}>Pendapatan</Text></View>
          </View>
          <FlatList
            data={receipts}
            keyExtractor={r=>r.noNota}
            contentContainerStyle={{padding:16,gap:10}}
            ListEmptyComponent={<View style={{alignItems:'center',paddingTop:60}}><Ionicons name="receipt-outline" size={48} color="#cbd5e1" /><Text style={{fontSize:15,color:'#94a3b8',marginTop:12}}>Belum ada transaksi</Text></View>}
            renderItem={({item})=>(
              <TouchableOpacity style={s.txListCard} onPress={()=>{ setTxModal(false); setTimeout(()=>setDetailModal(item),300); }}>
                <View style={[s.txListIcon,{backgroundColor:'#ecfeff'}]}><Ionicons name="receipt" size={20} color="#06b6d4" /></View>
                <View style={{flex:1,marginLeft:12}}>
                  <Text style={s.txListNota}>{item.noNota}</Text>
                  <Text style={s.txListMeta}>{item.tanggal} · {item.jam}</Text>
                  <Text style={s.txListMeta}>{item.items?.length??0} item · {item.kasir}</Text>
                </View>
                <View style={{alignItems:'flex-end'}}>
                  <Text style={s.txListTotal}>{formatRp(item.total)}</Text>
                  <View style={s.lunasBadge}><Text style={s.lunasTxt}>Lunas</Text></View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ══ MODAL: DETAIL NOTA ══ */}
      <Modal visible={!!detailModal} transparent animationType="slide" onRequestClose={()=>setDetailModal(null)}>
        <View style={s.detailOverlay}>
          <View style={s.detailSheet}>
            <View style={s.sheetHandle} />
            <View style={{flexDirection:'row',alignItems:'center',marginBottom:20}}>
              <View style={s.detailIconCircle}><Ionicons name="receipt" size={22} color="#fff" /></View>
              <View style={{flex:1,marginLeft:12}}>
                <Text style={{fontSize:16,fontWeight:'800',color:'#0f172a'}}>{detailModal?.noNota}</Text>
                <Text style={{fontSize:12,color:'#64748b',marginTop:2}}>{detailModal?.tanggal} · {detailModal?.jam}</Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={()=>setDetailModal(null)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={s.detailRows}>
              {[
                {lbl:'Kasir',     val:detailModal?.kasir||'-'},
                {lbl:'Item',      val:`${detailModal?.items?.length??0} produk`},
                {lbl:'Subtotal',  val:formatRp(detailModal?.total||0)},
                {lbl:'Dibayar',   val:formatRp(detailModal?.bayar||0)},
                {lbl:'Kembalian', val:formatRp(detailModal?.kembalian||0), highlight:true},
              ].map((row,i)=>(
                <View key={i} style={[s.detailRow, i===4&&{borderBottomWidth:0}]}>
                  <Text style={s.detailLbl}>{row.lbl}</Text>
                  <Text style={[s.detailVal, row.highlight&&{color:'#6366f1',fontWeight:'800'}]}>{row.val}</Text>
                </View>
              ))}
            </View>
            <View style={s.detailTotalBox}>
              <Text style={{fontSize:13,fontWeight:'700',color:'#a5b4fc',letterSpacing:1}}>TOTAL BAYAR</Text>
              <Text style={{fontSize:22,fontWeight:'900',color:'#fff'}}>{formatRp(detailModal?.total||0)}</Text>
            </View>
            <TouchableOpacity style={s.closeBtnFull} onPress={()=>setDetailModal(null)}>
              <Text style={{fontSize:15,fontWeight:'700',color:'#64748b'}}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title, icon, color }: { title:string; icon:string; color:string }) {
  return (
    <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingTop:18,paddingBottom:8,gap:8}}>
      <View style={{width:28,height:28,borderRadius:8,backgroundColor:color+'18',alignItems:'center',justifyContent:'center'}}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text style={{fontSize:12,fontWeight:'800',color:'#475569',letterSpacing:0.5,textTransform:'uppercase'}}>{title}</Text>
    </View>
  );
}

function MenuItem({ icon, bg, color, label, sub, onPress, last }: { icon:string;bg:string;color:string;label:string;sub:string;onPress:()=>void;last?:boolean; }) {
  return (
    <TouchableOpacity style={[s.menuItem, s.menuRow, last&&s.menuLast]} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.menuIconBox,{backgroundColor:bg}]}><Ionicons name={icon as any} size={18} color={color} /></View>
      <View style={{flex:1,marginLeft:12}}>
        <Text style={s.menuLbl}>{label}</Text>
        <Text style={s.menuSub} numberOfLines={1}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

function ToggleItem({ icon, bg, color, label, sub, value, onToggle, toggleColor, last }: { icon:string;bg:string;color:string;label:string;sub:string;value:boolean;onToggle:()=>void;toggleColor:string;last?:boolean; }) {
  return (
    <View style={[s.menuItem, s.menuRow, last&&s.menuLast]}>
      <View style={[s.menuIconBox,{backgroundColor:bg}]}><Ionicons name={icon as any} size={18} color={color} /></View>
      <View style={{flex:1,marginLeft:12}}>
        <Text style={s.menuLbl}>{label}</Text>
        <Text style={s.menuSub}>{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onToggle} trackColor={{false:'#e2e8f0',true:toggleColor}} thumbColor="#fff" />
    </View>
  );
}

function SField({ label, value, onChange, placeholder, fieldKey, focused, onFocus, keyboard, autoCapitalize, multiline, secure, showSecure, toggleSecure }: {
  label:string; value:string; onChange:(t:string)=>void; placeholder:string;
  fieldKey:string; focused:string|null; onFocus:(k:string|null)=>void;
  keyboard?:any; autoCapitalize?:any; multiline?:boolean;
  secure?:boolean; showSecure?:boolean; toggleSecure?:()=>void;
}) {
  return (
    <View style={{marginBottom:14}}>
      <Text style={s.fieldLbl}>{label}</Text>
      <View style={[s.fieldInput, focused===fieldKey&&s.fieldFocus, multiline&&{alignItems:'flex-start',paddingTop:4}]}>
        <TextInput
          style={[s.fieldTxt, multiline&&{height:72,textAlignVertical:'top',paddingTop:10}]}
          value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#94a3b8"
          keyboardType={keyboard||'default'} autoCapitalize={autoCapitalize||'none'}
          secureTextEntry={secure&&!showSecure} multiline={multiline}
          returnKeyType={multiline?'default':'next'}
          onFocus={()=>onFocus(fieldKey)} onBlur={()=>onFocus(null)}
        />
        {secure && toggleSecure && (
          <TouchableOpacity onPress={toggleSecure} hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <Ionicons name={showSecure?'eye-off-outline':'eye-outline'} size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function BottomSheet({ visible, onClose, title, icon, iconColor, children }: { visible:boolean;onClose:()=>void;title:string;icon:string;iconColor:string;children:React.ReactNode; }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.sheetOverlay}>
        <TouchableOpacity style={{flex:1}} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={{flexDirection:'row',alignItems:'center',marginBottom:20,gap:12}}>
            <View style={{width:40,height:40,borderRadius:12,backgroundColor:iconColor+'18',alignItems:'center',justifyContent:'center'}}>
              <Ionicons name={icon as any} size={20} color={iconColor} />
            </View>
            <Text style={{flex:1,fontSize:20,fontWeight:'800',color:'#0f172a'}}>{title}</Text>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}><Ionicons name="close" size={20} color="#64748b" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ModalActions({ onCancel, onSave, saveLabel, saveColor }: { onCancel:()=>void;onSave:()=>void;saveLabel:string;saveColor?:string; }) {
  return (
    <View style={{flexDirection:'row',gap:12,marginTop:8}}>
      <TouchableOpacity style={s.cancelBtn} onPress={onCancel}><Text style={{fontSize:15,fontWeight:'700',color:'#64748b'}}>Batal</Text></TouchableOpacity>
      <TouchableOpacity style={[s.saveBtn, saveColor&&{backgroundColor:saveColor}]} onPress={onSave}><Text style={{fontSize:15,fontWeight:'700',color:'#fff'}}>{saveLabel}</Text></TouchableOpacity>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:{ flex:1,backgroundColor:'#f1f5f9' },
  header:{ backgroundColor:'#312e81',paddingTop:Platform.OS==='ios'?56:40,paddingBottom:18,paddingHorizontal:20,flexDirection:'row',alignItems:'center',borderBottomLeftRadius:24,borderBottomRightRadius:24 },
  headerTitle:{ flex:1,fontSize:20,fontWeight:'800',color:'#fff' },
  logoutHeaderBtn:{ width:38,height:38,borderRadius:12,backgroundColor:'rgba(255,255,255,0.12)',alignItems:'center',justifyContent:'center' },
  profileCard:{ backgroundColor:'#fff',marginHorizontal:16,marginTop:16,borderRadius:24,padding:24,alignItems:'center',shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.08,shadowRadius:12,elevation:5 },
  avatarWrap:{ marginBottom:14,position:'relative' },
  avatar:{ width:88,height:88,borderRadius:44,borderWidth:3,borderColor:'#6366f1' },
  avatarPlaceholder:{ width:88,height:88,borderRadius:44,backgroundColor:'#6366f1',alignItems:'center',justifyContent:'center' },
  avatarInitial:{ fontSize:36,fontWeight:'800',color:'#fff' },
  cameraBadge:{ position:'absolute',bottom:2,right:2,width:26,height:26,borderRadius:13,backgroundColor:'#0f172a',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#fff' },
  profileName:{ fontSize:20,fontWeight:'800',color:'#0f172a',marginBottom:4 },
  profileEmail:{ fontSize:14,color:'#64748b',marginBottom:10 },
  tokoBadge:{ flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#eef2ff',paddingHorizontal:12,paddingVertical:5,borderRadius:20,marginBottom:14 },
  tokoBadgeTxt:{ fontSize:13,color:'#6366f1',fontWeight:'600' },
  editBtn:{ flexDirection:'row',alignItems:'center',gap:6,borderWidth:1.5,borderColor:'#6366f1',borderRadius:12,paddingHorizontal:16,paddingVertical:8 },
  editBtnTxt:{ fontSize:14,fontWeight:'700',color:'#6366f1' },
  statsRow:{ flexDirection:'row',marginHorizontal:16,marginTop:12,gap:10 },
  statCard:{ flex:1,backgroundColor:'#fff',borderRadius:16,padding:12,alignItems:'center',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.05,shadowRadius:4,elevation:2 },
  statIconBox:{ width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center',marginBottom:6 },
  statVal:{ fontSize:15,fontWeight:'800',color:'#1e293b' },
  statLbl:{ fontSize:10,color:'#94a3b8',marginTop:2,fontWeight:'500' },
  menuGroup:{ marginHorizontal:16,backgroundColor:'#fff',borderRadius:20,overflow:'hidden',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.05,shadowRadius:6,elevation:2 },
  menuItem:{ paddingHorizontal:16,paddingVertical:13,borderBottomWidth:1,borderBottomColor:'#f1f5f9' },
  menuRow:{ flexDirection:'row',alignItems:'center' },
  menuLast:{ borderBottomWidth:0 },
  menuIconBox:{ width:38,height:38,borderRadius:11,alignItems:'center',justifyContent:'center' },
  menuLbl:{ fontSize:14,fontWeight:'600',color:'#0f172a' },
  menuSub:{ fontSize:12,color:'#94a3b8',marginTop:2 },
  inlineInput:{ borderWidth:1.5,borderColor:'#e2e8f0',borderRadius:10,paddingHorizontal:10,paddingVertical:6,fontSize:14,color:'#1e293b',minWidth:80,textAlign:'right' },
  recentCard:{ marginHorizontal:16,backgroundColor:'#fff',borderRadius:18,padding:16,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.05,shadowRadius:6,elevation:2 },
  recentTitle:{ fontSize:14,fontWeight:'700',color:'#0f172a',marginBottom:12 },
  txItem:{ flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#f1f5f9' },
  txIcon:{ width:38,height:38,borderRadius:11,backgroundColor:'#ecfeff',alignItems:'center',justifyContent:'center' },
  txNota:{ fontSize:13,fontWeight:'700',color:'#0f172a' },
  txMeta:{ fontSize:11,color:'#94a3b8',marginTop:2 },
  txTotal:{ fontSize:14,fontWeight:'800',color:'#06b6d4' },
  lihatBtn:{ flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingTop:12 },
  lihatTxt:{ fontSize:13,fontWeight:'700',color:'#6366f1' },
  logoutBtn:{ flexDirection:'row',alignItems:'center',justifyContent:'center',marginHorizontal:16,marginTop:16,marginBottom:8,backgroundColor:'#fef2f2',borderWidth:1.5,borderColor:'#fecaca',borderRadius:18,paddingVertical:15 },
  logoutBtnTxt:{ fontSize:16,fontWeight:'700',color:'#ef4444' },
  versionTxt:{ textAlign:'center',fontSize:12,color:'#cbd5e1',paddingBottom:8 },
  passWarn:{ flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fff7ed',borderRadius:12,padding:12,marginBottom:16 },
  passWarnTxt:{ fontSize:12,color:'#c2410c',flex:1 },
  fieldLbl:{ fontSize:12.5,fontWeight:'700',color:'#475569',marginBottom:7 },
  fieldInput:{ backgroundColor:'#f8fafc',borderRadius:14,borderWidth:1.5,borderColor:'#e2e8f0',flexDirection:'row',alignItems:'center',paddingHorizontal:14 },
  fieldFocus:{ borderColor:'#6366f1',backgroundColor:'#fff' },
  fieldTxt:{ flex:1,fontSize:15,color:'#1e293b',paddingVertical:Platform.OS==='ios'?13:11 },
  cancelBtn:{ flex:1,paddingVertical:14,borderRadius:16,alignItems:'center',backgroundColor:'#f1f5f9',borderWidth:1.5,borderColor:'#e2e8f0' },
  saveBtn:{ flex:2,paddingVertical:14,borderRadius:16,alignItems:'center',backgroundColor:'#6366f1',shadowColor:'#6366f1',shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8,elevation:6 },
  sheetOverlay:{ flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end' },
  sheet:{ backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,padding:24,paddingBottom:Platform.OS==='ios'?40:24,maxHeight:'92%' },
  sheetHandle:{ width:40,height:4,borderRadius:2,backgroundColor:'#e2e8f0',alignSelf:'center',marginBottom:20 },
  closeBtn:{ width:34,height:34,borderRadius:10,backgroundColor:'#f1f5f9',alignItems:'center',justifyContent:'center' },
  fullModal:{ flex:1,backgroundColor:'#f1f5f9' },
  fullHeader:{ backgroundColor:'#312e81',paddingTop:Platform.OS==='ios'?56:40,paddingBottom:18,paddingHorizontal:16,flexDirection:'row',alignItems:'center',borderBottomLeftRadius:24,borderBottomRightRadius:24 },
  fullBackBtn:{ width:40,height:40,borderRadius:12,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center' },
  fullTitle:{ fontSize:18,fontWeight:'800',color:'#fff' },
  fullSub:{ fontSize:12,color:'#a5b4fc',marginTop:2 },
  txSummaryBar:{ flexDirection:'row',backgroundColor:'#fff',margin:16,borderRadius:16,padding:14,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.05,shadowRadius:4,elevation:2 },
  txSumItem:{ flex:1,alignItems:'center' },
  txSumVal:{ fontSize:18,fontWeight:'800' },
  txSumLbl:{ fontSize:11,color:'#94a3b8',marginTop:2 },
  txSumDiv:{ width:1,backgroundColor:'#e2e8f0',marginHorizontal:8 },
  txListCard:{ flexDirection:'row',alignItems:'center',backgroundColor:'#fff',borderRadius:16,padding:14,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.04,shadowRadius:4,elevation:2 },
  txListIcon:{ width:44,height:44,borderRadius:13,alignItems:'center',justifyContent:'center' },
  txListNota:{ fontSize:14,fontWeight:'700',color:'#0f172a' },
  txListMeta:{ fontSize:11,color:'#94a3b8',marginTop:2 },
  txListTotal:{ fontSize:15,fontWeight:'800',color:'#06b6d4' },
  lunasBadge:{ backgroundColor:'#f0fdf4',borderRadius:8,paddingHorizontal:8,paddingVertical:3,marginTop:4 },
  lunasTxt:{ fontSize:11,fontWeight:'700',color:'#16a34a' },
  detailOverlay:{ flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end' },
  detailSheet:{ backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,padding:24,paddingBottom:Platform.OS==='ios'?40:24 },
  detailIconCircle:{ width:46,height:46,borderRadius:23,backgroundColor:'#06b6d4',alignItems:'center',justifyContent:'center' },
  detailRows:{ backgroundColor:'#f8fafc',borderRadius:16,padding:4,marginBottom:12 },
  detailRow:{ flexDirection:'row',justifyContent:'space-between',paddingHorizontal:14,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#f1f5f9' },
  detailLbl:{ fontSize:14,color:'#64748b' },
  detailVal:{ fontSize:14,fontWeight:'600',color:'#0f172a' },
  detailTotalBox:{ backgroundColor:'#312e81',borderRadius:16,flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:18,paddingVertical:16,marginBottom:14 },
  closeBtnFull:{ backgroundColor:'#f1f5f9',borderRadius:16,paddingVertical:14,alignItems:'center',borderWidth:1.5,borderColor:'#e2e8f0' },
});