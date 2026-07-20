import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ThreatMeter({ score, category }) {
  // Determine severity tier
  let tierColor = '#16a34a'; // Green
  let tierLabel = 'SECURE / NO THREAT';
  let tierShadow = 'rgba(22, 163, 74, 0.4)';
  let advice = 'Conversation seems normal. Safe to continue.';

  if (score > 75) {
    tierColor = '#ef4444'; // Red
    tierLabel = 'CRITICAL DANGER: HANG UP';
    tierShadow = 'rgba(239, 68, 68, 0.7)';
    advice = 'IMMEDIATE FRAUD DETECTED. End the call now!';
  } else if (score > 40) {
    tierColor = '#f97316'; // Orange
    tierLabel = 'HIGH RISK: SUSPECTED SCAM';
    tierShadow = 'rgba(249, 115, 22, 0.6)';
    advice = 'Demands match known extortion/arrest patterns.';
  } else if (score > 15) {
    tierColor = '#3b82f6'; // Blue
    tierLabel = 'MODERATE SUSPICION';
    tierShadow = 'rgba(59, 130, 246, 0.5)';
    advice = 'Slight pressure or unusual questions detected.';
  }

  // Visual percentages for circular display
  const strokeDashoffset = 280 - (280 * score) / 100;

  return (
    <View style={styles.container}>
      {/* Outer Glow Ring */}
      <View style={[styles.glowRing, { borderColor: tierColor, shadowColor: tierColor }]}>
        <View style={styles.innerRing}>
          {/* Large Threat Number */}
          <Text style={[styles.scoreText, { color: tierColor }]}>{score}%</Text>
          <Text style={styles.scoreSub}>THREAT INDEX</Text>
        </View>
      </View>

      {/* Threat Level Banner */}
      <View style={[styles.banner, { backgroundColor: `${tierColor}1a`, borderColor: tierColor }]}>
        <Text style={[styles.bannerLabel, { color: tierColor }]}>{tierLabel}</Text>
        {category && category !== 'None' && category !== 'Normal Conversation' && (
          <Text style={styles.categoryLabel}>Scam Category: {category}</Text>
        )}
      </View>

      {/* Advisory Text */}
      <Text style={styles.adviceText}>{advice}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  glowRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    // Shadow / Glow effects (iOS & Web support)
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 20,
  },
  innerRing: {
    width: 146,
    height: 146,
    borderRadius: 73,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  scoreSub: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 2,
    marginTop: 2,
  },
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    width: '85%',
    marginBottom: 10,
  },
  bannerLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginTop: 3,
  },
  adviceText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
