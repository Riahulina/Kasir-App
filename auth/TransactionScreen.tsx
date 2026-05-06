import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, Modal, Animated, Platform, KeyboardAvoidingView,
  Alert, FlatList, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Product = {
  id: string; name: string; price: number;
  stock: number; category: string; description?: string;
};
type CartItem = { product: Product; qty: number; };
export type Receipt = {
  noNota: string; tanggal: string; jam: string;
  items: CartItem[]; subtotal: number; diskon: number;
  total: number; bayar: number; kembalian: number;
  namaToko: string; kasir: string;
};
type Props = { onBack: () => void; namaToko?: string; kasirName?: string; };

// ─── Storage ───────────────────────────────────────────────────────────────────
const PRODUCTS_KEY = '@kasirapp_products';
const RIWAYAT_KEY  = '@kasirapp_riwayat';  // ← data transaksi global

// ─── Kategori ──────────────────────────────────────────────────────────────────
type CategoryDef = { label: string; icon: string; color: string; bg: string; lightBg: string; };
const CATEGORY_DEFS: CategoryDef[] = [
  { label: 'Semua',      icon: 'grid',           color: '#6366f1', bg: '#6366f1', lightBg: '#eef2ff' },
  { label: 'Makanan',    icon: 'restaurant',     color: '#f97316', bg: '#f97316', lightBg: '#fff7ed' },
  { label: 'Minuman',    icon: 'cafe',           color: '#06b6d4', bg: '#06b6d4', lightBg: '#ecfeff' },
  { label: 'Snack',      icon: 'pizza',          color: '#a855f7', bg: '#a855f7', lightBg: '#faf5ff' },
  { label: 'Elektronik', icon: 'phone-portrait', color: '#3b82f6', bg: '#3b82f6', lightBg: '#eff6ff' },
  { label: 'Pakaian',    icon: 'shirt',          color: '#ec4899', bg: '#ec4899', lightBg: '#fdf2f8' },
  { label: 'Lainnya',    icon: 'apps',           color: '#64748b', bg: '#64748b', lightBg: '#f8fafc' },
];
const getCategoryDef = (label: string) =>
  CATEGORY_DEFS.find(c => c.label === label) ?? CATEGORY_DEFS[CATEGORY_DEFS.length - 1];

// ─── Helpers ────────────────────────────────────────────────────────────────────
const formatRupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
const generateNoNota = () => 'TRX-' + Date.now().toString().slice(-8);
const getNow = () => {
  const d = new Date();
  return {
    tanggal: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
    jam: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function TransactionScreen({
  onBack, namaToko = 'KasirApp Store', kasirName = 'Admin',
}: Props) {
  const [products,      setProducts]      = useState<Product[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [cart,          setCart]          = useState<CartItem[]>([]);
  const [search,        setSearch]        = useState('');
  const [activeCategory,setActiveCategory]= useState('Semua');
  const [diskon,        setDiskon]        = useState('0');
  const [focusedField,  setFocusedField]  = useState<string | null>(null);
  const [showCart,      setShowCart]      = useState(false);
  const [showPayment,   setShowPayment]   = useState(false);
  const [showReceipt,   setShowReceipt]   = useState(false);
  const [receipt,       setReceipt]       = useState<Receipt | null>(null);
  const [bayar,         setBayar]         = useState('');
  const [focusBayar,    setFocusBayar]    = useState(false);

  const payFade      = useRef(new Animated.Value(0)).current;
  const paySlide     = useRef(new Animated.Value(300)).current;
  const receiptFade  = useRef(new Animated.Value(0)).current;
  const receiptSlide = useRef(new Animated.Value(60)).current;
  const bounceMap    = useRef<Record<string, Animated.Value>>({}).current;

  useEffect(() => {
    AsyncStorage.getItem(PRODUCTS_KEY)
      .then(json => { if (json) setProducts(JSON.parse(json)); })
      .catch(e => console.error('[TX] load error:', e))
      .finally(() => setLoading(false));
  }, []);

  const subtotal  = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const diskonAmt = Math.min(Number(diskon) || 0, subtotal);
  const total     = subtotal - diskonAmt;
  const totalQty  = cart.reduce((s, i) => s + i.qty, 0);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = activeCategory === 'Semua' || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const getBounce = (id: string) => {
    if (!bounceMap[id]) bounceMap[id] = new Animated.Value(1);
    return bounceMap[id];
  };
  const animateAdd = (id: string) => {
    const b = getBounce(id);
    Animated.sequence([
      Animated.spring(b, { toValue: 1.28, useNativeDriver: true, tension: 400, friction: 5 }),
      Animated.spring(b, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 7 }),
    ]).start();
  };

  const addToCart = useCallback((product: Product) => {
    animateAdd(product.id);
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          Alert.alert('Stok Terbatas', `Stok ${product.name} hanya ${product.stock}`);
          return prev;
        }
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      if (product.stock < 1) { Alert.alert('Stok Habis', `${product.name} sudah habis`); return prev; }
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  const updateQty = (id: string, delta: number) =>
    setCart(prev => prev.map(i => {
      if (i.product.id !== id) return i;
      const q = i.qty + delta;
      if (q < 1) return i;
      if (q > i.product.stock) { Alert.alert('Stok Terbatas', `Maks ${i.product.stock}`); return i; }
      return { ...i, qty: q };
    }));

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id));
  const clearCart  = () => Alert.alert('Kosongkan?', 'Hapus semua item?', [
    { text: 'Batal', style: 'cancel' },
    { text: 'Hapus', style: 'destructive', onPress: () => { setCart([]); setDiskon('0'); } },
  ]);

  const openPayment = () => {
    setBayar('');
    setShowPayment(true);
    payFade.setValue(0); paySlide.setValue(300);
    Animated.parallel([
      Animated.timing(payFade,  { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(paySlide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  };
  const closePayment = () => {
    Animated.parallel([
      Animated.timing(payFade,  { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(paySlide, { toValue: 300, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowPayment(false));
  };

  const processPayment = () => {
    const nominalBayar = Number(bayar.replace(/\D/g, ''));
    if (!nominalBayar || nominalBayar < total) {
      Alert.alert('Pembayaran Kurang', `Minimal bayar ${formatRupiah(total)}`);
      return;
    }
    const { tanggal, jam } = getNow();
    const newReceipt: Receipt = {
      noNota: generateNoNota(), tanggal, jam,
      items: [...cart], subtotal, diskon: diskonAmt,
      total, bayar: nominalBayar, kembalian: nominalBayar - total,
      namaToko, kasir: kasirName,
    };
    setReceipt(newReceipt);
    closePayment();
    setTimeout(() => {
      setShowReceipt(true);
      receiptFade.setValue(0); receiptSlide.setValue(60);
      Animated.parallel([
        Animated.timing(receiptFade,  { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(receiptSlide, { toValue: 0, tension: 70, friction: 9, useNativeDriver: true }),
      ]).start();
    }, 250);
  };

  // ── Simpan transaksi ke AsyncStorage ──────────────────────────────────────
  const saveReceiptToStorage = async (r: Receipt) => {
    try {
      const json    = await AsyncStorage.getItem(RIWAYAT_KEY);
      const records = json ? JSON.parse(json) : [];
      records.unshift(r); // terbaru di depan
      await AsyncStorage.setItem(RIWAYAT_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('[TX] gagal simpan transaksi:', e);
    }
  };

  const finishTransaction = () => {
    if (receipt) saveReceiptToStorage(receipt);
    setCart([]); setDiskon('0'); setBayar('');
    setShowReceipt(false); setShowCart(false);
    Alert.alert('✅ Transaksi Selesai', 'Data berhasil disimpan!');
  };

  const quickAmounts = [...new Set([
    total,
    Math.ceil(total / 10000)  * 10000,
    Math.ceil(total / 50000)  * 50000,
    Math.ceil(total / 100000) * 100000,
  ])].slice(0, 4);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Memuat katalog produk...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={[styles.hCircle, { width:200, height:200, top:-80, right:-60, opacity:0.08 }]} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Transaksi Baru</Text>
            <Text style={styles.headerSub}>{namaToko}</Text>
          </View>
          <TouchableOpacity style={styles.cartBtn} onPress={() => setShowCart(true)}>
            <Ionicons name="bag-handle-outline" size={22} color="#fff" />
            {totalQty > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalQty > 99 ? '99+' : totalQty}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── STATS ── */}
      <View style={styles.statsRow}>
        {[
          { icon:'cube', bg:'#eef2ff', color:'#6366f1', val:String(products.length), lbl:'Produk' },
          { icon:'bag-handle', bg: totalQty>0?'#fef9ee':'#f0fdf4', color:totalQty>0?'#f59e0b':'#22c55e', val:String(totalQty), lbl:'Dipilih' },
          { icon:'cash', bg: total>0?'#eef2ff':'#f8fafc', color:total>0?'#6366f1':'#94a3b8', val:total>0?formatRupiah(total).replace('Rp ',''):'0', lbl:'Total (Rp)', small: total>999999 },
        ].map((st,i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: st.bg }]}>
              <Ionicons name={st.icon as any} size={18} color={st.color} />
            </View>
            <Text style={[styles.statNumber, { color: st.color }, st.small && { fontSize: 13 }]}>{st.val}</Text>
            <Text style={styles.statLabel}>{st.lbl}</Text>
          </View>
        ))}
      </View>

      {/* ── SEARCH ── */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBar, focusedField === 'search' && styles.searchFocused]}>
          <Ionicons name="search-outline" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            onFocus={() => setFocusedField('search')}
            onBlur={() => setFocusedField(null)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      
      {/* ── CATEGORY CHIPS ── */}
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  style={styles.categoryScroll}
  contentContainerStyle={styles.categoryScrollContent}
  bounces={true}                    // tambahan iOS biar lebih nyaman
>
  {CATEGORY_DEFS.map(cat => {
    const active = activeCategory === cat.label;
    const count = cat.label === 'Semua'
      ? products.length
      : products.filter(p => p.category === cat.label).length;

    return (
      <TouchableOpacity
        key={cat.label}
        style={[
          styles.categoryChip, 
          active && { backgroundColor: cat.bg, borderColor: cat.bg }
        ]}
        onPress={() => setActiveCategory(cat.label)}
        activeOpacity={0.75}
      >
        <View style={[
          styles.chipIconBox, 
          { backgroundColor: active ? 'rgba(255,255,255,0.22)' : cat.lightBg }
        ]}>
          <Ionicons name={cat.icon as any} size={14} color={active ? '#fff' : cat.color} />
        </View>

        <Text style={[styles.chipLabel, active && { color: '#fff' }]} numberOfLines={1}>
          {cat.label}
        </Text>

        <View style={[
          styles.chipBadge, 
          { backgroundColor: active ? 'rgba(255,255,255,0.28)' : cat.lightBg }
        ]}>
          <Text style={[styles.chipBadgeText, { color: active ? '#fff' : cat.color }]}>
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  })}

  {/* Tambahan padding di kanan supaya chip terakhir tidak terpotong */}
  <View style={{ width: 20,  }} />
</ScrollView>

      {/* ── PRODUCT GRID ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const def     = getCategoryDef(item.category);
          const inCart  = cart.find(c => c.product.id === item.id);
          const bounce  = getBounce(item.id);
          const noStock = item.stock < 1;
          return (
            <TouchableOpacity
              style={[styles.productCard, inCart && { borderColor: def.color, borderWidth: 2 }, noStock && { opacity: 0.5 }]}
              onPress={() => !noStock && addToCart(item)}
              activeOpacity={noStock ? 1 : 0.75}
            >
              {inCart && (
                <View style={[styles.qtyBadge, { backgroundColor: def.color }]}>
                  <Text style={styles.qtyBadgeText}>{inCart.qty}</Text>
                </View>
              )}
              <View style={[styles.productIconBox, { backgroundColor: def.lightBg }]}>
                <Ionicons name={def.icon as any} size={26} color={def.color} />
              </View>
              <Text style={[styles.productName, noStock && { color: '#94a3b8' }]} numberOfLines={2}>{item.name}</Text>
              <Text style={[styles.productPrice, { color: noStock ? '#cbd5e1' : def.color }]}>{formatRupiah(item.price)}</Text>
              <View style={styles.productFooter}>
                <View style={styles.stockRow}>
                  <View style={[styles.stockDot, { backgroundColor: item.stock < 10 ? '#ef4444' : '#22c55e' }]} />
                  <Text style={[styles.stockText, item.stock < 10 && { color: '#ef4444' }]}>
                    {noStock ? 'Habis' : item.stock}
                  </Text>
                </View>
                <Animated.View style={[
                  styles.addBtn,
                  { backgroundColor: noStock ? '#e2e8f0' : inCart ? def.color : def.lightBg },
                  { transform: [{ scale: bounce }] },
                ]}>
                  <Ionicons name={inCart ? 'checkmark' : 'add'} size={16} color={noStock ? '#94a3b8' : inCart ? '#fff' : def.color} />
                </Animated.View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>Produk tidak ditemukan</Text>
            <Text style={styles.emptySub}>Coba ubah kata kunci atau kategori</Text>
          </View>
        }
      />

      {/* ── STICKY BOTTOM ── */}
      {cart.length > 0 && (
        <View style={styles.stickyBottom}>
          <TouchableOpacity style={styles.stickyBtn} onPress={() => setShowCart(true)} activeOpacity={0.88}>
            <View style={styles.stickyLeft}>
              <Text style={styles.stickyQtyText}>{totalQty} item dipilih</Text>
              <Text style={styles.stickyTotal}>{formatRupiah(total)}</Text>
            </View>
            <View style={styles.stickyRight}>
              <Text style={styles.stickyBayarText}>Bayar</Text>
              <Ionicons name="arrow-forward" size={16} color="#000000" />
            </View>
          </TouchableOpacity>
        </View>
        
      )}

      {/* ═══ MODAL: KERANJANG ═══ */}
      <Modal visible={showCart} transparent animationType="slide" onRequestClose={() => setShowCart(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCart(false)} />
          <View style={styles.cartSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.cartHeader}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:10, flex:1 }}>
                <View style={styles.cartHeaderIcon}><Ionicons name="bag-handle" size={18} color="#6366f1" /></View>
                <Text style={styles.cartTitle}>Keranjang</Text>
              </View>
              <View style={{ flexDirection:'row', gap:8 }}>
                {cart.length > 0 && (
                  <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    <Text style={styles.clearBtnText}>Kosongkan</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setShowCart(false)}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Text style={{ fontSize: 52 }}>🛒</Text>
                <Text style={styles.emptyCartTitle}>Keranjang masih kosong</Text>
                <TouchableOpacity style={styles.emptyCartBtn} onPress={() => setShowCart(false)}>
                  <Ionicons name="arrow-back" size={16} color="#6366f1" />
                  <Text style={styles.emptyCartBtnText}>Kembali ke Katalog</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>
                  {cart.map((item, idx) => {
                    const def = getCategoryDef(item.product.category);
                    return (
                      <View key={item.product.id} style={[styles.cartItem, idx===cart.length-1&&{borderBottomWidth:0}]}>
                        <View style={[styles.cartItemIcon, { backgroundColor: def.lightBg }]}>
                          <Ionicons name={def.icon as any} size={20} color={def.color} />
                        </View>
                        <View style={{ flex:1, marginLeft:12 }}>
                          <Text style={styles.cartItemName} numberOfLines={1}>{item.product.name}</Text>
                          <Text style={styles.cartItemPrice}>{formatRupiah(item.product.price)} / item</Text>
                        </View>
                        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                          <TouchableOpacity style={[styles.qtyBtn, item.qty===1&&{backgroundColor:'#fef2f2'}]}
                            onPress={() => item.qty===1 ? removeItem(item.product.id) : updateQty(item.product.id,-1)}>
                            <Ionicons name={item.qty===1?'trash-outline':'remove'} size={15} color={item.qty===1?'#ef4444':'#6366f1'} />
                          </TouchableOpacity>
                          <Text style={styles.qtyNum}>{item.qty}</Text>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id,1)}>
                            <Ionicons name="add" size={15} color="#6366f1" />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.cartItemSubtotal, { color: def.color }]}>
                          {formatRupiah(item.product.price * item.qty)}
                        </Text>
                      </View>
                    );
                  })}

                  {/* Diskon */}
                  <View style={styles.diskonRow}>
                    <View style={{ flexDirection:'row', alignItems:'center', flex:1 }}>
                      <View style={[styles.statIconBox, { backgroundColor:'#f0fdf4', marginBottom:0, marginRight:10 }]}>
                        <Ionicons name="pricetag" size={16} color="#22c55e" />
                      </View>
                      <Text style={{ fontSize:15, color:'#475569', fontWeight:'600' }}>Diskon (Rp)</Text>
                    </View>
                    <TextInput
                      style={styles.diskonInput}
                      value={diskon}
                      onChangeText={v => setDiskon(v.replace(/[^0-9]/g,''))}
                      keyboardType="numeric" placeholder="0" placeholderTextColor="#94a3b8"
                    />
                  </View>
                </ScrollView>

                {/* Summary */}
                <View style={styles.summaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>{formatRupiah(subtotal)}</Text>
                  </View>
                  {diskonAmt > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color:'#22c55e' }]}>Diskon</Text>
                      <Text style={[styles.summaryValue, { color:'#22c55e' }]}>- {formatRupiah(diskonAmt)}</Text>
                    </View>
                  )}
                  <View style={[styles.summaryRow, { borderTopWidth:1.5, borderTopColor:'#e2e8f0', paddingTop:12, marginTop:6 }]}>
                    <Text style={{ fontSize:18, fontWeight:'800', color:'#0f172a' }}>TOTAL</Text>
                    <Text style={{ fontSize:20, fontWeight:'900', color:'#6366f1' }}>{formatRupiah(total)}</Text>
                  </View>
                  <TouchableOpacity style={styles.btnBayar}
                    onPress={() => { setShowCart(false); setTimeout(openPayment, 200); }}>
                    <Ionicons name="wallet-outline" size={20} color="#fff" style={{ marginRight:10 }} />
                    <Text style={{ fontSize:16, fontWeight:'800', color:'#fff' }}>Proses Pembayaran</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ═══ MODAL: PEMBAYARAN ═══ */}
      <Modal visible={showPayment} transparent animationType="none" onRequestClose={closePayment}>
        <Animated.View style={[styles.payOverlay, { opacity: payFade }]}>
          <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1, justifyContent:'flex-end' }}>
            <Animated.View style={[styles.paySheet, { transform:[{ translateY: paySlide }] }]}>
              <View style={styles.sheetHandle} />
              <View style={{ flexDirection:'row', alignItems:'center', marginBottom:20 }}>
                <View style={[styles.statIconBox, { backgroundColor:'#eef2ff', marginBottom:0, marginRight:12 }]}>
                  <Ionicons name="wallet" size={18} color="#6366f1" />
                </View>
                <Text style={{ flex:1, fontSize:20, fontWeight:'800', color:'#0f172a' }}>Pembayaran Tunai</Text>
                <TouchableOpacity style={styles.sheetCloseBtn} onPress={closePayment}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.totalBox}>
                <Text style={{ fontSize:13, color:'#a5b4fc' }}>Total Tagihan</Text>
                <Text style={{ fontSize:34, fontWeight:'900', color:'#fff', marginTop:4 }}>{formatRupiah(total)}</Text>
                {diskonAmt > 0 && (
                  <View style={{ flexDirection:'row', alignItems:'center', marginTop:6, gap:5 }}>
                    <Ionicons name="pricetag" size={12} color="#a5b4fc" />
                    <Text style={{ fontSize:12, color:'#a5b4fc' }}>Diskon {formatRupiah(diskonAmt)}</Text>
                  </View>
                )}
              </View>

              <Text style={{ fontSize:13, fontWeight:'700', color:'#475569', marginBottom:10 }}>Uang Diterima</Text>
              <View style={[styles.payInput, focusBayar && { borderColor:'#6366f1' }]}>
                <Text style={{ fontSize:18, fontWeight:'700', color:'#64748b', marginRight:8 }}>Rp</Text>
                <TextInput
                  style={{ flex:1, fontSize:28, fontWeight:'800', color:'#0f172a', paddingVertical:12 }}
                  placeholder="0" placeholderTextColor="#94a3b8"
                  keyboardType="numeric" value={bayar}
                  onChangeText={v => setBayar(v.replace(/\D/g,''))}
                  onFocus={() => setFocusBayar(true)} onBlur={() => setFocusBayar(false)}
                  autoFocus
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:16 }} contentContainerStyle={{ gap:8 }}>
                {quickAmounts.map((amt, i) => {
                  const active = bayar === String(amt);
                  return (
                    <TouchableOpacity key={i} style={[styles.quickBtn, active && { backgroundColor:'#6366f1', borderColor:'#6366f1' }]} onPress={() => setBayar(String(amt))}>
                      {i===0 && <Ionicons name="checkmark-circle" size={13} color={active?'#fff':'#6366f1'} style={{ marginRight:4 }} />}
                      <Text style={[{ fontSize:13, fontWeight:'700', color:'#64748b' }, active && { color:'#fff' }]}>
                        {i===0 ? 'Pas' : formatRupiah(amt)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {Number(bayar) >= total && (
                <View style={styles.kembalianBox}>
                  <View style={[styles.statIconBox, { backgroundColor:'#dcfce7', marginBottom:0, marginRight:10 }]}>
                    <Ionicons name="cash" size={16} color="#16a34a" />
                  </View>
                  <Text style={{ fontSize:16, fontWeight:'600', color:'#166534', flex:1 }}>Kembalian</Text>
                  <Text style={{ fontSize:22, fontWeight:'900', color:'#16a34a' }}>{formatRupiah(Number(bayar)-total)}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.btnProses, (!bayar || Number(bayar) < total) && { backgroundColor:'#cbd5e1', shadowOpacity:0 }]}
                onPress={processPayment} disabled={!bayar || Number(bayar) < total}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight:10 }} />
                <Text style={{ fontSize:16, fontWeight:'800', color:'#fff' }}>Konfirmasi Pembayaran</Text>
              </TouchableOpacity>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* ═══ MODAL: NOTA ═══ */}
      <Modal visible={showReceipt} transparent animationType="none" onRequestClose={() => {}}>
        <Animated.View style={[styles.receiptOverlay, { opacity: receiptFade }]}>
          <Animated.View style={[styles.receiptWrapper, { transform:[{ translateY: receiptSlide }] }]}>
            <TouchableOpacity style={styles.receiptCloseBtn} onPress={finishTransaction}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:120 }}>
              {/* Banner sukses */}
              <View style={{ alignItems:'center', paddingTop:36, paddingBottom:24, paddingHorizontal:24 }}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={34} color="#fff" />
                </View>
                <Text style={{ fontSize:24, fontWeight:'800', color:'#0f172a' }}>Transaksi Berhasil!</Text>
                <Text style={{ fontSize:14, color:'#64748b', marginTop:4 }}>Nota telah dibuat & tersimpan</Text>
              </View>

              {/* Nota kertas */}
              {receipt && (
                <View style={styles.receiptPaper}>
                  <View style={styles.tearEdge} />
                  {/* Header nota */}
                  <View style={{ paddingHorizontal:20, paddingTop:16, paddingBottom:4 }}>
                    <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, marginBottom:10 }}>
                      <View style={{ width:32, height:32, borderRadius:8, backgroundColor:'#eef2ff', alignItems:'center', justifyContent:'center' }}>
                        <Ionicons name="storefront" size={18} color="#6366f1" />
                      </View>
                      <Text style={{ fontSize:18, fontWeight:'900', color:'#0f172a' }}>{receipt.namaToko}</Text>
                    </View>
                    <View style={styles.rDivider} />
                    <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                      <View style={{ flexDirection:'row', alignItems:'center' }}>
                        <Ionicons name="receipt-outline" size={12} color="#94a3b8" style={{ marginRight:4 }} />
                        <Text style={styles.rMeta}>{receipt.noNota}</Text>
                      </View>
                      <View style={{ flexDirection:'row', alignItems:'center' }}>
                        <Ionicons name="person-outline" size={12} color="#94a3b8" style={{ marginRight:4 }} />
                        <Text style={styles.rMeta}>{receipt.kasir}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                      <View style={{ flexDirection:'row', alignItems:'center' }}>
                        <Ionicons name="calendar-outline" size={12} color="#94a3b8" style={{ marginRight:4 }} />
                        <Text style={styles.rMeta}>{receipt.tanggal}</Text>
                      </View>
                      <View style={{ flexDirection:'row', alignItems:'center' }}>
                        <Ionicons name="time-outline" size={12} color="#94a3b8" style={{ marginRight:4 }} />
                        <Text style={styles.rMeta}>{receipt.jam}</Text>
                      </View>
                    </View>
                    <View style={styles.rDivider} />
                  </View>

                  {/* Item */}
                  <View style={{ paddingHorizontal:20, paddingBottom:4 }}>
                    {receipt.items.map((item, i) => {
                      const def = getCategoryDef(item.product.category);
                      return (
                        <View key={i} style={{ flexDirection:'row', alignItems:'flex-start', marginBottom:10, gap:8 }}>
                          <View style={{ width:28, height:28, borderRadius:8, backgroundColor:def.lightBg, alignItems:'center', justifyContent:'center', marginTop:1 }}>
                            <Ionicons name={def.icon as any} size={13} color={def.color} />
                          </View>
                          <View style={{ flex:1 }}>
                            <Text style={{ fontSize:13, fontWeight:'700', color:'#0f172a' }}>{item.product.name}</Text>
                            <Text style={{ fontSize:12, color:'#64748b', marginTop:1 }}>{item.qty} × {formatRupiah(item.product.price)}</Text>
                          </View>
                          <Text style={{ fontSize:13, fontWeight:'700', minWidth:80, textAlign:'right', marginTop:1, color:def.color }}>
                            {formatRupiah(item.product.price*item.qty)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.rDivider} />
                  {/* Subtotal */}
                  <View style={{ paddingHorizontal:20 }}>
                    <View style={styles.rRow}>
                      <Text style={styles.rLabel}>Subtotal ({receipt.items.reduce((s,i)=>s+i.qty,0)} item)</Text>
                      <Text style={styles.rValue}>{formatRupiah(receipt.subtotal)}</Text>
                    </View>
                    {receipt.diskon > 0 && (
                      <View style={styles.rRow}>
                        <Text style={[styles.rLabel, { color:'#22c55e' }]}>Diskon</Text>
                        <Text style={[styles.rValue, { color:'#22c55e' }]}>- {formatRupiah(receipt.diskon)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Total box */}
                  <View style={styles.rTotalBox}>
                    <Text style={{ fontSize:13, fontWeight:'700', color:'#a5b4fc', letterSpacing:1.5 }}>TOTAL</Text>
                    <Text style={{ fontSize:22, fontWeight:'900', color:'#fff' }}>{formatRupiah(receipt.total)}</Text>
                  </View>

                  {/* Bayar & kembalian */}
                  <View style={{ paddingHorizontal:20, marginBottom:8 }}>
                    <View style={styles.rRow}>
                      <View style={{ flexDirection:'row', alignItems:'center' }}>
                        <Ionicons name="cash-outline" size={13} color="#64748b" style={{ marginRight:6 }} />
                        <Text style={styles.rLabel}>Tunai</Text>
                      </View>
                      <Text style={styles.rValue}>{formatRupiah(receipt.bayar)}</Text>
                    </View>
                    <View style={styles.rRow}>
                      <View style={{ flexDirection:'row', alignItems:'center' }}>
                        <Ionicons name="arrow-undo" size={13} color="#6366f1" style={{ marginRight:6 }} />
                        <Text style={[styles.rLabel, { fontWeight:'700', color:'#0f172a' }]}>Kembalian</Text>
                      </View>
                      <Text style={{ fontSize:16, fontWeight:'900', color:'#6366f1' }}>{formatRupiah(receipt.kembalian)}</Text>
                    </View>
                  </View>

                  <View style={styles.rDivider} />
                  <Text style={{ fontSize:14, fontWeight:'700', color:'#0f172a', textAlign:'center', paddingTop:8 }}>✨ Terima kasih!</Text>
                  <Text style={{ fontSize:11, color:'#94a3b8', textAlign:'center', marginTop:4, marginBottom:12 }}>Barang yang sudah dibeli tidak dapat dikembalikan</Text>
                  <View style={[styles.tearEdge, { transform:[{ rotate:'180deg' }] }]} />
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.receiptActions}>
              <TouchableOpacity style={styles.btnShare}>
                <Ionicons name="share-social-outline" size={19} color="#6366f1" />
                <Text style={{ fontSize:15, fontWeight:'700', color:'#6366f1' }}>Bagikan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnDone} onPress={finishTransaction}>
                <Ionicons name="add-circle-outline" size={19} color="#fff" style={{ marginRight:8 }} />
                <Text style={{ fontSize:15, fontWeight:'800', color:'#fff' }}>Transaksi Baru</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  loadingWrap: { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#f1f5f9' },
  loadingText: { marginTop:12, fontSize:15, color:'#64748b', fontWeight:'500' },

  header: { backgroundColor:'#312e81', paddingTop:Platform.OS==='ios'?54:36, paddingBottom:20, paddingHorizontal:20, overflow:'hidden', borderBottomLeftRadius:24, borderBottomRightRadius:24 },
  hCircle: { position:'absolute', borderRadius:999, backgroundColor:'#fff' },
  headerRow: { flexDirection:'row', alignItems:'center' },
  backBtn: { width:40, height:40, borderRadius:12, backgroundColor:'rgba(255,255,255,0.15)', alignItems:'center', justifyContent:'center' },
  headerCenter: { flex:1, alignItems:'center' },
  headerTitle: { fontSize:20, fontWeight:'800', color:'#fff', letterSpacing:-0.5 },
  headerSub: { fontSize:13, color:'#a5b4fc', marginTop:2 },
  cartBtn: { width:40, height:40, borderRadius:12, backgroundColor:'#6366f1', alignItems:'center', justifyContent:'center' },
  cartBadge: { position:'absolute', top:-4, right:-4, backgroundColor:'#ef4444', borderRadius:10, minWidth:18, height:18, alignItems:'center', justifyContent:'center', paddingHorizontal:4, borderWidth:2, borderColor:'#312e81' },
  cartBadgeText: { fontSize:10, color:'#fff', fontWeight:'800' },

  statsRow: { flexDirection:'row', marginHorizontal:16, marginTop:16, marginBottom:4, gap:10 },
  statCard: { flex:1, backgroundColor:'#fff', borderRadius:16, padding:12, alignItems:'center', shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:6, elevation:3 },
  statIconBox: { width:36, height:36, borderRadius:10, alignItems:'center', justifyContent:'center', marginBottom:6 },
  statNumber: { fontSize:20, fontWeight:'800', color:'#1e293b' },
  statLabel: { fontSize:11, color:'#94a3b8', marginTop:1, fontWeight:'500' },

  searchWrapper: { paddingHorizontal:16, paddingTop:14, paddingBottom:6 },
  searchBar: { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:16, paddingHorizontal:16, paddingVertical:12, borderWidth:1.5, borderColor:'#e2e8f0', shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.04, shadowRadius:6, elevation:2 },
  searchFocused: { borderColor:'#6366f1' },
  searchInput: { flex:1, fontSize:15, color:'#1e293b' },

  // ── Chip FIXED SIZE — tidak berubah saat dipilih ──────────────────────────
// ✅ SESUDAH
categoryScroll: {
  maxHeight: 56,        // ← naikan: 35 chip + 8+8 padding + 5 buffer
  backgroundColor: '#f1f5f9',
},
categoryScrollContent: {
  paddingHorizontal: 16,
  paddingVertical: 6,   // ← turunkan sedikit
  gap: 8,
  alignItems: 'center',
},
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 35,              // ← FIXED HEIGHT — tidak berubah saat aktif/nonaktif
    paddingHorizontal: 10,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    gap: 5,
  },
  chipIconBox: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,           // ← tidak menyusut
  },
  chipLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
    maxWidth: 68,            // ← batasi lebar agar tidak melar
  },
  chipBadge: {
    width: 22, height: 22,   // ← ukuran TETAP, bukan minWidth
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipBadgeText: { fontSize: 10, fontWeight: '800' },

  grid: { paddingHorizontal:12, paddingTop:8, paddingBottom:120 },
  productCard: { flex:1, margin:4, backgroundColor:'#fff', borderRadius:18, padding:14, borderWidth:1.5, borderColor:'transparent', shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:6, elevation:3 },
  qtyBadge: { position:'absolute', top:10, right:10, borderRadius:10, minWidth:22, height:22, alignItems:'center', justifyContent:'center', paddingHorizontal:5, zIndex:1 },
  qtyBadgeText: { fontSize:11, color:'#fff', fontWeight:'800' },
  productIconBox: { width:52, height:52, borderRadius:14, alignItems:'center', justifyContent:'center', marginBottom:10 },
  productName: { fontSize:13, fontWeight:'700', color:'#0f172a', marginBottom:4, lineHeight:18 },
  productPrice: { fontSize:14, fontWeight:'800', marginBottom:10 },
  productFooter: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  stockRow: { flexDirection:'row', alignItems:'center' },
  stockDot: { width:6, height:6, borderRadius:3, marginRight:5 },
  stockText: { fontSize:11, color:'#64748b', fontWeight:'500' },
  addBtn: { width:28, height:28, borderRadius:8, alignItems:'center', justifyContent:'center' },

  emptyWrap: { alignItems:'center', padding:48 },
  emptyIconBox: { width:96, height:96, borderRadius:28, backgroundColor:'#f8fafc', alignItems:'center', justifyContent:'center', marginBottom:16, borderWidth:2, borderColor:'#e2e8f0' },
  emptyTitle: { fontSize:17, fontWeight:'700', color:'#94a3b8' },
  emptySub: { fontSize:13, color:'#cbd5e1', marginTop:6 },

  stickyBottom: { position:'absolute', bottom:30, left:0, right:0, paddingHorizontal:16, paddingBottom:Platform.OS==='ios'?28:14, paddingTop:10 },
  stickyBtn: { flexDirection:'row', alignItems:'center', backgroundColor:'#312e81', borderRadius:20, paddingVertical:20, paddingHorizontal:20, shadowColor:'#312e81', shadowOffset:{width:0,height:8}, shadowOpacity:0.35, shadowRadius:20, elevation:12 },
  stickyLeft: { flex:1 },
  stickyQtyText: { fontSize:12, color:'#a5b4fc' },
  stickyTotal: { fontSize:20, fontWeight:'800', color:'#fff' },
  stickyRight: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#f7b308', paddingHorizontal:16, paddingVertical:10, borderRadius:14 },
  stickyBayarText: { fontSize:14, fontWeight:'700', color:'#000000' },

  sheetOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  sheetHandle: { width:40, height:4, borderRadius:2, backgroundColor:'#e2e8f0', alignSelf:'center', marginBottom:20 },
  sheetCloseBtn: { width:34, height:34, borderRadius:10, backgroundColor:'#f1f5f9', alignItems:'center', justifyContent:'center' },

  cartSheet: { backgroundColor:'#fff', borderTopLeftRadius:28, borderTopRightRadius:28, padding:24, maxHeight:'90%', paddingBottom:Platform.OS==='ios'?36:24 },
  cartHeader: { flexDirection:'row', alignItems:'center', marginBottom:16 },
  cartHeaderIcon: { width:34, height:34, borderRadius:10, backgroundColor:'#eef2ff', alignItems:'center', justifyContent:'center' },
  cartTitle: { fontSize:20, fontWeight:'800', color:'#0f172a' },
  clearBtn: { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:10, paddingVertical:6, borderRadius:10, backgroundColor:'#fef2f2' },
  clearBtnText: { fontSize:12, color:'#ef4444', fontWeight:'600' },
  emptyCart: { alignItems:'center', paddingVertical:48 },
  emptyCartTitle: { fontSize:18, fontWeight:'700', color:'#0f172a', marginTop:14, marginBottom:20 },
  emptyCartBtn: { flexDirection:'row', alignItems:'center', gap:6, borderWidth:1.5, borderColor:'#6366f1', borderRadius:14, paddingHorizontal:20, paddingVertical:11 },
  emptyCartBtnText: { fontSize:14, fontWeight:'700', color:'#6366f1' },
  cartItem: { flexDirection:'row', alignItems:'center', paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#f1f5f9', gap:10 },
  cartItemIcon: { width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center' },
  cartItemName: { fontSize:14, fontWeight:'700', color:'#0f172a' },
  cartItemPrice: { fontSize:12, color:'#94a3b8', marginTop:2 },
  qtyBtn: { width:30, height:30, borderRadius:8, backgroundColor:'#f1f5f9', alignItems:'center', justifyContent:'center' },
  qtyNum: { fontSize:15, fontWeight:'800', color:'#0f172a', minWidth:22, textAlign:'center' },
  cartItemSubtotal: { fontSize:14, fontWeight:'800', minWidth:80, textAlign:'right' },
  diskonRow: { flexDirection:'row', alignItems:'center', paddingVertical:14, borderTopWidth:1, borderTopColor:'#f1f5f9', marginTop:4 },
  diskonInput: { borderWidth:1.5, borderColor:'#e2e8f0', borderRadius:12, paddingHorizontal:12, paddingVertical:8, fontSize:15, color:'#1e293b', minWidth:110, textAlign:'right' },
  summaryBox: { paddingTop:16, borderTopWidth:1, borderTopColor:'#e2e8f0' },
  summaryRow: { flexDirection:'row', justifyContent:'space-between', marginBottom:6 },
  summaryLabel: { fontSize:15, color:'#64748b' },
  summaryValue: { fontSize:15, color:'#1e293b', fontWeight:'600' },
  btnBayar: { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#312e81', borderRadius:18, paddingVertical:16, marginTop:16, shadowColor:'#312e81', shadowOffset:{width:0,height:6}, shadowOpacity:0.3, shadowRadius:12, elevation:8 },

  payOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' },
  paySheet: { backgroundColor:'#fff', borderTopLeftRadius:28, borderTopRightRadius:28, padding:24, paddingBottom:Platform.OS==='ios'?40:24 },
  totalBox: { backgroundColor:'#312e81', borderRadius:18, padding:20, alignItems:'center', marginBottom:20 },
  payInput: { flexDirection:'row', alignItems:'center', borderWidth:2, borderColor:'#e2e8f0', borderRadius:16, paddingHorizontal:16, marginBottom:14 },
  quickBtn: { flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingVertical:9, borderRadius:12, borderWidth:1.5, borderColor:'#e2e8f0', backgroundColor:'#f8fafc' },
  kembalianBox: { flexDirection:'row', alignItems:'center', backgroundColor:'#f0fdf4', borderRadius:14, padding:14, marginBottom:16 },
  btnProses: { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#6366f1', borderRadius:18, paddingVertical:16, shadowColor:'#6366f1', shadowOffset:{width:0,height:6}, shadowOpacity:0.35, shadowRadius:12, elevation:8 },

  receiptOverlay: { flex:1, backgroundColor:'rgba(10,15,30,0.85)', justifyContent:'center' },
  receiptWrapper: { flex:1, marginTop:40, backgroundColor:'#f1f5f9', borderTopLeftRadius:28, borderTopRightRadius:28 },
  receiptCloseBtn: { position:'absolute', top:16, right:16, zIndex:10, width:36, height:36, borderRadius:10, backgroundColor:'#e2e8f0', alignItems:'center', justifyContent:'center' },
  successIcon: { width:72, height:72, borderRadius:36, backgroundColor:'#22c55e', alignItems:'center', justifyContent:'center', shadowColor:'#22c55e', shadowOffset:{width:0,height:8}, shadowOpacity:0.4, shadowRadius:16, elevation:10, marginBottom:16 },
  receiptPaper: { backgroundColor:'#fff', marginHorizontal:16, borderRadius:4, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.1, shadowRadius:16, elevation:8, overflow:'hidden' },
  tearEdge: { height:12, backgroundColor:'#f1f5f9', borderBottomWidth:2, borderBottomColor:'#e2e8f0', borderStyle:'dashed' },
  rDivider: { borderTopWidth:1.5, borderTopColor:'#f1f5f9', borderStyle:'dashed', marginVertical:10 },
  rMeta: { fontSize:12, color:'#64748b' },
  rRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 },
  rLabel: { fontSize:13, color:'#64748b' },
  rValue: { fontSize:13, color:'#0f172a', fontWeight:'600' },
  rTotalBox: { backgroundColor:'#312e81', marginHorizontal:20, borderRadius:12, flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:14, marginTop:8, marginBottom:12 },
  receiptActions: { position:'absolute', bottom:0, left:0, right:0, flexDirection:'row', gap:12, padding:16, paddingBottom:Platform.OS==='ios'?32:16, backgroundColor:'#fff', borderTopWidth:1, borderTopColor:'#e2e8f0' },
  btnShare: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:'#6366f1', borderRadius:16, paddingVertical:14, gap:8 },
  btnDone: { flex:2, flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#6366f1', borderRadius:16, paddingVertical:14, shadowColor:'#6366f1', shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:10, elevation:6 },
});