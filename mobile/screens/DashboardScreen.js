import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useScamStore } from '../store/useScamStore';
import CallSimulator from '../components/CallSimulator';

export default function DashboardScreen({ socketActions, navigation, BACKEND_URL }) {
  const isCallActive = useScamStore((state) => state.isCallActive);
  const reports = useScamStore((state) => state.reports);
  const stats = useScamStore((state) => state.stats);
  const fetchReports = useScamStore((state) => state.fetchReports);
  const fetchStats = useScamStore((state) => state.fetchStats);

  useEffect(() => {
    fetchReports(BACKEND_URL);
    fetchStats(BACKEND_URL);
  }, []);

  const totalPrevented = reports.filter(r => r.threatScore > 40).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>SafeCall</Text>
        <Text style={styles.tagline}>Real-Time Anti-Fraud Shield</Text>
      </View>

      {/* Pulse Shield Status */}
      <View style={styles.shieldCard}>
        <View style={styles.pulseContainer}>
          <View style={[styles.pulseCircle, isCallActive ? styles.pulseActiveColor : styles.pulseIdleColor]} />
        </View>
        <Text style={styles.shieldStatus}>
          {isCallActive ? 'CALL SCANNER RUNNING' : 'SHIELD ACTIVE & MONITORING'}
        </Text>
        <Text style={styles.shieldDesc}>
          {isCallActive 
            ? 'Analyzing live interaction for Digital Arrest patterns...' 
            : 'SafeCall is silently waiting for incoming call activations.'}
        </Text>
      </View>

      {/* Stats Counter Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{totalPrevented}</Text>
          <Text style={styles.statLabel}>Scams Stopped</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.totalReports || 0}</Text>
          <Text style={styles.statLabel}>Registry Size</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{reports.length}</Text>
          <Text style={styles.statLabel}>Total Calls</Text>
        </View>
      </View>

      {/* Navigation Shortcut to Live Scanner if call is active */}
      {isCallActive && (
        <TouchableOpacity 
          style={styles.scannerLink} 
          onPress={() => navigation('scanner')}
        >
          <Text style={styles.scannerLinkText}>👁 View Live Scanner Dashboard →</Text>
        </TouchableOpacity>
      )}

      {/* Embedded Simulation Panel */}
      <CallSimulator socketActions={socketActions} />

      {/* Safety Notice */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>💡 Cybersecurity Shield Rule</Text>
        <Text style={styles.tipText}>
          CBI, Police, or Tax authorities will never threaten you with "Digital Arrest" via WhatsApp, Skype, or phone. Hang up immediately if secrecy is demanded.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 25,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  shieldCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  pulseContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  pulseCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  pulseIdleColor: {
    backgroundColor: '#10b981', // green
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  pulseActiveColor: {
    backgroundColor: '#ef4444', // red
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  shieldStatus: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
    marginTop: 10,
  },
  shieldDesc: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 14,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  scannerLink: {
    backgroundColor: '#ef444415',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  scannerLinkText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tipCard: {
    backgroundColor: '#1e293b80',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#33415580',
    padding: 14,
    width: '100%',
    marginTop: 10,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
});
