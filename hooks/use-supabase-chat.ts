import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// Types
export interface ChatMessage {
  id: string;
  roomId: string;
  username: string;
  message: string;
  messageType: 'text' | 'system' | 'file';
  createdAt: string;
  userId?: string;
}

export interface ChatParticipant {
  id: string;
  roomId: string;
  username: string;
  joinedAt: string;
  lastSeen: string;
  isOnline: boolean;
  userId?: string;
}

export interface ChatRoom {
  id: string;
  roomId: string;
  name: string;
  password: string;
  expiryTime: string;
  expiresAt: string;
  isActive: boolean;
}

export interface ChatError {
  code: string;
  message: string;
  timestamp: Date;
}

export interface ChatState {
  messages: ChatMessage[];
  participants: ChatParticipant[];
  isConnected: boolean;
  isLoading: boolean;
  error: ChatError | null;
  lastMessageId: string | null;
}

export interface ChatActions {
  sendMessage: (username: string, message: string, messageType?: 'text' | 'system' | 'file') => Promise<ChatMessage>;
  joinRoom: (username: string) => Promise<ChatParticipant>;
  updateParticipantStatus: (username: string, isOnline: boolean) => Promise<ChatParticipant>;
  fetchMessages: (limit?: number) => Promise<void>;
  fetchParticipants: () => Promise<void>;
  reconnect: () => Promise<void>;
  clearError: () => void;
}

// Constants
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;
const MESSAGE_LIMIT = 100;
const RECONNECT_DELAY = 5000;
const DEBOUNCE_DELAY = 300;

// Utility functions
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const createError = (code: string, message: string): ChatError => ({
  code,
  message,
  timestamp: new Date()
});

// API client with retry logic
class ChatAPIClient {
  private static async makeRequest<T>(url: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      if (retryCount < RETRY_ATTEMPTS) {
        console.warn(`API request failed, retrying... (${retryCount + 1}/${RETRY_ATTEMPTS})`);
        await sleep(RETRY_DELAY * (retryCount + 1));
        return this.makeRequest<T>(url, options, retryCount + 1);
      }
      throw error;
    }
  }

  static async fetchMessages(roomId: string, limit = MESSAGE_LIMIT): Promise<{ messages: ChatMessage[] }> {
    return this.makeRequest(`/api/chat/messages?roomId=${roomId}&limit=${limit}`);
  }

  static async fetchParticipants(roomId: string): Promise<{ participants: ChatParticipant[] }> {
    return this.makeRequest(`/api/chat/participants?roomId=${roomId}`);
  }

  // NOTE: these methods now accept userId (UUID) and forward it to the API.
  static async sendMessage(roomId: string, username: string, userId: string, message: string, messageType = 'text'): Promise<{ message: ChatMessage }> {
    return this.makeRequest('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ roomId, username, userId, message, messageType }),
    });
  }

  static async joinRoom(roomId: string, username: string, userId: string): Promise<{ participant: ChatParticipant }> {
    return this.makeRequest('/api/chat/participants', {
      method: 'POST',
      body: JSON.stringify({ roomId, username, userId }),
    });
  }

  static async updateParticipantStatus(roomId: string, username: string, userId: string, isOnline: boolean): Promise<{ participant: ChatParticipant }> {
    return this.makeRequest('/api/chat/participants', {
      method: 'PUT',
      body: JSON.stringify({ roomId, username, userId, isOnline }),
    });
  }
}

// Main hook
export const useSupabaseChat = (roomId: string): ChatState & ChatActions => {
  // State
  const [state, setState] = useState<ChatState>({
    messages: [],
    participants: [],
    isConnected: false,
    isLoading: false,
    error: null,
    lastMessageId: null,
  });

  // Auth user state (NEW: store authenticated user info)
  const [authUser, setAuthUser] = useState<any | null>(null);

  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Memoized values
  const roomIdRef = useMemo(() => roomId, [roomId]);

  // State setters with error handling
  const setError = useCallback((error: ChatError | null) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, error }));
    }
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isLoading }));
    }
  }, []);

  const setConnected = useCallback((isConnected: boolean) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isConnected }));
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Fetch authenticated user once (NEW)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Try to get existing user
        const { data } = await supabase.auth.getUser();
        if (data.user && mounted) {
          setAuthUser(data.user);
          return;
        }
        
        // Create anonymous user session if no user exists
        const { data: anonData, error } = await supabase.auth.signInAnonymously();
        if (anonData.user && mounted) {
          setAuthUser(anonData.user);
        } else if (error) {
          console.warn('Failed to create anonymous user:', error);
          // Fallback: create a temporary user object
          if (mounted) {
            setAuthUser({
              id: crypto.randomUUID(),
              isAnonymous: true
            });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch auth user', err);
        // Fallback: create a temporary user object
        if (mounted) {
          setAuthUser({
            id: crypto.randomUUID(),
            isAnonymous: true
          });
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Fetch messages with error handling
  const fetchMessages = useCallback(async (limit = MESSAGE_LIMIT) => {
    if (!roomIdRef) return;

    try {
      setLoading(true);
      setError(null);

      const { messages } = await ChatAPIClient.fetchMessages(roomIdRef, limit);

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          messages: messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
          lastMessageId: messages.length > 0 ? messages[messages.length - 1].id : null,
        }));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError(createError('FETCH_MESSAGES_FAILED', error instanceof Error ? error.message : 'Failed to fetch messages'));
    } finally {
      setLoading(false);
    }
  }, [roomIdRef, setLoading, setError]);

  // Fetch participants with error handling
  const fetchParticipants = useCallback(async () => {
    if (!roomIdRef) return;

    try {
      setError(null);

      const { participants } = await ChatAPIClient.fetchParticipants(roomIdRef);

      if (isMountedRef.current) {
        setState(prev => ({ ...prev, participants }));
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      setError(createError('FETCH_PARTICIPANTS_FAILED', error instanceof Error ? error.message : 'Failed to fetch participants'));
    }
  }, [roomIdRef, setError]);

  // Send message with error handling
  const sendMessage = useCallback(async (
    username: string,
    message: string,
    messageType: 'text' | 'system' | 'file' = 'text'
  ): Promise<ChatMessage> => {
    if (!roomIdRef) {
      throw new Error('Room ID is required');
    }

    if (!authUser?.id) {
      const errMsg = 'User not authenticated';
      setError(createError('NOT_AUTHENTICATED', errMsg));
      throw new Error(errMsg);
    }

    try {
      setError(null);

      const { message: newMessage } = await ChatAPIClient.sendMessage(roomIdRef, username, authUser.id, message, messageType);

      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      const chatError = createError('SEND_MESSAGE_FAILED', error instanceof Error ? error.message : 'Failed to send message');
      setError(chatError);
      throw error;
    }
  }, [roomIdRef, setError, authUser]);

  // Join room with error handling (FIXED: pass userId UUID)
  const joinRoom = useCallback(async (username: string): Promise<ChatParticipant> => {
    if (!roomIdRef) {
      throw new Error('Room ID is required');
    }

    if (!authUser?.id) {
      const errMsg = 'User not authenticated';
      setError(createError('NOT_AUTHENTICATED', errMsg));
      throw new Error(errMsg);
    }

    try {
      setError(null);

      const { participant } = await ChatAPIClient.joinRoom(roomIdRef, username, authUser.id);

      return participant;
    } catch (error) {
      console.error('Error joining room:', error);
      const chatError = createError('JOIN_ROOM_FAILED', error instanceof Error ? error.message : 'Failed to join room');
      setError(chatError);
      throw error;
    }
  }, [roomIdRef, setError, authUser]);

  // Update participant status with debouncing (FIXED: pass userId UUID)
  const updateParticipantStatus = useCallback(async (username: string, isOnline: boolean): Promise<ChatParticipant> => {
    if (!roomIdRef) {
      throw new Error('Room ID is required');
    }

    if (!authUser?.id) {
      const errMsg = 'User not authenticated';
      setError(createError('NOT_AUTHENTICATED', errMsg));
      throw new Error(errMsg);
    }

    try {
      const { participant } = await ChatAPIClient.updateParticipantStatus(roomIdRef, username, authUser.id, isOnline);
      return participant;
    } catch (error) {
      console.error('Error updating participant status:', error);
      throw error;
    }
  }, [roomIdRef, authUser, setError]);

  // Reconnect function
  const reconnect = useCallback(async () => {
    if (!roomIdRef) return;

    try {
      console.log('Attempting to reconnect...');
      setConnected(false);

      // Cleanup existing channel
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch (e) {
          console.warn('Error unsubscribing channel during reconnect', e);
        }
        channelRef.current = null;
      }

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Fetch fresh data
      await Promise.all([fetchMessages(), fetchParticipants()]);

      // Re-establish real-time connection
      setupRealtimeConnection();
    } catch (error) {
      console.error('Reconnection failed:', error);
      setError(createError('RECONNECT_FAILED', 'Failed to reconnect'));

      // Schedule another reconnection attempt
      reconnectTimeoutRef.current = setTimeout(reconnect, RECONNECT_DELAY);
    }
  }, [roomIdRef, fetchMessages, fetchParticipants, setConnected, setError]);

  // Setup real-time connection
  const setupRealtimeConnection = useCallback(() => {
    if (!roomIdRef || channelRef.current) return;

    try {
      const channel = supabase
        .channel(`chat:${roomIdRef}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${roomIdRef}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            const newMessage = payload.new;
            if (newMessage && isMountedRef.current) {
              setState(prev => ({
                ...prev,
                messages: [...prev.messages, {
                  id: newMessage.id,
                  roomId: newMessage.room_id,
                  username: newMessage.username,
                  message: newMessage.message,
                  messageType: newMessage.message_type as 'text' | 'system' | 'file',
                  createdAt: newMessage.created_at,
                  userId: newMessage.user_id,
                }],
                lastMessageId: newMessage.id,
              }));
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_participants',
            filter: `room_id=eq.${roomIdRef}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            const newParticipant = payload.new;
            if (newParticipant && isMountedRef.current) {
              setState(prev => ({
                ...prev,
                participants: [...prev.participants, {
                  id: newParticipant.id,
                  roomId: newParticipant.room_id,
                  username: newParticipant.username,
                  joinedAt: newParticipant.joined_at,
                  lastSeen: newParticipant.last_seen,
                  isOnline: newParticipant.is_online,
                  userId: newParticipant.user_id,
                }],
              }));
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_participants',
            filter: `room_id=eq.${roomIdRef}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            const updatedParticipant = payload.new;
            if (updatedParticipant && isMountedRef.current) {
              setState(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                  p.id === updatedParticipant.id
                    ? {
                        ...p,
                        lastSeen: updatedParticipant.last_seen,
                        isOnline: updatedParticipant.is_online,
                      }
                    : p
                ),
              }));
            }
          }
        )
        .subscribe((status: string) => {
          console.log(`Real-time connection status: ${status}`);
          setConnected(status === 'SUBSCRIBED');

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('Real-time connection error, scheduling reconnection...');
            reconnectTimeoutRef.current = setTimeout(reconnect, RECONNECT_DELAY);
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('Error setting up real-time connection:', error);
      setError(createError('REALTIME_SETUP_FAILED', 'Failed to setup real-time connection'));
    }
  }, [roomIdRef, setConnected, setError, reconnect]);

  // Initialize connection
  useEffect(() => {
    if (!roomIdRef) return;

    isMountedRef.current = true;

    // Fetch initial data
    fetchMessages();
    fetchParticipants();

    // Setup real-time connection
    setupRealtimeConnection();

    // Cleanup function
    return () => {
      isMountedRef.current = false;

      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch (e) {
          console.warn('Error unsubscribing channel on unmount', e);
        }
        channelRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }

      setConnected(false);
    };
  }, [roomIdRef, fetchMessages, fetchParticipants, setupRealtimeConnection, setConnected]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!roomIdRef) return;

      if (document.visibilityState === 'visible') {
        // User came back to the page
        // NOTE: we cannot infer username here; caller should call updateParticipantStatus with proper username
        updateParticipantStatus('current_user', true).catch(() => {});
      } else {
        // User left the page
        updateParticipantStatus('current_user', false).catch(() => {});
      }
    };
    // Note: We can't reliably determine username here
      // This functionality should be handled by the component using this hook
      console.log('Visibility changed:', document.visibilityState);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomIdRef, updateParticipantStatus]);

  // Handle window focus/blur
  useEffect(() => {
    const handleFocus = () => {
      if (roomIdRef) {
        updateParticipantStatus('current_user', true).catch(() => {});
      }
    };

    const handleBlur = () => {
      if (roomIdRef) {
        updateParticipantStatus('current_user', false).catch(() => {});
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [roomIdRef, updateParticipantStatus]);

  return {
    ...state,
    sendMessage,
    joinRoom,
    updateParticipantStatus,
    fetchMessages,
    fetchParticipants,
    reconnect,
    clearError,
  };
};
