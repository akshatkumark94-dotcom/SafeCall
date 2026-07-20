import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Linking } from 'react-native';
import { useScamStore } from '../store/useScamStore';

export default function EvidenceScreen({ BACKEND_URL }) {
  const reports = useScamStore((state) => state.reports);
  const isLoading = useScamStore((state) => state.isLoading);
  const [expandedId, setExpandedId] = useState(null);

  const getThreatColor = (score) => {
    if (score > 75) return '#ef4444'; // Red
    if (score > 40) return '#f97316'; // Orange
    if (score > 15) return '#3b82f6'; // Blue
    return '#10b981'; // Green
  };

  const handleExportPDF = (id) => {
    const pdfUrl = `${BACKEND_URL}/api/reports/${id}/pdf`;
    Linking.openURL(pdfUrl).catch((err) =>
      console.error('Failed to open PDF download url:', err)
    );
  };

  const renderReportItem = ({ item }) => {
    const isExpanded = expandedId === item._id;
    const dateStr = new Date(item.createdAt).toLocaleString();
    const threatColor = getThreatColor(item.threatScore);

    return (
      <View style={styles.card}>
        {/* Main row */}
        <TouchableOpacity 
          style={styles.cardHeader} 
          onPress={() => setExpandedId(isExpanded ? null : item._id)}
        >
          <View style={styles.headerInfo}>
            <Text style={styles.callerName}>{item.callerName}</Text>
            <Text style={styles.callerNumber}>{item.callerNumber}</Text>
            <Text style={styles.cardDate}>{dateStr}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${threatColor}1a`, borderColor: threatColor }]}>
            <Text style={[styles.badgeText, { color: threatColor }]}>{item.threatScore}%</Text>
          </View>
        </TouchableOpacity>

        {/* Expanded details */}
        {isExpanded && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Dossier Analysis Summary</Text>
            <Text style={styles.detailField}>
              <Text style={styles.bold}>Scam Category:</Text> {item.scamCategory}
            </Text>
            <Text style={styles.detailField}>
              <Text style={styles.bold}>Key Indicators:</Text>{' '}
              {item.scamIndicators && item.scamIndicators.length > 0
                ? item.scamIndicators.join(', ')
                : 'None detected'}
            </Text>

            {/* In-app transcript preview */}
            <Text style={styles.transcriptPreviewTitle}>Transcript Record:</Text>
            <View style={styles.transcriptBox}>
              {item.transcript && item.transcript.map((line, idx) => (
                <Text key={idx} style={styles.transcriptLine}>
                  <Text style={line.isSuspicious ? styles.redSpeaker : styles.graySpeaker}>
                    {line.speaker}:
                  </Text>{' '}
                  <Text style={line.isSuspicious ? styles.redText : styles.whiteText}>
                    {line.text}
                  </Text>
                </Text>
              ))}
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.pdfButton}
                onPress={() => handleExportPDF(item._id)}
              >
                <Text style={styles.pdfButtonText}>📄 Export Official PDF Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Evidence Archive</Text>
        <Text style={styles.subtitle}>AI-generated court-ready logs</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading dossiers...</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Archive is Empty</Text>
          <Text style={styles.emptyText}>
            No scam cases recorded. Use the Call Simulator on the Dashboard to test and log scam calls.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item._id}
          renderItem={renderReportItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerInfo: {
    flex: 1,
  },
  callerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  callerNumber: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  cardDate: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 4,
  },
  badge: {
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '900',
  },
  detailsContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    backgroundColor: '#0f172a60',
  },
  detailsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#3b82f6',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  detailField: {
    fontSize: 12,
    color: '#e2e8f0',
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  transcriptPreviewTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginTop: 12,
    marginBottom: 6,
  },
  transcriptBox: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    maxHeight: 150,
  },
  transcriptLine: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  graySpeaker: {
    color: '#64748b',
    fontWeight: 'bold',
  },
  redSpeaker: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  whiteText: {
    color: '#e2e8f0',
  },
  redText: {
    color: '#fca5a5',
  },
  actionRow: {
    marginTop: 14,
    flexDirection: 'row',
  },
  pdfButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  pdfButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
