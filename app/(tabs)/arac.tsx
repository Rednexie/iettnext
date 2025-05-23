import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_BASE = 'https://iett.deno.dev';

const Arac = () => {
  const [query, setQuery] = useState<string>('');
  const [result, setResult] = useState<any | null>(null);
  const [hasQueried, setHasQueried] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const isVehicleDoorCode = (value: string) => /^[A-Za-z]-?\d{1,4}$/.test(value);
  const isNumberPlate = (value: string) => /^34/.test(value) && value.length > 5 && value.length < 9;

  const sendQuery = async () => {
    const q = query.trim();
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

  // Component to resolve and cache location names for coordinates
  const LocationResolver = ({ lat, lon }: { lat: number; lon: number }) => {
    const [location, setLocation] = useState<string>('Yükleniyor');
    useEffect(() => {
      const key = `location_${lat}_${lon}`;
      (async () => {
        try {
          const cached = await AsyncStorage.getItem(key);
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
            await AsyncStorage.setItem(key, text);
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

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.heading}>Araç Sorgulama</Text>
        <TextInput
          style={styles.input}
          placeholder="Plaka ya da Kapı Kodu girin"
          placeholderTextColor="#ccc"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={sendQuery}
        />
        <TouchableOpacity style={styles.button} onPress={sendQuery}>
          <Text style={styles.buttonText}>Ara</Text>
        </TouchableOpacity>
        {loading && <ActivityIndicator size="large" color="#8a6cf1" style={styles.loader} />}
        {hasQueried && result === null && !loading && <Text style={styles.noData}>Araç verisi bulunamadı.</Text>}
        {result && (
          <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent}>
            {(() => {
              const fields = ['kapı kodu', 'hat', 'marka', 'kapasite', 'özellikler', 'yer', 'konum', 'konumSaati', 'hiz', 'operator'];
              if (result.Garaj) fields.splice(1, 0, 'Garaj');
              return fields.map((field) => {
                let value: any = result[field] || 'null';
                if (field === 'kapı kodu') value = `${result.KapıKodu||'null'} / ${result.plaka||'null'}`;
                if (field === 'konum' && result.tamkonum) {
                  const coords = result.tamkonum.split(',').map((s: string) => s.trim());
                  if (coords.length === 2) {
                    const lat = Number(coords[0]); const lon = Number(coords[1]);
                    value = <LocationResolver lat={lat} lon={lon} />;
                  }
                }
                return (
                  <View key={field} style={styles.row}>
                    <Text style={styles.cellHeader}>{field}</Text>
                    {(typeof value === 'string' || typeof value === 'number') ? <Text style={styles.cell}>{value}</Text> : value}
                  </View>
                );
              });
            })()}
            {tasks.length === 0 && (
              <TouchableOpacity style={styles.tasksButton} onPress={viewTodayTasks}>
                <Text style={styles.buttonText}>Bugünkü Tüm Görevleri Gör</Text>
              </TouchableOpacity>
            )}
            {tasksLoading && <ActivityIndicator size="small" color="#8a6cf1" style={styles.loader} />}
            {tasks.map((task, i) => (
              <Text key={i} style={styles.taskText}>{task.time ? `${task.time}` : 'saat bilgisi yok'} - <Text style={styles.taskHighlight}>{task.name}</Text> - <Text style={styles.taskCode}>{task.code}</Text></Text>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a', justifyContent: 'center', alignItems: 'center', padding: 16 },
  box: { backgroundColor: '#252542', borderWidth: 1, borderColor: 'rgba(138,108,241,0.1)', borderRadius: 16, padding: 20, width: '100%', maxWidth: 500 },
  heading: { fontSize: 24, color: '#8a6cf1', fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  input: { backgroundColor: 'rgba(13,13,26,0.6)', borderWidth: 1, borderColor: 'rgba(138,108,241,0.2)', borderRadius: 8, padding: 12, color: '#e0e0e0', marginBottom: 8 },
  button: { backgroundColor: '#6a4cff', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: '500', fontSize: 16 },
  loader: { marginVertical: 12 },
  noData: { color: '#ccc', textAlign: 'center', marginVertical: 12 },
  results: { marginTop: 8, flexGrow: 1 },
  resultsContent: { paddingBottom: 16 },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(138,108,241,0.1)' },
  cellHeader: { flex: 1, color: '#8a6cf1', fontWeight: '600' },
  cell: { flex: 2, color: '#e0e0e0' },
  link: { color: '#8a6cf1', textDecorationLine: 'underline' },
  tasksButton: { backgroundColor: '#8a6cf1', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  taskText: { color: '#e0e0e0', marginTop: 6 },
  taskHighlight: { color: '#f1c40f', fontWeight: '600' },
  taskCode: { color: '#aaa', fontSize: 12 },
});

export default Arac;
