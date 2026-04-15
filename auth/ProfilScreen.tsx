import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ProfilScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Halaman Profil</Text>
      <Text style={styles.subtitle}>Ini adalah halaman Profil kamu</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Kembali ke Beranda</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fc' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 40 },
  button: { backgroundColor: '#6366f1', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});