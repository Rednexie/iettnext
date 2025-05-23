import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface OldLine {
  name: string;
  desc?: string;
  stop: string[];
  alt?: string[];
  freq?: string;
}

const API_URL = 'https://iett.deno.dev/api/oldlines';
const CACHE_KEY = 'oldlines_data';
const CACHE_TIMESTAMP_KEY = 'oldlines_timestamp';
const CACHE_VALIDITY_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function EskiHatlarScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [lines, setLines] = useState<OldLine[]>([]);
  const [filteredLines, setFilteredLines] = useState<OldLine[]>([]);
  const [selectedLine, setSelectedLine] = useState<OldLine | null>(null);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadLines();
  }, []);

  useEffect(() => {
    if (searchQuery.length === 0) {
      setFilteredLines([]);
      return;
    }
    const lower = searchQuery.toLowerCase();
    setFilteredLines(
      lines.filter((line) => line.name.toLowerCase().includes(lower)).slice(0, 5)
    );
  }, [searchQuery, lines]);

  const loadLines = async () => {
    try {
      const lastFetch = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      const now = Date.now();

      if (lastFetch && now - parseInt(lastFetch, 10) < CACHE_VALIDITY_MS) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          setLines(JSON.parse(cached));
          return;
        }
      }

      const res = await fetch(API_URL);
      const json = await res.json();
      if (json?.data) {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(json.data));
        await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
        setLines(json.data);
      }
    } catch (err) {
      console.error('Failed to load old lines:', err);
    }
  };

  const handleSelect = (line: OldLine) => {
    setSelectedLine(line);
    setSearchQuery(line.name);
    setFilteredLines([]);
    Keyboard.dismiss();
  };

  if (!fontsLoaded) return null;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView
        style={{ flex: 1, backgroundColor: '#0d0d1a' }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.squareContainer}>
          <Text style={styles.header}>Eski Hatlar Arama</Text>
          {!selectedLine && (
            <View style={{ width: '100%', position: 'relative' }}>
              <TextInput
                style={styles.inputBox}
                placeholder="Hat kodu veya adı girin..."
                placeholderTextColor="#aaa"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => {
                  // Try exact match first
                  const exact = lines.find(line => line.name.toLowerCase() === searchQuery.trim().toLowerCase());
                  if (exact) {
                    handleSelect(exact);
                  } else if (filteredLines.length > 0) {
                    handleSelect(filteredLines[0]);
                  }
                }}
              />
              {filteredLines.length > 0 && (
                <View style={styles.suggestionBox}>
                  {filteredLines.length > 5 ? (
                    <ScrollView
                      style={styles.suggestionScroll}
                      horizontal={true}
                      showsHorizontalScrollIndicator={true}
                      contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}
                    >
                      {filteredLines.map((line) => (
                        <TouchableOpacity
                          key={line.name}
                          onPress={() => handleSelect(line)}
                          style={[styles.suggestionItem, { minWidth: 120, alignItems: 'center', marginRight: 8 }]}
                        >
                          <Text style={styles.suggestionText} numberOfLines={1} ellipsizeMode="tail">{line.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <ScrollView style={styles.suggestionScroll}>
                      {filteredLines.map((line) => (
                        <TouchableOpacity
                          key={line.name}
                          onPress={() => handleSelect(line)}
                          style={styles.suggestionItem}
                        >
                          <Text style={styles.suggestionText}>{line.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          )}

          {selectedLine && (
            <View style={styles.resultBox}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultHeaderText}>{selectedLine.name}</Text>
                <TouchableOpacity onPress={() => { setSelectedLine(null); setSearchQuery(''); }} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>×</Text>
                </TouchableOpacity>
              </View>
              {selectedLine.desc && (
                <View style={styles.descBox}>
                  <Text style={styles.descText}>{selectedLine.desc}</Text>
                </View>
              )}
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>Duraklar:</Text>
                <View style={styles.stopListContainer}>
                  <ScrollView
                    style={[styles.stopListScroll, { height: 120 }]} // extra height for scrollbar
                    contentContainerStyle={{ flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 16, paddingHorizontal: 8 }}
                    horizontal={true}
                    showsHorizontalScrollIndicator={true}
                  >
                    {selectedLine.stop.map((stop, index) => (
                      <TouchableOpacity key={index} style={styles.metroStopHorizontal} activeOpacity={0.7}>
                        <View style={styles.stopDotHorizontal} />
                        <Text
                          style={stop.length > 14 ? [styles.stopTextHorizontal, styles.stopTextHorizontalSmall] : styles.stopTextHorizontal}
                          numberOfLines={2}
                        >
                          {stop}
                        </Text>
                        {index < selectedLine.stop.length - 1 && (
                          <View style={styles.metroLineHorizontal} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              {selectedLine.alt && selectedLine.alt.length > 0 && (
                <View style={styles.altRow}>
                  <Text style={styles.resultLabel}>Alternatif:</Text>
                  <View style={styles.altPillRow}>
                    {selectedLine.alt.map((alt, i) => (
                      <View key={i} style={styles.altPill}>
                        <Text style={styles.altPillText}>{alt}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )} 
              {selectedLine.freq && (
                <Text style={styles.resultInfo}>
                  <Text style={styles.resultLabel}>Sıklık:</Text> {selectedLine.freq}
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
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
    fontFamily: 'Inter_400Regular',
  },
  suggestionBox: {
    position: 'absolute',
    top: 64,
    width: '100%',
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderColor: 'rgba(138, 108, 241, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 10,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionScroll: {
    maxHeight: 200,
    width: '100%',
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  suggestionText: {
    color: '#e0e0e0',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  resultBox: {
    marginTop: 32,
    width: '100%',
    backgroundColor: '#19193a',
    borderColor: 'rgba(138, 108, 241, 0.25)',
    borderWidth: 2,
    borderRadius: 18,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8a6cf1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  resultHeaderText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  closeBtn: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(26,26,46,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 30,
    marginTop: -2,
  },
  resultTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#8a6cf1',
    marginBottom: 8,
  },
  descBox: {
    backgroundColor: 'rgba(138,108,241,0.09)',
    borderColor: '#8a6cf1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    marginTop: 8,
    alignSelf: 'stretch',
  },
  descText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#b6b0e7',
    textAlign: 'center',
  },
  resultDesc: {
    display: 'none', // legacy style, now hidden
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  altPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 8,
  },
  altPill: {
    backgroundColor: '#8a6cf1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  altPillText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  resultSection: {
    marginBottom: 12,
  },
  resultLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#8a6cf1',
  },
  resultInfo: {
    fontSize: 15,
    color: '#e0e0e0',
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  stopListContainer: {
    marginTop: 12,
    paddingLeft: 0,
    paddingRight: 0,
    position: 'relative',
    height: 110,
    maxHeight: 110,
    width: '100%',
    backgroundColor: 'rgba(26, 26, 46, 0.7)',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopListScroll: {
    flexGrow: 0,
    height: 110,
    maxHeight: 110,
    width: '100%',
    paddingLeft: 0,
    paddingRight: 0,
  },
  metroStopHorizontal: {
    alignItems: 'center',
    flexDirection: 'column',
    marginHorizontal: 16,
    position: 'relative',
  },
  stopDotHorizontal: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8a6cf1',
    borderWidth: 2,
    borderColor: '#fff',
    marginBottom: 6,
    zIndex: 2,
  },
  stopTextHorizontal: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
    textAlign: 'center',
    maxWidth: 90,
    minWidth: 90,
    width: 90,
    overflow: 'hidden',
  },
  stopTextHorizontalSmall: {
    fontSize: 11,
    lineHeight: 13,
    fontFamily: 'Inter_400Regular',
  },
  metroLineHorizontal: {
    width: 40,
    height: 3,
    backgroundColor: '#8a6cf1',
    position: 'absolute',
    top: 8,
    left: '100%',
    zIndex: 1,
    opacity: 0.7,
  },
});
