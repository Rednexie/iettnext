import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HaritaScreen() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold, 
    Inter_700Bold,
  });
  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Canlı Otobüs Haritası</Text>
      <Text style={styles.message}>
        Bu özellik web sitemizde mevcut:
      </Text>
      <TouchableOpacity 
        style={styles.linkButton}
        onPress={() => Linking.openURL('https://iett.deno.dev/harita')}
      >
        <Text style={styles.linkText}>Haritayı Görüntüle</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#8a6cf1',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#e0e0e0',
    textAlign: 'center',
    marginBottom: 20,
  },
  linkButton: {
    backgroundColor: '#6a4cff',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    marginTop: 12,
    shadowColor: '#6a4cff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  linkText: {
    color: '#ffffff',
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 0,
  },
});
