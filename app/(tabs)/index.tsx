import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0d0d1a' }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.header}>
        <Text style={styles.headerText}>iettnext</Text>
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
          <Text style={styles.cardDesc}>Durak bilgilerini ve geçen hatları sorgulayın</Text>
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
        {/* GitHub Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>GitHub</Text>
          <Text style={styles.cardDesc}>Android Uygulamasının kaynak kodunu görüntüleyin</Text>
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
