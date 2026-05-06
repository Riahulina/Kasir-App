import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  Animated, Dimensions, Platform, Modal, Alert,
  TextInput, StatusBar, FlatList, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductScreen from './ProductScreen';
import TransactionScreen from './TransactionScreen';
import ProfileScreen from './ProfilScreen';

const { width } = Dimensions.get('window');

// ─── Types ─────────────────────────────────────────────────────────────────────
type User = { name: string; email: string; namaToko?: string; kota?: string; telepon?: string; };
type Props = { user: User; onLogout: () => void; onUpdateUser?: (u: Partial<User>) => void; };
type ActiveTab = 'home' | 'transaksi' | 'produk' | 'profil';

type AbsensiRecord = {
  id: string; tanggal: string; masuk: string;
  keluar?: string; kasir: string; status: 'hadir' | 'cuti' | 'izin';
};
type CashRecord = {
  id: string; tanggal: string; jam: string;
  tipe: 'masuk' | 'keluar'; jumlah: number; keterangan: string; noNota?: string;
};
type Receipt = {
  noNota: string; tanggal: string; jam: string;
  items: any[]; subtotal: number; diskon: number;
  total: number; bayar: number; kembalian: number;
  namaToko: string; kasir: string;
};

// ─── Storage Keys ───────────────────────────────────────────────────────────
const RIWAYAT_KEY = '@kasirapp_riwayat';
const ABSENSI_KEY = '@kasirapp_absensi';
const CASH_KEY    = '@kasirapp_cash_manual'; // kas manual (bukan dari transaksi)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatRp  = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
const genId     = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const todayString = () =>
  new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
const nowTime = () =>
  new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

// Format Date → "15 April 2026"
const dateToString = (d: Date) =>
  d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
const prevDay = (d: Date) => { const r = new Date(d); r.setDate(r.getDate() - 1); return r; };
const nextDay = (d: Date) => { const r = new Date(d); r.setDate(r.getDate() + 1); return r; };
const isToday = (d: Date) => dateToString(d) === todayString();

// ═══════════════════════════════════════════════════════════════════════════════
export default function HomeScreen({ user, onLogout, onUpdateUser }: Props) {
  const [activeTab,     setActiveTab]     = useState<ActiveTab>('home');
  const [selectedDate,  setSelectedDate]  = useState<Date>(new Date());
  const [transactions,  setTransactions]  = useState<Receipt[]>([]);
  const [absensi,       setAbsensi]       = useState<AbsensiRecord[]>([]);
  const [cashManual,    setCashManual]    = useState<CashRecord[]>([]);
  const [refreshing,    setRefreshing]    = useState(false);
  const [sudahAbsen,    setSudahAbsen]    = useState(false);
  const [greeting,      setGreeting]      = useState('');

  // Modal states
  const [showAbsenModal, setShowAbsenModal] = useState(false);
  const [showCashModal,  setShowCashModal]  = useState(false);
  const [showCashList,   setShowCashList]   = useState(false);
  const [showAbsenList,  setShowAbsenList]  = useState(false);
  const [showTxList,     setShowTxList]     = useState(false);

  // Cash form
  const [cashTipe,   setCashTipe]   = useState<'masuk' | 'keluar'>('masuk');
  const [cashJumlah, setCashJumlah] = useState('');
  const [cashKet,    setCashKet]    = useState('');
  const [focusCash,  setFocusCash]  = useState<string | null>(null);

  // Animasi
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardSlide  = useRef(new Animated.Value(30)).current;

  // ── Load semua data ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [txJson, absenJson, cashJson] = await Promise.all([
        AsyncStorage.getItem(RIWAYAT_KEY),
        AsyncStorage.getItem(ABSENSI_KEY),
        AsyncStorage.getItem(CASH_KEY),
      ]);
      if (txJson)    setTransactions(JSON.parse(txJson));
      if (absenJson) {
        const a: AbsensiRecord[] = JSON.parse(absenJson);
        setAbsensi(a);
        setSudahAbsen(a.some(r => r.tanggal === todayString()));
      }
      if (cashJson)  setCashManual(JSON.parse(cashJson));
    } catch (e) {
      console.error('[HomeScreen] load error:', e);
    }
  }, []);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam');
    loadData();
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(cardSlide,  { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Re-load saat kembali ke tab home ──────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'home') loadData();
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Kalkulasi berdasarkan tanggal yang dipilih ────────────────────────────
  const selectedDateStr = dateToString(selectedDate);

  // Transaksi pada tanggal terpilih
  const txHariIni = transactions.filter(t => t.tanggal === selectedDateStr);

  // Kas masuk dari transaksi (hari ini)
  const kasMasukDariTx = txHariIni.reduce((s, t) => s + t.total, 0);

  // Kas manual (hari ini)
  const cashManualHariIni = cashManual.filter(c => c.tanggal === selectedDateStr);
  const cashManualMasuk   = cashManualHariIni.filter(c => c.tipe === 'masuk').reduce((s, c) => s + c.jumlah, 0);
  const cashManualKeluar  = cashManualHariIni.filter(c => c.tipe === 'keluar').reduce((s, c) => s + c.jumlah, 0);

  // Total kas
  const totalMasuk  = kasMasukDariTx + cashManualMasuk;
  const totalKeluar = cashManualKeluar;
  const saldoHariIni = totalMasuk - totalKeluar;

  // Saldo keseluruhan (semua transaksi + semua kas manual)
  const totalTxAllTime   = transactions.reduce((s, t) => s + t.total, 0);
  const allCashManualIn  = cashManual.filter(c => c.tipe === 'masuk').reduce((s, c) => s + c.jumlah, 0);
  const allCashManualOut = cashManual.filter(c => c.tipe === 'keluar').reduce((s, c) => s + c.jumlah, 0);
  const saldoTotal = totalTxAllTime + allCashManualIn - allCashManualOut;

  // Gabungan aktivitas kas hari ini (transaksi + manual), diurutkan terbaru
  const allCashHariIni: CashRecord[] = [
    ...txHariIni.map(t => ({
      id: t.noNota, tanggal: t.tanggal, jam: t.jam,
      tipe: 'masuk' as const, jumlah: t.total,
      keterangan: `Penjualan (${t.items?.length ?? 0} item)`, noNota: t.noNota,
    })),
    ...cashManualHariIni,
  ].sort((a, b) => b.jam.localeCompare(a.jam));

  // ── Absensi ────────────────────────────────────────────────────────────────
  const handleAbsenMasuk = async () => {
    const r: AbsensiRecord = { id: genId(), tanggal: todayString(), masuk: nowTime(), kasir: user.name, status: 'hadir' };
    const updated = [r, ...absensi];
    setAbsensi(updated); setSudahAbsen(true); setShowAbsenModal(false);
    await AsyncStorage.setItem(ABSENSI_KEY, JSON.stringify(updated));
    Alert.alert('✅ Absen Berhasil', `Selamat bekerja, ${user.name}!\nWaktu masuk: ${r.masuk}`);
  };
  const handleAbsenKeluar = async () => {
    const time = nowTime();
    const updated = absensi.map(a => a.tanggal === todayString() && !a.keluar ? { ...a, keluar: time } : a);
    setAbsensi(updated); setShowAbsenModal(false);
    await AsyncStorage.setItem(ABSENSI_KEY, JSON.stringify(updated));
    Alert.alert('✅ Absen Keluar', `Sampai jumpa!\nWaktu keluar: ${time}`);
  };
  const handleAbsenCustom = async (status: 'cuti' | 'izin') => {
    const r: AbsensiRecord = { id: genId(), tanggal: todayString(), masuk: '-', kasir: user.name, status };
    const updated = [r, ...absensi];
    setAbsensi(updated); setSudahAbsen(true); setShowAbsenModal(false);
    await AsyncStorage.setItem(ABSENSI_KEY, JSON.stringify(updated));
    Alert.alert('✅', `${status === 'cuti' ? 'Cuti' : 'Izin'} berhasil dicatat`);
  };

  // ── Tambah kas manual ──────────────────────────────────────────────────────
  const handleAddCash = async () => {
    if (!cashJumlah.trim() || isNaN(Number(cashJumlah))) { Alert.alert('Perhatian', 'Masukkan jumlah yang valid'); return; }
    if (!cashKet.trim()) { Alert.alert('Perhatian', 'Keterangan tidak boleh kosong'); return; }
    const r: CashRecord = { id: genId(), tanggal: todayString(), jam: nowTime(), tipe: cashTipe, jumlah: Number(cashJumlah), keterangan: cashKet.trim() };
    const updated = [r, ...cashManual];
    setCashManual(updated); setCashJumlah(''); setCashKet('');
    setShowCashModal(false);
    await AsyncStorage.setItem(CASH_KEY, JSON.stringify(updated));
    Alert.alert('✅ Berhasil', `Kas ${cashTipe === 'masuk' ? 'masuk' : 'keluar'} berhasil dicatat`);
  };

  // ── Navigasi tanggal ───────────────────────────────────────────────────────
  const DateNavigator = () => (
    <View style={styles.dateNav}>
      <TouchableOpacity style={styles.dateNavBtn} onPress={() => setSelectedDate(d => prevDay(d))}>
        <Ionicons name="chevron-back" size={18} color="#a5b4fc" />
      </TouchableOpacity>
      <View style={styles.dateNavCenter}>
        <Ionicons name="calendar-outline" size={13} color="#a5b4fc" style={{ marginRight: 5 }} />
        <Text style={styles.dateNavText}>{selectedDateStr}</Text>
        {isToday(selectedDate) && <View style={styles.todayDot} />}
      </View>
      <TouchableOpacity
        style={[styles.dateNavBtn, isToday(selectedDate) && { opacity: 0.3 }]}
        onPress={() => { if (!isToday(selectedDate)) setSelectedDate(d => nextDay(d)); }}
        disabled={isToday(selectedDate)}
      >
        <Ionicons name="chevron-forward" size={18} color="#a5b4fc" />
      </TouchableOpacity>
    </View>
  );

  // ── Tab rendering ──────────────────────────────────────────────────────────
  if (activeTab === 'transaksi') return (
    <View style={{ flex: 1 }}>
      <TransactionScreen onBack={() => setActiveTab('home')} namaToko={user.namaToko} kasirName={user.name} />
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </View>
  );
  if (activeTab === 'produk') return (
    <View style={{ flex: 1 }}>
      <ProductScreen onBack={() => setActiveTab('home')} />
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </View>
  );
  if (activeTab === 'profil') return (
    <View style={{ flex: 1 }}>
      <ProfileScreen user={user} onLogout={onLogout} onUpdateUser={onUpdateUser} />
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </View>
  );

  // ── BERANDA ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

      {/* ── HEADER ── */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <View style={[styles.hCircle, { width: 200, height: 200, top: -80, right: -60, opacity: 0.08 }]} />
        <View style={[styles.hCircle, { width: 120, height: 120, bottom: -30, left: -30, opacity: 0.06 }]} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greet}>{greeting} 👋</Text>
            <Text style={styles.name}>{user.name}</Text>
            {user.namaToko && (
              <View style={styles.tokoChip}>
                <Ionicons name="storefront-outline" size={12} color="#a5b4fc" />
                <Text style={styles.tokoChipTxt}>{user.namaToko}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => Alert.alert('Notifikasi', 'Tidak ada notifikasi baru')}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {transactions.length > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        {/* Date navigator */}
        <DateNavigator />

        {/* Kartu saldo */}
        <View style={styles.kasCard}>
          <View style={styles.kasTop}>
            <View>
              <Text style={styles.kasLbl}>Saldo Kas {isToday(selectedDate) ? 'Hari Ini' : selectedDateStr.split(' ').slice(0,2).join(' ')}</Text>
              <Text style={styles.kasAmt}>{formatRp(saldoHariIni)}</Text>
              <Text style={styles.kasSub}>
                Total semua waktu: {formatRp(saldoTotal)}
              </Text>
            </View>
            <TouchableOpacity style={styles.kasAddBtn} onPress={() => setShowCashModal(true)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.kasAddTxt}>Catat Kas</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.kasDivider} />
          <View style={styles.kasRow}>
            {[
              { lbl: 'Penjualan', val: kasMasukDariTx,  dot: '#22c55e' },
              { lbl: 'Kas Masuk', val: cashManualMasuk,  dot: '#06b6d4' },
              { lbl: 'Kas Keluar', val: totalKeluar,     dot: '#ef4444' },
            ].map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={styles.kasDiv} />}
                <View style={styles.kasItem}>
                  <View style={[styles.kasDot, { backgroundColor: item.dot }]} />
                  <Text style={styles.kasItemLbl}>{item.lbl}</Text>
                  <Text style={styles.kasItemVal} numberOfLines={1}>
                    {formatRp(item.val).replace('Rp ', '')}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {/* ── ABSENSI BANNER ── */}
        <Animated.View style={[styles.absenBanner, { transform: [{ translateY: cardSlide }] }]}>
          {sudahAbsen ? (
            <View style={styles.absenRow}>
              <View style={[styles.absenIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.absenTitle}>Sudah Absen Masuk ✓</Text>
                <Text style={styles.absenSub}>
                  {absensi.find(a => a.tanggal === todayString())?.masuk} — Semangat kerja!
                </Text>
              </View>
              <TouchableOpacity style={styles.absenKelBtn} onPress={() => setShowAbsenModal(true)}>
                <Text style={styles.absenKelTxt}>Keluar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.absenRow} onPress={() => setShowAbsenModal(true)}>
              <View style={[styles.absenIcon, { backgroundColor: '#fef9ee' }]}>
                <Ionicons name="finger-print-outline" size={24} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.absenTitle}>Belum Absen Hari Ini</Text>
                <Text style={styles.absenSub}>Tap untuk mencatat kehadiran</Text>
              </View>
              <View style={styles.absenMasukBtn}>
                <Text style={styles.absenMasukTxt}>Absen</Text>
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ── AKSI CEPAT ── */}
        <View style={styles.secRow}><Text style={styles.secTitle}>Aksi Cepat</Text></View>
        <Animated.View style={[styles.quickGrid, { transform: [{ translateY: cardSlide }] }]}>
          {[
            { icon: 'cart',              color: '#6366f1', bg: '#eef2ff', lbl: 'Transaksi',  fn: () => setActiveTab('transaksi') },
            { icon: 'cube-outline',      color: '#22c55e', bg: '#f0fdf4', lbl: 'Produk',     fn: () => setActiveTab('produk') },
            { icon: 'cash-outline',      color: '#f97316', bg: '#fff7ed', lbl: 'Catat Kas',  fn: () => setShowCashModal(true) },
            { icon: 'finger-print',      color: '#f59e0b', bg: '#fffbeb', lbl: 'Absensi',   fn: () => setShowAbsenModal(true) },
            { icon: 'receipt-outline',   color: '#06b6d4', bg: '#ecfeff', lbl: 'Transaksi',  fn: () => setShowTxList(true) },
            { icon: 'person-outline',    color: '#8b5cf6', bg: '#f5f3ff', lbl: 'Profil',    fn: () => setActiveTab('profil') },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.quickCard} onPress={item.fn} activeOpacity={0.75}>
              <View style={[styles.quickIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={26} color={item.color} />
              </View>
              <Text style={styles.quickLbl}>{item.lbl}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* ── RINGKASAN TRANSAKSI HARI INI ── */}
        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Transaksi {isToday(selectedDate) ? 'Hari Ini' : selectedDateStr.split(' ').slice(0,2).join(' ')}</Text>
          <TouchableOpacity onPress={() => setShowTxList(true)}>
            <Text style={styles.secLink}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        {txHariIni.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={36} color="#cbd5e1" />
            <Text style={styles.emptyTxt}>Belum ada transaksi {isToday(selectedDate) ? 'hari ini' : 'di tanggal ini'}</Text>
            {isToday(selectedDate) && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setActiveTab('transaksi')}>
                <Text style={styles.emptyBtnTxt}>+ Mulai Transaksi</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listCard}>
            {/* Ringkasan total */}
            <View style={styles.txSummaryRow}>
              <View style={styles.txSumItem}>
                <Text style={[styles.txSumVal, { color: '#6366f1' }]}>{txHariIni.length}</Text>
                <Text style={styles.txSumLbl}>Transaksi</Text>
              </View>
              <View style={styles.txSumDivider} />
              <View style={styles.txSumItem}>
                <Text style={[styles.txSumVal, { color: '#22c55e', fontSize: 14 }]} numberOfLines={1}>
                  {formatRp(kasMasukDariTx)}
                </Text>
                <Text style={styles.txSumLbl}>Total Penjualan</Text>
              </View>
              <View style={styles.txSumDivider} />
              <View style={styles.txSumItem}>
                <Text style={[styles.txSumVal, { color: '#f97316', fontSize: 14 }]} numberOfLines={1}>
                  {formatRp(txHariIni.reduce((s, t) => s + (t.items?.length ?? 0), 0))}
                </Text>
                <Text style={styles.txSumLbl}>Total Item</Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 12 }} />
            {txHariIni.slice(0, 4).map((tx, i) => (
              <View key={tx.noNota} style={[styles.txItem, i === Math.min(3, txHariIni.length - 1) && { borderBottomWidth: 0 }]}>
                <View style={styles.txIconBox}>
                  <Ionicons name="receipt" size={18} color="#6366f1" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.txNota}>{tx.noNota}</Text>
                  <Text style={styles.txMeta}>{tx.jam} · {tx.items?.length ?? 0} item · {tx.kasir}</Text>
                </View>
                <Text style={styles.txTotal}>{formatRp(tx.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── AKTIVITAS KAS ── */}
        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Aktivitas Kas</Text>
          <TouchableOpacity onPress={() => setShowCashList(true)}>
            <Text style={styles.secLink}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        {allCashHariIni.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={36} color="#cbd5e1" />
            <Text style={styles.emptyTxt}>Belum ada aktivitas kas {isToday(selectedDate) ? 'hari ini' : 'di tanggal ini'}</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {allCashHariIni.slice(0, 5).map((item, i) => (
              <View key={item.id} style={[styles.cashItem, i === Math.min(4, allCashHariIni.length - 1) && { borderBottomWidth: 0 }]}>
                <View style={[styles.cashIcon, { backgroundColor: item.tipe === 'masuk' ? '#f0fdf4' : '#fef2f2' }]}>
                  <Ionicons name={item.tipe === 'masuk' ? 'arrow-down-circle' : 'arrow-up-circle'} size={20} color={item.tipe === 'masuk' ? '#22c55e' : '#ef4444'} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cashKet}>{item.keterangan}</Text>
                  <Text style={styles.cashMeta}>
                    {item.jam}{item.noNota ? ` · ${item.noNota}` : ''}
                  </Text>
                </View>
                <Text style={[styles.cashAmt, { color: item.tipe === 'masuk' ? '#22c55e' : '#ef4444' }]}>
                  {item.tipe === 'masuk' ? '+' : '-'}{formatRp(item.jumlah)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── ABSENSI TERBARU ── */}
        <View style={styles.secRow}>
          <Text style={styles.secTitle}>Riwayat Absensi</Text>
          <TouchableOpacity onPress={() => setShowAbsenList(true)}>
            <Text style={styles.secLink}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          {/* Stats */}
          <View style={styles.absenStats}>
            {[
              { lbl: 'Hadir', val: absensi.filter(a => a.status === 'hadir').length, c: '#22c55e' },
              { lbl: 'Cuti',  val: absensi.filter(a => a.status === 'cuti').length,  c: '#f59e0b' },
              { lbl: 'Izin',  val: absensi.filter(a => a.status === 'izin').length,  c: '#6366f1' },
              { lbl: 'Total', val: absensi.length,                                    c: '#64748b' },
            ].map((s, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[{ fontSize: 20, fontWeight: '800' }, { color: s.c }]}>{s.val}</Text>
                <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.lbl}</Text>
              </View>
            ))}
          </View>
          <View style={{ height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 12 }} />
          {absensi.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 13, color: '#94a3b8' }}>Belum ada data absensi</Text>
            </View>
          ) : (
            absensi.slice(0, 3).map((item, i) => (
              <View key={item.id} style={[styles.absenItem, i === 2 && { borderBottomWidth: 0 }]}>
                <View style={[styles.absenDot, { backgroundColor: item.status === 'hadir' ? '#22c55e' : item.status === 'cuti' ? '#f59e0b' : '#6366f1' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.absenDate}>{item.tanggal}</Text>
                  <Text style={styles.absenTime}>
                    {item.status === 'hadir'
                      ? `Masuk: ${item.masuk}${item.keluar ? ` · Keluar: ${item.keluar}` : ' · Belum keluar'}`
                      : item.status === 'cuti' ? 'Cuti' : 'Izin'}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: item.status === 'hadir' ? '#f0fdf4' : item.status === 'cuti' ? '#fffbeb' : '#eef2ff' }]}>
                  <Text style={[styles.badgeTxt, { color: item.status === 'hadir' ? '#16a34a' : item.status === 'cuti' ? '#d97706' : '#6366f1' }]}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Info toko */}
        {user.namaToko && (
          <View style={styles.infoToko}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="storefront" size={18} color="#6366f1" />
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>{user.namaToko}</Text>
            </View>
            {user.kota && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Ionicons name="location-outline" size={14} color="#a5b4fc" />
                <Text style={{ fontSize: 13, color: '#a5b4fc' }}>{user.kota}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />

      {/* ══ MODAL: ABSENSI ══ */}
      <Modal visible={showAbsenModal} transparent animationType="slide" onRequestClose={() => setShowAbsenModal(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowAbsenModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Absensi Kasir</Text>
            <Text style={styles.sheetSub}>{todayString()} · {nowTime()}</Text>
            <View style={styles.absenInfo}>
              <Ionicons name="person-circle-outline" size={40} color="#6366f1" />
              <View style={{ marginLeft: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>{user.name}</Text>
                <Text style={{ fontSize: 13, color: '#64748b' }}>{user.email}</Text>
              </View>
            </View>
            {!sudahAbsen ? (
              <>
                <TouchableOpacity style={[styles.bigBtn, { backgroundColor: '#22c55e', shadowColor: '#22c55e' }]} onPress={handleAbsenMasuk}>
                  <Ionicons name="finger-print" size={22} color="#fff" />
                  <Text style={styles.bigBtnTxt}>Absen Masuk Sekarang</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  {[{ lbl: 'Catat Cuti', c: '#f59e0b', s: 'cuti' as const }, { lbl: 'Catat Izin', c: '#6366f1', s: 'izin' as const }].map((opt, i) => (
                    <TouchableOpacity key={i} style={[styles.optBtn, { borderColor: opt.c + '40' }]} onPress={() => handleAbsenCustom(opt.s)}>
                      <Text style={[{ fontSize: 14, fontWeight: '700' }, { color: opt.c }]}>{opt.lbl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <TouchableOpacity style={[styles.bigBtn, { backgroundColor: '#ef4444', shadowColor: '#ef4444' }]} onPress={handleAbsenKeluar}>
                <Ionicons name="log-out-outline" size={22} color="#fff" />
                <Text style={styles.bigBtnTxt}>Absen Keluar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* ══ MODAL: CATAT KAS ══ */}
      <Modal visible={showCashModal} transparent animationType="slide" onRequestClose={() => setShowCashModal(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCashModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Catat Kas Manual</Text>
            <Text style={styles.sheetSub}>{todayString()}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
              {(['masuk', 'keluar'] as const).map(t => (
                <TouchableOpacity key={t} style={[styles.toggle, cashTipe === t && { backgroundColor: t === 'masuk' ? '#22c55e' : '#ef4444', borderColor: 'transparent' }]} onPress={() => setCashTipe(t)}>
                  <Ionicons name={t === 'masuk' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={16} color={cashTipe === t ? '#fff' : '#64748b'} />
                  <Text style={[{ fontSize: 14, fontWeight: '700', color: '#64748b' }, cashTipe === t && { color: '#fff' }]}>Kas {t === 'masuk' ? 'Masuk' : 'Keluar'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.cashFldLbl}>Jumlah (Rp)</Text>
            <View style={[styles.cashInput, focusCash === 'j' && { borderColor: '#6366f1' }]}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#64748b', marginRight: 8 }}>Rp</Text>
              <TextInput style={{ flex: 1, fontSize: 26, fontWeight: '800', color: '#0f172a', paddingVertical: 12 }} placeholder="0" placeholderTextColor="#94a3b8" value={cashJumlah} onChangeText={v => setCashJumlah(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" onFocus={() => setFocusCash('j')} onBlur={() => setFocusCash(null)} />
            </View>
            <Text style={styles.cashFldLbl}>Keterangan</Text>
            <View style={[{ borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, marginBottom: 20 }, focusCash === 'k' && { borderColor: '#6366f1' }]}>
              <TextInput style={{ fontSize: 15, color: '#0f172a', paddingVertical: 13 }} placeholder="Contoh: Beli bahan baku..." placeholderTextColor="#94a3b8" value={cashKet} onChangeText={setCashKet} onFocus={() => setFocusCash('k')} onBlur={() => setFocusCash(null)} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCashModal(false)}><Text style={{ fontSize: 15, fontWeight: '700', color: '#64748b' }}>Batal</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: cashTipe === 'masuk' ? '#22c55e' : '#ef4444' }]} onPress={handleAddCash}><Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Simpan</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ MODAL: DAFTAR TRANSAKSI ══ */}
      <Modal visible={showTxList} animationType="slide" onRequestClose={() => setShowTxList(false)}>
        <View style={styles.fullModal}>
          <View style={styles.fullHeader}>
            <TouchableOpacity style={styles.fullBackBtn} onPress={() => setShowTxList(false)}><Ionicons name="arrow-back" size={22} color="#fff" /></TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.fullTitle}>Riwayat Transaksi</Text>
              <Text style={styles.fullSub}>{transactions.length} transaksi tersimpan</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.summaryBar}>
            <View style={styles.sumItem}><Text style={[styles.sumVal, { color: '#6366f1' }]}>{transactions.length}</Text><Text style={styles.sumLbl}>Total</Text></View>
            <View style={styles.sumDiv} />
            <View style={styles.sumItem}><Text style={[styles.sumVal, { color: '#22c55e', fontSize: 13 }]} numberOfLines={1}>{formatRp(totalTxAllTime)}</Text><Text style={styles.sumLbl}>Pendapatan</Text></View>
            <View style={styles.sumDiv} />
            <View style={styles.sumItem}><Text style={[styles.sumVal, { color: '#f97316' }]}>{txHariIni.length}</Text><Text style={styles.sumLbl}>Hari Ini</Text></View>
          </View>
          <FlatList
            data={transactions}
            keyExtractor={i => i.noNota}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 60 }}><Ionicons name="receipt-outline" size={48} color="#cbd5e1" /><Text style={{ fontSize: 15, color: '#94a3b8', marginTop: 12 }}>Belum ada transaksi</Text></View>}
            renderItem={({ item }) => (
              <View style={styles.txListCard}>
                <View style={[styles.txListIcon, { backgroundColor: '#ecfeff' }]}><Ionicons name="receipt" size={20} color="#06b6d4" /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.txListNota}>{item.noNota}</Text>
                  <Text style={styles.txListMeta}>{item.tanggal} · {item.jam}</Text>
                  <Text style={styles.txListMeta}>{item.items?.length ?? 0} item · {item.kasir}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.txListTotal}>{formatRp(item.total)}</Text>
                  <View style={styles.lnsBadge}><Text style={styles.lnsTxt}>Lunas</Text></View>
                </View>
              </View>
            )}
          />
        </View>
      </Modal>

      {/* ══ MODAL: DAFTAR KAS ══ */}
      <Modal visible={showCashList} animationType="slide" onRequestClose={() => setShowCashList(false)}>
        <View style={styles.fullModal}>
          <View style={styles.fullHeader}>
            <TouchableOpacity style={styles.fullBackBtn} onPress={() => setShowCashList(false)}><Ionicons name="arrow-back" size={22} color="#fff" /></TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.fullTitle}>Riwayat Kas</Text>
              <Text style={styles.fullSub}>Transaksi + Kas Manual</Text>
            </View>
            <TouchableOpacity style={[styles.fullBackBtn, { backgroundColor: '#22c55e' }]} onPress={() => { setShowCashList(false); setTimeout(() => setShowCashModal(true), 300); }}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
          </View>
          <View style={styles.summaryBar}>
            <View style={styles.sumItem}><Text style={[styles.sumVal, { color: '#22c55e', fontSize: 13 }]} numberOfLines={1}>{formatRp(totalTxAllTime + allCashManualIn)}</Text><Text style={styles.sumLbl}>Total Masuk</Text></View>
            <View style={styles.sumDiv} />
            <View style={styles.sumItem}><Text style={[styles.sumVal, { color: '#ef4444', fontSize: 13 }]} numberOfLines={1}>{formatRp(allCashManualOut)}</Text><Text style={styles.sumLbl}>Total Keluar</Text></View>
            <View style={styles.sumDiv} />
            <View style={styles.sumItem}><Text style={[styles.sumVal, { color: '#6366f1', fontSize: 13 }]} numberOfLines={1}>{formatRp(saldoTotal)}</Text><Text style={styles.sumLbl}>Saldo</Text></View>
          </View>
          {/* Gabungan list */}
          <FlatList
            data={[
              ...transactions.map(t => ({
                id: t.noNota, tanggal: t.tanggal, jam: t.jam,
                tipe: 'masuk' as const, jumlah: t.total,
                keterangan: `Penjualan — ${t.noNota}`,
              })),
              ...cashManual,
            ].sort((a, b) => {
              const da = `${a.tanggal} ${a.jam}`;
              const db = `${b.tanggal} ${b.jam}`;
              return db.localeCompare(da);
            })}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 60 }}><Ionicons name="wallet-outline" size={48} color="#cbd5e1" /><Text style={{ fontSize: 15, color: '#94a3b8', marginTop: 12 }}>Belum ada catatan kas</Text></View>}
            renderItem={({ item }) => (
              <View style={styles.txListCard}>
                <View style={[styles.txListIcon, { backgroundColor: item.tipe === 'masuk' ? '#f0fdf4' : '#fef2f2' }]}>
                  <Ionicons name={item.tipe === 'masuk' ? 'arrow-down-circle' : 'arrow-up-circle'} size={22} color={item.tipe === 'masuk' ? '#22c55e' : '#ef4444'} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.txListNota}>{item.keterangan}</Text>
                  <Text style={styles.txListMeta}>{item.tanggal} · {item.jam}</Text>
                </View>
                <Text style={[styles.txListTotal, { color: item.tipe === 'masuk' ? '#22c55e' : '#ef4444' }]}>
                  {item.tipe === 'masuk' ? '+' : '-'}{formatRp(item.jumlah)}
                </Text>
              </View>
            )}
          />
        </View>
      </Modal>

      {/* ══ MODAL: DAFTAR ABSENSI ══ */}
      <Modal visible={showAbsenList} animationType="slide" onRequestClose={() => setShowAbsenList(false)}>
        <View style={styles.fullModal}>
          <View style={styles.fullHeader}>
            <TouchableOpacity style={styles.fullBackBtn} onPress={() => setShowAbsenList(false)}><Ionicons name="arrow-back" size={22} color="#fff" /></TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.fullTitle}>Riwayat Absensi</Text>
              <Text style={styles.fullSub}>{user.name} · {absensi.length} hari</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.summaryBar}>
            {[{ lbl: 'Hadir', val: absensi.filter(a => a.status === 'hadir').length, c: '#22c55e' }, { lbl: 'Cuti', val: absensi.filter(a => a.status === 'cuti').length, c: '#f59e0b' }, { lbl: 'Izin', val: absensi.filter(a => a.status === 'izin').length, c: '#6366f1' }].map((s, i, arr) => (
              <React.Fragment key={i}>
                <View style={styles.sumItem}><Text style={[styles.sumVal, { color: s.c }]}>{s.val}</Text><Text style={styles.sumLbl}>{s.lbl}</Text></View>
                {i < arr.length - 1 && <View style={styles.sumDiv} />}
              </React.Fragment>
            ))}
          </View>
          <FlatList
            data={absensi}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 60 }}><Ionicons name="calendar-outline" size={48} color="#cbd5e1" /><Text style={{ fontSize: 15, color: '#94a3b8', marginTop: 12 }}>Belum ada data absensi</Text></View>}
            renderItem={({ item }) => (
              <View style={styles.txListCard}>
                <View style={[styles.txListIcon, { backgroundColor: item.status === 'hadir' ? '#f0fdf4' : item.status === 'cuti' ? '#fffbeb' : '#eef2ff', width: 44, height: 44 }]}>
                  <View style={[{ width: 12, height: 12, borderRadius: 6 }, { backgroundColor: item.status === 'hadir' ? '#22c55e' : item.status === 'cuti' ? '#f59e0b' : '#6366f1' }]} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.txListNota}>{item.tanggal}</Text>
                  <Text style={styles.txListMeta}>{item.status === 'hadir' ? `Masuk: ${item.masuk}${item.keluar ? ` · Keluar: ${item.keluar}` : ' · Belum keluar'}` : item.status === 'cuti' ? 'Cuti' : 'Izin'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: item.status === 'hadir' ? '#f0fdf4' : item.status === 'cuti' ? '#fffbeb' : '#eef2ff' }]}>
                  <Text style={[styles.badgeTxt, { color: item.status === 'hadir' ? '#16a34a' : item.status === 'cuti' ? '#d97706' : '#6366f1' }]}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── BottomNav ─────────────────────────────────────────────────────────────────
function BottomNav({ activeTab, onChange }: { activeTab: ActiveTab; onChange: (t: ActiveTab) => void }) {
  const tabs = [
    { id: 'home' as const,      icon: 'home' as const,        iconOut: 'home-outline' as const,         lbl: 'Beranda' },
    { id: 'transaksi' as const, icon: 'receipt' as const,     iconOut: 'receipt-outline' as const,      lbl: 'Kasir'   },
    { id: 'produk' as const,    icon: 'cube' as const,        iconOut: 'cube-outline' as const,         lbl: 'Produk'  },
    { id: 'profil' as const,    icon: 'person-circle' as const, iconOut: 'person-circle-outline' as const, lbl: 'Profil' },
  ];
  return (
    <View style={styles.bottomNav}>
      {tabs.map(t => (
        <TouchableOpacity key={t.id} style={styles.navItem} onPress={() => onChange(t.id)}>
          <View style={[styles.navIconWrap, activeTab === t.id && styles.navIconActive]}>
            <Ionicons name={activeTab === t.id ? t.icon : t.iconOut} size={activeTab === t.id ? 22 : 24} color={activeTab === t.id ? '#6366f1' : '#94a3b8'} />
          </View>
          <Text style={[styles.navLbl, activeTab === t.id && { color: '#6366f1', fontWeight: '700' }]}>{t.lbl}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { backgroundColor: '#312e81', paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingHorizontal: 20, paddingBottom: 20, overflow: 'hidden' },
  hCircle: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  greet: { fontSize: 13, color: '#a5b4fc', marginBottom: 2 },
  name: { fontSize: 22, fontWeight: '900', color: '#fff' },
  tokoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  tokoChipTxt: { fontSize: 12, color: '#a5b4fc' },
  bellBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316', borderWidth: 1.5, borderColor: '#312e81' },
  // Date navigator
  dateNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 6, paddingHorizontal: 6, marginBottom: 14 },
  dateNavBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  dateNavCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  dateNavText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  // Kas card
  kasCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 16 },
  kasTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  kasLbl: { fontSize: 12, color: '#a5b4fc', marginBottom: 4 },
  kasAmt: { fontSize: 24, fontWeight: '900', color: '#fff' },
  kasSub: { fontSize: 11, color: '#a5b4fc', marginTop: 2 },
  kasAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  kasAddTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  kasDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 12 },
  kasRow: { flexDirection: 'row', alignItems: 'center' },
  kasDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)' },
  kasItem: { flex: 1, alignItems: 'center' },
  kasDot: { width: 7, height: 7, borderRadius: 4, marginBottom: 3 },
  kasItemLbl: { fontSize: 10, color: '#a5b4fc', marginBottom: 2 },
  kasItemVal: { fontSize: 12, fontWeight: '700', color: '#fff' },
  absenBanner: { marginHorizontal: 16, marginTop: 14, backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  absenRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  absenIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  absenTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  absenSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  absenKelBtn: { backgroundColor: '#fef2f2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  absenKelTxt: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  absenMasukBtn: { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  absenMasukTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  secTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  secLink: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  quickCard: { width: (width - 48) / 3 - 2, alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  quickIcon: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  quickLbl: { fontSize: 12, fontWeight: '600', color: '#1e293b' },
  listCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  txSummaryRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 8 },
  txSumItem: { flex: 1, alignItems: 'center' },
  txSumVal: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  txSumLbl: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  txSumDivider: { width: 1, backgroundColor: '#f1f5f9', marginHorizontal: 4 },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  txIconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  txNota: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  txMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  txTotal: { fontSize: 14, fontWeight: '800', color: '#6366f1' },
  cashItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cashIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cashKet: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  cashMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  cashAmt: { fontSize: 13, fontWeight: '800' },
  absenStats: { flexDirection: 'row', paddingVertical: 14 },
  absenItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 10 },
  absenDot: { width: 10, height: 10, borderRadius: 5 },
  absenDate: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  absenTime: { fontSize: 11, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  emptyCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 18, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  emptyTxt: { fontSize: 13, color: '#94a3b8', marginTop: 10, textAlign: 'center' },
  emptyBtn: { marginTop: 14, backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 9 },
  emptyBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  infoToko: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#312e81', borderRadius: 18, padding: 16 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? 20 : 8, position: 'absolute', bottom: 0, left: 0, right: 0, elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navIconWrap: { width: 36, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  navIconActive: { backgroundColor: '#eef2ff' },
  navLbl: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sheetSub: { fontSize: 13, color: '#64748b', marginTop: 3, marginBottom: 18 },
  absenInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 18 },
  bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  bigBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  optBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 14, paddingVertical: 13, backgroundColor: '#f8fafc' },
  toggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingVertical: 12, backgroundColor: '#f8fafc' },
  cashFldLbl: { fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 8 },
  cashInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, marginBottom: 14 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 16, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fullModal: { flex: 1, backgroundColor: '#f1f5f9' },
  fullHeader: { backgroundColor: '#312e81', paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  fullBackBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  fullTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  fullSub: { fontSize: 12, color: '#a5b4fc', marginTop: 2 },
  summaryBar: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sumItem: { flex: 1, alignItems: 'center' },
  sumVal: { fontSize: 16, fontWeight: '800' },
  sumLbl: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  sumDiv: { width: 1, backgroundColor: '#e2e8f0', marginHorizontal: 8 },
  txListCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  txListIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  txListNota: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  txListMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  txListTotal: { fontSize: 15, fontWeight: '800', color: '#06b6d4' },
  lnsBadge: { backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  lnsTxt: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
});