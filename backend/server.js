require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const { connectDB, Report } = require('./db');
const { analyzeTranscript } = require('./services/geminiService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow connections from Expo Mobile / Web simulator clients
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
const reportsRouter = require('./routes/reports');
const communityRouter = require('./routes/community');

app.use('/api/reports', reportsRouter);
app.use('/api/community', communityRouter);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    api: 'SafeCall Scam Protection Service'
  });
});

// Live Call Sessions Store (In-Memory for ongoing calls)
const activeSessions = new Map();

// Socket.io Real-Time Interface
io.on('connection', (socket) => {
  console.log(`[SafeCall Socket] Client connected: ${socket.id}`);

  // Event 1: Call Started
  socket.on('start-call', (data) => {
    console.log(`[SafeCall Socket] Call started on ${socket.id} from:`, data);
    activeSessions.set(socket.id, {
      callerNumber: data.callerNumber || 'Unknown',
      callerName: data.callerName || 'Unknown Caller',
      transcript: [],
      threatScore: 0,
      scamCategory: 'None',
      scamIndicators: [],
      advice: []
    });
  });

  // Event 2: New transcript text chunk received from Speech-to-Text
  socket.on('transcript-chunk', async (data) => {
    const session = activeSessions.get(socket.id);
    if (!session) {
      console.log(`[SafeCall Socket] Warning: Chunk received for inactive session ${socket.id}`);
      return;
    }

    const { speaker, text } = data;
    if (!text || text.trim() === '') return;

    // Append to transcript
    const line = {
      speaker: speaker || 'Caller',
      text: text.trim(),
      timestamp: new Date(),
      isSuspicious: false
    };
    session.transcript.push(line);

    console.log(`[SafeCall Socket] Session ${socket.id} transcript update: "${text}"`);

    // Stream status update to client immediately (typing indicator / text showing)
    socket.emit('chunk-processed', { line });

    // Run Gemini Analysis (takes context of whole transcript)
    const analysis = await analyzeTranscript(session.transcript);

    // Update session metrics
    session.threatScore = analysis.threatScore;
    session.scamCategory = analysis.scamCategory;
    session.scamIndicators = analysis.indicators;
    session.advice = analysis.contextualAdvice;

    // Highlight flagged phrases
    session.transcript.forEach(item => {
      const isFlagged = analysis.suspiciousPhrases.some(sp => 
        item.text.toLowerCase().includes(sp.phrase.toLowerCase()) ||
        sp.phrase.toLowerCase().includes(item.text.toLowerCase())
      );
      if (isFlagged) {
        item.isSuspicious = true;
      }
    });

    // Emit live analysis results
    socket.emit('analysis-update', {
      threatScore: session.threatScore,
      scamCategory: session.scamCategory,
      scamIndicators: session.scamIndicators,
      advice: session.advice,
      transcript: session.transcript
    });
  });

  // Event 3: Call Completed - Save final data, clear session
  socket.on('end-call', async () => {
    console.log(`[SafeCall Socket] Call ending on ${socket.id}`);
    const session = activeSessions.get(socket.id);
    if (!session) {
      socket.emit('call-ended', { success: false, message: 'No active session found.' });
      return;
    }

    try {
      // Save report
      const savedReport = await Report.create({
        callerNumber: session.callerNumber,
        callerName: session.callerName,
        threatScore: session.threatScore,
        scamCategory: session.scamCategory,
        scamIndicators: session.scamIndicators,
        transcript: session.transcript,
        advice: session.advice
      });

      console.log(`[SafeCall Socket] Report saved successfully: ${savedReport._id}`);

      socket.emit('call-saved', {
        success: true,
        reportId: savedReport._id,
        report: savedReport
      });
    } catch (err) {
      console.error('[SafeCall Socket] Error saving call:', err);
      socket.emit('call-saved', { success: false, error: err.message });
    } finally {
      activeSessions.delete(socket.id);
    }
  });

  // Event 4: Client Disconnect
  socket.on('disconnect', () => {
    console.log(`[SafeCall Socket] Client disconnected: ${socket.id}`);
    activeSessions.delete(socket.id);
  });
});

// Create .env example file automatically if not present
const fs = require('fs');
const envPath = '.env';
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, `# SafeCall Server Environment Variables
PORT=5000
GEMINI_API_KEY=
MONGODB_URI=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
`);
  console.log('[SafeCall Server] Generated default .env configuration file.');
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`================================================`);
  console.log(` SafeCall Backend Server listening on port ${PORT}`);
  console.log(`================================================`);
  await connectDB();
});
