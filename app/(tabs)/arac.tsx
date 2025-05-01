import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import React, { useState } from 'react';
import { Keyboard, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AracScreen() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  function isVehicleDoorCode(value: string) {
    const regex = /^[a-zA-Z]-?\d{1,4}$/;
    return regex.test(value);
  }

  function isNumberPlate(value: string) {
    return /^34/.test(value) && value.length > 5 && value.length < 9;
  }

  async function sendQuery() {
    setError('');
    setResult(null);
    let queryInput = query.trim();
    let queryType: string;

    if (isVehicleDoorCode(queryInput)) {
      queryType = 'KapıKodu';
      queryInput = queryInput.toUpperCase();
    } else if (isNumberPlate(queryInput)) {
      queryType = 'plaka';
    } else {
      setError('Geçersiz giriş formatı. Lütfen geçerli bir plaka veya kapı kodu girin.');
      return;
    }

    const postBody: any = {};
    postBody[queryType] = queryInput;
    setLoading(true);
    try {
      // TODO: Update API URL with your LAN IP
      const response = await fetch('https://iett.deno.dev/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postBody),
      });
      if (!response.ok) throw new Error('API hatası');
      const data = await response.json();
      setResult(data);
    } catch (e) {
      setError('Sunucuya erişilemiyor veya hata oluştu.');
    } finally {
      setLoading(false);
      Keyboard.dismiss();
    }
  }

  function renderResults() {
    if (!result) {
      return null;
    }
    const fields = ['KapıKodu/plaka', 'hat', 'marka', 'kapasite', 'özellikler', 'konum', 'yer', 'konumSaati'];
    if (result['Garaj']) fields.splice(1, 0, 'Garaj');
    return (
      <View style={styles.resultTable}>
        {fields.map((field) => {
          let value: any = null;
          if (field === 'KapıKodu/plaka') {
            value = `${result['KapıKodu'] || 'null'} / ${result['plaka'] || 'null'}`;
          } else if (field === 'konum') {
            if (!result['tamkonum'] || !result['tamkonum'].includes(' ')) {
              value = 'null';
            } else {
              const [lat, lon] = result['tamkonum'].split(' ');
              value = (
                <Text
                  style={styles.tamkonumLink}
                  onPress={() => Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`)}
                >
                  {result['konum'] && result['konum'].startsWith(', ')
                    ? result['konum'].replace(', ', '')
                    : result['konum']}
                </Text>
              );
            }
          } else {
            value = result[field] || 'null';
          }
          return (
            <View key={field} style={styles.resultRow}>
              <Text style={styles.resultTh}>{field}</Text>
              <Text style={styles.resultTd}>{value}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0d0d1a' }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={styles.squareContainer}>
        <Text style={styles.header}>Araç Sorgulama</Text>
        <TextInput
          style={styles.inputBox}
          placeholder="Plaka ya da Kapı Kodu girin"
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={sendQuery}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.button} onPress={sendQuery} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Sorgulanıyor...' : 'Ara'}</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={{ marginTop: 20, width: '100%' }}>
          {renderResults()}
        </View>
      </View>
    </ScrollView>
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
    maxWidth: 500,
    marginTop: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  header: {
    fontSize: 26,
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
    padding: 16,
    fontSize: 18,
    width: '100%',
    marginBottom: 16,
    fontFamily: 'Inter_400Regular',
  },
  button: {
    backgroundColor: '#6a4cff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
    shadowColor: '#6a4cff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Inter_500Medium',
    fontSize: 17,
  },
  errorText: {
    color: '#ff6b81',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    fontFamily: 'Inter_500Medium',
  },
  resultTable: {
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)',
    width: '100%',
    marginTop: 8,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 108, 241, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  resultTh: {
    flex: 1.3,
    fontWeight: '500',
    color: '#8a6cf1',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  resultTd: {
    flex: 2,
    color: '#e0e0e0',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  tamkonumLink: {
    color: '#8a6cf1',
    textDecorationLine: 'underline',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
});
