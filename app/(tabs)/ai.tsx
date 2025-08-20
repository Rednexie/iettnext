import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import React, { useEffect, useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_BASE = 'https://iett.rednexie.workers.dev';

// Define chat message type
type Message = { sender: 'user' | 'model'; text: string; tool?: string; data?: any };

// Add UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function AiScreen() {
  const [fontsLoaded] = useFonts({
    'Inter_400Regular': Inter_400Regular,
    'Inter_500Medium': Inter_500Medium,
    'Inter_600SemiBold': Inter_600SemiBold,
    'Inter_700Bold': Inter_700Bold
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>(() => generateUUID());
  const scrollRef = useRef<ScrollView>(null);

  // Generate and store a unique device identifier
  useEffect(() => {
    const generateDeviceId = async () => {
      try {
        // First try to get existing device ID
        let id = await AsyncStorage.getItem('deviceId');
        
        // If no ID exists, generate a new one
        if (!id) {
          id = await createAndStoreDeviceId();
        }
        
        setDeviceId(id);
      } catch (error) {
        // If any error occurs, generate a new ID and continue
        const newId = await createAndStoreDeviceId();
        setDeviceId(newId);
      }
    };

    const createAndStoreDeviceId = async (): Promise<string> => {
      try {
        // Create a unique string using device info if available, otherwise use random string
        const deviceInfo = Device.osBuildFingerprint || Device.modelName || Device.deviceName || '';
        const randomString = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
        
        const id = btoa(unescape(encodeURIComponent(
          deviceInfo ? `${deviceInfo}-${randomString}` : randomString
        )));
        
        // Store the ID for future use
        await AsyncStorage.setItem('deviceId', id);
        return id;
      } catch (error) {
        // If storage fails, return a random ID (won't persist but will work for current session)
        // persist this id instead
        const id = generateUUID();
        await AsyncStorage.setItem('deviceId', id);
        return id;
      }
    };

    generateDeviceId();
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const newMessages: Message[] = [...messages, { sender: 'user', text }];
    try {
      if (!deviceId) return;

      // Add the message to the UI immediately
      setMessages([...newMessages, { sender: 'model', text: '...' }]);
      setLoading(true);
      
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'device-id': deviceId,
        },
        body: JSON.stringify({ conversationId, messages: newMessages }),
      });
      
      const data = await response.json();

      const assistantMessage: Message = { sender: 'model', text: data.content, tool: data.tool, data: data.data };
      setMessages([...newMessages, assistantMessage]);
      scrollRef.current?.scrollToEnd({ animated: true });
    } catch (e) {
      console.error(e);
      const assistantMessage: Message = { sender: 'model', text: 'Üzgünüm, bir hata oluştu.' };
      setMessages([...newMessages, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Clear chat history and reset conversation ID
  const clearSession = () => {
    setMessages([]);
    setConversationId(generateUUID());
  };

  // Helper to decode HTML entities for Turkish accents
  const decodeEntities = (text: string) => text
    .replace(/&#214;/g, 'Ö')
    .replace(/&#246;/g, 'ö')
    .replace(/&#220;/g, 'Ü')
    .replace(/&#252;/g, 'ü')
    .replace(/&#199;/g, 'Ç')
    .replace(/&#231;/g, 'ç')
    .replace(/&#350;/g, 'Ş')
    .replace(/&#351;/g, 'ş')
    .replace(/&#304;/g, 'İ')
    .replace(/&#305;/g, 'ı')
    .replace(/&#286;/g, 'Ğ')
    .replace(/&#287;/g, 'ğ');

  // Helper to render user or tool-based assistant messages
  const renderMessageContent = (m: Message): React.ReactNode => {
    if (!m.tool || !m.data) {
      return <Text style={[styles.messageText, m.sender === 'user' ? styles.userText : styles.assistantText]}>{m.text}</Text>;
    }
    // console.log(m)
    switch (m.tool) {
      case 'get_time_table': {
        return (
          <ScrollView nestedScrollEnabled style={styles.timeSectionsContainer} contentContainerStyle={{ paddingVertical: 8 }}>
            {m.data.map((section: any, idx: number) => {
              const weekdaysTimes = section.times.map((t: any) => t.weekdays).join(', ');
              const saturdayTimes = section.times.map((t: any) => t.saturday).join(', ');
              const sundayTimes = section.times.map((t: any) => t.sunday).join(', ');
              return (
                <View key={idx} style={styles.timeSection}>
                  <Text style={styles.directionTitle}>{decodeEntities(section.direction)}</Text>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Hafta İçi</Text>
                    <Text style={styles.timeValue}>{decodeEntities(weekdaysTimes)}</Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Cts</Text>
                    <Text style={styles.timeValue}>{decodeEntities(saturdayTimes)}</Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Paz</Text>
                    <Text style={styles.timeValue}>{decodeEntities(sundayTimes)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        );
      }
      case 'get_stops': {
        return (
          <View style={styles.stopListContainer}>
            <ScrollView nestedScrollEnabled>
              {m.data.map((stop: any, i: number) => (
                <View key={i} style={styles.stopItem}>
                  <View style={styles.stopDot} />
                  {i > 0 && <View style={styles.stopLine} />}
                  <Text style={styles.stopText}>{stop}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        );
      }
      case 'get_arrivals': {
        return (
          <View style={styles.arrivalListContainer}>
            <ScrollView nestedScrollEnabled>
              {m.data.map((station: any, idx: number) => (
                <View key={idx} style={{ marginBottom: 16 }}>
                  <Text style={styles.arrivalStation}>{decodeEntities(station.station)}</Text>
                  <View style={{ gap: 8, marginTop: 4 }}>
                    {station.arrivals.map((a: any, j: number) => (
                      <View key={j} style={styles.arrivalItem}>
                        <Text style={styles.arrivalText}>
                          <Text style={{ fontWeight: '600' }}>{a.hatkodu}</Text> {a.saat} 
                          <Text style={{ color: '#8a6cf1' }}> ({a.dakika} dk) </Text>
                          {a.kapino && (
                            <Text style={{ fontSize: 12, color: '#a0a0a0', marginLeft: 4 }}>
                              {a.kapino}
                            </Text>
                          )}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        );
      }
      case 'get_vehicle_info': {
        
        const vehicle = m.data;
        if (!vehicle) return <Text style={[styles.messageText, styles.assistantText]}>Araç bilgisi bulunamadı.</Text>;
        
        // Parse coordinates from tamkonum if available
        let lat: number | null = null;
        let lon: number | null = null;
        let locationText = vehicle.yer || 'Konum bilgisi yok';
        
        if (vehicle.tamkonum) {
          const [parsedLat, parsedLon] = vehicle.tamkonum.split(',').map(Number);
          if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
            lat = parsedLat;
            lon = parsedLon;
          }
        }
        
        const hasLocation = !!(lat && lon);
        
        return (
          <View style={styles.vehicleInfoContainer}>
            <View style={styles.vehicleInfoHeader}>
              <Text style={styles.vehicleInfoTitle}>Araç Bilgileri</Text>
            </View>
            
            <View style={styles.vehicleInfoSection}>
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>Kapı Kodu:</Text>
                <Text style={styles.vehicleInfoValue}>{vehicle.KapıKodu || 'Bilinmiyor'}</Text>
              </View>
              
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>Plaka:</Text>
                <Text style={styles.vehicleInfoValue}>{vehicle.plaka || 'Bilinmiyor'}</Text>
              </View>
              
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>Model:</Text>
                <Text style={styles.vehicleInfoValue}>{vehicle.marka || 'Bilinmiyor'}</Text>
              </View>
              
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>Hat:</Text>
                <Text style={[styles.vehicleInfoValue, {color: '#ffffff'}]}>{vehicle.hat || 'Bilinmiyor'}</Text>
              </View>
              
              {vehicle.özellikler && (
                <View style={styles.vehicleInfoRow}>
                  <Text style={styles.vehicleInfoLabel}>Özellikler:</Text>
                  <Text style={styles.vehicleInfoValue}>{vehicle.özellikler}</Text>
                </View>
              )}
              
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>Kapasite:</Text>
                <Text style={styles.vehicleInfoValue}>{vehicle.kapasite || 'Bilinmiyor'}</Text>
              </View>
              
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>Operatör:</Text>
                <Text style={styles.vehicleInfoValue}>{vehicle.operator || 'Bilinmiyor'}</Text>
              </View>
              
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>Konum:</Text>
                <TouchableOpacity 
                  onPress={() => {
                    if (hasLocation) {
                      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
                    }
                  }}
                >
                  <Text style={[styles.vehicleInfoValue, hasLocation ? styles.locationLink : {}]}>
                    {locationText}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.vehicleInfoRow}>
                <Text style={styles.vehicleInfoLabel}>Hız:</Text>
                <Text style={styles.vehicleInfoValue}>{typeof vehicle.hiz !== 'undefined'  ? `${vehicle.hiz} km/s` : 'Bilinmiyor'}</Text>
              </View>
              
              {vehicle.konumSaati && (
                <View style={styles.vehicleInfoRow}>
                  <Text style={styles.vehicleInfoLabel}>Konum Zamanı:</Text>
                  <Text style={styles.vehicleInfoValue}>{vehicle.konumSaati}</Text>
                </View>
              )}
              
              {hasLocation && lat !== null && lon !== null && (
                <Text style={styles.coordinatesText}>
                  {lat.toFixed(6)}, {lon.toFixed(6)}
                </Text>
              )}
            </View>
          </View>
        );
      }
      
      case 'get_line_info': {
        const lineInfo = m.data;
        if (!lineInfo) return <Text style={[styles.messageText, styles.assistantText]}>Hat bilgisi bulunamadı.</Text>;
        
        // Get the line name from the message or use a default
        const lineName = lineInfo.lineName || 'Hat';
        
        // Filter out empty values and format the data
        const infoItems = [
          { label: 'Sefer Süresi', value: lineInfo.tripDuration },
          { label: 'Hat Tipi', value: lineInfo.lineType },
          { label: 'Tarife Bilgisi', value: lineInfo.fareInfo },
          ...(lineInfo.otherInfo ? Object.entries(lineInfo.otherInfo).map(([key, value]) => ({
            label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            value: String(value)
          })) : [])
        ].filter(item => item.value);
        
        if (infoItems.length === 0) {
          return <Text style={[styles.messageText, styles.assistantText]}>Bu hat için bilgi bulunamadı.</Text>;
        }
        
        return (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Hat Bilgileri</Text>
            <View style={styles.infoGrid}>
              {infoItems.map((item, index) => (
                <View key={index} style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={2} ellipsizeMode="tail">
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      }
      
      case 'get_vehicles': {
        const vehicles = Array.isArray(m.data) ? m.data : [];
        return (
          <View style={styles.vehiclesContainer}>
            {vehicles.map((vehicle: any, index: number) => {
              const hasLocation = vehicle.lat && vehicle.lon;
              const locationText = vehicle.locationName || 
                (hasLocation ? `${vehicle.lat.toFixed(6)}, ${vehicle.lon.toFixed(6)}` : 'Konum bilgisi yok');
              
              return (
                <TouchableOpacity 
                  key={index} 
                  style={styles.vehicleCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (hasLocation) {
                      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${vehicle.lat},${vehicle.lon}`);
                    }
                  }}
                >
                  <View style={styles.vehicleHeader}>
                    <Text style={styles.vehicleCode}>{vehicle.vehicleDoorCode || 'Bilinmeyen'}</Text>
                    {vehicle.direction && (
                      <Text style={styles.vehicleDirection}>{vehicle.direction}</Text>
                    )}
                  </View>
                  <View style={styles.vehicleLocation}>
                    <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
                      {locationText}
                    </Text>
                  </View>
                  {hasLocation && (
                    <Text style={styles.vehicleCoordinates}>
                      {vehicle.lat.toFixed(6)}, {vehicle.lon.toFixed(6)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        );
      }
      default:
        return <Text style={[styles.messageText, styles.assistantText]}>Unsupported tool: {m.tool}</Text>;
    }
  };

  if (!fontsLoaded) return null;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <TouchableOpacity style={styles.clearSessionButton} onPress={clearSession}>
        <Text style={styles.clearSessionText}>Oturumu Temizle</Text>
      </TouchableOpacity>
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps='handled'
      >
        <View style={[styles.messageBubble, styles.assistantBubble]}>
          <Text style={styles.assistantText}>Merhaba, ben iettnext AI. Güncel İETT verilerine erişim sağlayabilirim, size istanbul ulaşımında yardımcı olmak için tasarlandım.</Text>
          <Text style={styles.assistantText}>Yapay zeka performansını artırmak için konuşma verileriniz işlenmektedir.</Text>
        </View>
        {messages.map((m, i) => {
          const bubbleStyles: StyleProp<ViewStyle> = [
            styles.messageBubble,
            m.sender === 'user' ? styles.userBubble : styles.assistantBubble,
            (m.tool === 'get_time_table' || m.tool === 'get_vehicle_info') && styles.wideBubble,
          ].filter(Boolean) as StyleProp<ViewStyle>;
          return (
            <View key={i} style={bubbleStyles}>
              {renderMessageContent(m)}
            </View>
          );
        })}
        {loading && <ActivityIndicator style={{ margin: 16 }} color="#8a6cf1" />}
      </ScrollView>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Mesajınızı yazın..."
          placeholderTextColor="#888"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Gönder</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoCardTitle: {
    color: '#8a6cf1',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: 12,
  },
  infoLabel: {
    color: '#a0a0b3',
    fontSize: 12,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  container: { 
    flex: 1, 
    backgroundColor: '#0d0d1a',
    justifyContent: 'space-between',
  },
  vehiclesContainer: {
    width: '100%',
    marginVertical: 8,
  },
  vehicleCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.2)',
    overflow: 'hidden',
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  vehicleCode: {
    color: '#e0e0e0',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    flexShrink: 1,
    marginRight: 8,
  },
  vehicleDirection: {
    color: '#8a6cf1',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    backgroundColor: 'rgba(138, 108, 241, 0.1)', 
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
    maxWidth: '60%',
    textAlign: 'right',
  },
  vehicleLocation: {
    marginVertical: 4,
    marginTop: 8,
  },
  locationText: {
    color: '#8a6cf1',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  vehicleCoordinates: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  vehicleInfoContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.2)',
    overflow: 'hidden',
    width: '100%',
  },
  vehicleInfoHeader: {
    backgroundColor: 'rgba(138, 108, 241, 0.1)',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 108, 241, 0.1)',
  },
  vehicleInfoTitle: {
    color: '#8a6cf1',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  lineInfoContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.3)',
    overflow: 'hidden',
    marginVertical: 4,
    width: '100%',
  },
  lineInfoHeader: {
    backgroundColor: 'rgba(138, 108, 241, 0.1)',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 108, 241, 0.2)',
  },
  lineInfoTitle: {
    color: '#8a6cf1',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  lineInfoSection: {
    padding: 4,
  },
  lineInfoRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  lineInfoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 108, 241, 0.1)',
  },
  lineInfoLabel: {
    color: '#8a6cf1',
    fontSize: 14,
    width: 120,
    fontFamily: 'Inter_500Medium',
  },
  lineInfoValue: {
    color: '#e0e0e0',
    fontSize: 14,
    flex: 1,
    fontFamily: 'Inter_400Regular',
  },
  vehicleInfoSection: {
    padding: 12,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  vehicleInfoLabel: {
    color: '#8a6cf1',
    width: 90,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginRight: 8,
  },
  vehicleInfoValue: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  highlight: {
    color: '#8a6cf1',
    fontWeight: '500',
  },
  locationLink: {
    color: '#8a6cf1',
    textDecorationLine: 'underline',
  },
  coordinatesText: {
    color: '#888',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
    fontStyle: 'italic',
  },
  messagesContainer: { 
    flex: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 10 : 0,
  },
  messagesContent: { paddingBottom: 16, flexGrow: 1, justifyContent: 'flex-end' },
  intro: { color: '#ccc', fontFamily: 'Inter_400Regular', textAlign: 'center', marginVertical: 20 },
  messageBubble: { 
    maxWidth: '80%', 
    padding: 12, 
    borderRadius: 12, 
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)',
  },
  wideBubble: { maxWidth: '95%', width: '95%' },
  userBubble: { 
    backgroundColor: '#6a4cff', 
    alignSelf: 'flex-end',
    marginRight: 4,
    borderWidth: 0,
  },
  assistantBubble: { 
    backgroundColor: '#1a1a2e', 
    borderWidth: 1, 
    borderColor: 'rgba(138,108,241,0.3)', 
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  messageText: { fontSize: 16 },
  userText: { color: '#fff', fontFamily: 'Inter_500Medium' },
  assistantText: { color: '#e0e0e0', fontFamily: 'Inter_400Regular' },
  stopListContainer: { marginTop: 8, maxHeight: 200 },
  stopItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  stopDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8a6cf1', marginRight: 8 },
  stopLine: { position: 'absolute', left: 3.5, top: 8, bottom: -12, width: 1, backgroundColor: '#8a6cf1' },
  stopText: { color: '#e0e0e0', fontSize: 14 },
  arrivalListContainer: { marginTop: 8, maxHeight: 300 },
  arrivalStation: { 
    color: '#8a6cf1', 
    fontWeight: '600', 
    fontSize: 15,
    marginBottom: 8,
    fontFamily: 'Inter_600SemiBold',
  },
  arrivalItem: {
    backgroundColor: 'rgba(138, 108, 241, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)', 
    padding: 12,
  },
  arrivalText: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  tableContainer: { borderWidth: 1, borderColor: 'rgba(138,108,241,0.1)', borderRadius: 8, overflow: 'hidden', marginVertical: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(138,108,241,0.1)' },
  tableHeaderCell: { flex: 1, color: '#8a6cf1', fontFamily: 'Inter_500Medium', fontSize: 14 },
  tableCellContainer: { flex: 2 },
  tableCell: { color: '#e0e0e0', fontFamily: 'Inter_400Regular', fontSize: 14 },
  timeSectionsContainer: { width: '100%', marginVertical: 8 },
  timeSection: { backgroundColor: '#1a1a2e', padding: 12, borderRadius: 8, marginVertical: 4 },
  directionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#8a6cf1', marginBottom: 4 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  timeLabel: { fontFamily: 'Inter_500Medium', color: '#ccc', width: 80 },
  timeValue: { flex: 1, fontFamily: 'Inter_400Regular', color: '#e0e0e0', flexWrap: 'wrap' },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a3a',
    paddingBottom: Platform.OS === 'android' ? 20 : 10, 
  },
  input: { flex: 1, color: '#e0e0e0', fontFamily: 'Inter_400Regular', backgroundColor: 'rgba(13,13,26,0.6)', borderRadius: 20, paddingHorizontal: 16 },
  sendButton: { justifyContent: 'center', paddingHorizontal: 16 },
  sendButtonText: { color: '#8a6cf1', fontFamily: 'Inter_600SemiBold' },
  clearSessionButton: {
    backgroundColor: '#e33e3e',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 48,  // increased bottom margin for lower placement
    alignItems: 'center',
  },
  clearSessionText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cellHeader: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#ccc',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cell: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#e0e0e0',
  },
  listItem: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#e0e0e0',
    marginBottom: 4,
  },
  key: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#ccc',
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#e0e0e0',
    flex: 1,
  },
  contentText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#e0e0e0',
  },
});
