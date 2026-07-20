import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useScamStore } from '../store/useScamStore';
import ThreatMeter from '../components/ThreatMeter';

export default function LiveScannerScreen({ navigation }) {
  const isCallActive = useScamStore((state) => state.isCallActive);
  const callerName = useScamStore((state) => state.callerName);
  const callerNumber = useScamStore((state) => state.callerNumber);
  const threatScore = useScamStore((state) => state.threatScore);
  const scamCategory = useScamStore((state) => state.scamCategory);
  const advice = useScamStore((state) => state.advice);
  const transcript = useScamStore((state) => state.transcript);

  const scrollRef = useRef(null);

  // Auto scroll transcript to the bottom on update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [transcript]);

  if (!isCallActive) {
    return (
      <View style={styles.idleContainer}>
        <View style={styles.idleCard}>
          <Text style={styles.idleTitle}>No Active Scan Session</Text>
          <Text style={styles.idleText}>
            SafeCall is not currently scanning a call. To test the detection system:
          </Text>
          
          <Text style={styles.bullet}>• Go to the <Text style={styles.highlightText}>Dashboard</Text></Text>
          <Text style={styles.bullet}>• Select a demo script under the Call Simulator</Text>
          <Text style={styles.bullet}>• Press <Text style={styles.highlightText}>Start Live Script</Text> to stream and scan the conversation</Text>

          <TouchableOpacity 
            style={styles.idleButton} 
            onPress={() => navigation('dashboard')}
          >
            <Text style={styles.idleButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Caller Identity Card */}
      <View style={styles.callerHeader}>
        <View style={styles.callerInfo}>
          <Text style={styles.callerLabel}>ACTIVE ANALYSIS</Text>
          <Text style={styles.callerValName}>{callerName}</Text>
          <Text style={styles.callerValNum}>{callerNumber}</Text>
        </View>
        <View style={styles.scanningDotContainer}>
          <View style={styles.scanningDot} />
          <Text style={styles.scanningText}>SCANNING</Text>
        </View>
      </View>

      {/* Main content grid */}
      <View style={styles.mainGrid}>
        
        {/* Threat Meter */}
        <View style={styles.threatSection}>
          <ThreatMeter score={threatScore} category={scamCategory} />
        </View>

        {/* Real-time Advice Board (Only shows if there is active advice) */}
        {advice && advice.length > 0 && (
          <View style={styles.adviceBoard}>
            <Text style={styles.adviceBoardTitle}>🛡 SafeCall Advice</Text>
            {advice.map((item, index) => (
              <View key={index} style={styles.adviceItem}>
                <Text style={styles.adviceMarker}>•</Text>
                <Text style={styles.adviceItemText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Scrolling Transcript Panel */}
        <Text style={styles.transcriptTitle}>Live Transcript Feed</Text>
        <ScrollView 
          ref={scrollRef}
          style={styles.transcriptBox}
          contentContainerStyle={styles.transcriptContent}
        >
          {transcript.map((line, index) => (
            <View 
              key={index} 
              style={[
                styles.chatBubble, 
                line.isSuspicious ? styles.suspiciousBubble : styles.normalBubble
              ]}
            >
              <Text 
                style={[
                  styles.bubbleSpeaker, 
                  line.isSuspicious ? styles.suspiciousSpeaker : styles.normalSpeaker
                ]}
              >
                {line.speaker} {line.isSuspicious ? '⚠️ SCAM DETECTED' : ''}
              </Text>
              <Text 
                style={[
                  styles.bubbleText, 
                  line.isSuspicious ? styles.suspiciousText : styles.normalText
                ]}
              >
                {line.text}
              </Text>
            </View>
          ))}
        </ScrollView>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  idleContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  idleCard: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  idleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  idleText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  bullet: {
    fontSize: 12,
    color: '#64748b',
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingLeft: 10,
  },
  highlightText: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  idleButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
  },
  idleButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  callerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  callerInfo: {
    flex: 1,
  },
  callerLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#3b82f6',
    letterSpacing: 1.5,
  },
  callerValName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  callerValNum: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  scanningDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scanningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  scanningText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ef4444',
    letterSpacing: 1,
  },
  mainGrid: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  threatSection: {
    alignItems: 'center',
  },
  adviceBoard: {
    backgroundColor: '#ea580c10',
    borderColor: '#ea580c80',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  adviceBoardTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#f97316',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  adviceItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  adviceMarker: {
    color: '#ea580c',
    marginRight: 6,
    fontWeight: 'bold',
  },
  adviceItemText: {
    flex: 1,
    fontSize: 11,
    color: '#e2e8f0',
    lineHeight: 16,
  },
  transcriptTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  transcriptBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  transcriptContent: {
    padding: 12,
    gap: 10,
  },
  chatBubble: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  normalBubble: {
    backgroundColor: '#1e293b50',
    borderColor: '#33415580',
  },
  suspiciousBubble: {
    backgroundColor: '#ef444415',
    borderColor: '#dc2626',
  },
  bubbleSpeaker: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  normalSpeaker: {
    color: '#64748b',
  },
  suspiciousSpeaker: {
    color: '#ef4444',
  },
  bubbleText: {
    fontSize: 12,
    lineHeight: 18,
  },
  normalText: {
    color: '#e2e8f0',
  },
  suspiciousText: {
    color: '#fca5a5',
    fontWeight: '500',
  },
});
