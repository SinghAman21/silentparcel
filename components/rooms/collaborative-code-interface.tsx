"use client";

import dynamic from "next/dynamic";
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { editor as MonacoEditorTypes } from "monaco-editor";

import { Send, Users, Clock, LogOut, Settings, Download, Code, MessageSquare } from "lucide-react";
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
import { useSupabaseChat } from "@/hooks/use-supabase-chat";
import { useToast } from "@/hooks/use-toast";

import { CompactUserDisplay } from "@/components/rooms/compact-user-display";
import { supabase } from "@/lib/supabase";

interface CollaborativeCodeInterfaceProps {
  roomId: string;
  roomPassword: string;
  userData?: any;
  onLeave: () => void;
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
  onLeave
}: CollaborativeCodeInterfaceProps) {
  // UI + editor state
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [showUsernameDialog, setShowUsernameDialog] = useState(true);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
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

  // Supabase auth user
  const [userId, setUserId] = useState<string | null>(null);

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
    sendMessage,
    joinRoom,
    updateParticipantStatus
  } = useSupabaseChat(roomId);

  // Get auth user once
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  // Username (seeded / provided)
  useEffect(() => {
    if (userData?.username) {
      setUsername(userData.username);
      setShowUsernameDialog(false);
      return;
    }
    if (!username) {
      const adjectives = ["Swift", "Silent", "Mystic", "Shadow", "Neon", "Cyber", "Phantom", "Eclipse"];
      const nouns = ["Fox", "Wolf", "Raven", "Phoenix", "Dragon", "Tiger", "Panther", "Viper"];
      const seed = roomId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seededRandom = (max: number) => {
        const x = Math.sin(seed) * 10000;
        return Math.floor((x - Math.floor(x)) * max);
      };
      const randomUsername = `${adjectives[seededRandom(adjectives.length)]}${nouns[seededRandom(nouns.length)]}${String(seededRandom(99)).padStart(2, "0")}`;
      setUsername(randomUsername);
    }
  }, [roomId, userData, username]);

  // Timer countdown (unchanged)
  useEffect(() => {
    const id = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

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

  // Join room (chat presence)
  useEffect(() => {
    if (username && !isJoining && !userData?.username) {
      setIsJoining(true);
      joinRoom(username)
        .then(() => setShowUsernameDialog(false))
        .catch((error) => {
          console.error("Failed to join room:", error);
          toast({ title: "Error", description: "Failed to join room", variant: "destructive" });
        })
        .finally(() => setIsJoining(false));
    }
  }, [joinRoom, isJoining, userData, username, toast]);

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

  const handleUsernameSubmit = (newUsername: string) => {
    if (newUsername.trim()) setUsername(newUsername.trim());
  };

  const handleLeaveRoom = () => setShowLeaveDialog(true);

  const confirmLeaveRoom = async () => {
    try {
      await updateParticipantStatus(username, false);
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

  const handleSendMessage = () => {
    if (!message.trim() || !chatConnected) return;
    
    try {
      sendMessage(message.trim(), username);
      setMessage(""); // Clear the input after sending
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

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
      `}</style>

      {/* Header */}
      <div className="border-b border-border/40 p-4 bg-background/80 backdrop-blur-xs shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="font-bold">Collaborative Code Room #{roomId}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
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

        {/* Chat Sidebar */}
        <div className="w-80 border-l border-border/40 bg-muted/20 shrink-0 flex flex-col">
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
          
          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-full">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start space-x-3 max-w-full">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="text-xs" style={{ backgroundColor: getParticipantColor(msg.username) + "20" }}>
                      {getParticipantAvatar(msg.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="max-w-full">
                      <div className="flex items-center space-x-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm truncate" style={{ color: getParticipantColor(msg.username) }}>{msg.username}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="bg-muted/50 rounded-lg px-3 py-2 max-w-full break-words text-sm">{msg.message}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="border-t border-border/40 p-4 bg-background/50 shrink-0">
            <div className="flex space-x-2">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 bg-background/50"
                disabled={!chatConnected}
              />
              <Button onClick={handleSendMessage} disabled={!message.trim() || !chatConnected}>
                <Send className="h-4 w-4" />
              </Button>
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
