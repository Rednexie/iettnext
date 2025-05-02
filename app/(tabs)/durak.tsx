import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Suggestion {
  DURAK_DURAK_KODU: number;
  DURAK_ADI: string;
  DURAK_YON_BILGISI: string;
}

interface Arrival {
  hatkodu: string;
  saat: string;
  dakika: number;
  son_hiz: number;
  hatadi: string;
  kapino: string;
  ototip: string;
  wifi?: boolean;
  klima?: boolean;
  usb?: boolean;
  engelli?: boolean;
  bisiklet?: boolean;
  son_konum: string;
}

function ArrivalCard({ arrival }: { arrival: Arrival }) {
  let lat: number | null = null, lon: number | null = null;
  if (arrival.son_konum && arrival.son_konum.includes(',')) {
    const [lonStr, latStr] = arrival.son_konum.split(',').map(s => s.trim());
    lon = parseFloat(lonStr);
    lat = parseFloat(latStr);
  }
  const [location, setLocation] = React.useState('Yükleniyor');
  React.useEffect(() => {
    let cancelled = false;
    async function fetchLocation() {
      if (lat && lon) {
        try {
          const response = await fetch('https://iett.deno.dev/location-transform', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lon, lat }),
          });
          const locText = await response.text();
          if (!cancelled) setLocation(locText);
        } catch {
          if (!cancelled) setLocation('Konum Bilinmiyor');
        }
      }
    }
    fetchLocation();
    return () => { cancelled = true; };
  }, [arrival.son_konum]);
  const canShowMapLink = lat && lon;
  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultTitle}>
        {arrival.hatkodu}
        <Text style={{ color: '#b39dfa', fontWeight: 'bold' }}> ⇒ {arrival.saat} ({arrival.dakika} dk) {arrival.son_hiz} km/sa</Text>
      </Text>
      <Text style={styles.resultLine}>{arrival.hatadi}</Text>
      <Text style={styles.carInfo} selectable={true}>{arrival.kapino} ({arrival.ototip})</Text>
      <View style={styles.carInfoRow}>
        <FontAwesome5 name="wifi" size={18} color={arrival.wifi ? '#4ade80' : '#ef4444'} style={styles.featureIcon} />
        <FontAwesome5 name="snowflake" size={18} color={arrival.klima ? '#4ade80' : '#ef4444'} style={styles.featureIcon} />
        <FontAwesome5 name="usb" size={18} color={arrival.usb ? '#4ade80' : '#ef4444'} style={styles.featureIcon} />
        <FontAwesome5 name="wheelchair" size={18} color={arrival.engelli ? '#4ade80' : '#ef4444'} style={styles.featureIcon} />
        <FontAwesome5 name="bicycle" size={18} color={arrival.bisiklet ? '#4ade80' : '#ef4444'} style={styles.featureIcon} />
      </View>
      {canShowMapLink ? (
        <Text style={styles.locationRow}>
          <Text style={styles.tamkonumLink} onPress={() => Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`)}>
            {location}
          </Text>
        </Text>
      ) : (
        <Text style={styles.locationRow}>{location}</Text>
      )}
    </View>
  );
}

export default function DurakScreen() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedStop, setSelectedStop] = useState<Suggestion | null>(null);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const inputRef = useRef<TextInput>(null);

  const API_BASE = 'https://iett.deno.dev';

  async function fetchSuggestions(text: string) {
    setQuery(text);
    setSelectedStop(null);
    setArrivals([]);
    setError('');
    if (text.trim() === "") {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/station-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text.trim() }),
      });
      const data = await response.json();
      setSuggestions(data.filter((s: Suggestion) => s.DURAK_DURAK_KODU >= 0));
    } catch (e) {
      setError('Öneriler alınamadı.');
    }
  }

  async function selectSuggestion(suggestion: Suggestion) {
    setSelectedStop(suggestion);
    setQuery(suggestion.DURAK_ADI);
    setSuggestions([]);
    inputRef.current?.blur();
    await fetchArrivals(suggestion.DURAK_DURAK_KODU);
  }

  async function fetchArrivals(stopId: number) {
    setLoading(true);
    setArrivals([]);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/bus-arrivals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopId }),
      });
      const data = await response.json();
      setArrivals(data);
    } catch (e) {
      setError('Otobüs bilgileri alınamadı.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (selectedStop) {
      await fetchArrivals(selectedStop.DURAK_DURAK_KODU);
    }
  }

  if (!fontsLoaded) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#18182c' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" style={{ backgroundColor: '#18182c' }}>
        <View style={{ flex: 1, alignItems: 'center', paddingBottom: 40, backgroundColor: '#18182c' }}>
          <View style={styles.squareContainer}>
            <Text style={styles.header}>Durak Sorgulama</Text>
            <TextInput
              ref={inputRef}
              style={styles.inputBox}
              placeholder="Durak adı veya kodu girin"
              placeholderTextColor="#aaa"
              value={query}
              onChangeText={fetchSuggestions}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {suggestions.length > 0 && (
               <View style={[styles.suggestions, { width: '100%', marginTop: 4 }]}>
                <ScrollView keyboardShouldPersistTaps="handled">
                  {suggestions.map((item, idx) => (
                    <TouchableOpacity
                      key={item.DURAK_DURAK_KODU}
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(item)}
                    >
                      <Text style={{ color: '#e0e0e0', fontSize: 14 }}>{`${item.DURAK_ADI} (${item.DURAK_YON_BILGISI})`}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          {selectedStop && (
            <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
              <FontAwesome5 name="sync-alt" size={18} color="#fff" />
              <Text style={styles.refreshBtnText}>  Yenile</Text>
            </TouchableOpacity>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {loading && <ActivityIndicator size="large" color="#8a6cf1" style={{ marginTop: 24 }} />}
          {!loading && arrivals.length === 0 && selectedStop && !error ? (
            <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 12 }}>Varacak otobüs bulunamadı.</Text>
          ) : null}
          {!loading && arrivals.map((arrival, idx) => <ArrivalCard key={idx} arrival={arrival} />)}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  squareContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)',
    padding: 24,
    width: '100%',
    maxWidth: 600,
    marginTop: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  header: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#8a6cf1',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputBox: {
    backgroundColor: 'rgba(13, 13, 26, 0.6)',
    borderColor: 'rgba(138, 108, 241, 0.2)',
    borderWidth: 1,
    color: '#e0e0e0',
    borderRadius: 8,
    padding: 14,
    fontSize: 14,
    width: '100%',
    marginBottom: 10,
    fontFamily: 'Inter_400Regular',
  },
  suggestions: {
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderColor: 'rgba(138, 108, 241, 0.1)',
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 1000,
    overflow: 'hidden',
  },  
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 108, 241, 0.05)',
  },
  refreshBtn: {
    backgroundColor: '#6a4cff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 12,
    alignSelf: 'center',
    marginBottom: 4,
  },
  refreshBtnText: {
    color: '#fff',
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  resultCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)',
    padding: 14,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  resultTitle: {
    color: '#b39dfa',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  resultLine: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  carInfo: {
    color: '#c0c0c0',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
  },
  carInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  featureIcon: {
    marginHorizontal: 5,
  },
  locationRow: {
    color: '#b39dfa',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
  tamkonumLink: {
    color: '#b39dfa',
    textDecorationLine: 'underline',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  errorText: {
    color: '#ff6b81',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    fontFamily: 'Inter_500Medium',
  },
});
