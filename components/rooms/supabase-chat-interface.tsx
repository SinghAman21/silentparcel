'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Users, Crown, Shield, Clock, LogOut, MoreVertical, Wifi, WifiOff, AlertCircle, UserMinus, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ThemeToggle from '@/components/theme-toggle';
import { LeaveRoomDialog } from '@/components/rooms/leave-room-dialog';
import { useSupabaseChat, ChatMessage, ChatParticipant } from '@/hooks/use-supabase-chat';
import { useToast } from '@/hooks/use-toast';

// Encryption utilities using Web Crypto API (browser-compatible)
const encryptMessage = async (message: string, password: string): Promise<string> => {
  try {
    // Derive key from password using PBKDF2
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the message
    const messageBuffer = encoder.encode(message);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      messageBuffer
    );
    
    // Combine salt, iv, and encrypted data
    const saltHex = Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join('');
    const ivHex = Array.from(iv, byte => byte.toString(16).padStart(2, '0')).join('');
    const encryptedHex = Array.from(new Uint8Array(encrypted), byte => byte.toString(16).padStart(2, '0')).join('');
    
    return saltHex + ':' + ivHex + ':' + encryptedHex;
  } catch (error) {
    console.error('Encryption failed:', error);
    return message; // Fallback to plain text
  }
};

const decryptMessage = async (encryptedData: string, password: string): Promise<string> => {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const salt = new Uint8Array(parts[0].match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const iv = new Uint8Array(parts[1].match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const encrypted = new Uint8Array(parts[2].match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    // Derive the same key from password
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt the message
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedData; // Return encrypted text if decryption fails
  }
};

interface SupabaseChatInterfaceProps {
  roomId: string;
  roomPassword: string;
  userData?: any; // Add userData prop
  onLeave: () => void;
  roomName?: string;
}

export function SupabaseChatInterface({ roomId, roomPassword, userData, onLeave, roomName }: SupabaseChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [showUsernameDialog, setShowUsernameDialog] = useState(true);
  const [timeLeft, setTimeLeft] = useState(3600); // Will be updated with actual room expiry
  const [roomExpiresAt, setRoomExpiresAt] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [userToKick, setUserToKick] = useState<string | null>(null);
  const [isKicking, setIsKicking] = useState(false);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null);
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map());
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    messages,
    participants,
    isConnected,
    error,
    sendMessage,
    joinRoom,
    updateParticipantStatus,
    kickParticipant,
    clearError,
    fetchParticipants
  } = useSupabaseChat(roomId);

  // Decrypt messages when they arrive or room password changes
  useEffect(() => {
    const decryptAllMessages = async () => {
      if (!roomPassword) return;
      
      const newDecryptedMap = new Map<string, string>();
      
      for (const msg of messages) {
        // Skip system messages (they're not encrypted)
        if (msg.messageType === 'system') {
          newDecryptedMap.set(msg.id, msg.message);
          continue;
        }
        
        // Check if message looks encrypted (has our format salt:iv:encrypted)
        if (msg.message.includes(':') && msg.message.split(':').length === 3) {
          try {
            const decrypted = await decryptMessage(msg.message, roomPassword);
            console.log('🔒 Encrypted from DB:', msg.message.substring(0, 50) + '...');
            console.log('🔐 Decrypted for display:', decrypted);
            newDecryptedMap.set(msg.id, decrypted);
          } catch (error) {
            console.error('Failed to decrypt message:', msg.id, error);
            // If decryption fails, show the original message
            newDecryptedMap.set(msg.id, msg.message);
          }
        } else {
          // Message is probably plain text (legacy or system message)
          newDecryptedMap.set(msg.id, msg.message);
        }
      }
      
      setDecryptedMessages(newDecryptedMap);
    };

    decryptAllMessages();
  }, [messages, roomPassword]);

  // FIXED: Comprehensive session and admin role persistence
  useEffect(() => {
    const sessionKey = `room_${roomId}_session`;
    const storedSession = localStorage.getItem(sessionKey);
    
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        const now = Date.now();
        
        // Check if session is still valid
        if (session.expiry && now < session.expiry) {
          if (session.username && !username) {
            setUsername(session.username);
          }
          if (session.isAdmin) {
            setIsCurrentUserAdmin(true);
          }
          setSessionExpiry(session.expiry);
          
          // If we have a valid session and userData matches, skip username dialog
          if (session.username && (!userData || userData.username === session.username)) {
            setShowUsernameDialog(false);
          }
        } else {
          // Session expired, clean up
          localStorage.removeItem(sessionKey);
        }
      } catch (error) {
        console.error('Error parsing stored session:', error);
        localStorage.removeItem(sessionKey);
      }
    }
    
    // Set up new session if userData is provided
    if (userData?.username) {
      const expiry = Date.now() + (2 * 60 * 60 * 1000); // 2 hours
      const sessionData = {
        username: userData.username,
        isAdmin: userData.isAdmin || false,
        role: userData.isAdmin ? 'admin' : 'participant',
        joinedAt: new Date().toISOString(),
        expiry
      };
      
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      setUsername(userData.username);
      setIsCurrentUserAdmin(userData.isAdmin || false);
      setSessionExpiry(expiry);
      setShowUsernameDialog(false);
    }
  }, [roomId, userData]);

  // FIXED: Determine admin status from participants (fallback for refresh)
  useEffect(() => {
    if (participants.length > 0 && username) {
      const sortedParticipants = [...participants].sort((a, b) => 
        new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
      );
      const firstParticipant = sortedParticipants[0];
      
      // If current user is the first participant and not already admin, make them admin
      if (firstParticipant?.username === username && !isCurrentUserAdmin) {
        setIsCurrentUserAdmin(true);
        
        // Update session with admin status
        const sessionKey = `room_${roomId}_session`;
        const storedSession = localStorage.getItem(sessionKey);
        if (storedSession) {
          try {
            const session = JSON.parse(storedSession);
            session.isAdmin = true;
            session.role = 'admin';
            localStorage.setItem(sessionKey, JSON.stringify(session));
          } catch (error) {
            console.error('Error updating session:', error);
          }
        }
      }
    }
  }, [participants, username, roomId, isCurrentUserAdmin]);

  // FIXED: Session expiry monitoring and initial data loading
  useEffect(() => {
    // Initial participant fetch when component mounts
    if (roomId) {
      fetchParticipants();
    }
    
    if (!sessionExpiry) return;
    
    const checkExpiry = () => {
      const now = Date.now();
      if (now >= sessionExpiry) {
        // Session expired
        const sessionKey = `room_${roomId}_session`;
        localStorage.removeItem(sessionKey);
        setIsCurrentUserAdmin(false);
        setSessionExpiry(null);
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please rejoin the room.",
          variant: "destructive"
        });
      }
    };
    
    const interval = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [sessionExpiry, roomId, toast, fetchParticipants]);

  // FIXED: Enhanced join room logic with session management and participant refresh
  useEffect(() => {
    if (username && !isJoining) {
      // Skip if we already have a valid session
      const sessionKey = `room_${roomId}_session`;
      const storedSession = localStorage.getItem(sessionKey);
      
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession);
          if (session.username === username && session.expiry > Date.now()) {
            // Valid session exists, no need to rejoin but refresh participants
            setShowUsernameDialog(false);
            fetchParticipants(); // Refresh to ensure we have current participant list
            return;
          }
        } catch (error) {
          console.error('Error parsing session:', error);
        }
      }
      
      // FIXED: Only join if userData is provided from room page (user already registered)
      // Don't attempt to join from chat interface if user came through proper room join flow
      if (userData?.username && userData.username === username) {
        // User came from room page with userData - just refresh participants
        setShowUsernameDialog(false);
        
        // Create session after room page provided userData
        const expiry = Date.now() + (2 * 60 * 60 * 1000); // 2 hours
        const sessionData = {
          username,
          isAdmin: userData?.isAdmin || false,
          role: userData?.isAdmin ? 'admin' : 'participant',
          joinedAt: new Date().toISOString(),
          expiry
        };
        
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        setSessionExpiry(expiry);
        
        // Refresh participants to get current list
        fetchParticipants();
        
        console.log(`User ${username} entered room as ${userData?.isAdmin ? 'admin' : 'participant'} (already registered)`);
        toast({
          title: "Welcome",
          description: `Entered room as ${userData?.isAdmin ? 'Admin' : 'Participant'}`,
        });
      } else if (!userData?.username && username) {
        // Legacy path - user entered username directly in chat interface
        setIsJoining(true);
        joinRoom(username)
          .then(() => {
            setShowUsernameDialog(false);
            
            // Create session after successful join
            const expiry = Date.now() + (2 * 60 * 60 * 1000); // 2 hours
            const sessionData = {
              username,
              isAdmin: false, // Will be updated if user is first to join
              role: 'participant',
              joinedAt: new Date().toISOString(),
              expiry
            };
            
            localStorage.setItem(sessionKey, JSON.stringify(sessionData));
            setSessionExpiry(expiry);
            
            // Force refresh participants after successful join
            setTimeout(() => {
              fetchParticipants();
            }, 500); // Small delay to ensure server has processed the join
            
            console.log(`User ${username} joined room via chat interface`);
            toast({
              title: "Success",
              description: "Joined room successfully",
            });
          })
          .catch((error) => {
            console.error('Failed to join room:', error);
            toast({
              title: "Error",
              description: "Failed to join room. Please try again.",
              variant: "destructive"
            });
          })
          .finally(() => {
            setIsJoining(false);
          });
      }
    }
  }, [username, joinRoom, isJoining, userData, roomId, toast, fetchParticipants]);

  // FIXED: Fetch room info to get actual expiry time
  useEffect(() => {
    const fetchRoomInfo = async () => {
      try {
        console.log(`Fetching room info for room: ${roomId}`);
        const response = await fetch(`/api/chat/rooms/${roomId}`);
        console.log('Room info response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Room info data:', data);
          
          if (data.success && data.room.expiresAt) {
            console.log('Setting room expiry time:', data.room.expiresAt);
            setRoomExpiresAt(data.room.expiresAt);
            
            // Calculate initial time left
            const expiryTime = new Date(data.room.expiresAt).getTime();
            const now = Date.now();
            const secondsLeft = Math.max(0, Math.floor((expiryTime - now) / 1000));
            console.log('Initial seconds left:', secondsLeft);
            setTimeLeft(secondsLeft);
          } else {
            console.warn('Room info response missing expiresAt:', data);
          }
        } else {
          console.error('Failed to fetch room info, status:', response.status);
        }
      } catch (error) {
        console.error('Error fetching room info:', error);
      }
    };
    
    if (roomId) {
      fetchRoomInfo();
    }
  }, [roomId]);

  // FIXED: Timer countdown with actual room expiry time
  useEffect(() => {
    if (!roomExpiresAt) return;
    
    const timer = setInterval(() => {
      const expiryTime = new Date(roomExpiresAt).getTime();
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.floor((expiryTime - now) / 1000));
      
      setTimeLeft(secondsLeft);
      
      // If time is up, show expiry message and redirect
      if (secondsLeft === 0) {
        toast({
          title: "Room Expired",
          description: "This room has expired and will be cleaned up.",
          variant: "destructive"
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          onLeave();
        }, 3000);
        
        clearInterval(timer);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [roomExpiresAt, toast, onLeave]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !username || isSending) return;

    setIsSending(true);
    try {
      // Encrypt message before sending to database
      const encryptedContent = await encryptMessage(message, roomPassword);
      
      console.log('🔐 Original message:', message);
      console.log('🔒 Encrypted for database:', encryptedContent);
      
      // Send encrypted message to database
      await sendMessage(encryptedContent, username, 'text');
      setMessage('');
      clearError();
      
      // Show encryption status in toast
      toast({
        title: "Message Encrypted",
        description: "Your message has been encrypted and sent securely.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleUsernameSubmit = (newUsername: string) => {
    if (newUsername.trim()) {
      const trimmedUsername = newUsername.trim();
      setUsername(trimmedUsername);
      
      // Create session for manual username entry
      const sessionKey = `room_${roomId}_session`;
      const expiry = Date.now() + (2 * 60 * 60 * 1000); // 2 hours
      const sessionData = {
        username: trimmedUsername,
        isAdmin: false, // Will be updated if user is first to join
        role: 'participant',
        joinedAt: new Date().toISOString(),
        expiry
      };
      
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      setSessionExpiry(expiry);
    }
  };

  const handleLeaveRoom = () => {
    setShowLeaveDialog(true);
  };

  const confirmLeaveRoom = async () => {
    try {
      await updateParticipantStatus(username, false);
      
      // Clean up session data when leaving
      const sessionKey = `room_${roomId}_session`;
      localStorage.removeItem(sessionKey);
      setIsCurrentUserAdmin(false);
      setSessionExpiry(null);
      
      toast({
        title: "Left Room",
        description: "You have successfully left the room.",
      });
    } catch (error) {
      console.error('Failed to update participant status:', error);
    }
    setShowLeaveDialog(false);
    onLeave();
  };

  const getParticipantColor = (participantUsername: string) => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
    const index = participantUsername.length % colors.length;
    return colors[index];
  };

  const getParticipantAvatar = (participantUsername: string) => {
    const avatars = ['🦊', '🐺', '🦝', '🐧', '🦔', '🐨', '🐯', '🦁', '🐸', '🐙'];
    const index = participantUsername.length % avatars.length;
    return avatars[index];
  };

  // FIXED: Use persistent admin status and debug participant count issues
  const sortedParticipants = [...participants].sort((a, b) => 
    new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  );
  
  // Debug logging for participant issues
  // useEffect(() => {
  //   console.log('Participants updated:', {
  //     count: participants.length,
  //     sortedCount: sortedParticipants.length,
  //     participants: participants.map(p => ({ username: p.username, isOnline: p.isOnline, id: p.id })),
  //     currentUsername: username
  //   });
  // }, [participants, username]);  // only for dev purposes
  
  const adminStatus = isCurrentUserAdmin || 
    (sortedParticipants.length > 0 && sortedParticipants[0]?.username === username);

  const handleKickClick = (targetUsername: string) => {
    setUserToKick(targetUsername);
    setKickDialogOpen(true);
  };

  const handleConfirmKick = async () => {
    if (!userToKick) return;
    
    setIsKicking(true);
    try {
      await kickParticipant(userToKick, username, 'admin-user-id');
      toast({
        title: "User Removed",
        description: `${userToKick} has been removed from the room.`,
      });
    } catch (error) {
      console.error('Failed to kick user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsKicking(false);
      setKickDialogOpen(false);
      setUserToKick(null);
    }
  };

  if (showUsernameDialog) {
    return (
      <Dialog open={showUsernameDialog} onOpenChange={setShowUsernameDialog}>
        <DialogContent className="bg-background/95 backdrop-blur-xs border-border/50">
          <DialogHeader>
            <DialogTitle>Join Chat Room</DialogTitle>
            <DialogDescription>
              Enter a username to join the secret room
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUsernameSubmit(username)}
              className="bg-background/50"
            />
            <Button 
              onClick={() => handleUsernameSubmit(username)}
              disabled={!username.trim() || isJoining}
              className="w-full"
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/40 p-4 bg-background/80 backdrop-blur-xs shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="font-bold text-lg">{roomName || 'Secret Chat Room'}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">Room ID:</span>
                <div className="flex items-center space-x-2">
                  <code className="bg-muted/50 px-2 py-1 rounded text-sm font-mono">
                    {roomId}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(roomId);
                        setCopiedRoomId(true);
                        setTimeout(() => setCopiedRoomId(false), 2000);
                        toast({ 
                          title: "Copied!", 
                          description: "Room ID copied to clipboard" 
                        });
                      } catch (err) {
                        console.error('Failed to copy room ID:', err);
                        toast({
                          title: "Error",
                          description: "Failed to copy room ID to clipboard",
                          variant: "destructive"
                        });
                      }
                    }}
                    className="h-6 w-6 p-0 hover:scale-105 transition-transform"
                    title="Copy Room ID"
                  >
                    {copiedRoomId ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Self-destructs in {formatTime(timeLeft)}</span>
                <div className="flex items-center space-x-1">
                  {isConnected ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                  <span className="text-xs">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="h-3 w-3 text-green-500" />
                  <span className="text-xs">E2E Encrypted</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{sortedParticipants.length}/10</span>
            </Badge>
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLeaveRoom}
              className="hover:scale-105 transition-transform hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Leave Room
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Error Display */}
          {error && (
            <div className="p-3 mx-4 mb-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{error.message}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearError}
                  className="ml-auto h-6 w-6 p-0 text-destructive hover:text-destructive"
                >
                  ×
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-full">
              {messages.map((msg) => {
                // Get decrypted message content
                const messageContent = decryptedMessages.get(msg.id) || msg.message;
                const isEncrypted = msg.message.includes(':') && msg.message.split(':').length === 3 && msg.messageType !== 'system';
                
                return (
                  <div key={msg.id} className="flex items-start space-x-3 max-w-full">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback 
                        className="text-xs" 
                        style={{ backgroundColor: getParticipantColor(msg.username) + '20' }}
                      >
                        {getParticipantAvatar(msg.username)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="max-w-full">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          <span 
                            className="font-semibold text-sm truncate"
                            style={{ color: getParticipantColor(msg.username) }}
                          >
                            {msg.username}
                          </span>
                          {isEncrypted && (
                            <Shield className="h-3 w-3 text-green-500" />
                          )}
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="bg-muted/50 rounded-lg px-3 py-2 max-w-full break-words">
                          {messageContent}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t border-border/40 p-4 bg-background/50 shrink-0">
            <div className="flex space-x-2">
              {/* <Button variant="outline" size="icon" className="hover:scale-105 transition-transform shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button> */}
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="flex-1 bg-background/50"
                disabled={!isConnected || isSending}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!message.trim() || !isConnected || isSending}
                className="hover:scale-105 transition-transform shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Users Sidebar */}
        <div className="w-72 border-l border-border/40 bg-muted/20 shrink-0 hidden md:flex flex-col">
          <div className="p-4 border-b border-border/40 shrink-0">
            <h3 className="font-semibold flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Users ({sortedParticipants.length})
              </div>
              <div className="flex items-center space-x-2">
                {adminStatus && (
                  <div className="flex items-center text-xs text-primary">
                    <Crown className="h-3 w-3 mr-1" />
                    Admin
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    fetchParticipants();
                    toast({ title: "Refreshed", description: "Participant list updated" });
                  }}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  title="Refresh participant list"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </Button>
              </div>
            </h3>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {sortedParticipants.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No participants found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchParticipants()}
                    className="mt-2"
                  >
                    Refresh List
                  </Button>
                </div>
              ) : (
                sortedParticipants.map((participant, index) => (
                  <div key={participant.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback 
                          className="text-xs"
                          style={{ backgroundColor: getParticipantColor(participant.username) + '20' }}
                        >
                          {getParticipantAvatar(participant.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1">
                          <span 
                            className="font-medium text-sm truncate"
                            style={{ color: getParticipantColor(participant.username) }}
                          >
                            {participant.username}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${participant.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {index === 0 && (
                            <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full flex items-center">
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </span>
                          )}
                        </div>
                        {participant.username === username && (
                          <span className="text-xs text-muted-foreground">You</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Kick button for admin */}
                    {adminStatus && 
                     participant.username !== username && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleKickClick(participant.username)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title={`Remove ${participant.username} from room`}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <LeaveRoomDialog
        isOpen={showLeaveDialog}
        onConfirm={confirmLeaveRoom}
        onCancel={() => setShowLeaveDialog(false)}
        roomId={roomId}
      />
      
      {/* Kick confirmation dialog */}
      <AlertDialog open={kickDialogOpen} onOpenChange={setKickDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{userToKick}</strong> from the room? 
              They will no longer be able to participate in this session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isKicking}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmKick}
              disabled={isKicking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isKicking ? "Removing..." : "Remove User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 