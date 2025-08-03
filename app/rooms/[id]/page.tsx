'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ThemeToggle from '@/components/theme-toggle';
import Link from 'next/link';
import { ChatInterface } from '@/components/chat-interface';

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [roomExists, setRoomExists] = useState(true);

  const roomId = params.id as string;

  useEffect(() => {
    // Simulate room existence check
    const checkRoom = () => {
      // In a real app, this would be an API call
      const exists = Math.random() > 0.2; // 80% chance room exists
      setRoomExists(exists);
    };

    checkRoom();
  }, [roomId]);

  const handleJoinRoom = () => {
    // Simulate password verification
    if (password === 'demo123' || password.length >= 6) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password. Try "demo123" for demo.');
    }
  };

  if (!roomExists) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 backdrop-blur-xs bg-background/80 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/rooms">
              <Button variant="ghost" size="sm" className="hover:bg-accent/50">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Rooms
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 max-w-md">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Room Not Found
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                This chat room doesn't exist or has expired. Rooms are automatically deleted after their expiration time.
              </p>
              <Link href="/rooms">
                <Button className="w-full">
                  Create New Room
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 backdrop-blur-xs bg-background/80 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/rooms">
              <Button variant="ghost" size="sm" className="hover:bg-accent/50">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Rooms
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 max-w-md">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Enter Room Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Room Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter room password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                  className="bg-background/50"
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
              <Button 
                onClick={handleJoinRoom} 
                disabled={!password} 
                className="w-full hover:scale-105 transition-transform"
              >
                Join Room
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Demo password: demo123
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <ChatInterface 
      roomId={roomId}
      roomPassword={password}
      onLeave={() => router.push('/rooms')}
    />
  );
}