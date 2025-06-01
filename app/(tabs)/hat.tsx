import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    // Handle hex entities
    .replace(/&#x([\da-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
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

type DepartureTable = {
  title: string;
  schedule: Record<'I'|'C'|'P', string[]>;
};

// const API_BASE = 'http://192.168.1.4:3000'
const API_BASE = 'https://iett.deno.dev'
const { width } = Dimensions.get('window');

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
  const [modalVisible, setModalVisible] = useState(false);
  const [direction, setDirection] = useState(0);
  const [activeTab, setActiveTab] = useState<'times'|'stations'>('times');

  // Dynamic font size for line name
  const lineNameText = selected ? decodeHTMLEntities(selected.name) : '';
  const lineNameFontSize = lineNameText.length > 20 ? 14 : 16;

  // Parse station anchor HTML into text entries
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

  // Load stations for lineCode and direction
  const loadStations = async (lineCode: string, dir: number) => {
    try {
      const url = `${API_BASE}/api/route-stations?hatkod=${lineCode}&hatstart=x&hatend=y&langid=1`;
      const res = await fetch(url);
      const text = await res.text();
      const allLinks = parseAnchors(text);
      const restartIdx = allLinks.findIndex((s, i) => i > 0 && /^\s*1\./.test(s));
      const splitIndex = restartIdx !== -1 ? restartIdx : Math.ceil(allLinks.length / 2);
      const forwardLinks = allLinks.slice(0, splitIndex);
      const backwardLinks = allLinks.slice(splitIndex);
      setStations(dir === 0 ? forwardLinks : backwardLinks);
    } catch (e) {
      console.error('Error loading stations:', e);
      setStations([]);
    }
  };

  // Reload stations when selected line or direction changes
  useEffect(() => {
    if (selected) loadStations(selected.line, direction);
  }, [selected, direction]);

  // Debounce and cancel previous fetches for suggestions
  const debounceTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = React.useRef<AbortController | null>(null);

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
          const filtered = data.filter((item: LineItem) => !item?.line?.trim().startsWith('<'));
          setSuggestions(filtered);
          setSelectedIndex(-1);
        })
        .catch((e) => {
          if (e.name !== 'AbortError') setSuggestions([]);
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

  // Parse HTML departure tables by matching each <table class="line-table">
  const parseLineTimeTable = (html: string): DepartureTable[] => {
    const tables: DepartureTable[] = [];
    const tableRe = /<table class="line-table">([\s\S]*?)<\/table>/g;
    let m;
    while ((m = tableRe.exec(html))) {
      const tblHtml = m[1];
      const titleMatch = tblHtml.match(/<th class="routedetailstartend"[^>]*>([\s\S]*?)<\/th>/);
      const title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : '';
      const sched: Record<'I'|'C'|'P', string[]> = { I: [], C: [], P: [] };
      const tbodyMatch = tblHtml.match(/<tbody>([\s\S]*?)<\/tbody>/);
      if (tbodyMatch) {
        const rows = tbodyMatch[1].match(/<tr>([\s\S]*?)<\/tr>/g) || [];
        rows.forEach(r => {
          const cells = Array.from(r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g), x => decodeHTMLEntities(x[1].trim()));
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

  const selectLine = (item: LineItem) => {
    setSelected(item);
    setQuery(item.line);
    setSuggestions([]);
    fetchDetails(item);
  };

  const fetchDetails = async (item: LineItem) => {
    setLoading(true);
    try {
      const [htmlRes, anRes] = await Promise.all([
        fetch(`${API_BASE}/line-time-table`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line: item.line }),
        }),
        fetch(`${API_BASE}/announcements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line: item.line }),
        }),
      ]);
      const html = await htmlRes.text();
      setTimetable(parseLineTimeTable(html));
      setAnnouncements(await anRes.json());
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
    setAnnouncements([]);
  };

  const handleSubmitEditing = () => {
    if (query.trim()) {
      selectLine({ line: query.trim().toUpperCase(), name: query.trim().toUpperCase() });
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
                  <Text style={[styles.tabItemText, activeTab === 'times' && styles.activeTabItem]}>Sefer Saatleri</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'stations' && styles.tabItemActive]}
                  onPress={() => setActiveTab('stations')}
                >
                  <Text style={[styles.tabItemText, activeTab === 'stations' && styles.activeTabItem]}>Duraklar</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.resultHeader}>
                <View style={styles.lineInfoContainer}>
                  <Text style={styles.lineCodeLarge}>{selected.line}</Text>
                  <Text style={[styles.lineNameLarge, { fontSize: lineNameFontSize }]}>{lineNameText}</Text>
                </View>
              </View>
              {announcements.length > 0 && (
                <TouchableOpacity 
                  style={styles.announcementButton} 
                  onPress={() => setModalVisible(true)}
                >
                  <Ionicons name="megaphone-outline" size={20} color="#fff" />
                  <Text style={styles.announcementButtonText}>Hat Duyuruları</Text>
                </TouchableOpacity>
              )}
              {activeTab === 'times' ? (
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
                          <Text style={[styles.tableCell, { flex: 1 }]}>{timetable[direction].schedule.I[idx]}</Text>
                          <Text style={[styles.tableCell, { flex: 1 }]}>{timetable[direction].schedule.C[idx]}</Text>
                          <Text style={[styles.tableCell, { flex: 1 }]}>{timetable[direction].schedule.P[idx]}</Text>
                        </View>
                      ))}
                    </>
                  ) : (
                    <Text style={styles.noDataText}>Bu hat için sefer saatleri bulunmamaktadır.</Text>
                  )}
                </View>
              ) : (
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
                        <Text style={styles.stationName}>{decodeHTMLEntities(station)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      )}
      
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
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
              {announcements.length > 0 ? (
                announcements.map((announcement, index) => {
                  // Determine the severity level for styling
                  const level = announcement.level || announcement.severity || '1';
                  
                  // Process content - split by '|' for multi-line display like in web version
                  let contentLines = [];
                  const content = decodeHTMLEntities(announcement.content || announcement.BILGI || 'İçerik belirtilmemiş');
                  
                  if (content.includes('|')) {
                    contentLines = content.split('|').map(line => line.trim());
                  } else if (content.length > 120) {
                    // Split by sentences if content is long
                    contentLines = content.split(/(?<=[.!?])\s+/).filter(line => line.trim().length > 0);
                  } else {
                    contentLines = [content];
                  }
                  
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.announcementItem,
                        level === '3' && styles.announcementItemCritical,
                        level === '2' && styles.announcementItemWarning
                      ]}
                    >
                      <Text style={styles.announcementDate}>
                          {(announcement.date || announcement.VERI_SAATI) ? 
                          announcement.date || announcement.VERI_SAATI : 
                          'Tarih belirtilmemiş'}
                      </Text>
                      {contentLines.map((line, lineIndex) => (
                        <Text key={lineIndex} style={styles.announcementText}>
                          {line}
                        </Text>
                      ))}
                    </View>
                  );
                })
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
  },
  lineInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineCodeLarge: {
    backgroundColor: 'rgba(138, 108, 241, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    color: '#8a6cf1',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    marginRight: 12,
  },
  lineNameLarge: {
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
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
  announcementButton: {
    backgroundColor: 'rgba(138, 108, 241, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 108, 241, 0.3)',
  },
  announcementButtonText: {
    color: '#ffffff',
    fontFamily: 'Inter_500Medium',
    marginLeft: 8,
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
    color: '#a0a0a0',
    fontWeight: 'bold',
  },
  announcementList: {
    padding: 16,
  },
  announcementItem: {
    backgroundColor: 'rgba(138, 108, 241, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8a6cf1',
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
    fontSize: 16,
    color: '#a0a0a0',
  },
  activeTabItem: {
    color: '#ffffff',
  },
  directionSwitch: {
    marginHorizontal: 8,
  },
});
