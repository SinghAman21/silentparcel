'use client';

import { useState } from 'react';
import { ArrowLeft, MessageSquare, Shield, Clock, Copy, Check, Code, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CaptchaModal } from '@/components/captcha-modal';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/theme-toggle';
import { useToast } from '@/hooks/use-toast';

type CreationStage = 'setup' | 'complete';

export default function CreateRoomPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [stage, setStage] = useState<CreationStage>('setup');
  const [roomName, setRoomName] = useState('');
  const [expiryTime, setExpiryTime] = useState('1h');
  const [roomType, setRoomType] = useState('chat');
  const [defaultLanguage, setDefaultLanguage] = useState('javascript');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [roomLink, setRoomLink] = useState('');
  const [roomId, setRoomId] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    
    try {
      // Create room via API
      const response = await fetch('/api/chat/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomName || undefined,
          expiryTime: expiryTime,
          roomType: roomType,
          defaultLanguage: roomType !== 'chat' ? defaultLanguage : undefined
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create room');
      }

      const link = `${window.location.origin}/rooms/${data.room.id}`;
      
      setGeneratedPassword(data.room.password);
      setRoomLink(link);
      setRoomId(data.room.id);
      setStage('complete');
      
      toast({
        title: "Success",
        description: "Room created successfully!",
      });
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create room',
        variant: "destructive"
      });
      setStage('setup');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'password' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'password') {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
      
      toast({
        title: "Copied!",
        description: `${type === 'password' ? 'Password' : 'Link'} copied to clipboard`,
      });
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleEnterRoom = () => {
    router.push(`/rooms/${roomId}`);
  };

  const getRoomTypeDescription = () => {
    switch (roomType) {
      case 'chat':
        return 'Traditional chat room with text messages';
      case 'code':
        return 'Collaborative code editor with real-time cursor tracking';
      case 'mixed':
        return 'Combined chat and code editor in one room';
      default:
        return '';
    }
  };

  const getRoomTypeIcon = () => {
    switch (roomType) {
      case 'chat':
        return <MessageSquare className="h-5 w-5" />;
      case 'code':
        return <Code className="h-5 w-5" />;
      case 'mixed':
        return <Users className="h-5 w-5" />;
      default:
        return <MessageSquare className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {stage === 'setup' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Create Secret Room</h1>
              <p className="text-muted-foreground">Configure your anonymous collaborative room</p>
            </div>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center">
                  {getRoomTypeIcon()}
                  <span className="ml-2">Room Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="room-name">Room Name (Optional)</Label>
                  <Input
                    id="room-name"
                    placeholder={roomType === 'code' ? 'My Code Session' : 'My Secret Chat'}
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for auto-generated name
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select value={roomType} onValueChange={setRoomType}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-xs border-border/50">
                      <SelectItem value="chat">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-4 w-4" />
                          <span>Chat Room</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="code">
                        <div className="flex items-center space-x-2">
                          <Code className="h-4 w-4" />
                          <span>Code Editor</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="mixed">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>Mixed (Chat + Code)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {getRoomTypeDescription()}
                  </p>
                </div>

                {roomType !== 'chat' && (
                  <div className="space-y-2">
                    <Label>Default Language</Label>
                    <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-xs border-border/50">
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
                    <p className="text-xs text-muted-foreground">
                      Initial language for the code editor
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Self-Destruct Timer</Label>
                  <Select value={expiryTime} onValueChange={setExpiryTime}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-xs border-border/50">
                      <SelectItem value="30m">30 Minutes</SelectItem>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="2h">2 Hours</SelectItem>
                      <SelectItem value="6h">6 Hours</SelectItem>
                      <SelectItem value="24h">24 Hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Room will be automatically deleted after this time or after inactivity of 120 minutes
                  </p>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Privacy Features</p>
                    <p className="text-xs text-muted-foreground">
                      Auto-generated password • Anonymous usernames • No message history
                      {roomType !== 'chat' && ' • Real-time cursor tracking'}
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleCreateRoom}
                  className="w-full hover:scale-105 transition-transform"
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : `Create ${roomType === 'code' ? 'Code' : roomType === 'mixed' ? 'Mixed' : 'Chat'} Room`}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {stage === 'complete' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Room Created! 🎉</h1>
              <p className="text-muted-foreground">
                Your {roomType === 'code' ? 'collaborative code room' : roomType === 'mixed' ? 'mixed chat and code room' : 'anonymous chat room'} is ready. Share the password with others to invite them.
              </p>
            </div>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Room Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Room Password</Label>
                  <div className="flex space-x-2">
                    <Input 
                      value={generatedPassword} 
                      readOnly 
                      className="font-mono bg-background/50"
                    />
                    <Button
                      onClick={() => copyToClipboard(generatedPassword, 'password')}
                      variant="outline"
                      size="icon"
                      className="hover:scale-105 transition-transform"
                    >
                      {copiedPassword ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Direct Link</Label>
                  <div className="flex space-x-2">
                    <Input 
                      value={roomLink} 
                      readOnly 
                      className="font-mono text-sm bg-background/50"
                    />
                    <Button
                      onClick={() => copyToClipboard(roomLink, 'link')}
                      variant="outline"
                      size="icon"
                      className="hover:scale-105 transition-transform"
                    >
                      {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Room expires in {expiryTime === '30m' ? '30 minutes' : expiryTime === '1h' ? '1 hour' : expiryTime === '2h' ? '2 hours' : expiryTime === '6h' ? '6 hours' : '24 hours'}</span>
                </div>

                {roomType !== 'chat' && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Code className="h-4 w-4" />
                    <span>Default language: {defaultLanguage}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex space-x-2">
              <Button 
                onClick={handleEnterRoom}
                className="flex-1 hover:scale-105 transition-transform"
              >
                Enter Room as Admin
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 hover:scale-105 transition-transform"
                onClick={() => router.push('/rooms/create')}
              >
                Create Another Room
              </Button>
            </div>
          </div>
        )}

        {/* <CaptchaModal 
          isOpen={stage === 'captcha'}
          fileName="Chat Room"
          fileSize={0}
          onComplete={() => handleCaptchaComplete('')}
          onClose={() => setStage('setup')}
        /> */}
      </div>
    </div>
  );
} 