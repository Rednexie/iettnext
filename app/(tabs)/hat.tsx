import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { FontAwesome5, Ionicons } from '@expo/vector-icons'; // Added FontAwesome5 for bell icon
import React, { useEffect, useState, useRef } from 'react'; // Added useRef
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native'; // Added Modal
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper component for dynamic font size
import type { TextStyle } from 'react-native';

interface AutoSizeTextProps {
  content: string;
  style?: TextStyle;
  minFontSize?: number;
  maxFontSize?: number;
}

const AutoSizeText: React.FC<AutoSizeTextProps> = ({ content, style, minFontSize = 8, maxFontSize = 14 }) => {
  const [fontSize, setFontSize] = useState<number>(maxFontSize); // Changed React.useState to useState
  const textRef = useRef<Text>(null); // Changed React.useRef to useRef

  useEffect(() => {
    setFontSize(maxFontSize);
  }, [content, maxFontSize]);

  useEffect(() => {
    if (!textRef.current) return;
    const measure = () => {
      // @ts-ignore
      textRef.current?.measure((x: number, y: number, width: number) => {
        if (width > 180 && fontSize > minFontSize) {
          setFontSize(f => Math.max(minFontSize, f - 1));
        }
      });
    };
    setTimeout(measure, 0);
  }, [content, fontSize, minFontSize]);

  return (
    <Text
      ref={textRef}
      style={[style, { fontSize }]}
      numberOfLines={1}
      adjustsFontSizeToFit={false}
    >
      {content}
    </Text>
  );
};


// Utility function to decode HTML entities and fix encoding issues
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
    .replace(/&#(\d+);/g, (match, dec) => {
      const charCode = parseInt(dec, 10);
      // Handle Turkish characters specifically
      switch (charCode) {
        case 199: return 'Ç';
        case 231: return 'ç';
        case 286: return 'Ğ';
        case 287: return 'ğ';
        case 304: return 'İ';
        case 305: return 'ı';
        case 350: return 'Ş';
        case 351: return 'ş';
        case 214: return 'Ö';
        case 246: return 'ö';
        case 220: return 'Ü';
        case 252: return 'ü';
        default: return String.fromCharCode(charCode);
      }
    })
    // Handle hex entities
    .replace(/&#x([\da-f]+);/gi, (match, hex) => {
      const charCode = parseInt(hex, 16);
      // Handle Turkish characters specifically
      switch (charCode) {
        case 0xC7: return 'Ç';
        case 0xE7: return 'ç';
        case 0x011E: return 'Ğ';
        case 0x011F: return 'ğ';
        case 0x130: return 'İ';
        case 0x131: return 'ı';
        case 0x15E: return 'Ş';
        case 0x15F: return 'ş';
        case 0xD6: return 'Ö';
        case 0xF6: return 'ö';
        case 0xDC: return 'Ü';
        case 0xFC: return 'ü';
        default: return String.fromCharCode(charCode);
      }
    })
    // Remove any other HTML tags
    .replace(/<\/?[^>]+(>|$)/g, '');
};

// Define types
type LineItem = {
  line: string;
  name: string;
};

type AnnouncementItem = {
  date?: string;
  VERI_SAATI?: string;
  content?: string;
  BILGI?: string;
  level?: string;
  severity?: string;
};

interface DepartureTime {
  text: string;
  isSpecial: boolean;
}

interface DepartureTable {
  title: string;
  schedule: Record<'I' | 'C' | 'P', DepartureTime[]>;
};


const API_BASE = 'https://iett.rednexie.workers.dev'
// const { width } = Dimensions.get('window');

function openGoogleMaps(lat: number, lon: number) {
  const url = `https://maps.google.com/?q=${lat},${lon}`;
  // @ts-ignore
  if (typeof window !== 'undefined' && window.open) {
    window.open(url, '_blank');
  } else {
    // React Native Linking
    import('react-native').then(({ Linking }) => Linking.openURL(url));
  }
}

interface Vehicle {
  vehicleDoorCode: string;
  direction?: string;
  lat?: number;
  lon?: number;
  locationResolved?: boolean;
  locationName?: string;
  guzergah: string,
}

const VehiclesByDirection = ({ line }: { line: string }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    fetch(`${API_BASE}/line-vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line }),
    })
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          // Initialize vehicles with locationResolved flag and ensure guzergah has a default value
          const vehiclesWithLocationStatus = (data.vehicles || []).map((v: Vehicle) => ({
            ...v,
            
            locationResolved: false
          }));
          setVehicles(vehiclesWithLocationStatus); 
          
          // Resolve locations after a short delay to show loading state
          setTimeout(() => {
            if (isMounted) {
              setVehicles(prevVehicles => 
                prevVehicles.map(v => ({
                  ...v,
                  locationResolved: true
                }))
              );
            }
          }, 500);
        }
      })
      .catch(() => isMounted && setVehicles([]))
      .finally(() => isMounted && setLoading(false));
      
    return () => { isMounted = false; };
  }, [line]);

  if (loading) return <ActivityIndicator size="small" color="#8a6cf1" style={{ marginVertical: 20 }} />;
  if (!vehicles.length) return <Text style={styles.noDataText}>Bu hatta araç bulunamadı.</Text>;

  // Resolve location names with caching
  const resolveLocation = async (vehicle: Vehicle) => {
    if (!vehicle.lat || !vehicle.lon) return;
    
    const key = `${vehicle.lon},${vehicle.lat}`;
    
    try {
      // Check cache first
      const cacheName = await AsyncStorage.getItem('useBetaLocationTransform') === 'true' ? 'locationCacheBeta' : 'locationCache';
      const raw = await AsyncStorage.getItem(cacheName);
      const cache: Record<string, string> = raw ? JSON.parse(raw) : {};
      
      if (cache[key]) {
        setVehicles(prevVehicles => 
          
          prevVehicles.map(v => 
            v.vehicleDoorCode === vehicle.vehicleDoorCode 
              ? { ...v, locationName: cache[key] }
              : v
          )
        );
        return;
      }
      
      // If not in cache, fetch from API
      const url = (await AsyncStorage.getItem('useBetaLocationTransform')) === 'true' ? '/location-transform-new' : '/location-transform';

      const response = await fetch(`${API_BASE}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lon: vehicle.lon, 
          lat: vehicle.lat,
          hatCode: vehicle.guzergah,
        }),
      });
      
      const locationText = await response.text();
      if (locationText) {
        // Update cache
        cache[key] = locationText;
        await AsyncStorage.setItem(cacheName, JSON.stringify(cache));
        
        // Update UI
        setVehicles(prevVehicles => 
          prevVehicles.map(v => 
            v.vehicleDoorCode === vehicle.vehicleDoorCode 
              ? { ...v, locationName: locationText }
              : v
          )
        );
      }
    } catch (error) {
      console.error('Error resolving location:', error);
      setVehicles(prevVehicles => 
        prevVehicles.map(v => 
          v.vehicleDoorCode === vehicle.vehicleDoorCode 
            ? { ...v, locationName: 'Konum Bilinmiyor' }
            : v
          )
        );
    }
  };

  // Group vehicles by direction
  const grouped = vehicles.reduce<Record<string, Vehicle[]>>((acc, v) => {
    const dir = (v.direction || '').trim() || 'Bilinmeyen Yön';
    if (!acc[dir]) {
      acc[dir] = [];
    }
    acc[dir].push(v);
    
    // Resolve location if not already done
    if (v.lat && v.lon && !v.locationName) {
      resolveLocation(v);
    }
    
    return acc;
  }, {});

  return (
    <ScrollView>
      {Object.entries(grouped).map(([direction, group]) => (
        <View key={direction} style={{ marginBottom: 18 }}>
          <Text style={{ color: '#8a6cf1', fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 5, marginTop: 4 }}>
            {direction}
          </Text>
          {group.map((v) => (
            <View key={v.vehicleDoorCode} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingLeft: 8 }}>
              <View style={{ flex: 1 }}>
                <Text 
                  selectable
                  style={{ 
                    color: '#e0e0e0', 
                    fontFamily: 'Inter_500Medium', 
                    fontSize: 11,
                    paddingVertical: 4,
                  }}
                  onPress={(e) => {
                    // This will ensure the entire text is selected when tapped
                    const textComponent = e.target as any;
                    if (textComponent && textComponent.setNativeProps) {
                      textComponent.setNativeProps({
                        selection: { start: 0, end: v.vehicleDoorCode.length }
                      });
                    }
                  }}
                >
                  {v.vehicleDoorCode}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => v.lat && v.lon && openGoogleMaps(v.lat, v.lon)}
                disabled={!v.locationResolved || !v.lat || !v.lon}
              >
                <Text style={{ 
                  color: v.locationResolved && v.lat && v.lon ? '#8a6cf1' : '#a0a0a0', 
                  fontFamily: 'Inter_400Regular', 
                  fontSize: 9,
                  textDecorationLine: v.locationResolved && v.lat && v.lon ? 'underline' : 'none'
                }}>
                  {v.locationName || 
                   (v.locationResolved 
                     ? (v.lat && v.lon ? `${v.lat.toFixed(5)}, ${v.lon.toFixed(5)}` : 'Konum yok')
                     : 'yükleniyor...')}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};


export default function HatScreen() {
  
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LineItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selected, setSelected] = useState<LineItem | null>(null);
  const [timetable, setTimetable] = useState<DepartureTable[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState(0);
  const stationsCache = useRef<Record<string, { forward: string[], backward: string[], timestamp: number }>>({});
  const STATIONS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  const [activeTab, setActiveTab] = useState<'times' | 'stations' | 'vehicles' | 'about'>('times');
  const [favoriteLines, setFavoriteLines] = useState<{ code: string; name: string }[]>([]);
  const [lineInfo, setLineInfo] = useState<{
    tripDuration?: string;
    lineType?: string;
    fareInfo?: string;
    notes?: string[];
    loading: boolean;
    error?: string;
  }>({ loading: false });
  const isFavoriteLine = selected ? favoriteLines.some(f => f.code === selected.line) : false;

  // Added state for announcement modal
  const [modalVisible, setModalVisible] = useState(false);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  // Added state for line name
  const [lineName, setLineName] = useState<string | null>(null);

  // Update line name when line is selected
  useEffect(() => {
    if (selected) {
      // Only set the route name without the line code
      setLineName(decodeHTMLEntities(selected.name));
    } else {
      setLineName(null);
    }
  }, [selected]);

  const params = useLocalSearchParams();
  useEffect(() => {
    const lineParam = params.line as string | undefined;
    if (lineParam && typeof lineParam === 'string') {
      const code = lineParam.trim().toUpperCase();
      if (!code) return;
      setQuery(code);
      // trigger selection
      selectLine({ line: code, name: code });
    }
  }, [params.line]);

  // Debounce and cancel previous fetches for suggestions
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null); // Changed React.useRef to useRef
  const abortController = useRef<AbortController | null>(null); // Changed React.useRef to useRef

  useEffect(() => {
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
      fetch(`${API_BASE}/api/line-suggestions?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          // filter suggestions before setting
          // if there are no lines 
          if (!data || !data.filter || data.length === 0) {
            setSuggestions([]);
            return;
          }
          const filtered = data.filter((item: LineItem) => !item?.line?.trim().startsWith('<'));
          setSuggestions(filtered);
          setSelectedIndex(-1);
        })
        .catch((e) => {
          if (e.name !== 'AbortError') {
            console.error('Error fetching suggestions:', e);
            setSuggestions([]);
          }
        });
    }, 400);
    // Cleanup
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [query]);

  // Helper function to check if cache is expired (1 week)
  const isCacheExpired = (timestamp: number): boolean => {
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
    return Date.now() - timestamp > oneWeekInMs;
  };

  // Fetch line information when the about tab is active and we have a selected line
  useEffect(() => {
    const fetchLineInfo = async () => {
      if (activeTab === 'about' && selected) {
        setLineInfo(prev => ({ ...prev, loading: true, error: undefined }));
        
        const cacheKey = `lineInfo_${selected.line}`;
        
        try {
          // Try to get from cache first
          const cachedData = await AsyncStorage.getItem(cacheKey);
          
          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData);
            
            // If cache is still valid, use it
            if (!isCacheExpired(timestamp)) {
              setLineInfo({
                tripDuration: data.tripDuration,
                lineType: data.lineType,
                fareInfo: data.fareInfo,
                notes: data.notes,
                loading: false
              });
              return; // Exit early if using valid cache
            }
          }
          
          // If no valid cache, fetch from API
          const response = await fetch(`${API_BASE}/line-information`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ line: selected.line })
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch line information');
          }
          
          const data = await response.json();
          
          
          // Update cache with new data and current timestamp
          const cacheData = {
            data,
            timestamp: Date.now()
          };
          await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
          
          // Update UI
          setLineInfo({
            tripDuration: data.tripDuration,
            lineType: data.lineType,
            fareInfo: data.fareInfo,
            notes: data.notes,
            loading: false
          });
        } catch (error) {
          console.error('Error in fetchLineInfo:', error);
          
          // Try to use expired cache if available and API fails
          try {
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
              const { data } = JSON.parse(cachedData);
              setLineInfo({
                tripDuration: data.tripDuration,
                lineType: data.lineType,
                fareInfo: data.fareInfo,
                notes: data.notes,
                loading: false
              });
              return;
            }
          } catch (cacheError) {
            console.error('Error reading from cache:', cacheError);
          }
          
          setLineInfo(prev => ({
            ...prev,
            loading: false,
            error: 'Bilgi yüklenirken bir hata oluştu'
          }));
        }
      }
    };
    
    fetchLineInfo();
  }, [activeTab, selected]);

  // Parse HTML departure tables by matching each <table class="line-table">
  const parseLineTimeTable = (html: string): DepartureTable[] => {
    const tables: DepartureTable[] = [];
    const tableRe = /<table class="line-table">([\s\S]*?)<\/table>/g;
    let m;
    while ((m = tableRe.exec(html))) {
      const tblHtml = m[1];
      const titleMatch = tblHtml.match(/<th class="routedetailstartend"[^>]*>([\s\S]*?)<\/th>/);
      const title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : '';
      const sched: Record<'I'|'C'|'P', DepartureTime[]> = { I: [], C: [], P: [] };
      const tbodyMatch = tblHtml.match(/<tbody>([\s\S]*?)<\/tbody>/);
      if (tbodyMatch) {
        const rows = tbodyMatch[1].match(/<tr>([\s\S]*?)<\/tr>/g) || [];
        rows.forEach(r => {
          // Get all table cells in this row
          const cellMatches = Array.from(r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g));
          const cells = cellMatches.map(match => {
            const cellContent = match[1];
            // Check if this is a special service (red color)
            const isSpecial = match[0].includes('color:red');
            // Extract just the text content
            const timeText = decodeHTMLEntities(cellContent.replace(/<[^>]*>/g, '').trim());
            return { text: timeText, isSpecial };
          });
          
          if (cells.length === 3) {
            sched.I.push(cells[0]);
            sched.C.push(cells[1]);
            sched.P.push(cells[2]);
          }
        });
      }
      tables.push({ title, schedule: sched });
    }
    return tables;
  };

  // Format departure time - returns just the text
  const formatDepartureTime = (timeData: DepartureTime | undefined): string => {
    return timeData?.text || '';
  };

  const selectLine = (item: LineItem) => {
    setSelected(item);
    setQuery(item.line);
    setSuggestions([]);
    fetchDetails(item);
  };

  const fetchDetails = async (item: LineItem) => {
    setLoading(true);
    try {
      const [htmlRes] = await Promise.all([
        fetch(`${API_BASE}/line-time-table`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line: item.line }),
        }),
      ]);
      if (!htmlRes.ok) console.error(`Error fetching timetable, status ${htmlRes.status}`);
      const html = await htmlRes.text();
      setTimetable(parseLineTimeTable(html));
    } catch (e) {
      console.error('Error fetching details:', e);
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setSelected(null);
    setQuery('');
    setStations([]);
    setTimetable([]);
    setAnnouncements([]); // Clear announcements when search is reset
  };

  const handleSubmitEditing = () => {
    if (query.trim()) {
      selectLine({ line: query.trim().toUpperCase(), name: query.trim().toUpperCase() });
    }
  };

  // Parse anchor tags from HTML
  const parseAnchors = (html: string): string[] => {
    const anchorRegex = /<a[^>]*>([\s\S]*?)<\/a>/g;
    const result: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = anchorRegex.exec(html)) !== null) {
      const txt = decodeHTMLEntities(m[1].trim()).replace(/<[^>]+>/g, '').trim();
      if (txt) result.push(txt);
    }
    return result;
  };

  // Load stations for the selected line and direction
  const loadStations = async (lineCode: string, dir?: number) => {
    if (!lineCode) return;
    
    const cacheKey = `stations_${lineCode}`;
    const now = Date.now();

    // Check in-memory cache first
    if (stationsCache.current[cacheKey] && 
        now - stationsCache.current[cacheKey].timestamp < STATIONS_CACHE_TTL) {
      const { forward, backward } = stationsCache.current[cacheKey];
      setStations(dir === 0 ? forward : backward);
      return;
    }

    setLoading(true);
    try {

      const response = await fetch(`${API_BASE}/api/route-stations?hatkod=${lineCode}&hatstart=x&hatend=y&langid=1`, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Error loading stations, status ${response.status}`);
      }
      
      const html = await response.text();
      const allStations = parseAnchors(html);
      
      // Handle circular routes by finding the restart point
      const restartIdx = allStations.findIndex((s, i) => i > 0 && /^\s*1\./.test(s));
      const splitIndex = restartIdx !== -1 ? restartIdx : Math.ceil(allStations.length / 2);
      
      const forwardStations = allStations.slice(0, splitIndex);
      const backwardStations = allStations.slice(splitIndex);
      
      // Update cache
      stationsCache.current[cacheKey] = {
        forward: forwardStations,
        backward: backwardStations,
        timestamp: now
      };
      
      setStations(dir === 0 ? forwardStations : backwardStations);
    } catch (error) {
      console.error('Error loading stations:', error);
      // If we have cached data, use it even if it's expired
      if (stationsCache.current[cacheKey]) {
        const { forward, backward } = stationsCache.current[cacheKey];
        setStations(dir === 0 ? forward : backward);
      } else {
        setStations([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load stations when direction or selected line changes
  useEffect(() => {
    if (selected && (activeTab === 'stations' || activeTab === 'times')) {
      loadStations(selected.line, direction);
    }
  }, [selected, direction, activeTab]);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('favoriteLines');
      if (raw) setFavoriteLines(JSON.parse(raw));
    })();
  }, []);

  async function toggleFavoriteLine() {
    if (!selected) return;
    const updated = favoriteLines.filter(f => f.code !== selected.line);
    const isAdding = updated.length === favoriteLines.length;
    if (isAdding) {
      updated.unshift({ code: selected.line, name: selected.name });
    }
    setFavoriteLines(updated);
    await AsyncStorage.setItem('favoriteLines', JSON.stringify(updated));
  }

  // Allow unstar from favorites list
  async function removeFavoriteLine(code: string) {
    const updated = favoriteLines.filter(f => f.code !== code);
    setFavoriteLines(updated);
    await AsyncStorage.setItem('favoriteLines', JSON.stringify(updated));
  }

  async function handleAnnouncementsPress() {
    if (!selected) return;
    setAnnouncementsLoading(true);
    setModalVisible(true);
    try {
      const response = await fetch(`${API_BASE}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line: selected.line
        })
      });
      
      if (!response.ok) {
        throw new Error('Duyurular alınamadı');
      }
      
      const data = await response.json();
      setAnnouncements(data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      // Removed specific error for announcements to avoid overwriting main screen error
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps='handled'
    >
      <View style={styles.searchContainer}>
        <Text style={styles.title}>Hat Sorgulama</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Hat kodu veya adı girin..."
            placeholderTextColor="#ccc"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmitEditing}
            returnKeyType="search"
            autoCapitalize="characters"
          />
          {query.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={resetSearch}>
              <Ionicons name="close-circle" size={20} color="#6a6a8a" />
            </TouchableOpacity>
          )}
        </View>
        {!selected && query.length >= 0 && (
          <View style={styles.suggestionsContainer}>
            {loading ? (
              <ActivityIndicator size="small" color="#8a6cf1" style={styles.loader} />
            ) : suggestions.length > 0 ? (
              suggestions.filter(item => typeof item.line === 'string' && typeof item.name === 'string').map((item, index) => (
                <TouchableOpacity 
                  key={`${item.line}-${index}`}
                  style={[styles.suggestionItem, index === selectedIndex && styles.selectedItem]} 
                  onPress={() => selectLine(item)}
                >
                  <Text style={styles.lineCode}>{item.line}</Text>
                  <Text style={styles.lineName}>{decodeHTMLEntities(item.name)}</Text>
                </TouchableOpacity>
              ))
            ) : (
              query.length > 0 && !selected && !loading && suggestions.length === 0 && <Text style={styles.noDataText}>Sonuç bulunamadı</Text>
            )}
          </View>
        )}
      </View>
      {!selected && query.trim() === '' && favoriteLines.length > 0 && (
        <View style={styles.favoritesContainer}>
          <Text style={styles.favoritesTitle}>Favori Hatlar</Text>
          <View style={styles.favoritesList}>
            {favoriteLines.map(f => {
              let fontSize = 16;
              if (f.name.length > 28) fontSize = 12;
              else if (f.name.length > 20) fontSize = 13.5;
              else if (f.name.length > 14) fontSize = 14.5;
              return (
                <View key={f.code} style={styles.favoriteItem}>
                  <TouchableOpacity
                    onPress={() => removeFavoriteLine(f.code)}
                    style={[styles.favoriteBtn, { justifyContent: 'center', alignItems: 'center', alignSelf: 'center' }]}
                  >
                    <Ionicons name="star" size={20} color="#6a4cff" style={[styles.favoriteIcon, { alignSelf: 'center', marginLeft: -10 }]} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => selectLine({ line: f.code, name: f.name })}
                    style={{ flex: 1, minWidth: 40, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Text style={styles.favoriteCode}>{f.code}</Text>
                    <Text style={styles.favoriteName}>{f.name}</Text>
                  </TouchableOpacity>
                </View>
              );
            })} 
          </View>
        </View>
      )}
      {selected && (
        <View style={[styles.resultContainer, { paddingTop: 16 }]}>
          {loading ? (
            <ActivityIndicator size="large" color="#8a6cf1" style={styles.loader} />
          ) : (
            <>  
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'times' && styles.tabItemActive]}
                  onPress={() => setActiveTab('times')}
                >
                  <Text style={[styles.tabItemText, activeTab === 'times' && styles.activeTabItem]}>Saatler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'stations' && styles.tabItemActive]}
                  onPress={() => setActiveTab('stations')}
                >
                  <Text style={[styles.tabItemText, activeTab === 'stations' && styles.activeTabItem]}>Duraklar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'vehicles' && styles.tabItemActive]}
                  onPress={() => setActiveTab('vehicles')}
                >
                  <Text style={[styles.tabItemText, activeTab === 'vehicles' && styles.activeTabItem]}>Araçlar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'about' && styles.tabItemActive]}
                  onPress={() => setActiveTab('about')}
                >
                  <Text style={[styles.tabItemText, activeTab === 'about' && styles.activeTabItem]}>Bilgi</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.resultHeader}>
                <View style={styles.lineInfoContainer}>
                  <View style={styles.lineCodeRow}>
                    <Text style={styles.lineCodeLarge}>{selected.line}</Text>
                    <View style={styles.headerButtonsContainer}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.smallStarBtn]}
                        onPress={toggleFavoriteLine}
                      >
                        <Ionicons 
                          name={isFavoriteLine ? 'star' : 'star-outline'} 
                          size={20} 
                          color={isFavoriteLine ? '#fff' : '#fff'} 
                        />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { marginLeft: 8 }]} 
                        onPress={handleAnnouncementsPress}
                      >
                        <FontAwesome5 name="bell" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Duyuru</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
              {activeTab === 'times' && (
                <View style={styles.contentCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Sefer Saatleri</Text>
                    <Switch
                      trackColor={{ false: '#0d0d1a', true: '#0d0d1a' }}
                      thumbColor={direction ? '#8a6cf1' : '#6a4cff'}
                      ios_backgroundColor="#0d0d1a"
                      onValueChange={(val) => setDirection(val ? 1 : 0)}
                      value={direction === 1}
                      style={styles.directionSwitch}
                    />
                  </View>
                  {timetable.length > 0 && timetable[direction] ? (
                    <>
                      <Text style={[styles.sectionTitle, { fontSize: 14, marginBottom: 8 }]}>{timetable[direction].title}</Text>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>İş Günleri</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Cumartesi</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Pazar</Text>
                      </View>
                      {timetable[direction].schedule.I.map((_, idx) => (
                        <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                          <Text style={[styles.tableCell, { flex: 1 }, timetable[direction].schedule.I[idx]?.isSpecial && { color: 'red' }]}> 
                            {formatDepartureTime(timetable[direction].schedule.I[idx])}
                          </Text>
                          <Text style={[styles.tableCell, { flex: 1 }, timetable[direction].schedule.C[idx]?.isSpecial && { color: 'red' }]}> 
                            {formatDepartureTime(timetable[direction].schedule.C[idx])}
                          </Text>
                          <Text style={[styles.tableCell, { flex: 1 }, timetable[direction].schedule.P[idx]?.isSpecial && { color: 'red' }]}> 
                            {formatDepartureTime(timetable[direction].schedule.P[idx])}
                          </Text>
                        </View>
                      ))}
                    </>
                  ) : (
                    <Text style={styles.noDataText}>Bu hat için sefer saatleri bulunmamaktadır.</Text>
                  )}
                </View>
              )}
              {activeTab === 'stations' && (
                <View style={styles.contentCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Duraklar</Text>
                    <Switch
                      trackColor={{ false: '#0d0d1a', true: '#0d0d1a' }}
                      thumbColor={direction ? '#8a6cf1' : '#6a4cff'}
                      ios_backgroundColor="#0d0d1a"
                      onValueChange={(val) => setDirection(val ? 1 : 0)}
                      value={direction === 1}
                      style={styles.directionSwitch}
                    />
                  </View>
                  <View style={styles.stationContainer}>
                    <View style={styles.stationLine} />
                    {stations.map((station, index) => (
                      <View key={index} style={styles.stationItem}>
                        <View style={styles.stationDot} />
                        <TouchableOpacity onPress={() => router.push({ pathname: '/durak', params: { query: decodeHTMLEntities(station) } })}> 
                            <Text style={styles.stationName}>{decodeHTMLEntities(station)}</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {activeTab === 'vehicles' && (
                <View style={styles.contentCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Araçlar</Text>
                  </View>
                  {selected ? (
                    <VehiclesByDirection line={selected.line} />
                  ) : (
                    <Text style={styles.noDataText}>Bir hat seçiniz.</Text>
                  )}
                </View>
              )}
              {activeTab === 'about' && (
                <View style={styles.contentCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Hat Bilgileri</Text>
                  </View>
                  <View style={styles.aboutContainer}>
                    {lineInfo.loading ? (
                      <ActivityIndicator size="small" color="#8a6cf1" style={styles.loader} />
                    ) : lineInfo.error ? (
                      <Text style={[styles.aboutText, { color: '#ff6b6b' }]}>{lineInfo.error}</Text>
                    ) : (
                      <>
                        {lineInfo.tripDuration && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Sefer Süresi:</Text>
                            <Text style={styles.infoValue}>{lineInfo.tripDuration}</Text>
                          </View>
                        )}
                        {lineInfo.lineType && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Hat Tipi:</Text>
                            <Text style={styles.infoValue}>{decodeHTMLEntities(lineInfo.lineType)}</Text>
                          </View>
                        )}
                        {lineInfo.fareInfo && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Tarife Bilgisi:</Text>
                            <Text style={styles.infoValue}>{decodeHTMLEntities(lineInfo.fareInfo)}</Text>
                          </View>
                        )}
                        {lineName && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Güzergâh:</Text>
                            <Text style={styles.infoValue}>{lineName}</Text>
                          </View>
                        )}


                        {lineInfo.notes && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Notlar:</Text>
                            <Text style={[styles.infoValue, {flex: 1}]}>
                              {String(lineInfo.notes || '').replace(/\n/g, ' ')}
                            </Text>
                          </View>
                        )}
                        {!lineInfo.tripDuration && !lineInfo.lineType && !lineInfo.fareInfo && !lineName && (
                          <Text style={styles.aboutText}>Bu hat için bilgi bulunamadı.</Text>
                        )}
                      </>
                    )}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      )}
      {/* Announcements Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hat Duyuruları</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.announcementList} contentContainerStyle={{ flexGrow: 1 }}>
              {announcementsLoading ? (
                <ActivityIndicator size="large" color="#8a6cf1" style={styles.loader} />
              ) : announcements.length > 0 ? (
                <>
                  {announcements.map((announcement, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.announcementItem,
                        (announcement.severity === 'warning' || announcement.level === 'warning') && styles.announcementItemWarning,
                        (announcement.severity === 'critical' || announcement.level === 'critical') && styles.announcementItemCritical,
                      ]}
                    >
                      <Text style={styles.announcementDate}>
                        {announcement.date || announcement.VERI_SAATI}
                      </Text>
                      <Text style={styles.announcementText}>
                        {announcement.content || announcement.BILGI}
                      </Text>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={styles.noDataText}>Bu hat için duyuru bulunmamaktadır.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: '#8a6cf1',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
  },
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
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  suggestionsContainer: {
    elevation: 12,
    overflow: 'hidden',
    zIndex: 20,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 108, 241, 0.08)',
  },
  selectedItem: {
    backgroundColor: 'rgba(138, 108, 241, 0.34)',
  },
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
  lineName: {
    color: '#e0e0e0',
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  resultContainer: {
    width: '100%',
  },
  loader: {
    marginTop: 40,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  lineInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  lineCodeLarge: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#8a6cf1',
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: 'rgba(138, 108, 241, 0.2)',
    paddingHorizontal: 10,
    lineHeight: 24,
  },
  lineNameLarge: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  backButton: {
    backgroundColor: '#6a4cff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontFamily: 'Inter_500Medium',
  },
  button: {
    backgroundColor: '#6a4cff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  actionBtn: { // Renamed from announcementButton to be more general
    backgroundColor: '#6a4cff', // Primary button color
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 0, // Match screen1's action buttons
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 6,
    minWidth: 42,
    minHeight: 42,
  },
  actionBtnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginLeft: 8,
  },
  smallStarBtn: { // Style for the small star button
    paddingVertical: 0,
    paddingHorizontal: 0,
    minWidth: 42,
    minHeight: 42,
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonRow: { // New style for button grouping
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#8a6cf1',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(138, 108, 241, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  tableHeaderCell: {
    color: '#8a6cf1',
    fontFamily: 'Inter_600SemiBold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 108, 241, 0.05)',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(138, 108, 241, 0.05)',
  },
  tableCell: {
    color: '#e0e0e0',
    fontFamily: 'Inter_400Regular',
  },
  stationContainer: {
    position: 'relative',
    paddingLeft: 20,
  },
  stationLine: {
    position: 'absolute',
    left: 10,
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: '#8a6cf1',
    zIndex: 1,
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    zIndex: 2,
  },
  stationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#8a6cf1',
    borderWidth: 2,
    borderColor: '#ffffff',
    marginRight: 16,
    zIndex: 3,
  },
  stationName: {
    color: '#e0e0e0',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  noDataText: {
    color: '#a0a0a0',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginVertical: 16,
  },
  noResultsText: {
    color: '#a0a0a0',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginVertical: 16,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.2)',
    overflow: 'hidden', // Ensure content stays inside and scrollbars show
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 108, 241, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  modalClose: {
    fontSize: 24,
    color: '#8a6cf1', // Matched screen1's close button color
    paddingHorizontal: 10, // Matched screen1's close button padding
  },
  announcementItemWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderLeftColor: '#f59e0b',
  },
  announcementItemCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftColor: '#ef4444',
  },
  announcementDate: {
    color: '#a0a0a0',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginBottom: 4,
  },
  announcementText: {
    color: '#e0e0e0',
    fontFamily: 'Inter_400Regular',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#8a6cf1',
  },
  tabItemText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#a0a0a0',
  },
  activeTabItem: {
    color: '#ffffff',
  },
  directionSwitch: {
    marginHorizontal: 8,
  },
  suggestionsScrollView: { paddingHorizontal: 16 },
  favoritesContainer: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  favoritesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8a6cf1',
    marginLeft: 8,
    marginBottom: 8,
  },
  favoritesScrollView: {
    paddingVertical: 4,
  },
  favoritesList: {
    flexDirection: 'column',
    gap: 8,
  },
  favoriteItem: {
    backgroundColor: 'rgba(13, 13, 26, 0.5)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8a4cff',
    borderWidth: 1,
    borderColor: '#8a6cf1', // neon border
    shadowColor: '#8a6cf1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
    maxWidth: 350,
  },


  favoriteCode: {
    backgroundColor: 'rgba(138, 108, 241, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    color: '#8a6cf1',
    fontFamily: 'Inter_500Medium',
    marginRight: 12,
    minWidth: 50,
    textAlign: 'center',
  },
  favoriteName: {
    color: '#a084ff', // neon purple
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    flexShrink: 1,
    flexGrow: 1,
    textAlign: 'left',
    flexWrap: 'wrap',
    textShadowColor: '#8a6cf1',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  favoriteIcon: {
    marginRight: 4,
  },
  favoriteBtn: {
    marginLeft: 10,
    padding: 4,
  },
  aboutContainer: {
    padding: 16,
  },
  aboutText: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  notesContainer: {
    marginTop: 8,
  },
  notesList: {
    marginTop: 4,
  },
  noteText: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  infoLabel: {
    color: '#a0a0a0',
    fontFamily: 'Inter_600SemiBold',
    width: 120,
    fontSize: 13,
  },
  infoValue: {
    color: '#e0e0e0',
    fontFamily: 'Inter_400Regular',
    flex: 1,
    fontSize: 13,
  },
  announcementList: {
    padding: 16,
    flexGrow: 1,
  },
  announcementItem: {
    backgroundColor: 'rgba(138, 108, 241, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8a6cf1',
  },
});
