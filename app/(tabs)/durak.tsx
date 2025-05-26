import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { FontAwesome5, Ionicons } from '@expo/vector-icons'; // Import Ionicons for clear button
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import React, { useEffect, useRef, useState } from 'react'; // Added useEffect
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Suggestion {
  DURAK_DURAK_KODU: number;
  DURAK_ADI: string;
  DURAK_YON_BILGISI: string;
}

interface Arrival {
  hatkodu: string;
  depar?: boolean;
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

// Utility function to decode HTML entities and fix encoding issues (copied from HatScreen)
const decodeHTMLEntities = (text: string): string => {
  if (!text) return '';
  
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Convert numeric HTML entities to characters
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10))) // Added parseInt(dec, 10)
    // Handle hex entities
    .replace(/&#x([\da-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Remove any other HTML tags
    .replace(/<\/?[^>]+(>|$)/g, '');
};

function ArrivalCard({ arrival }: { arrival: Arrival }) {
  // Parse longitude and latitude directly (first is lon, second is lat)
  let lon: number | null = null, lat: number | null = null;
  if (arrival.son_konum && arrival.son_konum.includes(',')) {
    const [lonStr, latStr] = arrival.son_konum.split(',').map(s => s.trim());
    lon = parseFloat(lonStr);
    lat = parseFloat(latStr);
  }
  const [location, setLocation] = useState('Yükleniyor'); // Changed React.useState to useState
  useEffect(() => { // Changed React.useEffect to useEffect
    let cancelled = false;
    async function fetchLocation() {
      if (lon !== null && lat !== null && !isNaN(lon) && !isNaN(lat)) {
        const key = `${lon},${lat}`;
        const raw = await AsyncStorage.getItem('locationCache');
        const cache: Record<string, string> = raw ? JSON.parse(raw) : {};
        if (cache[key]) {
          if (!cancelled) setLocation(cache[key]);
          return;
        }
        try {
          const response = await fetch('https://iett.deno.dev/location-transform', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lon, lat }),
          });
          const locText = await response.text();
          if (!cancelled) {
            setLocation(locText);
            cache[key] = locText;
            await AsyncStorage.setItem('locationCache', JSON.stringify(cache));
          }
        } catch {
          if (!cancelled) setLocation('Konum Bilinmiyor');
        }
      }
    }
    fetchLocation();
    return () => { cancelled = true; };
  }, [arrival.son_konum, lon, lat]); // Added lon, lat to dependencies for correctness

  const canShowMapLink = lon !== null && lat !== null && !isNaN(lon) && !isNaN(lat);

  return (
    <View style={styles.resultContainer}>
      <Text style={[styles.resultHeaderText, { color: '#8a6cf1' }]}>
        {arrival.hatkodu}
        <Text style={[styles.resultHeaderText, { color: '#8a6cf1' }]}> ⇒ {arrival.saat} ({arrival.dakika} dk) {arrival.son_hiz} km/sa</Text>
      </Text>
      <Text style={styles.resultHeaderText}>{arrival.hatadi + (arrival.depar ? '-' : '')}</Text>
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
          <Text style={styles.tamkonumLink} onPress={() => Linking.openURL(`http://maps.google.com/maps?q=${lat},${lon}`)}>
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

  // Debounce and cancel previous fetches for suggestions
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null); // Changed React.useRef to useRef
  const abortController = useRef<AbortController | null>(null); // Changed React.useRef to useRef

  async function fetchSuggestions(text: string) {
    setQuery(text);
    setSelectedStop(null);
    setArrivals([]);
    setError('');
    if (text.trim() === "") {
      setSuggestions([]);
      return;
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      // Abort previous fetch
      if (abortController.current) {
        abortController.current.abort();
      }
      const controller = new AbortController();
      abortController.current = controller;

      setLoading(true); // Start loading for suggestions
      fetch(`${API_BASE}/station-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text.trim() }),
        signal: controller.signal,
      })
        .then(r => r.json())
        .then(data => {
          setSuggestions(data.filter((s: Suggestion) => s.DURAK_DURAK_KODU >= 0));
          setLoading(false); // End loading
        })
        .catch((e) => {
          if (e.name !== 'AbortError') {
            setError('Öneriler alınamadı.');
            setSuggestions([]);
          }
          setLoading(false); // End loading even on abort/error
        });
    }, 300); // Debounce time
  }

  async function selectSuggestion(suggestion: Suggestion) {
    setSelectedStop(suggestion);
    setQuery(suggestion.DURAK_ADI);
    setSuggestions([]); // Clear suggestions after selection
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
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setArrivals(data);
    } catch (e) {
      setError('Otobüs bilgileri alınamadı.');
      console.error("Fetch Arrivals Error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (selectedStop) {
      await fetchArrivals(selectedStop.DURAK_DURAK_KODU);
    }
  }

  async function handleSubmitEditing() {
    if (query.trim() !== "") {
      await fetchArrivals(Number(query.trim()) || 0);
    }
  }

  // Effect for cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled" style={styles.container}>
        <View style={styles.searchContainer}>
          <Text style={styles.title}>Durak Sorgulama</Text>
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Durak adı veya kodu girin"
              placeholderTextColor="#ccc"
              value={query}
              onChangeText={fetchSuggestions}
              onSubmitEditing={handleSubmitEditing}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={() => {
                  setQuery('');
                  setSuggestions([]); // Clear suggestions when input is cleared
                  setSelectedStop(null); // Clear selected stop
                  setArrivals([]); // Clear arrivals
                }}
              >
                <Ionicons name="close-circle" size={20} color="#6a6a8a" />
              </TouchableOpacity>
            )}
          </View>
            
          {query.length >= 2 && !selectedStop && (
            <View style={styles.suggestionsContainer}>
              {loading ? (
                <ActivityIndicator size="small" color="#8a6cf1" style={styles.loader} />
              ) : suggestions.length > 0 ? (
                <ScrollView style={styles.suggestionsScrollView}>
                  {suggestions.map((item, idx) => (
                    <TouchableOpacity
                      key={item.DURAK_DURAK_KODU}
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(item)}
                    >
                      <Text style={styles.lineName}>{decodeHTMLEntities(`${item.DURAK_ADI} (${item.DURAK_YON_BILGISI})`)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                query.length >= 2 && !loading && <Text style={styles.noDataText}>Sonuç bulunamadı</Text>
              )}
            </View>
          )}
        </View>

        {selectedStop && (
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
            <FontAwesome5 name="sync-alt" size={18} color="#fff" />
            <Text style={styles.refreshBtnText}>Yenile</Text>
          </TouchableOpacity>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
        {loading && !selectedStop && <ActivityIndicator size="large" color="#8a6cf1" style={styles.loader} />}
          
        {!loading && arrivals.length === 0 && selectedStop && !error ? (
          <Text style={styles.noDataText}>Varacak otobüs bulunamadı.</Text>
        ) : null}

        {!loading && arrivals.map((arrival, idx) => <ArrivalCard key={idx} arrival={arrival} />)}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  contentContainer: { padding: 16, paddingBottom: 32 },
  searchContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)',
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 12,
  },
  title: { fontSize: 24, fontFamily: 'Inter_600SemiBold', color: '#8a6cf1', marginBottom: 16, textAlign: 'center' },
  inputContainer: { position: 'relative', width: '100%' },
  input: {
    backgroundColor: 'rgba(13, 13, 26, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.2)',
    borderRadius: 8,
    padding: 14,
    color: '#e0e0e0',
    width: '100%',
    fontFamily: 'Inter_400Regular',
  },
  clearButton: { position: 'absolute', right: 12, top: 14 },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.26)',
    borderRadius: 12,
    maxHeight: 350,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
    zIndex: 20,
  },
  suggestionsScrollView: { maxHeight: 350 },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 108, 241, 0.08)',
  },
  selectedItem: { backgroundColor: 'rgba(138, 108, 241, 0.34)' },
  lineCode: {
    backgroundColor: 'rgba(138, 108, 241, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    color: '#8a6cf1',
    fontFamily: 'Inter_500Medium',
    marginRight: 12,
    minWidth: 50,
    textAlign: 'center',
  },
  lineName: { color: '#e0e0e0', fontFamily: 'Inter_400Regular', flex: 1 },
  loader: { marginVertical: 16 },
  noDataText: { color: '#a0a0a0', fontFamily: 'Inter_400Regular', textAlign: 'center', marginVertical: 16 },
  resultContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)',
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 108, 241, 0.1)',
  },
  resultHeaderText: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: '#e0e0e0' },
  refreshBtn: {
    backgroundColor: '#6a4cff', // Match HatScreen button
    borderRadius: 8, // Match HatScreen button
    paddingVertical: 12, // Match HatScreen button
    paddingHorizontal: 16, // Match HatScreen button
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 16, // Adjusted margin
    alignSelf: 'center',
    marginBottom: 16, // Adjusted margin
    shadowColor: '#000', // Match HatScreen button
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  refreshBtnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold', // Match HatScreen buttonText
    fontSize: 16, // Match HatScreen buttonText
    marginLeft: 8, // Space from icon
  },
  carInfoRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
  },
  featureIcon: { marginRight: 8, },
  carInfo: { color: '#e0e0e0', fontFamily: 'Inter_400Regular', marginBottom: 8 },
  locationRow: { marginTop: 10, fontFamily: 'Inter_400Regular', fontSize: 12, color: '#e0e0e0', }, // Match HatScreen's general text color
  tamkonumLink: { color: '#6a4cff', textDecorationLine: 'underline', }, // Match HatScreen's button color for links
  errorText: { color: '#ef4444', fontSize: 14, marginTop: 12, textAlign: 'center', }, // Match HatScreen error color
});