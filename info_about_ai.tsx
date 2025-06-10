import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type AIResponse = {
  content: string;
  tool?: string;
  data?: any;
};

interface ToolDisplayProps {
  response: AIResponse;
}

const ToolDisplay: React.FC<ToolDisplayProps> = ({ response }) => {
  const { content, tool, data } = response;
  if (!tool || !data) {
    return <Text style={styles.contentText}>{content}</Text>;
  }
  switch (tool) {
    case 'get_time_table':
      return (
        <View>
          {data.map((section: any, idx: number) => (
            <View key={idx} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.direction}</Text>
              <View style={styles.rowHeader}>
                <Text style={styles.cellHeader}>Weekdays</Text>
                <Text style={styles.cellHeader}>Saturday</Text>
                <Text style={styles.cellHeader}>Sunday</Text>
              </View>
              {section.times.map((t: any, i: number) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.cell}>{t.weekdays}</Text>
                  <Text style={styles.cell}>{t.saturday}</Text>
                  <Text style={styles.cell}>{t.sunday}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    case 'get_stops':
      return (
        <View style={styles.section}>
          {data.map((stop: string, idx: number) => (
            <Text key={idx} style={styles.listItem}>{stop}</Text>
          ))}
        </View>
      );
    case 'get_arrivals':
      return (
        <View>
          {data.map((station: any, idx: number) => (
            <View key={idx} style={styles.section}>
              <Text style={styles.sectionTitle}>{station.station}</Text>
              {station.arrivals.map((a: any, i: number) => (
                <Text key={i} style={styles.listItem}>
                  {a.hatkodu}: {a.saat} ({a.dakika} dakika sonra)
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    case 'get_vehicle_info':
      return (
        <View style={styles.section}>
          {Object.entries(data).map(([key, value]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.key}>{key}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>
      );
    default:
      return <Text style={styles.contentText}>Unsupported tool: {tool}</Text>;
  }
};

const styles = StyleSheet.create({
  contentText: {
    color: '#fff',
    fontSize: 16,
    marginVertical: 4,
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    color: '#00aced',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cellHeader: {
    flex: 1,
    color: '#ccc',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  cell: {
    flex: 1,
    color: '#fff',
  },
  listItem: {
    color: '#fff',
    fontSize: 16,
    marginVertical: 2,
  },
  key: {
    flex: 1,
    color: '#ccc',
    fontWeight: '600',
  },
  value: {
    flex: 1,
    color: '#fff',
  },
});

export default ToolDisplay;
