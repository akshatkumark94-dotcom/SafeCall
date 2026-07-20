import { create } from 'zustand';

const DEFAULT_CALL_STATE = {
  isCallActive: false,
  callerNumber: '',
  callerName: '',
  threatScore: 0,
  scamCategory: 'None',
  scamIndicators: [],
  advice: [],
  transcript: []
};

export const useScamStore = create((set, get) => ({
  // Live Call State
  ...DEFAULT_CALL_STATE,

  // Lists & Statistics
  reports: [],
  communityReports: [],
  stats: {
    totalReports: 0,
    byType: { phone: 0, upi: 0, website: 0, other: 0 },
    byCategory: {}
  },
  isLoading: false,
  error: null,

  // Local Actions
  startCall: (callerNumber, callerName) => {
    set({
      ...DEFAULT_CALL_STATE,
      isCallActive: true,
      callerNumber: callerNumber || 'Unknown',
      callerName: callerName || 'Unknown Caller'
    });
  },

  addLocalTranscriptLine: (speaker, text) => {
    const newline = {
      speaker,
      text,
      timestamp: new Date().toISOString(),
      isSuspicious: false
    };
    set((state) => ({
      transcript: [...state.transcript, newline]
    }));
  },

  updateAnalysis: (data) => {
    set({
      threatScore: data.threatScore || 0,
      scamCategory: data.scamCategory || 'None',
      scamIndicators: data.scamIndicators || [],
      advice: data.advice || [],
      transcript: data.transcript || []
    });
  },

  endCallLocal: () => {
    set({ isCallActive: false });
  },

  resetCallState: () => {
    set(DEFAULT_CALL_STATE);
  },

  // Backend Integration Actions
  fetchReports: async (backendUrl) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`${backendUrl}/api/reports`);
      const data = await response.json();
      if (data.success) {
        set({ reports: data.reports, error: null });
      } else {
        set({ error: data.error });
      }
    } catch (err) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCommunityReports: async (backendUrl) => {
    try {
      const response = await fetch(`${backendUrl}/api/community`);
      const data = await response.json();
      if (data.success) {
        set({ communityReports: data.reports });
      }
    } catch (err) {
      console.error('Error fetching community reports:', err);
    }
  },

  fetchStats: async (backendUrl) => {
    try {
      const response = await fetch(`${backendUrl}/api/community/stats`);
      const data = await response.json();
      if (data.success) {
        set({ stats: data.stats });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  },

  submitCommunityReport: async (backendUrl, reportData) => {
    try {
      const response = await fetch(`${backendUrl}/api/community`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });
      const data = await response.json();
      if (data.success) {
        // Re-fetch lists and stats
        get().fetchCommunityReports(backendUrl);
        get().fetchStats(backendUrl);
        return { success: true };
      }
      return { success: false, error: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}));
