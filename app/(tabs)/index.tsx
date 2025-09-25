import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, LayoutAnimation, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import localVersionData from '../../assets/version.json';

// Decode HTML entities (including numeric Turkish codes) similar to public index.html
function decodeEntities(input: any): string {
  if (typeof input !== 'string') return '';
  // Quick replacements for common numeric codes if any survived double-encoding
  const quickMap: Array<[RegExp, string]> = [
    [/&#351;/g, 'ş'], [/&#350;/g, 'Ş'],
    [/&#287;/g, 'ğ'], [/&#286;/g, 'Ğ'],
    [/&#305;/g, 'ı'], [/&#304;/g, 'İ'],
    [/&#231;/g, 'ç'], [/&#199;/g, 'Ç'],
    [/&#246;/g, 'ö'], [/&#214;/g, 'Ö'],
    [/&#252;/g, 'ü'], [/&#220;/g, 'Ü'],
  ];
  let text = input;
  quickMap.forEach(([re, ch]) => { text = text.replace(re, ch); });
  // Decode numeric decimal and hex entities
  text = text
    .replace(/&#(\d+);/g, (_m, dec: string) => {
      const code = parseInt(dec, 10);
      return isFinite(code) ? String.fromCharCode(code) : _m;
    })
    .replace(/&#x([\da-fA-F]+);/g, (_m, hex: string) => {
      const code = parseInt(hex, 16);
      return isFinite(code) ? String.fromCharCode(code) : _m;
    });
  return text;
}



const API_BASE = 'https://iett.rednexie.workers.dev';


interface Announcement {
  id: string | number;
  title: string;
  description: string;
  startDate: string;
  url: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Traffic state
  const [trafficExpanded, setTrafficExpanded] = useState(false);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState<string | null>(null);
  const [trafficOverall, setTrafficOverall] = useState<number | null>(null);
  const [trafficAv, setTrafficAv] = useState<number | null>(null);
  const [trafficAn, setTrafficAn] = useState<number | null>(null);
  const [trafficFetched, setTrafficFetched] = useState(false);
  
  // Configure layout animation for smooth expand/collapse
  const toggleExpand = () => {
    LayoutAnimation.configureNext({
      duration: 200,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setIsExpanded(!isExpanded);
  };

  const toggleTraffic = async () => {
    LayoutAnimation.configureNext({
      duration: 200,
      update: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    const next = !trafficExpanded;
    setTrafficExpanded(next);
    if (next && !trafficFetched) {
      await fetchTraffic();
    }
  };

  const clampPct = (v: any): number => {
    const n = Math.round(Number(v ?? 0));
    if (!isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  };

  const getTrafficColor = (v: number): string => {
    if (v <= 25) return '#2ecc71';
    if (v <= 50) return '#f1c40f';
    if (v <= 75) return '#e67e22';
    return '#e74c3c';
  };

  const fetchTraffic = async () => {
    try {
      setTrafficLoading(true);
      setTrafficError(null);
      const res = await fetch('https://tkmservices.ibb.gov.tr/web/api/TrafficData/v1/TrafficIndex_Sc1_Cont', {
        method: 'GET',
        headers: { accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const overall = clampPct(data?.TI);
      const av = clampPct(data?.TI_Av);
      const an = clampPct(data?.TI_An);
      setTrafficOverall(overall);
      setTrafficAv(av);
      setTrafficAn(an);
      setTrafficFetched(true);
    } catch (e: any) {
      setTrafficError('Trafik bilgisi alınamadı.');
    } finally {
      setTrafficLoading(false);
    }
  };

  // Debug flag to always trigger update prompt
  const ALWAYSUPDATE = false;

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch(`${API_BASE}/main-announcements`);

        const data = await response.json();
        setAnnouncements(data); // Store all announcements
      } catch (err) {
        setError('Duyurular yüklenemedi. Lütfen daha sonra tekrar deneyiniz.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // Daily update check
  useEffect(() => {
    const checkUpdate = async () => {
      const now = Date.now(); // Declare 'now' here

      try {
        const last = await AsyncStorage.getItem('lastUpdateCheck');
        
        let shouldCheckForUpdate = false;

        if (ALWAYSUPDATE) {
          shouldCheckForUpdate = true;
        } else if (!last || (now - parseInt(last) >= 24 * 60 * 60 * 1000)) {
          shouldCheckForUpdate = true;
        }

        if (shouldCheckForUpdate) {
          const res = await fetch('https://raw.githubusercontent.com/Rednexie/rednexie.github.io/main/iettnext.json');
          if (!res.ok) {
            console.log('Failed to fetch remote version data.');
            return;
          }

          const remoteData = await res.json();
          const remoteVersion = remoteData?.version;
          const remoteMessage = remoteData?.message;

          if (!remoteVersion) {
            console.log('Remote version data is missing version.');
            return;
          }
          
          const currentVersion = localVersionData.version; 
          const updateUrl = localVersionData.url;

          if (remoteVersion !== currentVersion) {
            Alert.alert(
              'iettnext güncellendi!',
              remoteMessage || `Yeni sürüm ${remoteVersion} mevcut.`,
              [
                { text: 'Daha Sonra', style: 'cancel' },
                { text: 'Güncelle', onPress: () => Linking.openURL(updateUrl) }
              ],
              { cancelable: true }
            );
          }
        }
        await AsyncStorage.setItem('lastUpdateCheck', now.toString());
      } catch (e) {
        console.error('Error during update check:', e);
      }
    };
    
    checkUpdate();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0d0d1a' }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.header}>
        <Text style={styles.headerText}>iettnext</Text>
      </View>

      {/* Traffic Card */}
      <View style={styles.announcementCard}>
        <TouchableOpacity 
          style={styles.announcementHeader}
          onPress={toggleTraffic}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons 
              name="speedometer" 
              size={20} 
              color="#8a6cf1" 
              style={{ marginRight: 8 }}
            />
            <Text style={styles.announcementTitle}>Trafik Yoğunluğu</Text>
          </View>
          <Text style={styles.announcementCount}>
            {trafficOverall != null ? `${trafficOverall}%` : '—'}
          </Text>
        </TouchableOpacity>

        {trafficExpanded && (
          <Animated.View style={styles.announcementsList}>
            {trafficLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#8a6cf1" />
                <Text style={styles.loadingText}>Yükleniyor...</Text>
              </View>
            ) : trafficError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ff6b6b" />
                <Text style={styles.errorText}>{trafficError}</Text>
              </View>
            ) : (
              <View>
                {/* Avrupa */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <Text style={styles.announcementItemMessage}>Avrupa</Text>
                  <Text style={styles.announcementCount}>{trafficAv != null ? `${trafficAv}%` : '—'}</Text>
                </View>
                <View style={{ height: 14, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 6 }}>
                  <View style={{ height: '100%', width: `${trafficAv ?? 0}%`, backgroundColor: getTrafficColor(trafficAv ?? 0) }} />
                </View>

                {/* Anadolu */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <Text style={styles.announcementItemMessage}>Anadolu</Text>
                  <Text style={styles.announcementCount}>{trafficAn != null ? `${trafficAn}%` : '—'}</Text>
                </View>
                <View style={{ height: 14, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 6 }}>
                  <View style={{ height: '100%', width: `${trafficAn ?? 0}%`, backgroundColor: getTrafficColor(trafficAn ?? 0) }} />
                </View>
              </View>
            )}
          </Animated.View>
        )}
      </View>

      {/* Announcements Section */}
      <View style={styles.announcementCard}>
        <TouchableOpacity 
          style={styles.announcementHeader}
          onPress={toggleExpand}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons 
              name="megaphone" 
              size={20} 
              color="#8a6cf1" 
              style={{ marginRight: 8 }}
            />
            <Text style={styles.announcementTitle}>Duyurular</Text>
            {announcements.length > 0 && (
              <Text style={styles.announcementCount}>
                ({announcements.length} duyuru)
              </Text>
            )}
          </View>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20} 
            color="#8a6cf1" 
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <Animated.View style={styles.announcementsList}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#8a6cf1" />
                <Text style={styles.loadingText}>Duyurular yükleniyor...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ff6b6b" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : announcements.length > 0 ? (
              announcements.map((announcement) => (
                <View 
                  key={announcement.id} 
                  style={styles.announcementItem}
                >
                  <Text 
                    style={styles.announcementItemTitle}
                    onPress={() => Linking.openURL(announcement.url)}
                    accessibilityRole="link"
                  >
                    {decodeEntities(announcement.title)}
                  </Text>
                  <Text style={styles.announcementItemDate} selectable>
                    {announcement.startDate}
                  </Text>
                  <Text style={styles.announcementItemMessage} selectable>
                    {decodeEntities(announcement.description)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.noAnnouncementsContainer}>
                <Ionicons name="information-circle" size={20} color="#8a6cf1" />
                <Text style={styles.noAnnouncementsText}>Şu an için duyuru bulunmamaktadır.</Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>
      
      <View style={styles.cardsContainer}>
                {/* Eski Hatlar Card */}
                <View style={styles.card}>
          <Text style={styles.cardTitle}>Eski Hatlar</Text>
          <Text style={styles.cardDesc}>Eski otobüs hatlarını sorgulayın</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/eski')}>
            <Text style={styles.buttonText}>Eski Hatlar</Text>
          </TouchableOpacity>
        </View> 
        {/* Araç Sorgulama Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Araç Sorgulama</Text>
          <Text style={styles.cardDesc}>Plaka veya kapı kodu ile araç bilgilerini sorgulayın</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/arac')}>
            <Text style={styles.buttonText}>Araçlar</Text>
          </TouchableOpacity>
        </View>
        {/* Canlı Otobüs Haritası Card
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Canlı Otobüs Haritası</Text>
          <Text style={styles.cardDesc}>Otobüslerin anlık konumlarını harita üzerinde görüntüleyin</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/harita')}>
            <Text style={styles.buttonText}>Harita</Text>
          </TouchableOpacity>
        </View>
        */}
        
        {/* Durak Sorgulama Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Durak Sorgulama</Text>
          <Text style={styles.cardDesc}>Durağa gelmekte olan otobüslerin ayrıntılı bilgisini görüntüleyin</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/durak')}>
            <Text style={styles.buttonText}>Duraklar</Text>
          </TouchableOpacity>
        </View>
        {/* Hat Sorgulama Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hat Sorgulama</Text>
          <Text style={styles.cardDesc}>Otobüs hatlarının saatleri ve anlık duyuruları hakkında bilgi edinin</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/hat')}>
            <Text style={styles.buttonText}>Hatlar</Text>
          </TouchableOpacity>
        </View>

        {/* AI Yardımcısı Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI Asistanı</Text>
          <Text style={styles.cardDesc}>Türkçe olarak yapay zeka asistanı ile sohbet edin</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/ai')}>
            <Text style={styles.buttonText}>AI Asistanı</Text>
          </TouchableOpacity>
        </View>
        {/* GitHub Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>GitHub</Text>
          <Text style={styles.cardDesc}>Uygulamanın kaynak kodunu görüntüleyin</Text>
          <TouchableOpacity style={styles.button} onPress={() => Linking.openURL('https://github.com/Rednexie/iettnext')}>
            <Text style={styles.buttonText}>GitHub</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footerTextContainer}>
        <Text style={styles.footerText}>
          <Text
            onPress={() => Linking.openURL('https://github.com/Rednexie')}
            style={styles.footerLink}
          >
            Rednexie
          </Text>{' '}
          tarafından geliştirilmiştir.
          </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1a1a2e',
    padding: 32,
    borderRadius: 20,
    marginHorizontal: 16,
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
  cardsContainer: {
    flexDirection: 'column',
    marginHorizontal: 16,
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
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#ccc',
    marginBottom: 18,
    textAlign: 'center',
  },
  announcementCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)',
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a40',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
  },
  announcementTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    marginLeft: 8,
  },
  announcementCount: {
    color: '#8a6cf1',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginLeft: 8,
  },
  announcementsList: {
    padding: 16,
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  announcementItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  announcementItemTitle: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  announcementItemDate: {
    color: '#8a8a8f',
    fontSize: 12,
    marginBottom: 6,
    fontFamily: 'Inter_400Regular',
  },
  announcementItemMessage: {
    fontSize: 14,
    color: '#c9c9d6',
    marginTop: 8,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  seeAllButtonText: {
    color: '#8a6cf1',
    fontFamily: 'Inter_600SemiBold',
    marginRight: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#8a8a8f',
    marginLeft: 8,
    fontFamily: 'Inter_400Regular',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    marginLeft: 8,
    fontFamily: 'Inter_400Regular',
  },
  noAnnouncementsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noAnnouncementsText: {
    color: '#8a8a8f',
    marginLeft: 8,
    fontFamily: 'Inter_400Regular',
  },
  button: {
    backgroundColor: '#6a4cff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6a4cff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Inter_500Medium',
    fontSize: 17,
  },
  footer: {
    marginTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerTextContainer: {  
    marginTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    color: '#8a6cf1',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  footerLink: {
    color: '#8a6cf1',
    textDecorationLine: 'underline',
  },
});
