import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
const CACHE_KEY = 'ol';
const CACHE_TIMESTAMP_KEY = 'olt';
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
  const inputRef = useRef<TextInput>(null); // Ref for the TextInput

  useEffect(() => {
    loadLines();
  }, []);

  useEffect(() => {
    if (searchQuery.length === 0) {
      setFilteredLines([]);
      return;
    }
    const lower = searchQuery.toLowerCase();
    const currentFiltered = lines.filter((line) =>
      line.name.toLowerCase().includes(lower)
    );
    setFilteredLines(currentFiltered);
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
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      if (json?.data) {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(json.data));
        await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
        setLines(json.data);
      }
    } catch (err) {
      console.error('Failed to load old lines:', err);
      // Optionally, set an error state to display to the user
    }
  };

  const handleSelect = (line: OldLine) => {
    setSelectedLine(line);
    setSearchQuery(line.name);
    setFilteredLines([]);
    Keyboard.dismiss();
  };

  if (!fontsLoaded) {
    return null; // Or a loading indicator
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.contentWrapper}>
            <View style={styles.searchContainer}>
              <Text style={styles.header}>Eski Hat Sorgulama</Text>
              {!selectedLine ? (
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholder="Hat kodu veya adı girin..."
                    placeholderTextColor="#aaa"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                    returnKeyType="search"
                    onSubmitEditing={() => {
                      const lowerQuery = searchQuery.trim().toLowerCase();
                      const exact = lines.find((line) => line.name.toLowerCase() === lowerQuery);
                      if (exact) {
                        handleSelect(exact);
                      } else if (filteredLines.length > 0) {
                        handleSelect(filteredLines[0]);
                      }
                    }}
                  />
                  {filteredLines.length > 0 && (
                    <View style={styles.suggestionBox}>
                      {/* This ScrollView acts like a simple View now, allowing content to push height */}
                      <ScrollView
                        style={styles.suggestionScroll} // No maxHeight applied here
                        keyboardShouldPersistTaps="always"
                        showsVerticalScrollIndicator={true} // Still show scrollbar if this specific list grows large and the main page isn't scrolled
                      >
                        {filteredLines.map((line, index) => (
                          <TouchableOpacity
                            key={`${line.name}-${index}`}
                            onPress={() => handleSelect(line)}
                            style={styles.suggestionItem}
                          >
                            <Text style={styles.suggestionText} numberOfLines={1} ellipsizeMode="tail">
                              {line.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.resultBox}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultHeaderText}>{selectedLine.name}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedLine(null);
                        setSearchQuery('');
                      }}
                      style={styles.closeBtn}
                    >
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
                      {selectedLine.stop.map((stop, index) => (
                        <View key={index} style={styles.stopItem}>
                          <View style={styles.stopDot} />
                          <Text style={styles.stopText}>{stop}</Text>
                          {index < selectedLine.stop.length - 1 && (
                            <View style={styles.stopLine} />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                  {selectedLine.alt && selectedLine.alt.length > 0 && (
                    <View style={styles.altRow}>
                      <Text style={styles.resultLabel}>Alternatifler:</Text>
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
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  scrollViewContent: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 16,
    paddingBottom: 32,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingBottom: 40,
    justifyContent: 'flex-start',
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
  header: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: '#8a6cf1',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    position: 'relative',
    zIndex: 1,
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
    marginBottom: 10,
  },
  suggestionBox: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderColor: 'rgba(138, 108, 241, 0.1)',
    borderWidth: 1,
    borderRadius: 12,
    zIndex: 1000,
    overflow: 'hidden', 
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionScroll: {
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 108, 241, 0.08)',
  },
  suggestionText: {
    color: '#e0e0e0',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  resultBox: {
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
    width: '92%',
    maxWidth: 600,
    alignSelf: 'center',
    marginTop: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8a6cf1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginBottom: 10,
  },
  resultHeaderText: {
    color: '#e0e0e0',
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
    backgroundColor: 'rgba(138,108,241,0.2)',
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
  descBox: {
    backgroundColor: '#1a1a2e',
    borderColor: 'rgba(138,108,241,0.1)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 14,
    marginBottom: 16,
    marginTop: 8,
    alignSelf: 'stretch',
  },
  descText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#e0e0e0',
    textAlign: 'center',
  },
  resultSection: {
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  resultLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#8a6cf1',
    marginBottom: 8,
  },
  resultInfo: {
    fontSize: 15,
    color: '#e0e0e0',
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 14,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
  },
  altPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  altPill: {
    backgroundColor: '#8a6cf1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  altPillText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  stopListContainer: {
    marginTop: 12,
    paddingVertical: 10,
    paddingLeft: 20, 
    width: '100%',
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.1)',
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, 
    position: 'relative', 
    width: '100%', 
  },
  stopDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#8a6cf1',
    borderWidth: 2,
    borderColor: '#fff',
    position: 'absolute',
    left: -7, 
    top: '50%',
    marginTop: -7, 
    zIndex: 2,
  },
  stopText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginLeft: 15, 
    flexShrink: 1, 
  },
  stopLine: {
    width: 2,
    height: '100%', 
    backgroundColor: '#8a6cf1',
    position: 'absolute',
    left: 0, 
    zIndex: 1, 
    opacity: 0.7,
  },
}); 