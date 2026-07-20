import React, { useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, TextInput } from 'react-native';
import { useScamStore } from '../store/useScamStore';

const SCRIPTS = [
  {
    id: 'digital_arrest',
    name: '🚨 Digital Arrest - CBI Impersonation',
    callerName: 'Inspector Kumar (CBI Cyber Cell)',
    callerNumber: '+91 11-2436-1200',
    lines: [
      { speaker: 'Inspector Kumar', text: 'Hello, this is Inspector Vinay Kumar calling from the CBI HQ Cyber Crime Branch.' },
      { speaker: 'Inspector Kumar', text: 'We have intercepted a customs parcel sent from Mumbai to Cambodia containing 5 illegal passports, 30 fake credit cards, and 200 grams of MDMA narcotics registered under your Aadhaar card.' },
      { speaker: 'Inspector Kumar', text: 'An arrest warrant has been issued against you by the Supreme Court of Delhi for international drug trafficking and money laundering.' },
      { speaker: 'Inspector Kumar', text: 'We are placing you under Digital Arrest. You must lock your room door, stay connected on video, and not talk to any family members or we will send local police to jail you immediately.' },
      { speaker: 'Inspector Kumar', text: 'To prove your innocence, we must run a financial clearance check. Open your bank app, and transfer your total balance of 1,50,000 Rupees to our CBI verification treasury account. It will be refunded in 30 minutes.' }
    ]
  },
  {
    id: 'bank_fraud',
    name: '💳 Bank Fraud - Suspicious Account Block',
    callerName: 'HDFC Bank Security',
    callerNumber: '+91 22-6160-6161',
    lines: [
      { speaker: 'Bank Agent', text: 'Good morning, this is Amit Shah from HDFC Security Operations.' },
      { speaker: 'Bank Agent', text: 'Our automated system flagged a suspicious login request from Russia trying to debit 75,000 Rupees from your savings account.' },
      { speaker: 'Bank Agent', text: 'To secure your account and stop the debit, I need to verify your identity. Please tell me your customer ID and full debit card number.' },
      { speaker: 'Bank Agent', text: 'I am sending a security bypass token to your mobile. Please read out the 6-digit OTP code to me right now before the transfer goes through.' }
    ]
  },
  {
    id: 'amazon_delivery',
    name: '📦 Normal Delivery Agent (Safe Call)',
    callerName: 'Amazon Delivery',
    callerNumber: '+91 98765 01234',
    lines: [
      { speaker: 'Delivery Agent', text: 'Hello, am I speaking to the owner of Flat 402?' },
      { speaker: 'Delivery Agent', text: 'I am standing near the lobby gate. Can you share the entry code or approve the entry request on MyGate app?' },
      { speaker: 'Delivery Agent', text: 'Okay, thank you. I am leaving the box with the reception desk since you are not home. Have a nice day.' }
    ]
  }
];

export default function CallSimulator({ socketActions }) {
  const [selectedScriptId, setSelectedScriptId] = useState(SCRIPTS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [customText, setCustomText] = useState('');
  
  const startStoreCall = useScamStore((state) => state.startCall);
  const addLocalLine = useScamStore((state) => state.addLocalTranscriptLine);
  const isCallActive = useScamStore((state) => state.isCallActive);
  
  const timerRef = useRef(null);
  const currentLineIndexRef = useRef(0);

  const selectedScript = SCRIPTS.find(s => s.id === selectedScriptId);

  const runSimulation = () => {
    if (isCallActive) return;
    
    setIsPlaying(true);
    currentLineIndexRef.current = 0;

    // 1. Trigger Start Call state & socket event
    startStoreCall(selectedScript.callerNumber, selectedScript.callerName);
    socketActions.startCall(selectedScript.callerNumber, selectedScript.callerName);

    // 2. Play lines sequentially
    const lines = selectedScript.lines;
    
    // Send first line immediately
    sendLine(lines[0]);
    currentLineIndexRef.current = 1;

    timerRef.current = setInterval(() => {
      if (currentLineIndexRef.current < lines.length) {
        sendLine(lines[currentLineIndexRef.current]);
        currentLineIndexRef.current++;
      } else {
        // Complete
        stopSimulation();
      }
    }, 4500); // Send message every 4.5 seconds
  };

  const sendLine = (line) => {
    addLocalLine(line.speaker, line.text);
    socketActions.sendTranscriptChunk(line.speaker, line.text);
  };

  const stopSimulation = () => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Save report in DB via socket
    socketActions.endCall();
  };

  const handleSendCustomText = () => {
    if (!customText.trim()) return;

    if (!isCallActive) {
      // Start call automatically if not running
      startStoreCall('+91 Custom Input', 'Simulated Speaker');
      socketActions.startCall('+91 Custom Input', 'Simulated Speaker');
    }

    // Send the custom text as if spoken by caller
    addLocalLine('Caller', customText);
    socketActions.sendTranscriptChunk('Caller', customText);
    setCustomText('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scam Detection Call Simulator</Text>

      {/* Script Selector */}
      <View style={styles.selectorContainer}>
        {SCRIPTS.map((script) => (
          <TouchableOpacity
            key={script.id}
            style={[
              styles.scriptButton,
              selectedScriptId === script.id && styles.activeScriptButton,
              isPlaying && styles.disabledButton
            ]}
            disabled={isPlaying}
            onPress={() => setSelectedScriptId(script.id)}
          >
            <Text
              style={[
                styles.scriptButtonText,
                selectedScriptId === script.id && styles.activeScriptButtonText
              ]}
            >
              {script.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Simulator Control Buttons */}
      <View style={styles.controlsRow}>
        {!isPlaying ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.startButton, isCallActive && styles.disabledButton]} 
            onPress={runSimulation}
            disabled={isCallActive}
          >
            <Text style={styles.buttonText}>▶ Start Live Script</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.actionButton, styles.stopButton]} onPress={stopSimulation}>
            <Text style={styles.buttonText}>⏹ Stop Call & Save Report</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Custom Phrase Injector */}
      <View style={styles.customContainer}>
        <TextInput
          style={styles.input}
          placeholder="Or type custom caller phrase to test..."
          placeholderTextColor="#64748b"
          value={customText}
          onChangeText={setCustomText}
          onSubmitEditing={handleSendCustomText}
        />
        <TouchableOpacity style={styles.injectButton} onPress={handleSendCustomText}>
          <Text style={styles.injectText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 10,
    width: '100%',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 10,
    textAlign: 'center',
  },
  selectorContainer: {
    flexDirection: 'column',
    gap: 6,
    marginBottom: 12,
  },
  scriptButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeScriptButton: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a33',
  },
  scriptButtonText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  activeScriptButtonText: {
    color: '#60a5fa',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#2563eb',
  },
  stopButton: {
    backgroundColor: '#dc2626',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  customContainer: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#ffffff',
  },
  injectButton: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  injectText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
