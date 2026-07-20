import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useScamStore } from '../store/useScamStore';

export const useSocket = (backendUrl) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const updateAnalysis = useScamStore((state) => state.updateAnalysis);
  const fetchReports = useScamStore((state) => state.fetchReports);
  const endCallLocal = useScamStore((state) => state.endCallLocal);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(backendUrl, {
      autoConnect: false,
      transports: ['websocket']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket Hook] Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[Socket Hook] Socket disconnected');
      setIsConnected(false);
    });

    // Handle real-time AI updates
    socket.on('analysis-update', (data) => {
      // console.log('[Socket Hook] Analysis update:', data);
      updateAnalysis(data);
    });

    // Handle call saved confirmation
    socket.on('call-saved', (data) => {
      console.log('[Socket Hook] Call saved to DB:', data);
      if (data.success) {
        // Trigger re-fetch of past logs
        fetchReports(backendUrl);
      }
      endCallLocal();
    });

    socket.connect();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [backendUrl]);

  // Actions
  const startCall = (callerNumber, callerName) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('start-call', { callerNumber, callerName });
    } else {
      console.error('[Socket Hook] Cannot start call. Socket is not connected.');
    }
  };

  const sendTranscriptChunk = (speaker, text) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('transcript-chunk', { speaker, text });
    }
  };

  const endCall = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('end-call');
    }
  };

  return {
    isConnected,
    startCall,
    sendTranscriptChunk,
    endCall
  };
};
