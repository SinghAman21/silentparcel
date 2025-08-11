'use client';

import { useState } from 'react';
import { ArrowLeft, MessageSquare, Users, Shield, Clock, Plus, Code, FileText } from 'lucide-react';
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Collaborative Rooms</h1>
          <p className="text-muted-foreground">
            Create or join ephemeral rooms for chat and collaborative coding
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
                Create New Room
              </CardTitle>
              <CardDescription>
                Start a new anonymous room with chat, code editing, or both
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
                Enter a room link or room ID to join an active session
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

          {/* Room Types */}
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <Card className="text-center p-4 bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 hover:scale-105">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold mb-1">Chat Rooms</h3>
              <p className="text-xs text-muted-foreground">Real-time messaging</p>
            </Card>
            
            <Card className="text-center p-4 bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 hover:scale-105">
              <Code className="h-8 w-8 mx-auto mb-2 text-chart-1" />
              <h3 className="font-semibold mb-1">Code Editor</h3>
              <p className="text-xs text-muted-foreground">Collaborative coding</p>
            </Card>
            
            <Card className="text-center p-4 bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 hover:scale-105">
              <Users className="h-8 w-8 mx-auto mb-2 text-chart-2" />
              <h3 className="font-semibold mb-1">Mixed Mode</h3>
              <p className="text-xs text-muted-foreground">Chat + Code editor</p>
            </Card>
          </div>

          {/* Features */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
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
              <Code className="h-8 w-8 mx-auto mb-2 text-chart-2" />
              <h3 className="font-semibold mb-1">Real-time Cursors</h3>
              <p className="text-xs text-muted-foreground">See who's typing where</p>
            </Card>

            <Card className="text-center p-4 bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-300 hover:scale-105">
              <FileText className="h-8 w-8 mx-auto mb-2 text-chart-3" />
              <h3 className="font-semibold mb-1">Multi-language</h3>
              <p className="text-xs text-muted-foreground">Support for 10+ languages</p>
            </Card>
          </div>

          {/* Collaborative Features */}
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20 mt-8">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-600">
                <Code className="h-5 w-5 mr-2" />
                Collaborative Coding Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Real-time Collaboration</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Live cursor tracking</li>
                    <li>• Real-time code synchronization</li>
                    <li>• Multiple language support</li>
                    <li>• Auto-save functionality</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Developer Experience</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Syntax highlighting</li>
                    <li>• Code completion</li>
                    <li>• Error detection</li>
                    <li>• File download support</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}