'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Users, Crown, Shield, Clock, LogOut, MoreVertical, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ThemeToggle from '@/components/theme-toggle';
import { LeaveRoomDialog } from '@/components/leave-room-dialog';
import { useSupabaseChat, ChatMessage, ChatParticipant } from '@/hooks/use-supabase-chat';

interface SupabaseChatInterfaceProps {
  roomId: string;
  roomPassword: string;
  userData?: any; // Add userData prop
  onLeave: () => void;
}

export function SupabaseChatInterface({ roomId, roomPassword, userData, onLeave }: SupabaseChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [showUsernameDialog, setShowUsernameDialog] = useState(true);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    participants,
    isConnected,
    sendMessage,
    joinRoom,
    updateParticipantStatus
  } = useSupabaseChat(roomId);

  // Use userData if provided, otherwise generate random username
  useEffect(() => {
    if (userData?.username) {
      setUsername(userData.username);
      setShowUsernameDialog(false);
    } else if (!username) {
      const adjectives = ['Swift', 'Silent', 'Mystic', 'Shadow', 'Neon', 'Cyber', 'Phantom', 'Eclipse'];
      const nouns = ['Fox', 'Wolf', 'Raven', 'Phoenix', 'Dragon', 'Tiger', 'Panther', 'Viper'];
      const randomUsername = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 99)}`;
      setUsername(randomUsername);
    }
  }, [username, userData]);

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
          // You might want to show an error message here
        })
        .finally(() => {
          setIsJoining(false);
        });
    }
  }, [username, joinRoom, isJoining, userData]);

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
    if (!message.trim() || !username) return;

    try {
      await sendMessage(username, message, 'text');
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      // You might want to show an error message here
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
              <h1 className="font-bold">Secret Room #{roomId}</h1>
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
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{participants.length}/10</span>
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
              <Button variant="outline" size="icon" className="hover:scale-105 transition-transform shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-background/50"
                disabled={!isConnected}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!message.trim() || !isConnected}
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