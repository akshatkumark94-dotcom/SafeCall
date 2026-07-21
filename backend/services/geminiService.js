const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API;

let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Fallback rules-based analyzer when Gemini Key is absent
function localRulesAnalyzer(transcriptLines) {
  const text = transcriptLines.map(l => l.text).join(' ').toLowerCase();
  
  let threatScore = 0;
  const indicators = [];
  const advice = [];
  const suspiciousPhrases = [];
  let scamCategory = 'None';

  // Rule checks
  // 1. Digital Arrest / Authority Impersonation
  if (/\b(cbi|police|customs|court|arrest|jail|investigation|illegal|warrant|drug|narcotics|suspect)\b/.test(text)) {
    scamCategory = 'Digital Arrest';
    threatScore += 45;
    indicators.push('Authority Impersonation');
    advice.push('State that you will contact the police station directly and verify.');
    advice.push('Government agencies NEVER conduct arrests or official investigations via Skype/WhatsApp video calls.');
    
    // Find matching phrases
    transcriptLines.forEach(line => {
      if (/\b(cbi|police|customs|court|arrest|jail|illegal|warrant)\b/i.test(line.text)) {
        suspiciousPhrases.push({
          phrase: line.text,
          reason: 'Impersonation of law enforcement/legal authority'
        });
      }
    });
  }

  // 2. Financial Demand / Banking Scam
  if (/\b(transfer|bank account|verification account|money|otp|card number|cvv|pin|funds|safety account)\b/.test(text)) {
    if (scamCategory === 'None') scamCategory = 'Bank Fraud / Refund';
    threatScore += 35;
    indicators.push('Financial Request / Transaction');
    advice.push('NEVER share OTP, CVV, or passwords over the phone.');
    advice.push('Banks and government agencies will never ask you to transfer funds to a "secure safety account".');

    transcriptLines.forEach(line => {
      if (/\b(transfer|bank|money|otp|pin|cvv|funds)\b/i.test(line.text)) {
        suspiciousPhrases.push({
          phrase: line.text,
          reason: 'Requesting financial details or fund transfer'
        });
      }
    });
  }

  // 3. Urgency & Panic creation
  if (/\b(urgent|immediate|quickly|hang up|arrest you now|court hearing|within 2 hours|don't disconnect)\b/.test(text)) {
    threatScore += 15;
    indicators.push('Urgency and Pressure Tactics');
    advice.push('Take a deep breath. Scammers use artificial time limits to bypass your logical thinking.');
    
    transcriptLines.forEach(line => {
      if (/\b(urgent|immediate|quickly|hang up|now|hours|disconnect)\b/i.test(line.text)) {
        suspiciousPhrases.push({
          phrase: line.text,
          reason: 'Applying psychological pressure and urgency'
        });
      }
    });
  }

  // 4. Secrecy demands
  if (/\b(secret|don't tell|confidential|quiet|close the door|nobody|family|warn you)\b/.test(text)) {
    threatScore += 15;
    indicators.push('Demands for Secrecy');
    advice.push('Immediately talk to a family member, friend, or neighbor about this call.');

    transcriptLines.forEach(line => {
      if (/\b(secret|don't tell|confidential|quiet|nobody|family)\b/i.test(line.text)) {
        suspiciousPhrases.push({
          phrase: line.text,
          reason: 'Attempting to isolate the victim by demanding secrecy'
        });
      }
    });
  }

  // Bound score
  threatScore = Math.min(threatScore, 100);

  if (threatScore === 0 && transcriptLines.length > 0) {
    // Basic baseline if we have text but no matches
    threatScore = 5;
    scamCategory = 'Normal Conversation';
    advice.push('Conversation appears safe. Continue to stay vigilant.');
  }

  // Remove duplicates from advice
  const uniqueAdvice = [...new Set(advice)];
  if (uniqueAdvice.length === 0) {
    uniqueAdvice.push('Stay calm. Hang up if the caller asks for sensitive details.');
  }

  return {
    threatScore,
    scamCategory,
    indicators,
    contextualAdvice: uniqueAdvice,
    suspiciousPhrases: suspiciousPhrases.slice(0, 5) // cap at 5
  };
}

/**
 * Analyzes a call transcript using Gemini 2.5 Flash.
 * Falls back to local rules-based engine if Gemini key is missing or calls fail.
 * @param {Array<{speaker: string, text: string}>} transcriptLines 
 * @returns {Promise<{threatScore: number, scamCategory: string, indicators: string[], contextualAdvice: string[], suspiciousPhrases: Array<{phrase: string, reason: string}>}>}
 */
async function analyzeTranscript(transcriptLines) {
  if (transcriptLines.length === 0) {
    return {
      threatScore: 0,
      scamCategory: 'None',
      indicators: [],
      contextualAdvice: ['Activate mic or select a script to begin monitoring.'],
      suspiciousPhrases: []
    };
  }

  // Standard fallback log
  if (!genAI) {
    // console.log('[Gemini Service] No API Key. Running local rule analyzer.');
    return localRulesAnalyzer(transcriptLines);
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const transcriptText = transcriptLines
      .map(line => `${line.speaker}: "${line.text}"`)
      .join('\n');

    const prompt = `You are a real-time cyber security system named SafeCall. 
Your role is to analyze live transcripts of incoming calls to detect scams, specifically Digital Arrest scams, Lottery/Refund fraud, Bank Impersonation, and Tech Support scams.

Analyze the following call transcript:
"""
${transcriptText}
"""

Evaluate it based on common scam tactics:
1. Authority Impersonation (claims to be Police, CBI, Customs, Tax, Court, Bank, FedEx support)
2. Urgency/Pressure (must transfer money now, arrest warrant issued, immediate action needed)
3. Demands for Secrecy (do not tell family, keep line connected, lock room door)
4. Financial requests (verify funds, transfer money to "safe accounts", share OTP/PIN/CVV)

Return a strictly formatted JSON response matching this schema:
{
  "threatScore": <number from 0 to 100 reflecting the likelihood of a scam>,
  "scamCategory": "<detected category e.g., 'Digital Arrest', 'Bank Fraud', 'Lottery Scam', 'None'>",
  "indicators": ["<detected indicators e.g., 'Authority Impersonation', 'Urgency', 'Secrecy Demand', 'Financial Request'>"],
  "contextualAdvice": ["<actionable advise for the victim in 1 sentence e.g., 'Hang up immediately', 'Do not share OTP'>"],
  "suspiciousPhrases": [
    {
      "phrase": "<exact sentence from the transcript that was suspicious>",
      "reason": "<short explanation of why it is suspicious>"
    }
  ]
}

Only return the JSON. Do not include markdown code block syntax.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Parse response
    const analysis = JSON.parse(responseText);
    return {
      threatScore: Number(analysis.threatScore) || 0,
      scamCategory: analysis.scamCategory || 'Unclassified',
      indicators: Array.isArray(analysis.indicators) ? analysis.indicators : [],
      contextualAdvice: Array.isArray(analysis.contextualAdvice) ? analysis.contextualAdvice : [],
      suspiciousPhrases: Array.isArray(analysis.suspiciousPhrases) ? analysis.suspiciousPhrases : []
    };

  } catch (error) {
    console.error('[Gemini Service] API call failed, using local rules engine:', error.message);
    return localRulesAnalyzer(transcriptLines);
  }
}

module.exports = {
  analyzeTranscript,
  analyzeAudio
};

/**
 * Analyzes an audio file (base64) using Gemini 2.5 Flash.
 * @param {string} audioBase64 
 * @param {string} mimeType 
 * @returns {Promise<{threatScore: number, scamCategory: string, indicators: string[], contextualAdvice: string[], suspiciousPhrases: Array<{phrase: string, reason: string}>, transcript: Array<{speaker: string, text: string}>}>}
 */
async function analyzeAudio(audioBase64, mimeType = 'audio/mp4') {
  if (!genAI) {
    throw new Error('Gemini API key is not configured.');
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const prompt = `You are a real-time cyber security system named SafeCall. 
Your role is to listen to the provided phone call recording and analyze it to detect scams, specifically Digital Arrest scams, Lottery/Refund fraud, Bank Impersonation, and Tech Support scams.

Listen to the audio, transcribe the conversation (identifying speakers if possible, e.g., "Caller" vs "Receiver"), and evaluate it based on common scam tactics:
1. Authority Impersonation (claims to be Police, CBI, Customs, Tax, Court, Bank, FedEx support)
2. Urgency/Pressure (must transfer money now, arrest warrant issued, immediate action needed)
3. Demands for Secrecy (do not tell family, keep line connected, lock room door)
4. Financial requests (verify funds, transfer money to "safe accounts", share OTP/PIN/CVV)

Return a strictly formatted JSON response matching this schema:
{
  "transcript": [
    {
      "speaker": "Caller" or "Receiver",
      "text": "transcribed speech segment"
    }
  ],
  "threatScore": <number from 0 to 100 reflecting the likelihood of a scam>,
  "scamCategory": "<detected category e.g., 'Digital Arrest', 'Bank Fraud', 'Lottery Scam', 'None'>",
  "indicators": ["<detected indicators e.g., 'Authority Impersonation', 'Urgency', 'Secrecy Demand', 'Financial Request'>"],
  "contextualAdvice": ["<actionable advise for the victim in 1 sentence e.g., 'Hang up immediately', 'Do not share OTP'>"],
  "suspiciousPhrases": [
    {
      "phrase": "<exact sentence from the transcript that was suspicious>",
      "reason": "<short explanation of why it is suspicious>"
    }
  ]
}

Only return the JSON. Do not include markdown code block syntax.`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: audioBase64,
          mimeType: mimeType
        }
      },
      prompt
    ]);

    const responseText = result.response.text().trim();
    const analysis = JSON.parse(responseText);

    return {
      threatScore: Number(analysis.threatScore) || 0,
      scamCategory: analysis.scamCategory || 'Unclassified',
      indicators: Array.isArray(analysis.indicators) ? analysis.indicators : [],
      contextualAdvice: Array.isArray(analysis.contextualAdvice) ? analysis.contextualAdvice : [],
      suspiciousPhrases: Array.isArray(analysis.suspiciousPhrases) ? analysis.suspiciousPhrases : [],
      transcript: Array.isArray(analysis.transcript) ? analysis.transcript.map(line => ({
        speaker: line.speaker || 'Caller',
        text: line.text || '',
        timestamp: new Date(),
        isSuspicious: false
      })) : []
    };

  } catch (error) {
    console.error('[Gemini Service] Audio analysis failed:', error.message);
    throw error;
  }
}
