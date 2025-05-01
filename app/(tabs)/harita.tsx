import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

const API_BASE = 'https://iett.deno.dev';
const ISTANBUL_REGION = {
  latitude: 41.0161,
  longitude: 28.9944,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

export default function HaritaScreen() {
  const [showVehicles, setShowVehicles] = useState(true);
  const [showStations, setShowStations] = useState(false);
  const [showGarages, setShowGarages] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [garages, setGarages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<Region>(ISTANBUL_REGION);
  const [lineDataCache, setLineDataCache] = useState<{ [kapiNo: string]: string }>({});
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 60000);
    return () => clearInterval(interval);
  }, [showVehicles, showStations, showGarages]);

  async function fetchData() {
    setLoading(true);
    try {
      if (showVehicles) {
        const res = await fetch(`${API_BASE}/api/vehicles`);
        const data = await res.json();
        // Deduplicate by KapiNo, keep latest by Saat
        const uniqueVehicles = new Map();
        data.vehicles.forEach((vehicle: any) => {
          const key = `${vehicle.KapiNo}`;
          if (!uniqueVehicles.has(key) || new Date(vehicle.Saat) > new Date(uniqueVehicles.get(key).Saat)) {
            uniqueVehicles.set(key, vehicle);
          }
        });
        setVehicles(Array.from(uniqueVehicles.values()));
      } else {
        setVehicles([]);
      }
      if (showStations) {
        const res = await fetch(`${API_BASE}/api/stations`);
        const data = await res.json();
        setStations(data.stations);
      } else {
        setStations([]);
      }
      if (showGarages) {
        const res = await fetch(`${API_BASE}/api/garages`);
        const data = await res.json();
        setGarages(data.garages);
      } else {
        setGarages([]);
      }
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  async function getLineData(kapiNo: string) {
    if (lineDataCache[kapiNo]) return lineDataCache[kapiNo];
    try {
      const res = await fetch(`${API_BASE}/api/vehicle-line?kapiNo=${kapiNo}`);
      const data = await res.json();
      if (data.line) {
        setLineDataCache((prev) => ({ ...prev, [kapiNo]: data.line }));
        return data.line;
      }
    } catch (e) {}
    return '';
  }

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        initialRegion={ISTANBUL_REGION}
        region={region}
        onRegionChangeComplete={setRegion}
      >
        {showVehicles && vehicles.map((vehicle, i) => (
          <Marker
            key={`vehicle-${vehicle.KapiNo}`}
            coordinate={{ latitude: vehicle.coordinates[1], longitude: vehicle.coordinates[0] }}
            title={`Kapı No: ${vehicle.KapiNo}`}
            description={`Plaka: ${vehicle.Plaka}`}
            pinColor="#4a90e2"
          >
            <FontAwesome5 name="bus" size={22} color="#4a90e2" />
            <Callout onPress={async () => {}}>
              <VehiclePopup vehicle={vehicle} getLineData={getLineData} />
            </Callout>
          </Marker>
        ))}
        {showStations && stations.map((station, i) => (
          <Marker
            key={`station-${station.SDURAKKODU}`}
            coordinate={{ latitude: station.coordinates[1], longitude: station.coordinates[0] }}
            title={station.SDURAKADI}
            pinColor="#e74c3c"
          >
            <FontAwesome5 name="map-marker-alt" size={18} color="#e74c3c" />
            <Callout>
              <Text style={{ fontFamily: 'Inter_700Bold', color: '#8a6cf1', fontSize: 16 }}>{station.SDURAKADI}</Text>
              <Text>Kod: {station.SDURAKKODU}</Text>
              <Text>İlçe: {station.ILCEADI}</Text>
              <Text>Yön: {station.SYON}</Text>
              {station.AKILLI === '1' && <Text>Akıllı Durak</Text>}
            </Callout>
          </Marker>
        ))}
        {showGarages && garages.map((garage, i) => (
          <Marker
            key={`garage-${garage.GARAJ_KODU}`}
            coordinate={{ latitude: garage.coordinates[1], longitude: garage.coordinates[0] }}
            title={garage.GARAJ_ADI}
            pinColor="#2ecc71"
          >
            <FontAwesome5 name="warehouse" size={20} color="#2ecc71" />
            <Callout>
              <Text style={{ fontFamily: 'Inter_700Bold', color: '#2ecc71', fontSize: 16 }}>{garage.GARAJ_ADI}</Text>
              <Text>Kod: {garage.GARAJ_KODU}</Text>
            </Callout>
          </Marker>
        ))}
      </MapView>
      <View style={styles.layerMenu}>
        <View style={styles.layerRow}>
          <Text style={styles.layerLabel}>Araçlar</Text>
          <Switch value={showVehicles} onValueChange={setShowVehicles} thumbColor="#4a90e2" trackColor={{ true: '#b3d1f7', false: '#ccc' }} />
        </View>
        <View style={styles.layerRow}>
          <Text style={styles.layerLabel}>Duraklar</Text>
          <Switch value={showStations} onValueChange={setShowStations} thumbColor="#e74c3c" trackColor={{ true: '#f9b6b6', false: '#ccc' }} />
        </View>
        <View style={styles.layerRow}>
          <Text style={styles.layerLabel}>Garajlar</Text>
          <Switch value={showGarages} onValueChange={setShowGarages} thumbColor="#2ecc71" trackColor={{ true: '#b5f9c6', false: '#ccc' }} />
        </View>
      </View>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8a6cf1" />
        </View>
      )}
    </View>
  );
}

function VehiclePopup({ vehicle, getLineData }: { vehicle: any; getLineData: (kapiNo: string) => Promise<string> }) {
  const [line, setLine] = useState('');
  useEffect(() => {
    let mounted = true;
    getLineData(vehicle.KapiNo).then((data) => { if (mounted) setLine(data); });
    return () => { mounted = false; };
  }, [vehicle.KapiNo]);
  return (
    <ScrollView style={{ maxWidth: 260 }}>
      <Text style={{ fontFamily: 'Inter_700Bold', color: '#4a90e2', fontSize: 16 }}>Kapı No: {vehicle.KapiNo}</Text>
      <Text>Plaka: {vehicle.Plaka}</Text>
      <Text>Garaj: {vehicle.Garaj}</Text>
      <Text>Hız: {vehicle.hiz == null || vehicle.hiz === 0 ? 0 : vehicle.hiz} km/s</Text>
      <Text>Son Güncelleme: {vehicle.Saat}</Text>
      {line ? <Text>Hat: {line.split(' ')[0]}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  layerMenu: {
    position: 'absolute',
    top: 20,
    right: 12,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    zIndex: 100,
    minWidth: 120,
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  layerLabel: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    fontFamily: 'Inter_600SemiBold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,13,26,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
});
