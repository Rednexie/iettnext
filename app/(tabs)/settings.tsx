
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Switch } from 'react-native';
import localVersionData from '../../assets/version.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [useBetaLocationTransform, setUseBetaLocationTransform] = useState(false);
  const [cacheInfo, setCacheInfo] = useState({
    lineInfoCacheCount: 0,
    lineInfoCacheSize: 0,
    favoriteCacheCount: 0,
    favoriteCacheSize: 0,
    combinedLocationCacheCount: 0,
    combinedLocationCacheSize: 0,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const betaTransform = await AsyncStorage.getItem('useBetaLocationTransform');
        if (betaTransform !== null) {
          setUseBetaLocationTransform(JSON.parse(betaTransform));
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    };

    const calculateCacheInfo = async () => {
      let locationCacheCount = 0;
      let locationCacheSize = 0;
      let lineInfoCacheCount = 0;
      let lineInfoCacheSize = 0;
      let favoriteCacheCount = 0;
      let favoriteCacheSize = 0;
      let legacyLocationCacheCount = 0;
      let legacyLocationCacheSize = 0;

      try {
        const keys = await AsyncStorage.getAllKeys();
        for (const key of keys) {
          const item = await AsyncStorage.getItem(key);
          if (item) {
            const itemSize = item.length * 2;

            if (key === 'locationCache') {
              const cache = JSON.parse(item);
              locationCacheCount = Object.keys(cache).length;
              locationCacheSize = itemSize;
            } else if (key.startsWith('h=')) {
              lineInfoCacheCount++;
              lineInfoCacheSize += itemSize;
            } else if (key === 'favoriteVehicles' || key === 'favoriteStops' || key === 'favoriteLines') {
              const favorites = JSON.parse(item);
              favoriteCacheCount += favorites.length; 
              favoriteCacheSize += itemSize;
            } else if (key.startsWith('ll=')) {
              legacyLocationCacheCount++;
              legacyLocationCacheSize += itemSize;
            }
          }
        }
      } catch (e) {
        console.error('Failed to calculate cache info:', e);
      }
      setCacheInfo({
        lineInfoCacheCount,
        lineInfoCacheSize: lineInfoCacheSize / 1024,
        favoriteCacheCount,
        favoriteCacheSize: favoriteCacheSize / 1024,
        combinedLocationCacheCount: locationCacheCount + legacyLocationCacheCount,
        combinedLocationCacheSize: (locationCacheSize + legacyLocationCacheSize) / 1024,
      });
    };

    loadSettings();
    calculateCacheInfo();
  }, []);

  const toggleBetaLocationTransform = async () => {
    const newValue = !useBetaLocationTransform;
    setUseBetaLocationTransform(newValue);
    try {
      await AsyncStorage.setItem('useBetaLocationTransform', JSON.stringify(newValue));
    } catch (e) {
      console.error('Failed to save beta location transform setting:', e);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Ayarlar</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Genel Ayarlar</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Durak Bazlı Konum Çözümleme(Beta)</Text>
          <Switch
            trackColor={{ false: '#767577', true: '#8a6cf1' }}
            thumbColor={useBetaLocationTransform ? '#f4f3f4' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleBetaLocationTransform}
            value={useBetaLocationTransform}
          />
        </View>
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Eski Konum Çözümleme Sistemi: Araç konumlarını tamamen yol, mahalle, cadde ve semt isimlerine göre çözümler.
            {'\n'}Örnek: Ali İhsan Paşa Caddesi, Tuzla
            {'\n\n'}Yeni Konum Çözümleme Sistemi: Araç konumlarını tamamen en yakın durağa kuşbakışı uzaklığına göre çözümler.
            {'\n'}Örnek: 144m ~ SABİHA GÖKÇEN HAVALİMANI
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Uygulama Bilgileri</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Sürüm</Text>
          <Text style={styles.settingValue}>{localVersionData.version}</Text>
        </View>

        <Text style={styles.subheading}>Önbellek Bilgileri</Text>

        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Favoriler Önbelleği</Text>
          <Text style={styles.settingValue}>
            {cacheInfo.favoriteCacheCount} öğe (~
            {cacheInfo.favoriteCacheSize.toFixed(2)} KB)
          </Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Konum Önbelleği</Text>
          <Text style={styles.settingValue}>
            {cacheInfo.combinedLocationCacheCount} öğe (~
            {cacheInfo.combinedLocationCacheSize.toFixed(2)} KB)
          </Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Hat Bilgisi Önbelleği</Text>
          <Text style={styles.settingValue}>
            {cacheInfo.lineInfoCacheCount} öğe (~
            {cacheInfo.lineInfoCacheSize.toFixed(2)} KB)
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#1a1a2e',
    padding: 32,
    borderRadius: 20,
    marginHorizontal: 0,
    marginTop: 32,
    marginBottom: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  headerText: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#8a6cf1',
    textAlign: 'center',
    letterSpacing: -1,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)',
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#8a6cf1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: '#8a6cf1',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  descriptionContainer: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 12,
  },
  descriptionText: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 18,
  },
  settingText: {
    color: '#e0e0e0',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  settingValue: {
    color: '#a0a0a0',
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
  subheading: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#8a6cf1',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
}); 