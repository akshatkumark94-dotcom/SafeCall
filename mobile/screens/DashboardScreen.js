import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useScamStore } from '../store/useScamStore';
import CallSimulator from '../components/CallSimulator';

export default function DashboardScreen({ socketActions, navigation, BACKEND_URL, setBackendUrl, isConnected }) {
  const isCallActive = useScamStore((state) => state.isCallActive);
  const reports = useScamStore((state) => state.reports);
  const stats = useScamStore((state) => state.stats);
  const fetchReports = useScamStore((state) => state.fetchReports);
  const fetchStats = useScamStore((state) => state.fetchStats);
  const startCall = useScamStore((state) => state.startCall);

  const [manualNumber, setManualNumber] = useState('+91 90000 01930');
  const [manualName, setManualName] = useState('Suspected Officer');
  const [tempUrl, setTempUrl] = useState(BACKEND_URL);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchReports(BACKEND_URL);
    fetchStats(BACKEND_URL);
  }, [BACKEND_URL]);

  const handleManualCallStart = () => {
    const num = manualNumber.trim() || '+91 90000 01930';
    const name = manualName.trim() || 'Suspected Officer';
    startCall(num, name);
    socketActions.startCall(num, name);
    navigation('scanner');
  };

  const handlePickAndUploadAudio = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true
      });

      console.log('[DocumentPicker] Selected document:', res);

      if (res.canceled || !res.assets || res.assets.length === 0) {
        console.log('[DocumentPicker] Cancelled picking');
        return;
      }

      const file = res.assets[0];
      const uri = file.uri;
      setIsUploading(true);

      console.log('[DocumentPicker] Reading file as base64...');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      const sessId = 'sess_uploaded_' + Math.random().toString(36).substring(2, 11);

      console.log('[DocumentPicker] Sending audio for threat assessment...');
      const response = await fetch(`${BACKEND_URL}/api/reports/analyze-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType: file.mimeType || 'audio/mp4',
          callerNumber: manualNumber || 'Unknown Number',
          callerName: manualName || 'Uploaded Audio Call',
          sessionId: sessId
        })
      });

      const result = await response.json();
      console.log('[DocumentPicker] Response:', result);

      setIsUploading(false);

      if (result.success) {
        // Trigger report list reload
        fetchReports(BACKEND_URL);
        alert('Call recording processed successfully! Open the Evidence tab to view your PDF report.');
        
        // Auto-navigate to Evidence Tab
        navigation('evidence');
      } else {
        alert('Analysis failed: ' + (result.error || result.message || 'Unknown error'));
      }

    } catch (err) {
      console.error('[DocumentPicker] Error during pick & upload:', err);
      alert('Error uploading call recording: ' + err.message);
      setIsUploading(false);
    }
  };

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
        
        {isCallActive ? (
          <Text style={styles.shieldDesc}>
            Analyzing live interaction for Digital Arrest patterns...
          </Text>
        ) : (
          <View style={styles.manualDialerContainer}>
            <Text style={styles.manualDialerTitle}>📞 Suspect a Scam? Activate Shield</Text>
            <View style={styles.manualInputGroup}>
              <TextInput
                style={styles.manualInput}
                placeholder="Caller Phone Number"
                placeholderTextColor="#64748b"
                value={manualNumber}
                onChangeText={setManualNumber}
              />
              <TextInput
                style={styles.manualInput}
                placeholder="Caller Identity / Name"
                placeholderTextColor="#64748b"
                value={manualName}
                onChangeText={setManualName}
              />
            </View>
            <TouchableOpacity 
              style={styles.manualButton} 
              onPress={handleManualCallStart}
            >
              <Text style={styles.manualButtonText}>🔴 ACTIVATE SHIELD NOW</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Upload Call Recording Card */}
      {!isCallActive && (
        <View style={styles.uploadCard}>
          <Text style={styles.uploadTitle}>📤 Upload Call Recording</Text>
          <Text style={styles.uploadDesc}>
            Suspect a call you already recorded? Select the audio file to analyze it for threat patterns and generate a digital dossier.
          </Text>
          
          {isUploading ? (
            <View style={styles.uploadLoadingRow}>
              <Text style={styles.uploadLoadingText}>⏳ Analyzing audio via SafeCall AI...</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBtn} onPress={handlePickAndUploadAudio}>
              <Text style={styles.uploadBtnText}>📁 Select Call Recording File</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Connection Settings Box */}
      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>⚙️ Backend Link Config</Text>
        <View style={styles.settingsRow}>
          <TextInput
            style={styles.settingsInput}
            value={tempUrl}
            onChangeText={setTempUrl}
            placeholder="Backend IP e.g. http://192.168.1.15:5000"
            placeholderTextColor="#64748b"
          />
          <TouchableOpacity 
            style={styles.settingsSaveBtn}
            onPress={() => setBackendUrl(tempUrl)}
          >
            <Text style={styles.settingsSaveText}>Connect</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.settingsStatus}>
          Status: <Text style={isConnected ? styles.statusConnected : styles.statusDisconnected}>
            {isConnected ? 'Linked' : 'Not Linked'}
          </Text>
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
  manualDialerContainer: {
    width: '100%',
    marginTop: 15,
    alignItems: 'center',
  },
  manualDialerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  manualInputGroup: {
    width: '100%',
    gap: 8,
    marginBottom: 12,
  },
  manualInput: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#ffffff',
  },
  manualButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  settingsCard: {
    backgroundColor: '#1e293b80',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#33415550',
    padding: 14,
    width: '100%',
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  settingsInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: '#ffffff',
  },
  settingsSaveBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  settingsSaveText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  settingsStatus: {
    fontSize: 10,
    color: '#64748b',
  },
  statusConnected: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  statusDisconnected: {
    color: '#ef4444',
    fontWeight: 'bold',
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
  uploadCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 18,
    width: '100%',
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  uploadDesc: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    marginBottom: 14,
  },
  uploadLoadingRow: {
    backgroundColor: '#1e293b',
    borderColor: '#3b82f6',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadLoadingText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  uploadBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
