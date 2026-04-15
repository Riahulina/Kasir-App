import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProductScreen from './ProductScreen';
import TransactionScreen from './TransactionScreen';

type User = {
  name: string;
  email: string;
  namaToko?: string;
};

type Props = {
  user: User;
  onLogout: () => void;
};

type ActiveTab = 'home' | 'transaksi' | 'produk' | 'profil';

export default function HomeScreen({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  const totalPendapatan = 'Rp 18.750.000';
  const persenNaik = '+22.4%';

  // ── Render TransactionScreen saat tab transaksi aktif ───────────────────
  if (activeTab === 'transaksi') {
    return (
      <View style={{ flex: 1 }}>
        <TransactionScreen
          onBack={() => setActiveTab('home')}
          namaToko={user.namaToko}
          kasirName={user.name}
        />
        <BottomNav activeTab={activeTab} onChange={setActiveTab} onLogout={onLogout} />
      </View>
    );
  }

  // ── Render ProductScreen saat tab produk aktif ───────────────────────────
  if (activeTab === 'produk') {
    return (
      <View style={{ flex: 1 }}>
        <ProductScreen onBack={() => setActiveTab('home')} />
        <BottomNav activeTab={activeTab} onChange={setActiveTab} onLogout={onLogout} />
      </View>
    );
  }

  // ── Beranda ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Halo, {user.name}!</Text>
          {user.namaToko && <Text style={styles.toko}>🏪 {user.namaToko}</Text>}
        </View>

        <View style={styles.incomeCard}>
          <Text style={styles.cardTitle}>Total Pendapatan Bulan Ini</Text>
          <Text style={styles.incomeAmount}>{totalPendapatan}</Text>
          <Text style={styles.incomeChange}>{persenNaik} dari bulan lalu</Text>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setActiveTab('transaksi')}
          >
            <Ionicons name="cart-outline" size={32} color="#6366f1" />
            <Text style={styles.actionText}>Transaksi Baru</Text>
          </TouchableOpacity>

          {/* ← Tombol Tambah Produk navigasi ke ProductScreen */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setActiveTab('produk')}
          >
            <Ionicons name="add-circle-outline" size={32} color="#10b981" />
            <Text style={styles.actionText}>Tambah Produk</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => Alert.alert('Lihat Laporan')}
          >
            <Ionicons name="bar-chart-outline" size={32} color="#f59e0b" />
            <Text style={styles.actionText}>Laporan</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Aktivitas terbaru akan muncul di sini</Text>
        </View>
      </ScrollView>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} onLogout={onLogout} />
    </View>
  );
}

// ── BottomNav Component ──────────────────────────────────────────────────────

function BottomNav({
  activeTab,
  onChange,
  onLogout,
}: {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
  onLogout: () => void;
}) {
  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navItem} onPress={() => onChange('home')}>
        <Ionicons
          name={activeTab === 'home' ? 'home' : 'home-outline'}
          size={26}
          color={activeTab === 'home' ? '#6366f1' : '#64748b'}
        />
        <Text style={[styles.navLabel, activeTab === 'home' && { color: '#6366f1' }]}>Beranda</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => onChange('transaksi')}>
        <Ionicons
          name={activeTab === 'transaksi' ? 'receipt' : 'receipt-outline'}
          size={26}
          color={activeTab === 'transaksi' ? '#6366f1' : '#64748b'}
        />
        <Text style={[styles.navLabel, activeTab === 'transaksi' && { color: '#6366f1' }]}>Transaksi</Text>
      </TouchableOpacity>

      {/* ← Tab Produk */}
      <TouchableOpacity style={styles.navItem} onPress={() => onChange('produk')}>
        <Ionicons
          name={activeTab === 'produk' ? 'cube' : 'cube-outline'}
          size={26}
          color={activeTab === 'produk' ? '#6366f1' : '#64748b'}
        />
        <Text style={[styles.navLabel, activeTab === 'produk' && { color: '#6366f1' }]}>Produk</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => Alert.alert('Profil')}>
        <Ionicons
          name={activeTab === 'profil' ? 'person' : 'person-outline'}
          size={26}
          color={activeTab === 'profil' ? '#6366f1' : '#64748b'}
        />
        <Text style={[styles.navLabel, activeTab === 'profil' && { color: '#6366f1' }]}>Profil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={26} color="#ef4444" />
        <Text style={[styles.navLabel, { color: '#ef4444' }]}>Keluar</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fc' },
  scroll: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 32 },
  greeting: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
  toko: { fontSize: 16, color: '#6366f1', marginTop: 4, fontWeight: '600' },
  incomeCard: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  cardTitle: { color: '#e0e7ff', fontSize: 16, marginBottom: 8 },
  incomeAmount: { color: '#ffffff', fontSize: 36, fontWeight: '800' },
  incomeChange: { color: '#c7d2fe', fontSize: 16, marginTop: 8, fontWeight: '600' },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: { marginTop: 12, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  placeholder: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  placeholderText: { color: '#94a3b8', fontSize: 16 },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  navLabel: { fontSize: 12, marginTop: 4, color: '#64748b', fontWeight: '500' },
});