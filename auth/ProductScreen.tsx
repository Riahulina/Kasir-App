import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Data awal dari products.json (fallback jika AsyncStorage kosong) ─────────
import INITIAL_PRODUCTS from '../data/products.json';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  description?: string;
};

type Props = {
  onBack: () => void;
};

// ─── Kunci penyimpanan AsyncStorage ───────────────────────────────────────────
const STORAGE_KEY = '@kasirapp_products';

// ─── Definisi Kategori lengkap dengan icon & warna ────────────────────────────
type CategoryDef = {
  label: string;
  icon: string;
  color: string;
  bg: string;
  lightBg: string;
};

const CATEGORY_DEFS: CategoryDef[] = [
  { label: 'Semua',      icon: 'grid',            color: '#6366f1', bg: '#6366f1', lightBg: '#eef2ff' },
  { label: 'Makanan',    icon: 'restaurant',      color: '#f97316', bg: '#f97316', lightBg: '#fff7ed' },
  { label: 'Minuman',    icon: 'cafe',            color: '#06b6d4', bg: '#06b6d4', lightBg: '#ecfeff' },
  { label: 'Snack',      icon: 'pizza',           color: '#a855f7', bg: '#a855f7', lightBg: '#faf5ff' },
  { label: 'Elektronik', icon: 'phone-portrait',  color: '#3b82f6', bg: '#3b82f6', lightBg: '#eff6ff' },
  { label: 'Pakaian',    icon: 'shirt',           color: '#ec4899', bg: '#ec4899', lightBg: '#fdf2f8' },
  { label: 'Lainnya',    icon: 'apps',            color: '#64748b', bg: '#64748b', lightBg: '#f8fafc' },
];

const CATEGORIES = CATEGORY_DEFS.filter(c => c.label !== 'Semua').map(c => c.label);

const getCategoryDef = (label: string): CategoryDef =>
  CATEGORY_DEFS.find(c => c.label === label) ?? CATEGORY_DEFS[CATEGORY_DEFS.length - 1];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatRupiah = (value: number) => 'Rp ' + value.toLocaleString('id-ID');
const generateId = () => 'prod_' + Date.now().toString(36) + Math.random().toString(36).slice(2);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductScreen({ onBack }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategory, setFormCategory] = useState('Makanan');
  const [formDescription, setFormDescription] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  // ── Load dari AsyncStorage saat pertama mount ────────────────────────────
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const parsed: Product[] = JSON.parse(json);
        setProducts(parsed);
      } else {
        // Pertama kali buka: gunakan data dari products.json
        const initial = INITIAL_PRODUCTS as Product[];
        setProducts(initial);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } catch (e) {
      console.error('[ProductScreen] Gagal load:', e);
      setProducts(INITIAL_PRODUCTS as Product[]);
    } finally {
      setLoading(false);
    }
  };

  // ── Simpan ke AsyncStorage setiap produk berubah ─────────────────────────
  const saveProducts = async (updated: Product[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[ProductScreen] Gagal simpan:', e);
      Alert.alert('Error', 'Gagal menyimpan data produk');
    }
  };

  const updateProducts = (updated: Product[]) => {
    setProducts(updated);
    saveProducts(updated);
  };

  // ── Modal open/close ──────────────────────────────────────────────────────
  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormName(product.name);
      setFormPrice(product.price.toString());
      setFormStock(product.stock.toString());
      setFormCategory(product.category);
      setFormDescription(product.description || '');
    } else {
      setEditingProduct(null);
      setFormName('');
      setFormPrice('');
      setFormStock('');
      setFormCategory('Makanan');
      setFormDescription('');
    }
    setModalVisible(true);
    fadeAnim.setValue(0);
    slideAnim.setValue(60);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 60, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setModalVisible(false);
      setShowCategoryPicker(false);
    });
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!formName.trim()) { Alert.alert('Perhatian', 'Nama produk wajib diisi'); return; }
    if (!formPrice.trim() || isNaN(Number(formPrice)) || Number(formPrice) < 0) {
      Alert.alert('Perhatian', 'Harga tidak valid'); return;
    }
    if (!formStock.trim() || isNaN(Number(formStock)) || Number(formStock) < 0) {
      Alert.alert('Perhatian', 'Stok tidak valid'); return;
    }

    if (editingProduct) {
      const updated = products.map(p =>
        p.id === editingProduct.id
          ? {
              ...p,
              name: formName.trim(),
              price: Number(formPrice),
              stock: Number(formStock),
              category: formCategory,
              description: formDescription.trim(),
            }
          : p
      );
      updateProducts(updated);
      Alert.alert('✅ Berhasil', 'Produk berhasil diperbarui');
    } else {
      const newProduct: Product = {
        id: generateId(),
        name: formName.trim(),
        price: Number(formPrice),
        stock: Number(formStock),
        category: formCategory,
        description: formDescription.trim(),
      };
      const updated = [newProduct, ...products];
      updateProducts(updated);
      Alert.alert('✅ Berhasil', 'Produk berhasil ditambahkan');
    }
    closeModal();
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Hapus Produk',
      `Yakin ingin menghapus "${product.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: () => updateProducts(products.filter(p => p.id !== product.id)),
        },
      ]
    );
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const totalProducts = products.length;
  const lowStock = products.filter(p => p.stock < 10).length;

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Memuat data produk...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1b4b" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Daftar Produk</Text>
          <Text style={styles.headerSub}>{totalProducts} item tersimpan</Text>
        </View>
        <TouchableOpacity style={styles.addBtnHeader} onPress={() => openModal()}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── STATS ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#eef2ff' }]}>
            <Ionicons name="cube" size={18} color="#6366f1" />
          </View>
          <Text style={styles.statNumber}>{totalProducts}</Text>
          <Text style={styles.statLabel}>Total Produk</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: lowStock > 0 ? '#fef2f2' : '#f0fdf4' }]}>
            <Ionicons name="warning" size={18} color={lowStock > 0 ? '#ef4444' : '#22c55e'} />
          </View>
          <Text style={[styles.statNumber, lowStock > 0 && { color: '#ef4444' }]}>{lowStock}</Text>
          <Text style={styles.statLabel}>Stok Menipis</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#fff7ed' }]}>
            <Ionicons name="pricetag" size={18} color="#f97316" />
          </View>
          <Text style={styles.statNumber}>{CATEGORIES.length}</Text>
          <Text style={styles.statLabel}>Kategori</Text>
        </View>
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBar, focusedField === 'search' && styles.searchFocused]}>
          <Ionicons name="search-outline" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama produk atau kategori..."
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

      {/* ── CATEGORY CHIPS dengan ICON — Horizontal Scroll ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {CATEGORY_DEFS.map(cat => {
          const active = selectedCategory === cat.label;
          const count = cat.label === 'Semua'
            ? products.length
            : products.filter(p => p.category === cat.label).length;

          return (
            <TouchableOpacity
              key={cat.label}
              style={[
                styles.categoryChip,
                active && { backgroundColor: cat.bg, borderColor: cat.bg },
              ]}
              onPress={() => setSelectedCategory(cat.label)}
              activeOpacity={0.75}
            >
              {/* Icon */}
              <View style={[
                styles.categoryChipIcon,
                { backgroundColor: active ? 'rgba(255,255,255,0.22)' : cat.lightBg },
              ]}>
                <Ionicons
                  name={cat.icon as any}
                  size={15}
                  color={active ? '#fff' : cat.color}
                />
              </View>

              {/* Label */}
              <Text style={[styles.categoryChipLabel, active && styles.categoryChipLabelActive]}>
                {cat.label}
              </Text>

              {/* Jumlah produk */}
              <View style={[
                styles.categoryChipBadge,
                { backgroundColor: active ? 'rgba(255,255,255,0.28)' : cat.lightBg },
              ]}>
                <Text style={[
                  styles.categoryChipBadgeText,
                  { color: active ? '#fff' : cat.color },
                ]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── PRODUCT LIST ── */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>Produk tidak ditemukan</Text>
            <Text style={styles.emptySubtitle}>Coba ubah kata kunci atau tambah produk baru</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => openModal()}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyAddBtnText}>Tambah Produk</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => openModal(product)}
              onDelete={() => handleDelete(product)}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} onPress={() => openModal()} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ══ MODAL TAMBAH / EDIT ══════════════════════════════════════════════ */}
      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeModal}>
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <View style={[
                    styles.modalTitleIcon,
                    { backgroundColor: editingProduct ? '#fff7ed' : '#eef2ff' },
                  ]}>
                    <Ionicons
                      name={editingProduct ? 'create' : 'add-circle'}
                      size={20}
                      color={editingProduct ? '#f97316' : '#6366f1'}
                    />
                  </View>
                  <Text style={styles.modalTitle}>
                    {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <FormField
                  label="Nama Produk *"
                  placeholder="Contoh: Nasi Goreng Spesial"
                  value={formName}
                  onChangeText={setFormName}
                  fieldKey="name"
                  focused={focusedField}
                  onFocus={setFocusedField}
                />

                <View style={styles.rowFields}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <FormField
                      label="Harga (Rp) *"
                      placeholder="0"
                      value={formPrice}
                      onChangeText={setFormPrice}
                      fieldKey="price"
                      focused={focusedField}
                      onFocus={setFocusedField}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <FormField
                      label="Stok *"
                      placeholder="0"
                      value={formStock}
                      onChangeText={setFormStock}
                      fieldKey="stock"
                      focused={focusedField}
                      onFocus={setFocusedField}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Kategori Picker */}
                <Text style={styles.fieldLabel}>Kategori *</Text>
                <TouchableOpacity
                  style={[styles.categorySelector, showCategoryPicker && styles.categorySelectorActive]}
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                >
                  {(() => {
                    const def = getCategoryDef(formCategory);
                    return (
                      <>
                        <View style={[styles.catSelectorIconBox, { backgroundColor: def.lightBg }]}>
                          <Ionicons name={def.icon as any} size={16} color={def.color} />
                        </View>
                        <Text style={styles.categorySelectorText}>{formCategory}</Text>
                        <Ionicons
                          name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color="#64748b"
                        />
                      </>
                    );
                  })()}
                </TouchableOpacity>

                {showCategoryPicker && (
                  <View style={styles.categoryOptions}>
                    {CATEGORY_DEFS.filter(c => c.label !== 'Semua').map(cat => (
                      <TouchableOpacity
                        key={cat.label}
                        style={[
                          styles.categoryOption,
                          formCategory === cat.label && styles.categoryOptionActive,
                        ]}
                        onPress={() => { setFormCategory(cat.label); setShowCategoryPicker(false); }}
                      >
                        <View style={[styles.catOptionIconBox, { backgroundColor: cat.lightBg }]}>
                          <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                        </View>
                        <Text style={[
                          styles.categoryOptionText,
                          formCategory === cat.label && { color: '#6366f1', fontWeight: '700' },
                        ]}>
                          {cat.label}
                        </Text>
                        {formCategory === cat.label && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#6366f1"
                            style={{ marginLeft: 'auto' }}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <FormField
                  label="Deskripsi (opsional)"
                  placeholder="Deskripsi singkat produk..."
                  value={formDescription}
                  onChangeText={setFormDescription}
                  fieldKey="description"
                  focused={focusedField}
                  onFocus={setFocusedField}
                  multiline
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.btnCancel} onPress={closeModal}>
                    <Text style={styles.btnCancelText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
                    <Ionicons
                      name={editingProduct ? 'checkmark-circle' : 'add-circle'}
                      size={20}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.btnSaveText}>
                      {editingProduct ? 'Simpan Perubahan' : 'Tambahkan'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </View>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────

function FormField({
  label, placeholder, value, onChangeText,
  fieldKey, focused, onFocus, keyboardType, multiline,
}: {
  label: string; placeholder: string; value: string;
  onChangeText: (t: string) => void; fieldKey: string;
  focused: string | null; onFocus: (k: string | null) => void;
  keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[
        styles.fieldInput,
        focused === fieldKey && styles.fieldInputFocused,
        multiline && { minHeight: 80 },
      ]}>
        <TextInput
          style={[styles.fieldTextInput, multiline && { textAlignVertical: 'top', height: 80 }]}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || 'default'}
          multiline={multiline}
          onFocus={() => onFocus(fieldKey)}
          onBlur={() => onFocus(null)}
        />
      </View>
    </View>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({ product, onEdit, onDelete }: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const def = getCategoryDef(product.category);
  const isLowStock = product.stock < 10;

  return (
    <View style={styles.productCard}>
      <View style={[styles.productAccent, { backgroundColor: def.color }]} />
      <View style={styles.productBody}>
        <View style={styles.productTop}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
            {product.description ? (
              <Text style={styles.productDesc} numberOfLines={1}>{product.description}</Text>
            ) : null}
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: def.lightBg, borderColor: def.color + '40' }]}>
            <Ionicons name={def.icon as any} size={11} color={def.color} style={{ marginRight: 3 }} />
            <Text style={[styles.categoryBadgeText, { color: def.color }]}>{product.category}</Text>
          </View>
        </View>

        <View style={styles.productBottom}>
          <View>
            <Text style={styles.productPrice}>{formatRupiah(product.price)}</Text>
            <View style={styles.stockRow}>
              <View style={[styles.stockDot, { backgroundColor: isLowStock ? '#ef4444' : '#22c55e' }]} />
              <Text style={[styles.stockText, isLowStock && { color: '#ef4444' }]}>
                Stok: {product.stock}{isLowStock ? ' ⚠️' : ''}
              </Text>
            </View>
          </View>
          <View style={styles.productActions}>
            <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
              <Ionicons name="create-outline" size={18} color="#6366f1" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#64748b', fontWeight: '500' },

  header: {
    backgroundColor: '#312e81',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#a5b4fc', marginTop: 2 },
  addBtnHeader: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
  },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 16,
    marginTop: 16, marginBottom: 4, gap: 10,
  },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16,
    padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  statIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 1, fontWeight: '500' },

  searchWrapper: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  searchFocused: { borderColor: '#6366f1' },
  searchInput: { flex: 1, fontSize: 15, color: '#1e293b' },

  // ── Category Chips ──────────────────────────────────────────────────────
  categoryScroll: { maxHeight: 60 },
  categoryScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 8, paddingRight: 10, paddingVertical: 7,
    borderRadius: 22, borderWidth: 1.5,
    borderColor: '#e2e8f0', backgroundColor: '#fff',
    gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  categoryChipIcon: {
    width: 28, height: 28, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryChipLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  categoryChipLabelActive: { color: '#fff' },
  categoryChipBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  categoryChipBadgeText: { fontSize: 11, fontWeight: '800' },

  listContent: { paddingHorizontal: 16, paddingTop: 6 },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: '#e2e8f0',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#94a3b8' },
  emptySubtitle: {
    fontSize: 14, color: '#cbd5e1', marginTop: 6,
    textAlign: 'center', paddingHorizontal: 32,
  },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#6366f1', borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 24,
  },
  emptyAddBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  productCard: {
    backgroundColor: '#fff', borderRadius: 20,
    marginBottom: 12, flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 4,
  },
  productAccent: { width: 5 },
  productBody: { flex: 1, padding: 14 },
  productTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  productName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  productDesc: { fontSize: 12, color: '#94a3b8', marginTop: 3 },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  categoryBadgeText: { fontSize: 11, fontWeight: '700' },
  productBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productPrice: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  stockRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  stockDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  stockText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  productActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
  },

  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 12,
  },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '93%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modalTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitleIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },

  rowFields: { flexDirection: 'row' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, letterSpacing: 0.3 },
  fieldInput: {
    backgroundColor: '#f8fafc', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 4,
  },
  fieldInputFocused: { borderColor: '#6366f1', backgroundColor: '#fff' },
  fieldTextInput: { paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#1e293b' },

  categorySelector: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12, gap: 10,
  },
  categorySelectorActive: { borderColor: '#6366f1', backgroundColor: '#fff' },
  catSelectorIconBox: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  categorySelectorText: { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: '500' },
  categoryOptions: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    marginBottom: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
  },
  categoryOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12,
  },
  categoryOptionActive: { backgroundColor: '#eef2ff' },
  catOptionIconBox: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryOptionText: { fontSize: 15, color: '#1e293b', fontWeight: '500' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnCancel: {
    flex: 1, paddingVertical: 15, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  btnCancelText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  btnSave: {
    flex: 2, flexDirection: 'row', paddingVertical: 15,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  btnSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});