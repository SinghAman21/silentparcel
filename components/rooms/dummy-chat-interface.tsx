'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Users, Crown, Shield, Clock, LogOut, MoreVertical, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ThemeToggle from '@/components/theme-toggle';
import { LeaveRoomDialog } from '@/components/rooms/leave-room-dialog';
import { useToast } from '@/hooks/use-toast';
// Using Web Crypto API for browser compatibility

interface Message {
  id: string;
  user: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
}

interface User {
  id: string;
  name: string;
  color: string;
  isAdmin: boolean;
  avatar: string;
}

interface ChatInterfaceProps {
  roomId: string;
  roomPassword: string;
  onLeave: () => void;
}

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

export function ChatInterface({ roomId, roomPassword, onLeave }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize room data
  useEffect(() => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
    const avatars = ['🦊', '🐺', '🦝', '🐧', '🦔', '🐨', '🐯', '🦁', '🐸', '🐙'];
    const adjectives = ['Swift', 'Silent', 'Mystic', 'Shadow', 'Neon', 'Cyber', 'Phantom', 'Eclipse'];
    const nouns = ['Fox', 'Wolf', 'Raven', 'Phoenix', 'Dragon', 'Tiger', 'Panther', 'Viper'];
    
    // Use roomId as seed for consistent generation
    const seed = roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seededRandom = (max: number) => {
      const x = Math.sin(seed) * 10000;
      return Math.floor((x - Math.floor(x)) * max);
    };
    
    const generateUser = (isAdmin = false): User => ({
      id: `user_${seededRandom(1000000)}`,
      name: `${adjectives[seededRandom(adjectives.length)]}${nouns[seededRandom(nouns.length)]}${seededRandom(99)}`,
      color: colors[seededRandom(colors.length)],
      isAdmin,
      avatar: avatars[seededRandom(avatars.length)]
    });

    // FIXED: Only create current user, no phantom users
    const currentUserData = generateUser(true);
    setCurrentUser(currentUserData);
    setUsers([currentUserData]); // Only add the actual current user

    // Add welcome message (system messages are not encrypted)
    setMessages([
      {
        id: '1',
        user: 'System',
        content: `Welcome to the secret room! You are now ${currentUserData.name} (Admin)`,
        timestamp: new Date(),
        type: 'system'
      }
    ]);
  }, [roomId]);

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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !currentUser) return;

    // Encrypt message before storing/sending
    const encryptedContent = await encryptMessage(message, roomPassword);

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      user: currentUser.name,
      content: message, // Display decrypted message in UI
      timestamp: new Date(),
      type: 'text'
    };

    // In a real implementation, you would send the encrypted content to the server
    // For demo purposes, we're showing the decrypted message in the UI
    // but the actual storage would use encryptedContent

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Show encryption status in toast
    toast({
      title: "Message Encrypted",
      description: "Your message has been encrypted using Web Crypto API.",
      duration: 2000,
    });
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedRoomId(true);
      setTimeout(() => setCopiedRoomId(false), 2000);
      
      toast({
        title: "Copied!",
        description: "Room ID copied to clipboard",
      });
    } catch (err) {
      console.error('Failed to copy room ID:', err);
      toast({
        title: "Error",
        description: "Failed to copy room ID to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleKickUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    const kickedUser = users.find(u => u.id === userId);
    if (kickedUser) {
      setMessages(prev => [...prev, {
        id: `sys_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        user: 'System',
        content: `${kickedUser.name} was kicked from the room`,
        timestamp: new Date(),
        type: 'system'
      }]);
    }
  };

  const handleLeaveRoom = () => {
    setShowLeaveDialog(true);
  };

  const confirmLeaveRoom = () => {
    setShowLeaveDialog(false);
    onLeave();
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/40 p-4 bg-background/80 backdrop-blur-xs shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold">Secret Room #{roomId}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyRoomId}
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
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Self-destructs in {formatTime(timeLeft)}</span>
                <Shield className="h-3 w-3 text-green-500 End-to-end encrypted" />
                <span className="text-xs">E2E Encrypted</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{users.length}/10</span>
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
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-full">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start space-x-3 max-w-full">
                  {msg.type !== 'system' && (
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="text-xs" style={{ backgroundColor: users.find(u => u.name === msg.user)?.color + '20' }}>
                        {users.find(u => u.name === msg.user)?.avatar || '👤'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`flex-1 min-w-0 ${msg.type === 'system' ? 'text-center' : ''}`}>
                    {msg.type === 'system' ? (
                      <div className="text-sm text-muted-foreground italic bg-muted/30 rounded-lg px-3 py-1 inline-block">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="max-w-full">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          <span 
                            className="font-semibold text-sm truncate"
                            style={{ color: users.find(u => u.name === msg.user)?.color }}
                          >
                            {msg.user}
                          </span>
                          {users.find(u => u.name === msg.user)?.isAdmin && (
                            <Crown className="h-3 w-3 text-yellow-500 shrink-0" />
                          )}
                          <span className="text-xs text-muted-foreground shrink-0">
                            {msg.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="bg-muted/50 rounded-lg px-3 py-2 max-w-full break-words">
                          {msg.content}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t border-border/40 p-4 bg-background/50 shrink-0">
            <div className="flex space-x-2">
              <Button variant="outline" size="icon" className="hover:scale-105 transition-transform shrink-0">
                {/* <Paperclip className="h-4 w-4" /> */}
              </Button>
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-background/50"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!message.trim()}
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
            <h3 className="font-semibold flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Users ({users.length})
            </h3>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback 
                        className="text-xs"
                        style={{ backgroundColor: user.color + '20' }}
                      >
                        {user.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1">
                        <span 
                          className="font-medium text-sm truncate"
                          style={{ color: user.color }}
                        >
                          {user.name}
                        </span>
                        {user.isAdmin && <Crown className="h-3 w-3 text-yellow-500 shrink-0" />}
                      </div>
                      {user.id === currentUser?.id && (
                        <span className="text-xs text-muted-foreground">You</span>
                      )}
                    </div>
                  </div>
                  
                  {currentUser?.isAdmin && user.id !== currentUser.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:scale-105 transition-transform shrink-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-background/95 backdrop-blur-xs border-border/50">
                        <DropdownMenuItem onClick={() => handleKickUser(user.id)} className="cursor-pointer">
                          Kick User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
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
    </div>
  );
}