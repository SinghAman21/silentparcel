'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Users, Crown, Shield, Clock, LogOut, Code, MessageSquare, Settings, Download, Upload, Play, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import ThemeToggle from '@/components/theme-toggle';
import { LeaveRoomDialog } from '@/components/rooms/leave-room-dialog';
import { useSupabaseChat, ChatMessage, ChatParticipant } from '@/hooks/use-supabase-chat';
import dynamic from 'next/dynamic';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { WebrtcProvider } from 'y-webrtc';
import { useToast } from '@/hooks/use-toast';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

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
}

export function CollaborativeCodeInterface({ roomId, roomPassword, userData, onLeave }: CollaborativeCodeInterfaceProps) {
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [showUsernameDialog, setShowUsernameDialog] = useState(true);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState('code');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [showSettings, setShowSettings] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [cursorPositions, setCursorPositions] = useState<CursorPosition[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Y.js collaborative editing setup
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const {
    messages,
    participants,
    isConnected: chatConnected,
    sendMessage,
    joinRoom,
    updateParticipantStatus
  } = useSupabaseChat(roomId);

  // Set username on mount
  useEffect(() => {
    if (userData?.username) {
      setUsername(userData.username);
      setShowUsernameDialog(false);
    } else if (!username) {
      const adjectives = ['Swift', 'Silent', 'Mystic', 'Shadow', 'Neon', 'Cyber', 'Phantom', 'Eclipse'];
      const nouns = ['Fox', 'Wolf', 'Raven', 'Phoenix', 'Dragon', 'Tiger', 'Panther', 'Viper'];
      
      const seed = roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seededRandom = (max: number) => {
        const x = Math.sin(seed) * 10000;
        return Math.floor((x - Math.floor(x)) * max);
      };
      
      const randomUsername = `${adjectives[seededRandom(adjectives.length)]}${nouns[seededRandom(nouns.length)]}${seededRandom(99)}`;
      setUsername(randomUsername);
    }
  }, [username, userData, roomId]);

  // Initialize Y.js collaborative editing
  useEffect(() => {
    if (!roomId || !username) return;

    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
      providerRef.current = new WebrtcProvider(`room-${roomId}`, ydocRef.current, {
        signaling: ['wss://signaling.yjs.dev'],
        password: roomPassword,
        // awareness: {
        //   clientID: Math.floor(Math.random() * 1000000),
        // }
      });

      yTextRef.current = ydocRef.current.getText('monaco');

      // Set up awareness for cursor tracking
      providerRef.current.awareness.setLocalStateField('user', {
        name: username,
        color: getCursorColor(),
        cursor: null
      });

      // Listen for cursor changes from other users
      providerRef.current.awareness.on('change', (changes: any) => {
        const states = Array.from(providerRef.current!.awareness.getStates().values());
        const cursors: CursorPosition[] = states
          .filter((state: any) => state.user && state.user.cursor && state.user.name !== username)
          .map((state: any) => ({
            lineNumber: state.user.cursor.lineNumber,
            column: state.user.cursor.column,
            username: state.user.name,
            color: state.user.color
          }));
        setCursorPositions(cursors);
      });

      setIsConnected(true);
    }

    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
    };
  }, [roomId, username, roomPassword]);

  // Join room when username is set
  useEffect(() => {
    if (username && !isJoining && !userData?.username) {
      setIsJoining(true);
      joinRoom(username)
        .then(() => {
          setShowUsernameDialog(false);
        })
        .catch((error) => {
          console.error('Failed to join room:', error);
          toast({
            title: "Error",
            description: "Failed to join room",
            variant: "destructive"
          });
        })
        .finally(() => {
          setIsJoining(false);
        });
    }
  }, [username, joinRoom, isJoining, userData, toast]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getCursorColor = () => {
    const colors = ['#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#4db6ac', '#ff8a65', '#7986cb'];
    if (!username) return colors[0];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
    return colors[hash % colors.length];
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    if (yTextRef.current && ydocRef.current && providerRef.current) {
      bindingRef.current = new MonacoBinding(
        yTextRef.current,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        providerRef.current.awareness
      );

      // Set up cursor tracking
      editor.onDidChangeCursorPosition((e: any) => {
        if (providerRef.current) {
          providerRef.current.awareness.setLocalStateField('user', {
            name: username,
            color: getCursorColor(),
            cursor: {
              lineNumber: e.position.lineNumber,
              column: e.position.column
            }
          });
        }
      });

      // Set up selection tracking
      editor.onDidChangeCursorSelection((e: any) => {
        if (providerRef.current) {
          providerRef.current.awareness.setLocalStateField('user', {
            name: username,
            color: getCursorColor(),
            cursor: {
              lineNumber: e.position.lineNumber,
              column: e.position.column
            },
            selection: {
              startLineNumber: e.selection.startLineNumber,
              startColumn: e.selection.startColumn,
              endLineNumber: e.selection.endLineNumber,
              endColumn: e.selection.endColumn
            }
          });
        }
      });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !username) return;

    try {
      await sendMessage(username, message, 'text');
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleUsernameSubmit = (newUsername: string) => {
    if (newUsername.trim()) {
      setUsername(newUsername.trim());
    }
  };

  const handleLeaveRoom = () => {
    setShowLeaveDialog(true);
  };

  const confirmLeaveRoom = async () => {
    try {
      await updateParticipantStatus(username, false);
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownloadCode = () => {
    if (editorRef.current) {
      const content = editorRef.current.getValue();
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `code-${roomId}.${getFileExtension(selectedLanguage)}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getFileExtension = (language: string) => {
    const extensions: { [key: string]: string } = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      html: 'html',
      css: 'css',
      json: 'json',
      markdown: 'md'
    };
    return extensions[language] || 'txt';
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    if (editorRef.current && monacoRef.current) {
      // Update Monaco editor language
      monacoRef.current.editor.setModelLanguage(editorRef.current.getModel(), language);
    }
  };

  if (showUsernameDialog) {
    return (
      <Dialog open={showUsernameDialog} onOpenChange={setShowUsernameDialog}>
        <DialogContent className="bg-background/95 backdrop-blur-xs border-border/50">
          <DialogHeader>
            <DialogTitle>Join Collaborative Coding Room</DialogTitle>
            <DialogDescription>
              Enter a username to join the collaborative coding session
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
              <h1 className="font-bold">Collaborative Code Room #{roomId}</h1>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Self-destructs in {formatTime(timeLeft)}</span>
                <div className="flex items-center space-x-1">
                  {isConnected ? (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                  )}
                  <span className="text-xs">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{participants.length}/10</span>
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="hover:scale-105 transition-transform"
            >
              <Settings className="h-4 w-4" />
            </Button>
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
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="code" className="flex items-center space-x-2">
                <Code className="h-4 w-4" />
                <span>Code Editor</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="flex-1 flex flex-col min-h-0">
              {/* Code Editor Toolbar */}
              <div className="border-b border-border/40 p-2 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="language-select" className="text-sm">Language:</Label>
                  <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                    <SelectTrigger id="language-select" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadCode}
                    className="hover:scale-105 transition-transform"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:scale-105 transition-transform"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run
                  </Button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 min-h-0">
                <MonacoEditor
                  height="100%"
                  language={selectedLanguage}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    renderWhitespace: 'selection',
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    smoothScrolling: true,
                    mouseWheelZoom: true,
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    parameterHints: { enabled: true },
                    autoIndent: 'full',
                    formatOnPaste: true,
                    formatOnType: true,
                  }}
                  onMount={handleEditorDidMount}
                />
              </div>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-full">
                  {messages.map((msg) => (
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
                            <span className="text-xs text-muted-foreground shrink-0">
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="bg-muted/50 rounded-lg px-3 py-2 max-w-full break-words">
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t border-border/40 p-4 bg-background/50 shrink-0">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 bg-background/50"
                    disabled={!chatConnected}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!message.trim() || !chatConnected}
                    className="hover:scale-105 transition-transform shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Users Sidebar */}
        <div className="w-72 border-l border-border/40 bg-muted/20 shrink-0 hidden md:flex flex-col">
          <div className="p-4 border-b border-border/40 shrink-0">
            <h3 className="font-semibold flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Users ({participants.length})
            </h3>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {participants.map((participant) => (
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
                      </div>
                      {participant.username === username && (
                        <span className="text-xs text-muted-foreground">You</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Cursor Positions */}
          {activeTab === 'code' && cursorPositions.length > 0 && (
            <div className="p-4 border-t border-border/40 shrink-0">
              <h4 className="font-semibold text-sm mb-2">Active Cursors</h4>
              <div className="space-y-1">
                {cursorPositions.map((cursor, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cursor.color }}
                    />
                    <span className="truncate">{cursor.username}</span>
                    <span className="text-muted-foreground">
                      L{cursor.lineNumber}:{cursor.column}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-background/95 backdrop-blur-xs border-border/50">
          <DialogHeader>
            <DialogTitle>Editor Settings</DialogTitle>
            <DialogDescription>
              Configure your collaborative coding experience
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-save">Auto Save</Label>
              <Switch
                id="auto-save"
                checked={autoSave}
                onCheckedChange={setAutoSave}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cursor-tracking">Show Cursor Positions</Label>
              <Switch
                id="cursor-tracking"
                checked={true}
                disabled
              />
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
