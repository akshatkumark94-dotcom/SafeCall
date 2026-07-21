import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useScamStore } from '../store/useScamStore';
import ThreatMeter from '../components/ThreatMeter';

export default function LiveScannerScreen({ navigation, socketActions, BACKEND_URL }) {
  const isCallActive = useScamStore((state) => state.isCallActive);
  const callerName = useScamStore((state) => state.callerName);
  const callerNumber = useScamStore((state) => state.callerNumber);
  const threatScore = useScamStore((state) => state.threatScore);
  const scamCategory = useScamStore((state) => state.scamCategory);
  const advice = useScamStore((state) => state.advice);
  const transcript = useScamStore((state) => state.transcript);
  const addLocalLine = useScamStore((state) => state.addLocalTranscriptLine);
  const sessionId = useScamStore((state) => state.sessionId);

  const [inputText, setInputText] = useState('');
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('Idle');
  
  const scrollRef = useRef(null);
  const chunkTimeoutRef = useRef(null);

  // Auto scroll transcript to the bottom on update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [transcript]);

  // Clean up recording timers on unmount
  useEffect(() => {
    return () => {
      if (chunkTimeoutRef.current) {
        clearTimeout(chunkTimeoutRef.current);
      }
    };
  }, []);

  // Monitor call status to end recording automatically
  useEffect(() => {
    if (!isCallActive && isRecording) {
      stopAndAnalyzeRecording();
    }
  }, [isCallActive]);

  const startRecording = async () => {
    try {
      console.log('[LiveScanner] Requesting mic permissions..');
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        alert('Microphone permission is required to record and analyze calls.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('[LiveScanner] Starting initial audio chunk...');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingStatus('Monitoring Call Audio...');
      console.log('[LiveScanner] Initial recording started.');

      // Start the recursive chunk loop
      startChunkTimer(newRecording);
    } catch (err) {
      console.error('[LiveScanner] Failed to start recording', err);
      alert('Error starting recording: ' + err.message);
    }
  };

  const startChunkTimer = (currentRecording) => {
    if (chunkTimeoutRef.current) {
      clearTimeout(chunkTimeoutRef.current);
    }

    chunkTimeoutRef.current = setTimeout(async () => {
      // Check if session has been closed in store
      const activeState = useScamStore.getState().isCallActive;
      if (!activeState) {
        return;
      }

      try {
        console.log('[LiveScanner] Rolling over audio chunk...');
        // 1. Immediately spin up a new recording chunk to minimize gaps
        const { recording: nextRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(nextRecording);

        // 2. Stop and extract audio from the completed chunk
        await currentRecording.stopAndUnloadAsync();
        const uri = currentRecording.getURI();
        console.log('[LiveScanner] Chunk completed. Temp file:', uri);

        // Process completed chunk in background
        processAudioChunk(uri);

        // 3. Chain next rollover
        startChunkTimer(nextRecording);
      } catch (err) {
        console.error('[LiveScanner] Error during audio rollover:', err);
      }
    }, 8000); // 8-second chunks for near real-time feedback
  };

  const processAudioChunk = async (uri) => {
    try {
      console.log('[LiveScanner] Converting chunk to base64...');
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('[LiveScanner] Uploading chunk for sessionId:', sessionId);
      const response = await fetch(`${BACKEND_URL}/api/reports/analyze-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: 'audio/mp4',
          callerNumber: callerNumber,
          callerName: callerName,
          sessionId: sessionId
        }),
      });

      const result = await response.json();
      console.log('[LiveScanner] Chunk analysis response:', result);

      if (result.success) {
        // Update Zustand store
        const updateAnalysis = useScamStore.getState().updateAnalysis;
        updateAnalysis({
          threatScore: result.report.threatScore,
          scamCategory: result.report.scamCategory,
          scamIndicators: result.report.scamIndicators,
          advice: result.report.advice,
          transcript: result.report.transcript,
        });
        
        // Trigger background fetch of reports
        const fetchReports = useScamStore.getState().fetchReports;
        fetchReports(BACKEND_URL);
      }
    } catch (err) {
      console.error('[LiveScanner] Error processing chunk:', err.message);
    }
  };

  const stopAndAnalyzeRecording = async () => {
    if (chunkTimeoutRef.current) {
      clearTimeout(chunkTimeoutRef.current);
      chunkTimeoutRef.current = null;
    }

    if (!recording) {
      setIsRecording(false);
      setRecordingStatus('Idle');
      if (socketActions && socketActions.endCall) {
        socketActions.endCall();
      }
      return;
    }

    try {
      setRecordingStatus('Finalizing analysis...');
      console.log('[LiveScanner] Stopping final audio chunk...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      setRecording(null);
      setIsRecording(false);

      // Process the final chunk
      await processAudioChunk(uri);
      
      setRecordingStatus('Idle');
      
      if (socketActions && socketActions.endCall) {
        socketActions.endCall();
      }

      alert('Call session complete! Final evidence dossier generated.');
    } catch (err) {
      console.error('[LiveScanner] Failed to stop/analyze recording', err);
      setIsRecording(false);
      setRecording(null);
      setRecordingStatus('Idle');
      if (socketActions && socketActions.endCall) {
        socketActions.endCall();
      }
    }
  };

  const handleSendPhrase = (text) => {
    addLocalLine('Caller', text);
    if (socketActions && socketActions.sendTranscriptChunk) {
      socketActions.sendTranscriptChunk('Caller', text);
    }
  };

  const handleSendCustomText = () => {
    if (!inputText.trim()) return;
    handleSendPhrase(inputText.trim());
    setInputText('');
  };

  const handleHangUp = () => {
    if (isRecording) {
      stopAndAnalyzeRecording();
    } else {
      if (socketActions && socketActions.endCall) {
        socketActions.endCall();
      }
    }
  };

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

      {/* Audio Recording Control Bar */}
      <View style={styles.recordingBanner}>
        <View style={styles.recordingTextCol}>
          <Text style={styles.recordingStatusLabel}>🎙️ MICROPHONE SHIELD</Text>
          <Text style={styles.recordingStatusText}>
            {recordingStatus !== 'Idle' ? recordingStatus : (isRecording ? 'RECORDING ACTIVE' : 'RECORDING IDLE')}
          </Text>
        </View>
        
        {!isRecording ? (
          <TouchableOpacity 
            style={[styles.recordBtn, styles.recordStartBtn, recordingStatus !== 'Idle' && styles.disabledRecordBtn]} 
            onPress={startRecording}
            disabled={recordingStatus !== 'Idle'}
          >
            <Text style={styles.recordBtnText}>🎙️ RECORD</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.recordBtn, styles.recordStopBtn]} onPress={stopAndAnalyzeRecording}>
            <Text style={styles.recordBtnText}>⏹ STOP & ANALYZE</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Speakerphone Warning Banner */}
      <View style={styles.speakerphoneWarningBanner}>
        <Text style={styles.speakerphoneWarningText}>
          ⚠️ <Text style={styles.boldText}>IMPORTANT:</Text> You must turn on <Text style={styles.warningHighlight}>Speakerphone</Text> during the call so SafeCall can capture both sides of the conversation.
        </Text>
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

        {/* Live Simulator Controls inside Scanner */}
        <View style={styles.liveControls}>
          <Text style={styles.liveControlsTitle}>🧪 Live Simulation Controls</Text>
          
          {/* Quick-tap Phrases */}
          <View style={styles.quickPhrasesRow}>
            <TouchableOpacity 
              style={styles.quickPhraseBtn} 
              onPress={() => handleSendPhrase('This is CBI Cyber Crime HQ calling. An international drug trafficking case is registered under your Aadhaar card.')}
            >
              <Text style={styles.quickPhraseText}>🚨 CBI Threat</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickPhraseBtn} 
              onPress={() => handleSendPhrase('To verify your innocence, transfer all your account funds to the secure government verification treasury account immediately.')}
            >
              <Text style={styles.quickPhraseText}>💰 Send Money</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickPhraseBtn} 
              onPress={() => handleSendPhrase('You are under Digital Arrest. Do not tell anyone or hang up the call, keep your room locked.')}
            >
              <Text style={styles.quickPhraseText}>🔒 Secrecy</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickPhraseBtn} 
              onPress={() => handleSendPhrase('I have a package delivery from Amazon. Please verify the OTP or MyGate entry request.')}
            >
              <Text style={styles.quickPhraseText}>📦 Safe Agent</Text>
            </TouchableOpacity>
          </View>

          {/* Text Input Row */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Or type custom caller phrase here..."
              placeholderTextColor="#64748b"
              onSubmitEditing={handleSendCustomText}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendCustomText}>
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>

          {/* Hang Up Action */}
          <TouchableOpacity style={styles.hangUpBtn} onPress={handleHangUp}>
            <Text style={styles.hangUpText}>⏹ HANG UP & COMPILE EVIDENCE REPORT</Text>
          </TouchableOpacity>
        </View>

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
  liveControls: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginTop: 12,
  },
  liveControlsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  quickPhrasesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  quickPhraseBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  quickPhraseText: {
    color: '#e2e8f0',
    fontSize: 9,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  textInput: {
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
  sendBtn: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  hangUpBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  hangUpText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  recordingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  recordingTextCol: {
    flex: 1,
  },
  recordingStatusLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#3b82f6',
    letterSpacing: 1,
  },
  recordingStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  recordBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordStartBtn: {
    backgroundColor: '#10b981',
  },
  recordStopBtn: {
    backgroundColor: '#ef4444',
  },
  disabledRecordBtn: {
    opacity: 0.5,
  },
  recordBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  speakerphoneWarningBanner: {
    backgroundColor: '#7f1d1d',
    borderBottomWidth: 1,
    borderBottomColor: '#b91c1c',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  speakerphoneWarningText: {
    color: '#fca5a5',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  warningHighlight: {
    fontWeight: 'bold',
    color: '#fecdd3',
    textDecorationLine: 'underline',
  },
});
