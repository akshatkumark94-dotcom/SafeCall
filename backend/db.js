const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
let isConnected = false;

// In-Memory Database Fallback Store
const memoryStore = {
  reports: [],
  communityReports: []
};

// Log helper
function log(msg) {
  console.log(`[SafeCall DB] ${msg}`);
}

// Connect function
async function connectDB() {
  if (!MONGODB_URI) {
    log('MONGODB_URI is not set. Using In-Memory fallback store.');
    return false;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    log('MongoDB connected successfully.');
    return true;
  } catch (err) {
    log(`Failed to connect to MongoDB: ${err.message}. Falling back to In-Memory store.`);
    return false;
  }
}

// ==========================================
// In-Memory Mocks for DB Models
// ==========================================
class MemoryModel {
  constructor(storeName) {
    this.storeName = storeName;
  }

  async find(query = {}) {
    let results = [...memoryStore[this.storeName]];
    // Simple filter matching
    for (const key of Object.keys(query)) {
      if (typeof query[key] === 'object' && query[key] !== null) {
        // Handle basic $or/regex search
        if (key === '$or') {
          results = results.filter(item => {
            return query[key].some(subQuery => {
              return Object.entries(subQuery).some(([subKey, subVal]) => {
                if (subVal instanceof RegExp) {
                  return subVal.test(item[subKey] || '');
                }
                return item[subKey] === subVal;
              });
            });
          });
        }
      } else {
        results = results.filter(item => item[key] === query[key]);
      }
    }
    // Sort descending by default
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  async findById(id) {
    return memoryStore[this.storeName].find(item => item._id === id) || null;
  }

  async create(data) {
    const newItem = {
      _id: Math.random().toString(36).substring(2, 15),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };
    memoryStore[this.storeName].push(newItem);
    return newItem;
  }
}

// ==========================================
// Mongoose Schema Definitions (for Production)
// ==========================================
const ReportSchema = new mongoose.Schema({
  callerNumber: { type: String, default: 'Unknown' },
  callerName: { type: String, default: 'Unknown Caller' },
  threatScore: { type: Number, default: 0 },
  scamCategory: { type: String, default: 'Unclassified' },
  scamIndicators: [{ type: String }],
  transcript: [{
    speaker: String,
    text: String,
    timestamp: Date,
    isSuspicious: Boolean
  }],
  advice: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const CommunityReportSchema = new mongoose.Schema({
  scamValue: { type: String, required: true }, // Phone number, UPI, website, etc.
  type: { type: String, required: true }, // 'phone', 'upi', 'website', 'other'
  scamCategory: { type: String, default: 'Unclassified' },
  description: { type: String },
  reporterName: { type: String, default: 'Anonymous' },
  createdAt: { type: Date, default: Date.now }
});

// Export Mongoose models or Memory models depending on configuration
let Report;
let CommunityReport;

if (MONGODB_URI) {
  Report = mongoose.model('Report', ReportSchema);
  CommunityReport = mongoose.model('CommunityReport', CommunityReportSchema);
} else {
  Report = new MemoryModel('reports');
  CommunityReport = new MemoryModel('communityReports');
}

module.exports = {
  connectDB,
  Report,
  CommunityReport,
  isInMemory: () => !isConnected
};
