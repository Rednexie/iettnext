import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';

const API_BASE = 'https://iett.rednexie.workers.dev';

const Arac = () => {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  
  const [query, setQuery] = useState<string>('');
  const [result, setResult] = useState<any | null>(null);
  const [hasQueried, setHasQueried] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [favoriteVehicles, setFavoriteVehicles] = useState<{ id: string; name: string; plate?: string; doorCode?: string }[]>([]);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isFavorite = result ? favoriteVehicles.some(f => f.id === (result.KapıKodu || result.plaka)) : false;

  const isVehicleDoorCode = (value: string) => /^[A-Za-z]-?\d{1,4}$/.test(value);
  const isNumberPlate = (value: string) => /^34/.test(value) && value.length > 5 && value.length < 9;

  const sendQuery = async () => {
    let q = query.trim();
    if (q.startsWith('o') && q.length === 6) {
      // Handle special case for door codes starting with 'o'
      q = q.replace(/-/g, '');
    }
    if (!q) return;
    setHasQueried(true);
    let queryType: string;
    if (isVehicleDoorCode(q)) {
      queryType = 'KapıKodu';
    } else if (isNumberPlate(q)) {
      queryType = 'plaka';
    } else {
      alert('Geçersiz giriş formatı. Lütfen geçerli bir plaka veya kapı kodu girin.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [queryType]: q.toUpperCase() }),
      });
      const data = await res.json();
      setResult(data || null);
      setTasks([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const viewTodayTasks = async () => {
    if (!result) return;
    setTasksLoading(true);
    const id = result.KapıKodu || result.plaka;
    try {
      const res = await fetch(`${API_BASE}/api/vehicle-lines-today`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kapino: id }),
      });
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setTasksLoading(false);
    }
  };
  
  // Load favorite vehicles on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const saved = await AsyncStorage.getItem('favoriteVehicles');
        if (saved) setFavoriteVehicles(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load favorite vehicles', error);
      }
    };
    loadFavorites();
  }, []);

  // Save favorites when they change
  useEffect(() => {
    const saveFavorites = async () => {
      try {
        await AsyncStorage.setItem('favoriteVehicles', JSON.stringify(favoriteVehicles));
      } catch (error) {
        console.error('Failed to save favorite vehicles', error);
      }
    };
    saveFavorites();
  }, [favoriteVehicles]);

  const toggleFavorite = useCallback(() => {
    if (!result) return;
    
    const vehicleId = result.KapıKodu || result.plaka;
    const isFavorite = favoriteVehicles.some(f => f.id === vehicleId);
    
    if (isFavorite) {
      setFavoriteVehicles(favoriteVehicles.filter(f => f.id !== vehicleId));
    } else {
      setFavoriteVehicles([
        ...favoriteVehicles,
        {
          id: vehicleId,
          name: result.hatadi || 'Araç',
          plate: (result.plaka || '').replace(/\s/g, ''),
          doorCode: result.KapıKodu
        }
      ]);
    }
  }, [result, favoriteVehicles]);

  const removeFavorite = (id: string) => {
    setFavoriteVehicles(favoriteVehicles.filter(f => f.id !== id));
  };

  const selectFavorite = (vehicle: { id: string; plate?: string; doorCode?: string }) => {
    if (vehicle.doorCode) {
      setQuery(vehicle.doorCode);
      // Query immediately after state update
      requestAnimationFrame(() => sendQuery());
    } else if (vehicle.plate) {
      setQuery(vehicle.plate);
      // Query immediately after state update
      requestAnimationFrame(() => sendQuery());
    }
  };

  const resetSearch = () => {
    setQuery('');
    setResult(null);
    setHasQueried(false);
    setTasks([]);
    inputRef.current?.focus();
  };

  // Component to resolve and cache location names for coordinates
  const LocationResolver = ({ lat, lon }: { lat: number; lon: number }) => {
    const [location, setLocation] = useState<string>('Yükleniyor');
    useEffect(() => {
      const cacheKey = `l=${lat},${lon}`;
      (async () => {
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            setLocation(cached);
          } else {
            const res = await fetch(`${API_BASE}/location-transform`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lon, lat }),
            });
            const text = await res.text();
            setLocation(text);
            await AsyncStorage.setItem(cacheKey, text);
          }
        } catch {
          setLocation('Konum Bilinmiyor');
        }
      })();
    }, [lat, lon]);
    return (
      <Text
        style={styles.link}
        onPress={() => Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`)}
      >
        {location}
      </Text>
    );
  };

  if (!fontsLoaded) return null;
  
  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps='handled'
        >
          <View style={styles.searchContainer}>
            <Text style={[styles.title, { color: '#8a6cf1' }]}>Araç Sorgulama</Text>
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { fontFamily: 'Inter_400Regular' }]}
                value={query}
                onChangeText={setQuery}
                placeholder="Plaka veya Kapı Kodu girin..."
                placeholderTextColor="#ccc"
                onSubmitEditing={sendQuery}
                returnKeyType="search"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {query.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton} 
                  onPress={resetSearch}
                >
                  <Ionicons name="close-circle" size={20} color="#6a6a8a" />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.button}
              onPress={sendQuery}
            >
              <Text style={styles.buttonText}>Ara</Text>
            </TouchableOpacity>
            {/* Added margin below the 'Ara' button */}
            <View style={{ marginBottom: 16 }} />
            
            {loading && <ActivityIndicator size="large" color="#8a6cf1" style={styles.loader} />}
            {hasQueried && result === null && !loading && <Text style={styles.noData}>Araç verisi bulunamadı.</Text>}
            
            {/* Favorites Section */}
            {!result && query.trim() === '' && favoriteVehicles.length > 0 && (
              <View style={styles.favoritesContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.favoritesScrollView}
                >
                  {favoriteVehicles.map((f) => (
                    <TouchableOpacity 
                      key={f.id} 
                      style={styles.favoriteItem}
                      onPress={async () => {
                        const value = f.plate || f.doorCode;
                        if (!value) return;
                        
                        // Set the query and wait for state to update
                        setQuery(value);
                        
                        // Force a re-render to ensure query is updated
                        await new Promise(resolve => requestAnimationFrame(resolve));
                        
                        // Trigger the query with the updated value
                        let q = value.trim();
                        if (q.startsWith('o') && q.length === 6) {
                          q = q.replace(/-/g, '');
                        }
                        
                        setHasQueried(true);
                        let queryType: string;
                        if (isVehicleDoorCode(q)) {
                          queryType = 'KapıKodu';
                        } else if (isNumberPlate(q)) {
                          queryType = 'plaka';
                        } else {
                          return;
                        }
                        
                        setLoading(true);
                        try {
                          const res = await fetch(`${API_BASE}/query`, {
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify({ [queryType]: q.toUpperCase() }),
                          });
                          const data = await res.json();
                          setResult(data || null);
                          setTasks([]);
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      <Text style={styles.favoriteName}>
                        {f.doorCode || f.plate}
                      </Text>
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          removeFavorite(f.id);
                        }}
                        style={styles.favoriteStar}
                      >
                        <Ionicons name="star" size={16} color="#8a6cf1" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
      
          {result && (
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <View style={styles.resultHeaderContent}>
              <Text style={styles.resultHeaderText}>
                {result.KapıKodu ? `${result.KapıKodu}${result.plaka ? ` / ${result.plaka}` : ''}` : result.plaka}
              </Text>
              <TouchableOpacity 
                onPress={toggleFavorite}
                style={styles.favoriteButton}
              >
                <Ionicons 
                  name={isFavorite ? "star" : "star-outline"} 
                  size={24} 
                  color={isFavorite ? "#8a6cf1" : "#6a6a8a"} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.tableContainer}>
            {(() => {
              const fields = ['hat', 'marka', 'kapasite', 'özellikler', 'yer', 'konum', 'konumSaati', 'hiz', 'operator'];
              if (result.Garaj) fields.splice(0, 0, 'Garaj');
              return fields.map((field) => {
                let value: any = result[field] || 'N/A';
                if (field === 'konum' && result.tamkonum) {
                  const coords = result.tamkonum.split(',').map((s: string) => s.trim());
                  if (coords.length === 2) {
                    const lat = Number(coords[0]); const lon = Number(coords[1]);
                    value = <LocationResolver lat={lat} lon={lon} />;
                  }
                }
                return (
                  <View key={field} style={styles.tableRow}>
                    <Text style={styles.tableHeaderCell}>{field}</Text>
                    <View style={styles.tableCellContainer}>
                      {(typeof value === 'string' || typeof value === 'number') ? 
                        <Text style={styles.tableCell}>{value}</Text> : value}
                    </View>
                  </View>
                );
              });
            })()}
          </View>
          
          {tasks.length === 0 && (
            <TouchableOpacity style={styles.tasksButton} onPress={viewTodayTasks}>
              <Text style={styles.buttonText}>Bugünkü Tüm Seferleri Gör</Text>
            </TouchableOpacity>
          )}
          
          {tasksLoading && <ActivityIndicator size="small" color="#8a6cf1" style={styles.loader} />}
          
          {tasks.length > 0 && (
            <View style={styles.tasksContainer}>
              <Text style={styles.sectionTitle}>Bugünkü Seferler</Text>
              {tasks.map((task, i) => (
                <View key={i} style={styles.taskItem}>
                  <Text style={styles.taskTime}>{task.time ? `${task.time}` : 'Saat bilgisi yok'}</Text>
                  <Text style={styles.taskName}>{task.name}</Text>
                  <Text style={styles.taskCode}>{task.code}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: { 
    flexGrow: 1,
    padding: 16,
    paddingBottom: 120,
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
    elevation: 12,
    marginBottom: 16,
    position: 'relative',
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  favoritesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(138, 108, 241, 0.1)',
  },
  favoritesTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#8a6cf1',
    marginBottom: 8,
    marginLeft: 8,
  },
  favoritesScrollView: {
    paddingVertical: 4,
  },
  favoriteItem: {
    backgroundColor: 'rgba(138, 108, 241, 0.1)',
    borderWidth: 1,
    borderColor: '#8a6cf1',
    borderRadius: 0,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    marginLeft: 8,
    padding: 8,
  },
  favoriteStar: {
    marginLeft: 4,
    padding: 4,
  },
  favoriteName: {
    color: '#e0e0e0',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  favoriteRemove: {
    padding: 4,
  },
  buttonWithFavorite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 16,
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
    minHeight: 48,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  button: {
    backgroundColor: '#6a4cff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  loader: {
    marginVertical: 12,
  },
  noData: {
    color: '#ccc',
    textAlign: 'center',
    marginVertical: 12,
  },
  resultContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)',
    padding: 16,
    marginTop: 16,
    width: '100%',
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
    marginBottom: 16,
  },
  resultHeaderText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#e0e0e0',
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 108, 241, 0.1)',
  },
  tableHeaderCell: {
    flex: 1,
    color: '#8a6cf1',
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  tableCellContainer: {
    flex: 2,
  },
  tableCell: {
    color: '#e0e0e0',
    fontFamily: 'Inter_400Regular',
  },
  link: {
    color: '#8a6cf1',
    textDecorationLine: 'underline',
    fontFamily: 'Inter_400Regular',
  },
  tasksButton: {
    backgroundColor: '#8a6cf1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  tasksContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#8a6cf1',
    marginBottom: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 108, 241, 0.08)',
  },
  taskTime: {
    color: '#e0e0e0',
    fontFamily: 'Inter_500Medium',
    marginRight: 8,
    minWidth: 60,
  },
  taskName: {
    color: '#8a6cf1',
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  taskCode: {
    color: '#aaa',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});

export default Arac;
