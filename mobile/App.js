import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import { useSocket } from './hooks/useSocket';
import { useScamStore } from './store/useScamStore';

// Screens
import DashboardScreen from './screens/DashboardScreen';
import LiveScannerScreen from './screens/LiveScannerScreen';
import EvidenceScreen from './screens/EvidenceScreen';
import CommunityScreen from './screens/CommunityScreen';

// Set backend URL (supports local dev out-of-the-box)
const BACKEND_URL = 'http://localhost:5000';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const isCallActive = useScamStore((state) => state.isCallActive);
  const threatScore = useScamStore((state) => state.threatScore);

  // Initialize WebSockets
  const { isConnected, startCall, sendTranscriptChunk, endCall } = useSocket(BACKEND_URL);

  const socketActions = { startCall, sendTranscriptChunk, endCall };

  const handleNavigate = (tabName) => {
    setActiveTab(tabName);
  };

  const getThreatBorderColor = () => {
    if (!isCallActive) return '#334155';
    if (threatScore > 75) return '#ef4444';
    if (threatScore > 40) return '#f97316';
    return '#3b82f6';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Global Connection Badge */}
      <View style={styles.topStatus}>
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>SAFECALL</Text>
          <View style={[styles.statusDot, isConnected ? styles.dotGreen : styles.dotRed]} />
          <Text style={styles.statusLabel}>{isConnected ? 'SECURE LINK ACTIVE' : 'DISCONNECTED'}</Text>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.body}>
        {activeTab === 'dashboard' && (
          <DashboardScreen 
            socketActions={socketActions} 
            navigation={handleNavigate} 
            BACKEND_URL={BACKEND_URL} 
          />
        )}
        {activeTab === 'scanner' && (
          <LiveScannerScreen 
            navigation={handleNavigate} 
          />
        )}
        {activeTab === 'evidence' && (
          <EvidenceScreen 
            BACKEND_URL={BACKEND_URL} 
          />
        )}
        {activeTab === 'community' && (
          <CommunityScreen 
            BACKEND_URL={BACKEND_URL} 
          />
        )}
      </View>

      {/* Floating Bottom Tab Bar */}
      <View style={[styles.tabBar, { borderColor: getThreatBorderColor() }]}>
        
        {/* Dashboard Tab */}
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'dashboard' && styles.activeTabItem]}
          onPress={() => handleNavigate('dashboard')}
        >
          <Text style={styles.tabIcon}>🛡️</Text>
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        {/* Live Scanner Tab */}
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'scanner' && styles.activeTabItem]}
          onPress={() => handleNavigate('scanner')}
        >
          <View style={styles.scannerTabWrapper}>
            <Text style={styles.tabIcon}>👁️</Text>
            {isCallActive && (
              <View style={[
                styles.scamIndicatorDot, 
                { backgroundColor: threatScore > 40 ? '#ef4444' : '#3b82f6' }
              ]} />
            )}
          </View>
          <Text style={[styles.tabText, activeTab === 'scanner' && styles.activeTabText]}>
            Scanner
          </Text>
        </TouchableOpacity>

        {/* Evidence Tab */}
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'evidence' && styles.activeTabItem]}
          onPress={() => handleNavigate('evidence')}
        >
          <Text style={styles.tabIcon}>📄</Text>
          <Text style={[styles.tabText, activeTab === 'evidence' && styles.activeTabText]}>
            Evidence
          </Text>
        </TouchableOpacity>

        {/* Community Tab */}
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'community' && styles.activeTabItem]}
          onPress={() => handleNavigate('community')}
        >
          <Text style={styles.tabIcon}>🌐</Text>
          <Text style={[styles.tabText, activeTab === 'community' && styles.activeTabText]}>
            Registry
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  topStatus: {
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginRight: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotGreen: {
    backgroundColor: '#10b981',
  },
  dotRed: {
    backgroundColor: '#ef4444',
  },
  statusLabel: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  body: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 2,
    paddingVertical: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 4,
    flex: 1,
  },
  activeTabItem: {
    opacity: 1,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748b',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  scannerTabWrapper: {
    position: 'relative',
  },
  scamIndicatorDot: {
    position: 'absolute',
    right: -4,
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#1e293b',
  },
});
