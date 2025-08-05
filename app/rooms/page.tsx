'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Users, Shield, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ThemeToggle from '@/components/theme-toggle';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function RoomsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [joinInput, setJoinInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleJoinRoom = async () => {
    if (!joinInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room link or ID",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    
    try {
      // Extract room ID from URL if it's a full link
      let roomId = joinInput.trim();
      if (joinInput.includes('/rooms/')) {
        const urlParts = joinInput.split('/rooms/');
        roomId = urlParts[1]?.split('?')[0] || '';
      }
      
      if (!roomId) {
        toast({
          title: "Error",
          description: "Invalid room link or ID",
          variant: "destructive"
        });
        return;
      }

      // Navigate to the room page
      router.push(`/rooms/${roomId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid room link or ID",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateRoom = () => {
    router.push('/rooms/create');
  };

  // Show loading state until client is ready
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background">
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
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-muted rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
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

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Anonymous Chat Rooms</h1>
          <p className="text-muted-foreground">
            Create or join ephemeral chat rooms that self-destruct automatically
          </p>
        </div>

        <div className="grid gap-6">
          {/* Create Room */}
          <Card 
            className="bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 cursor-pointer hover:scale-105"
            onClick={handleCreateRoom}
          >
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
                Enter a room link or room ID to join an active chat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-input">Room Link or ID</Label>
                <Input
                  id="room-input"
                  placeholder="https://silentparcel.com/rooms/xyz123 or xyz123"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  className="bg-background/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
              </div>
              <Button 
                onClick={handleJoinRoom} 
                className="w-full hover:scale-105 transition-transform" 
                disabled={!joinInput.trim() || isJoining}
              >
                {isJoining ? 'Joining...' : 'Join Room'}
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
    </div>
  );
}