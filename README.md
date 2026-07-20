# SafeCall – AI-Powered Real-Time Digital Arrest Scam Detection & Protection System

SafeCall is an AI-powered mobile application designed to protect citizens from digital arrest scams and other forms of cyber fraud by providing real-time detection, intelligent guidance, and automated evidence generation during suspicious interactions. Unlike existing solutions that operate after financial loss has already occurred, SafeCall focuses on preventing fraud at the exact moment it happens. When a user receives a suspicious phone call or message, they can activate SafeCall with a single tap. The application securely captures the ongoing conversation through the device's microphone, converts the speech into text using a Speech-to-Text engine, and continuously analyzes the transcript using an advanced Large Language Model trained to recognize common scam tactics such as authority impersonation, urgency, secrecy demands, psychological manipulation, and requests for financial transfers. As the conversation progresses, the system dynamically calculates a threat score and silently alerts the user through vibration, visual indicators, and contextual explanations whenever suspicious patterns are detected, allowing the user to make informed decisions without alerting the scammer.

Beyond real-time protection, SafeCall automatically creates a structured evidence package containing the complete conversation transcript, highlighted suspicious phrases, timestamps, detected scam patterns, threat analysis, caller information, and any URLs or payment details shared during the interaction. This evidence can be exported as a professionally formatted PDF report, making it easier for victims to file complaints with cybercrime authorities. The application also supports anonymous community reporting, where verified scam phone numbers, UPI IDs, fraudulent websites, and scam patterns are securely stored in a centralized intelligence database. Over time, this continuously growing dataset enables the system to identify emerging fraud trends, improve detection accuracy, and contribute to a collaborative public safety network.

## System Architecture

The project follows a mobile-first architecture built using:
- **Frontend**: React Native (Expo) for cross-platform application development, ensuring a smooth and responsive user experience on Android and iOS devices.
- **Backend**: Node.js, Express.js, and Socket.io to enable low-latency, real-time communication between the mobile application and AI services.
- **Database**: MongoDB Atlas for storing transcripts, scam patterns, evidence reports, and community intelligence.
- **Caching**: Upstash Redis for caching and session management.
- **Speech-to-Text**: Speech transcription is handled using Faster-Whisper or Google Speech-to-Text / Expo AV recording.
- **AI Analysis**: Google Gemini 2.5 Flash for contextual analysis, scam pattern detection, threat assessment, and recommendation generation.
- **Evidence Generation**: PDFKit to generate structured evidence reports.
- **State Management**: Zustand for efficient global state management.
- **Alerts**: Expo Notifications and Expo Haptics for silent user alerts.
- **Secure Storage**: Expo Secure Store to securely store user preferences and sensitive information.
