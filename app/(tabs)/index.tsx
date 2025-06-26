import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, LayoutAnimation, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import localVersionData from '../../assets/version.json';



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

  // Debug flag to always trigger update prompt
  const ALWAYSUPDATE = false;

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch(`${API_BASE}/main-announcements`);

        const data = await response.json();
        //console.log(data)
        setAnnouncements(data); // Store all announcements
      } catch (err) {
        console.error('Error fetching announcements:', err);
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
      const now = Date.now();
      let last: string | null = null;
      if (!ALWAYSUPDATE) {
        last = await AsyncStorage.getItem('lastUpdateCheck');
        if (last && now - parseInt(last) < 24 * 60 * 60 * 1000) {
          return;
        }
      }
      try {
        const res = await fetch('https://raw.githubusercontent.com/Rednexie/rednexie.github.io/main/iettnext.json');
        if (!res.ok) return;
        const remoteData = await res.json();
        const remoteVersion = remoteData.version?.trim();
        const remoteMessage = remoteData.message;
        const semverRe = /^\d+\.\d+\.\d+$/;
        if (!remoteVersion || !semverRe.test(remoteVersion)) return;
        const currentVersion = localVersionData.version;
        if (remoteVersion !== currentVersion) {
          Alert.alert(
            'Güncelleme Var',
            remoteMessage || `Yeni sürüm ${remoteVersion} mevcut.`,
            [
              { text: 'Daha Sonra', style: 'cancel' },
              { text: 'Güncelle', onPress: () => Linking.openURL(localVersionData.url) }
            ],
            { cancelable: true }
          );
        }
      } catch (e) {
      } finally {
        if (!ALWAYSUPDATE) {
          await AsyncStorage.setItem('lastUpdateCheck', now.toString());
        }
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
                <TouchableOpacity 
                  key={announcement.id} 
                  style={styles.announcementItem}
                  onPress={() => Linking.openURL(announcement.url)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.announcementItemTitle}>{announcement.title}</Text>
                  <Text style={styles.announcementItemDate}>
                    {(announcement.startDate)}
                  </Text>
                  <Text style={styles.announcementItemMessage}>
                    {announcement.description}
                  </Text>
                </TouchableOpacity>
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
        {/* Araç Sorgulama Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Araç Sorgulama</Text>
          <Text style={styles.cardDesc}>Plaka veya kapı kodu ile araç bilgilerini sorgulayın</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/arac')}>
            <Text style={styles.buttonText}>Araçlar</Text>
          </TouchableOpacity>
        </View>
        {/* Canlı Otobüs Haritası Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Canlı Otobüs Haritası</Text>
          <Text style={styles.cardDesc}>Otobüslerin anlık konumlarını harita üzerinde görüntüleyin</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/harita')}>
            <Text style={styles.buttonText}>Harita</Text>
          </TouchableOpacity>
        </View>
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
        {/* Eski Hatlar Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Eski Hatlar</Text>
          <Text style={styles.cardDesc}>Kaldırılmış otobüs hatlarını sorgulayın</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/eski')}>
            <Text style={styles.buttonText}>Eski Hatlar</Text>
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
          tarafından geliştirilmiştir
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
