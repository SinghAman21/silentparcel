"use client";

import dynamic from "next/dynamic";
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { editor as MonacoEditorTypes } from "monaco-editor";

import { Send, Users, Clock, LogOut, Settings, Download, Code, MessageSquare, AlertCircle, GripVertical, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ThemeToggle from "@/components/theme-toggle";
import { LeaveRoomDialog } from "@/components/rooms/leave-room-dialog";
import { useSupabaseChat, ChatMessage, ChatParticipant } from "@/hooks/use-supabase-chat";
import { useToast } from "@/hooks/use-toast";

import { CompactUserDisplay } from "@/components/rooms/compact-user-display";
import { supabase } from "@/lib/supabase";

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

interface CollaborativeCodeInterfaceProps {
  roomId: string;
  roomPassword: string;
  userData?: any;
  onLeave: () => void;
  roomName?: string;
}

interface CursorPosition {
  lineNumber: number;
  column: number;
  username: string;
  color: string;
  lastSeen?: number;
}

type RealtimeChannel = ReturnType<typeof supabase.channel>;

const DOCUMENT_TABLE = "collaborative_code_documents";
const DOCUMENT_NAME = "main"; // single doc per room
const DEBOUNCE_MS = 400;
const CURSOR_THROTTLE_MS = 200;
const CURSOR_STALE_MS = 15_000;

export function CollaborativeCodeInterface({
  roomId,
  roomPassword,
  userData,
  onLeave,
  roomName
}: CollaborativeCodeInterfaceProps) {
  // UI + editor state
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [showUsernameDialog, setShowUsernameDialog] = useState(true);
  const [timeLeft, setTimeLeft] = useState(3600); // Will be updated with actual room expiry
  const [roomExpiresAt, setRoomExpiresAt] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map());
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  
  // Chat references
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [showSettings, setShowSettings] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [cursorPositions, setCursorPositions] = useState<CursorPosition[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [initialCode, setInitialCode] = useState<string>("");
  const [lastEditorName, setLastEditorName] = useState<string>("-");
  const [lastEditedAt, setLastEditedAt] = useState<string>("-");
  const [lastEditedBy, setLastEditedBy] = useState<string | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);

  // Resizer state for chat panel
  const [chatPanelWidth, setChatPanelWidth] = useState(320); // Default 320px (80 * 4)
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Supabase auth user
  const [userId, setUserId] = useState<string | null>(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null);

  const { toast } = useToast();

  // Monaco refs
  const editorRef = useRef<MonacoEditorTypes.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);

  // Realtime + flow control refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isRemoteUpdateRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);
  const lastLocalContentRef = useRef<string>("");
  const lastCursorSentRef = useRef<number>(0);

  // Decorations for remote cursors
  const remoteCursorDecorationsRef = useRef<Map<string, string[]>>(new Map());

  // Chat hook already in your project
  const {
    messages,
    participants,
    isConnected: chatConnected,
    error: chatError,
    sendMessage,
    joinRoom,
    updateParticipantStatus,
    kickParticipant,
    clearError,
    fetchParticipants
  } = useSupabaseChat(roomId);

  // Get auth user once
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

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

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // FIXED: Username (seeded / provided) - Prevent automatic phantom user creation
  useEffect(() => {
    if (userData?.username) {
      setUsername(userData.username);
      setShowUsernameDialog(false);
      return;
    }
    // Don't automatically generate username - wait for user input
    if (!username) {
      setShowUsernameDialog(true);
    }
  }, [roomId, userData, username]);

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

  // Ensure a document row exists, and load it
  const ensureAndLoadDocument = useCallback(async () => {
    try {
      console.log(`Loading documents for room: ${roomId}`);
      
      // Try to fetch existing documents via API
      const response = await fetch(`/api/chat/rooms/${roomId}/documents`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error fetching documents:', data);
        
        if (response.status === 404) {
          toast({
            title: "Room Not Found",
            description: data.details || `Room ${roomId} does not exist`,
            variant: "destructive"
          });
        } else if (response.status === 410) {
          toast({
            title: "Room Expired",
            description: data.details || `Room ${roomId} has expired or been deactivated`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error Loading Documents",
            description: data.error || "Failed to load documents",
            variant: "destructive"
          });
        }
        
        // Set fallback empty document
        setInitialCode("");
        lastLocalContentRef.current = "";
        return;
      }
      
      if (data.success && data.documents && data.documents.length > 0) {
        // Use the first document (or find the main one)
        const doc = data.documents.find((d: any) => d.documentName === DOCUMENT_NAME) || data.documents[0];
        const content = doc.content || "";
        
        console.log(`Loaded document: ${doc.documentName} (${doc.language})`);
        
        setInitialCode(content);
        lastLocalContentRef.current = content;
        setSelectedLanguage(doc.language || "javascript");
        setLastEditedBy(doc.lastEditedBy);
        setCurrentDocumentId(doc.id);
        
        if (doc.updatedAt) {
          setLastEditedAt(new Date(doc.updatedAt).toLocaleString());
        }
        
        // Resolve last editor username
        if (doc.lastEditedBy) {
          const participant = participants.find(p => p.userId === doc.lastEditedBy);
          setLastEditorName(participant?.username || "Unknown");
        }
      } else {
        console.log('No existing documents, creating initial document');
        
        // Create initial document via API
        const createResponse = await fetch(`/api/chat/rooms/${roomId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentName: DOCUMENT_NAME,
            language: selectedLanguage,
            content: "",
            userId: userId
          })
        });
        
        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          console.error('Error creating document:', errorData);
          
          toast({
            title: "Error Creating Document",
            description: errorData.details || errorData.error || "Failed to create initial document",
            variant: "destructive"
          });
        } else {
          const createData = await createResponse.json();
          if (createData.success && createData.document) {
            setCurrentDocumentId(createData.document.id);
            console.log(`Created initial document: ${createData.document.id}`);
          }
        }
        
        setInitialCode("");
        setLastEditorName(username || "-");
        setLastEditedAt(new Date().toLocaleString());
        lastLocalContentRef.current = "";
      }
    } catch (error) {
      console.error("Exception loading document:", error);
      
      toast({
        title: "Connection Error",
        description: "Failed to connect to the server. Please check your connection and try again.",
        variant: "destructive"
      });
      
      // Fallback to empty document
      setInitialCode("");
      lastLocalContentRef.current = "";
    }
  }, [roomId, selectedLanguage, userId, username, participants, toast]);

  // Supabase Realtime channel: code + cursor broadcasts
  useEffect(() => {
    if (!roomId || !username) return;

    let mounted = true;

    (async () => {
      await ensureAndLoadDocument();

      const channel = supabase.channel(`code-room-${roomId}`);
      channelRef.current = channel;

      // Incoming code updates (broadcast)
      channel.on("broadcast", { event: "code-update" }, (payload: any) => {
        const content: string | undefined = payload?.payload?.content;
        const editorUsername: string | undefined = payload?.payload?.username;
        const ts: string | undefined = payload?.payload?.updatedAt;
        if (typeof content !== "string") return;

        const current = editorRef.current?.getValue?.() ?? initialCode;
        if (current === content) return;

        isRemoteUpdateRef.current = true;
        if (editorRef.current) {
          editorRef.current.setValue(content);
        } else {
          setInitialCode(content);
        }
        lastLocalContentRef.current = content;
        setTimeout(() => (isRemoteUpdateRef.current = false), 30);

        if (editorUsername) setLastEditorName(editorUsername);
        if (ts) setLastEditedAt(new Date(ts).toLocaleString());
      });

      // Incoming cursor updates (broadcast)
      channel.on("broadcast", { event: "cursor-update" }, (payload: any) => {
        const p = payload?.payload;
        if (!p || p.username === username) return;

        setCursorPositions((prev) => {
          const others = prev.filter((c) => c.username !== p.username);
          return [
            ...others,
            {
              username: p.username,
              color: p.color,
              lineNumber: p.lineNumber,
              column: p.column,
              lastSeen: Date.now()
            }
          ];
        });

        // Render remote cursor decoration
        if (!editorRef.current || !monacoRef.current) return;
        try {
          const monaco = monacoRef.current!;
          const editor = editorRef.current!;
          const model = editor.getModel();
          if (!model) return;

          // Prepare a decoration range at the caret position (zero-length)
          const position = new monaco.Position(p.lineNumber, p.column);
          const range = new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          );

          const className = `remote-cursor-${safeCssClass(p.username)}`;
          // Create/Update CSS for this user's cursor color
          injectCursorStyles(className, p.color);

          const newDecorations = [
            {
              range,
              options: {
                className, // draws a caret
                // small after-content label with username
                after: {
                  content: ` ${p.username} `,
                  inlineClassName: `${className}-label`
                },
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
              }
            }
          ];

          const prevIds = remoteCursorDecorationsRef.current.get(p.username) ?? [];
          const newIds = editor.deltaDecorations(prevIds, newDecorations as any);
          remoteCursorDecorationsRef.current.set(p.username, newIds);
        } catch (e) {
          console.error("Cursor decoration error:", e);
        }
      });

      await channel.subscribe();
      if (!mounted) return;
      setIsConnected(true);
    })();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
      // Clear remote cursor decorations
      if (editorRef.current) {
        const editor = editorRef.current;
        const allIds = Array.from(remoteCursorDecorationsRef.current.values()).flat();
        if (allIds.length) editor.deltaDecorations(allIds, []);
      }
      remoteCursorDecorationsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, username]);

  // Prune stale cursors
  useEffect(() => {
    const id = setInterval(() => {
      setCursorPositions((prev) => prev.filter((c) => (c.lastSeen ?? 0) > Date.now() - CURSOR_STALE_MS));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Editor mount + handlers
  const handleEditorDidMount = useCallback(
    (editor: MonacoEditorTypes.IStandaloneCodeEditor, monaco: typeof import("monaco-editor")) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Apply initial content
      if (initialCode !== undefined) {
        isRemoteUpdateRef.current = true;
        editor.setValue(initialCode);
        lastLocalContentRef.current = initialCode;
        setTimeout(() => (isRemoteUpdateRef.current = false), 30);
      }

      // Broadcast + persist content (debounced)
      editor.onDidChangeModelContent(() => {
        if (isRemoteUpdateRef.current) return;

        const content = editor.getValue();
        if (content === lastLocalContentRef.current) return;

        // Debounce
        if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = window.setTimeout(async () => {
          lastLocalContentRef.current = content;

          const updatedAt = new Date().toISOString();

          // Broadcast (fast)
          try {
            if (channelRef.current) {
              channelRef.current.send({
                type: "broadcast",
                event: "code-update",
                payload: {
                  content,
                  username, // for UI hints on listeners
                  updatedAt
                }
              });
            }
          } catch (err) {
            console.error("Broadcast code-update failed:", err);
          }

          // Persist to DB via API
          try {
            if (currentDocumentId) {
              // Update existing document
              const response = await fetch(`/api/chat/rooms/${roomId}/documents/${currentDocumentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content,
                  language: selectedLanguage,
                  userId: userId
                })
              });
              
              if (!response.ok) {
                console.error('Failed to update document via API');
              }
            } else {
              // Create new document
              const response = await fetch(`/api/chat/rooms/${roomId}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  documentName: DOCUMENT_NAME,
                  language: selectedLanguage,
                  content,
                  userId: userId
                })
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.document) {
                  setCurrentDocumentId(data.document.id);
                }
              } else {
                console.error('Failed to create document via API');
              }
            }

            // Update UI hints immediately
            setLastEditorName(username || "-");
            setLastEditedAt(new Date().toLocaleString());
          } catch (err) {
            console.error("Persist doc exception:", err);
          }
        }, DEBOUNCE_MS);
      });

      // Cursor movement -> throttle broadcasts
      editor.onDidChangeCursorPosition((e) => {
        try {
          if (!channelRef.current) return;
          const now = Date.now();
          if (now - lastCursorSentRef.current < CURSOR_THROTTLE_MS) return;
          lastCursorSentRef.current = now;

          channelRef.current.send({
            type: "broadcast",
            event: "cursor-update",
            payload: {
              username,
              color: getCursorColor(username),
              lineNumber: e.position.lineNumber,
              column: e.position.column
            }
          });
        } catch (err) {
          console.error("cursor-update broadcast failed:", err);
        }
      });
    },
    [initialCode, roomId, selectedLanguage, userId, username, currentDocumentId]
  );

  // Change language: update Monaco + persist language column
  const handleLanguageChange = async (language: string) => {
    setSelectedLanguage(language);
    if (editorRef.current && monacoRef.current) {
      monacoRef.current.editor.setModelLanguage(editorRef.current.getModel()!, language);
    }
    
    // Persist language change via API
    try {
      if (currentDocumentId) {
        const response = await fetch(`/api/chat/rooms/${roomId}/documents/${currentDocumentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language,
            userId: userId
          })
        });
        
        if (!response.ok) {
          console.error('Failed to update document language via API');
        }
      }
    } catch (e) {
      console.error("Failed to persist language:", e);
    }
  };

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

  // Helpers
  const getCursorColor = (name: string) => {
    const colors = ["#e57373", "#64b5f6", "#81c784", "#ffd54f", "#ba68c8", "#4db6ac", "#ff8a65", "#7986cb"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  };

  const getParticipantColor = (participantUsername: string) => {
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
    const index = participantUsername.length % colors.length;
    return colors[index];
  };

  const getParticipantAvatar = (participantUsername: string) => {
    const avatars = ["🦊", "🐺", "🦝", "🐧", "🦔", "🐨", "🐯", "🦁", "🐸", "🐙"];
    const index = participantUsername.length % avatars.length;
    return avatars[index];
  };

  const handleUsernameSubmit = async (newUsername: string) => {
    if (!newUsername.trim()) return;
    
    setIsJoining(true);
    try {
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
      
      // Join room after setting username
      await joinRoom(trimmedUsername);
      setShowUsernameDialog(false);
      
      toast({
        title: "Success",
        description: "Successfully joined the collaborative coding room!",
      });
    } catch (error) {
      console.error('Failed to join room:', error);
      toast({
        title: "Error",
        description: "Failed to join room. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = () => setShowLeaveDialog(true);

  const handleSendMessage = async () => {
    if (!message.trim() || !username || isSendingMessage) return;

    setIsSendingMessage(true);
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
      setIsSendingMessage(false);
    }
  };

  const handleKickParticipant = async (targetUsername: string) => {
    if (!isCurrentUserAdmin && !userData?.isAdmin) {
      toast({
        title: "Error",
        description: "Only the room admin can remove participants.",
        variant: "destructive"
      });
      return;
    }

    try {
      await kickParticipant(targetUsername, username, userId || 'anonymous');
    } catch (error) {
      console.error('Failed to kick participant:', error);
      throw error; // Re-throw to let CompactUserDisplay handle the error
    }
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
      console.error("Failed to update participant status:", error);
    }
    setShowLeaveDialog(false);
    onLeave();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getFileExtension = (language: string) => {
    const extensions: Record<string, string> = {
      javascript: "js",
      typescript: "ts",
      python: "py",
      java: "java",
      cpp: "cpp",
      c: "c",
      html: "html",
      css: "css",
      json: "json",
      markdown: "md"
    };
    return extensions[language] || "txt";
  };

  const handleDownloadCode = () => {
    if (!editorRef.current) return;
    const content = editorRef.current.getValue();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code-${roomId}.${getFileExtension(selectedLanguage)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Resizer handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(chatPanelWidth);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = startX - e.clientX; // Negative delta expands chat panel
    const newWidth = Math.max(250, Math.min(600, startWidth + deltaX)); // Min 250px, Max 600px
    setChatPanelWidth(newWidth);
  }, [isResizing, startX, startWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add global mouse events for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Username dialog
  if (showUsernameDialog) {
    return (
      <Dialog open={showUsernameDialog} onOpenChange={setShowUsernameDialog}>
        <DialogContent className="bg-background/95 backdrop-blur-xs border-border/50">
          <DialogHeader>
            <DialogTitle>Join Collaborative Coding Room</DialogTitle>
            <DialogDescription>Enter a username to join the collaborative coding session</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUsernameSubmit(username)}
              className="bg-background/50"
            />
            <Button onClick={() => handleUsernameSubmit(username)} disabled={!username.trim() || isJoining} className="w-full">
              {isJoining ? "Joining..." : "Join Room"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Remote cursor styles injected globally */}
      <style jsx global>{`
        /* caret line */
        [class^="remote-cursor-"], [class*=" remote-cursor-"] {
          border-left-width: 2px;
          border-left-style: solid;
          margin-left: -1px;
        }
        /* username badge next to caret */
        [class$="-label"] {
          background: rgba(0,0,0,0.6);
          color: white;
          border-radius: 3px;
          padding: 0 3px;
          margin-left: 2px;
          font-size: 10px;
        }
        /* Resizer styles */
        .resizer {
          transition: background-color 0.2s ease;
        }
        .resizer:hover {
          background-color: hsl(var(--primary) / 0.2) !important;
        }
        .resizer.resizing {
          background-color: hsl(var(--primary) / 0.3) !important;
        }
        /* Prevent text selection during resize */
        .resizing * {
          user-select: none !important;
        }
        /* Message text handling */
        .message-content {
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
          hyphens: auto;
          white-space: pre-wrap;
          line-height: 1.5;
          max-width: 100%;
        }
        /* Handle URLs and long strings */
        .message-content a,
        .message-content code {
          word-break: break-all;
          overflow-wrap: break-word;
        }
      `}</style>

      {/* Header */}
      <div className="border-b border-border/40 p-4 bg-background/80 backdrop-blur-xs shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="font-bold text-lg">{roomName || 'Collaborative Code Room'}</h1>
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
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Self-destructs in {formatTime(timeLeft)}
              </span>
              <span className="inline-flex items-center gap-1">
                {isConnected ? (
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                ) : (
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                )}
                {isConnected ? "Connected" : "Disconnected"}
              </span>
              <span className="inline-flex items-center gap-1">
                Last edited by <strong>{lastEditorName}</strong> at {lastEditedAt}
              </span>
            </div>
          </div>
          
          {/* Compact User Display for Collaborative Coding */}
          <div className="flex items-center space-x-4">
            <CompactUserDisplay 
              participants={participants}
              currentUsername={username}
              isCurrentUserAdmin={isCurrentUserAdmin || userData?.isAdmin || false}
              onKickParticipant={handleKickParticipant}
              maxVisibleAvatars={5}
            />
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4" />
              </Button>
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={handleLeaveRoom}>
                <LogOut className="h-4 w-4 mr-2" />
                Leave Room
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main Code Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="border-b border-border/40 p-2 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label htmlFor="language-select" className="text-sm">Language:</Label>
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger id="language-select" className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="c">C</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="css">CSS</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              {/* Active Cursors Display */}
              {cursorPositions.length > 0 && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    {cursorPositions.slice(0, 3).map((cursor, index) => (
                      <div 
                        key={index} 
                        className="flex items-center space-x-1 bg-muted/50 rounded px-2 py-1"
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cursor.color }} />
                        <span className="text-xs truncate max-w-16">{cursor.username}</span>
                        <span className="text-xs text-muted-foreground">L{cursor.lineNumber}</span>
                      </div>
                    ))}
                    {cursorPositions.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{cursorPositions.length - 3} more</span>
                    )}
                  </div>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleDownloadCode}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
            <MonacoEditor
              height="100%"
              language={selectedLanguage}
              theme="vs-dark"
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                wordWrap: "on",
                automaticLayout: true,
                scrollBeyondLastLine: false,
                renderWhitespace: "selection",
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                smoothScrolling: true,
                mouseWheelZoom: true,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                parameterHints: { enabled: true },
                autoIndent: "full",
                formatOnPaste: true,
                formatOnType: true
              }}
              onMount={handleEditorDidMount}
            />
          </div>
        </div>

        {/* Resizer Handle */}
        <div 
          className={`w-1 bg-border/40 hover:bg-border cursor-ew-resize flex items-center justify-center transition-colors resizer ${
            isResizing ? 'resizing bg-primary/30' : ''
          }`}
          onMouseDown={handleMouseDown}
          title="Drag to resize chat panel"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground/50 rotate-90" />
        </div>

        {/* Chat Sidebar */}
        <div 
          className="border-l border-border/40 bg-muted/20 shrink-0 flex flex-col"
          style={{ width: `${chatPanelWidth}px` }}
        >
          <div className="p-4 border-b border-border/40 shrink-0">
            <h3 className="font-semibold flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat {messages.length > 0 && (
                <span className="ml-2 bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
                  {messages.length}
                </span>
              )}
            </h3>
          </div>
          
          {/* Chat Error Display */}
          {chatError && (
            <div className="p-3 mx-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center space-x-2 text-destructive">
                <span className="text-xs font-medium">{chatError.message}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearError}
                  className="ml-auto h-4 w-4 p-0 text-destructive hover:text-destructive"
                >
                  ×
                </Button>
              </div>
            </div>
          )}
          
          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => {
                // Get decrypted message content
                const messageContent = decryptedMessages.get(msg.id) || msg.message;
                const isEncrypted = msg.message.includes(':') && msg.message.split(':').length === 3 && msg.messageType !== 'system';
                
                return (
                  <div key={msg.id} className="flex items-start space-x-3 w-full">
                    <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                      <AvatarFallback className="text-xs" style={{ backgroundColor: getParticipantColor(msg.username) + "20" }}>
                        {getParticipantAvatar(msg.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-baseline space-x-2 mb-1 min-w-0">
                        <span 
                          className="font-semibold text-sm max-w-[60%] truncate" 
                          style={{ color: getParticipantColor(msg.username) }}
                          title={msg.username}
                        >
                          {msg.username}
                        </span>
                        {isEncrypted && (
                          <div className="flex items-center text-green-500" title="Message is end-to-end encrypted">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
                            </svg>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-auto">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm word-wrap break-all hyphens-auto">
                        <div className="message-content">
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

          {/* Chat Input */}
          <div className="border-t border-border/40 p-4 bg-background/50 shrink-0">
            <div className="flex space-x-2">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                className="flex-1 bg-background/50 min-w-0"
                disabled={!chatConnected || isSendingMessage}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!message.trim() || !chatConnected || isSendingMessage}
                className="shrink-0"
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {/* Connection status indicator */}
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                {chatConnected ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Chat connected</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span>Chat disconnected</span>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <svg className="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
                </svg>
                <span>E2E Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-background/95 backdrop-blur-xs border-border/50">
          <DialogHeader>
            <DialogTitle>Editor Settings</DialogTitle>
            <DialogDescription>Configure your collaborative coding experience</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-save">Auto Save</Label>
              <Switch id="auto-save" checked={autoSave} onCheckedChange={setAutoSave} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cursor-tracking">Show Cursor Positions</Label>
              <Switch id="cursor-tracking" checked={true} disabled />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LeaveRoomDialog
        isOpen={showLeaveDialog}
        onConfirm={confirmLeaveRoom}
        onCancel={() => setShowLeaveDialog(false)}
        roomId={roomId}
      />
    </div>
  );
}

/* ---------- helpers for remote cursor CSS ---------- */
function safeCssClass(username: string) {
  return username.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}

/** Inject (or update) CSS rules for a specific remote user */
function injectCursorStyles(baseClass: string, color: string) {
  const styleId = `style-${baseClass}`;
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  const css = `
    .${baseClass} { border-left-color: ${color}; }
    .${baseClass}-label { background: ${hexToRgba(color, 0.8)}; }
  `;
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  } else {
    style.textContent = css;
  }
}

function hexToRgba(hex: string, alpha = 1) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
