'use client';

import { useState } from 'react';
import { ArrowLeft, MessageSquare, Users, Shield, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ThemeToggle from '@/components/theme-toggle';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChatRoomCreator } from '@/components/chat-room-creator';
import { ChatInterface } from '@/components/chat-interface';

type ChatStage = 'lobby' | 'creating' | 'room';

export default function RoomsPage() {
  const router = useRouter();
  const [stage, setStage] = useState<ChatStage>('lobby');
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');

  const handleRoomCreated = (id: string, password: string) => {
    setRoomId(id);
    setRoomPassword(password);
    setStage('room');
  };

  const handleJoinRoom = () => {
    // Extract room ID from URL or use password directly
    let extractedRoomId = '';
    if (joinPassword.includes('/rooms/')) {
      const urlParts = joinPassword.split('/rooms/');
      extractedRoomId = urlParts[1] || '';
    } else {
      extractedRoomId = Math.random().toString(36).substring(2, 8);
    }
    
    setRoomId(extractedRoomId);
    setRoomPassword(joinPassword);
    router.push(`/rooms/${extractedRoomId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-xs bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="hover:bg-accent/50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {stage === 'lobby' && (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Anonymous Chat Rooms</h1>
            <p className="text-muted-foreground">
              Create or join ephemeral chat rooms that self-destruct automatically
            </p>
          </div>

          <div className="grid gap-6">
            {/* Create Room */}
            <Card className="bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 cursor-pointer hover:scale-105" onClick={() => setStage('creating')}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Secret Room
                </CardTitle>
                <CardDescription>
                  Start a new anonymous chat room with auto-generated password
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Join Room */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Join Existing Room
                </CardTitle>
                <CardDescription>
                  Enter a room link or password to join an active chat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room-link">Room Link or Password</Label>
                  <Input
                    id="room-link"
                    placeholder="https://silentparcel.vercel.app/rooms/xyz123 or password"
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <Button 
                  onClick={handleJoinRoom} 
                  className="w-full hover:scale-105 transition-transform" 
                  disabled={!joinPassword}
                >
                  Join Room
                </Button>
              </CardContent>
            </Card>

            {/* Features */}
            <div className="grid sm:grid-cols-3 gap-4 mt-8">
              <Card className="text-center p-4 bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 hover:scale-105">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Anonymous</h3>
                <p className="text-xs text-muted-foreground">No registration required</p>
              </Card>
              
              <Card className="text-center p-4 bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 hover:scale-105">
                <Clock className="h-8 w-8 mx-auto mb-2 text-chart-1" />
                <h3 className="font-semibold mb-1">Ephemeral</h3>
                <p className="text-xs text-muted-foreground">Auto-delete after time</p>
              </Card>
              
              <Card className="text-center p-4 bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 hover:scale-105">
                <Users className="h-8 w-8 mx-auto mb-2 text-chart-2" />
                <h3 className="font-semibold mb-1">Private</h3>
                <p className="text-xs text-muted-foreground">Password protected</p>
              </Card>
            </div>
          </div>
        </div>
      )}

      {stage === 'creating' && (
        <ChatRoomCreator 
          onComplete={handleRoomCreated}
          onBack={() => setStage('lobby')}
        />
      )}

      {stage === 'room' && (
        <ChatInterface 
          roomId={roomId}
          roomPassword={roomPassword}
          onLeave={() => setStage('lobby')}
        />
      )}
    </div>
  );
}