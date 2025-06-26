import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import React, { useEffect, useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_BASE = 'https://iett.rednexie.workers.dev';

// Define chat message type
type Message = { sender: 'user' | 'assistant'; text: string; tool?: string; data?: any };

// Add UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function AiScreen() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
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
        let id = await AsyncStorage.getItem('deviceId');
        
        if (!id) {
          // Get device information
            
          // Create a unique string from device info
          // Simple base64 encoding
          id = btoa(unescape(encodeURIComponent(Device.osBuildFingerprint || Math.random().toString(36).substring(2, 25))));
          // Store the ID
          await AsyncStorage.setItem('deviceId', id);
        }
        
        setDeviceId(id);
      } catch (error) {
        console.error('Failed to generate device ID:', error);
      }
    };

    generateDeviceId();
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const newMessages: Message[] = [...messages, { sender: 'user', text }];
    console.log('Conversation ID:', conversationId);
    console.log('Sending message:', newMessages);
    setMessages(newMessages);
    setLoading(true);
    try {
      console.log('Device ID:', deviceId);
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'device-id': deviceId || '' 
        },
        body: JSON.stringify({ conversationId, messages: newMessages }),
      });

      console.log('Request sent to:', `${API_BASE}/api/chat`);
      console.log('Request headers:', {
        'Content-Type': 'application/json',
        'device-id': deviceId || ''
      });
      console.log('Request body:', { conversationId, messages: newMessages });

      const data: any = await res.json();
      console.log('Response received:', data);

      const assistantMessage: Message = { sender: 'assistant', text: data.content, tool: data.tool, data: data.data };
      setMessages([...newMessages, assistantMessage]);
      scrollRef.current?.scrollToEnd({ animated: true });
    } catch (e) {
      console.error(e);
      const assistantMessage: Message = { sender: 'assistant', text: 'Üzgünüm, bir hata oluştu.' };
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
          <View style={styles.stopListContainer}>
            <ScrollView nestedScrollEnabled>
              {m.data.map((station: any, idx: number) => (
                <React.Fragment key={idx}>
                  <Text style={styles.arrivalStation}>{station.station}</Text>
                  {station.arrivals.map((a: any, j: number) => (
                    <View key={j} style={styles.stopItem}>
                      <Text style={styles.stopText}>{`${a.hatkodu} @ ${a.saat} (${a.dakika} dk)`}</Text>
                    </View>
                  ))}
                </React.Fragment>
              ))}
            </ScrollView>
          </View>
        );
      }
      case 'get_vehicle_info': {
        const info: any = m.data;
        const rows: [string, any][] = [
          ['Kapı Kodu', info.KapıKodu],
          ['Plaka', info.plaka],
          ['Model', info.marka || info.arac_modeli],
          ['Hat', info.hat || info.route],
          ['Konum', info.konum || info.location],
          ['Özellikler', info['özellikler'] || info.features],
          ['Kapasite', info.kapasite || info.capacity],
          ['Operatör', info.operator || info.isletmeci],
          ['Hız', info.hiz + ' km/s'],
        ];

        if(info.Garaj) rows.push(['Garaj', info.Garaj]);
        
        return (
          <ScrollView nestedScrollEnabled style={styles.timeSectionsContainer} contentContainerStyle={{ paddingVertical: 8 }}>
            <View style={styles.tableContainer}>
              {rows.map(([label, value], idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={styles.tableHeaderCell}>{decodeEntities(label)}</Text>
                  <View style={styles.tableCellContainer}>
                    {label === 'Konum' && info.tamkonum ? (
                      <TouchableOpacity onPress={() => Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.tamkonum)}`
                      )}>
                        <Text style={[styles.tableCell, { color: '#8a6cf1', textDecorationLine: 'underline' }]}>
                          {decodeEntities(value?.toString() ?? '-')}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.tableCell}>{decodeEntities(value?.toString() ?? '-')}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        );
      }
      default:
        return <Text style={[styles.messageText, styles.assistantText]}>Unsupported tool: {m.tool}</Text>;
    }
  };

  if (!fontsLoaded) return null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
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
          <Text style={styles.assistantText}>Merhaba, ben iettnext AI. İETT bilgilerine erişime sahibim, size istanbul ulaşımında yardımcı olmak için tasarlandım.</Text>
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
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  messagesContainer: { flex: 1, padding: 16 },
  messagesContent: { paddingBottom: 16, flexGrow: 1, justifyContent: 'flex-end' },
  intro: { color: '#ccc', fontFamily: 'Inter_400Regular', textAlign: 'center', marginVertical: 20 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 12, marginVertical: 4 },
  wideBubble: { maxWidth: '95%', width: '95%' },
  userBubble: { backgroundColor: '#6a4cff', alignSelf: 'flex-end' },
  assistantBubble: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: 'rgba(138,108,241,0.3)', alignSelf: 'flex-start' },
  messageText: { fontSize: 16 },
  userText: { color: '#fff', fontFamily: 'Inter_500Medium' },
  assistantText: { color: '#e0e0e0', fontFamily: 'Inter_400Regular' },
  stopListContainer: { maxHeight: 200, width: '100%', marginVertical: 8 },
  stopItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, position: 'relative' },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8a6cf1', position: 'absolute', left: 0, zIndex: 2 },
  stopLine: { position: 'absolute', left: 4, top: 10, bottom: 0, width: 2, backgroundColor: '#8a6cf1', zIndex: 1 },
  stopText: { marginLeft: 16, color: '#fff', fontFamily: 'Inter_500Medium', fontSize: 14, flexShrink: 1 },
  arrivalContainer: { marginVertical: 8 },
  arrivalCard: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: 'rgba(138,108,241,0.1)', borderRadius: 8, padding: 12, marginVertical: 4 },
  arrivalStation: { fontFamily: 'Inter_600SemiBold', color: '#8a6cf1', marginBottom: 6 },
  arrivalText: { fontFamily: 'Inter_400Regular', color: '#e0e0e0', fontSize: 14, marginBottom: 2 },
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
  inputContainer: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: 'rgba(138,108,241,0.2)', backgroundColor: '#1a1a2e' },
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
