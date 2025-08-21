'use client';

import { useState } from 'react';
import { ArrowLeft, MessageSquare, Shield, Clock, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CaptchaModal } from '@/components/captcha-modal';

type CreationStage = 'setup' | 'captcha' | 'complete';

interface ChatRoomCreatorProps {
  onComplete: (roomId: string, password: string) => void;
  onBack: () => void;
}

export function ChatRoomCreator({ onComplete, onBack }: ChatRoomCreatorProps) {
  const [stage, setStage] = useState<CreationStage>('setup');
  const [roomName, setRoomName] = useState('');
  const [expiryTime, setExpiryTime] = useState('1h');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [roomLink, setRoomLink] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCaptchaComplete = () => {
    // Generate room credentials using timestamp for consistency
    const timestamp = Date.now();
    const password = timestamp.toString(36).substring(0, 12).toUpperCase();
    const roomId = timestamp.toString(36).substring(0, 8);
    const link = `https://silentparcel.vercel.app/rooms/${roomId}`;
    
    setGeneratedPassword(password);
    setRoomLink(link);
    setStage('complete');
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
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {stage === 'setup' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="hover:bg-accent/50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create Secret Room</h1>
              <p className="text-muted-foreground">Configure your anonymous chat room</p>
            </div>
          </div>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Room Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name (Optional)</Label>
                <Input
                  id="room-name"
                  placeholder="My Secret Chat"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="bg-background/50"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for auto-generated name
                </p>
              </div>

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
                  Room will be automatically deleted after this time
                </p>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Privacy Features</p>
                  <p className="text-xs text-muted-foreground">
                    Auto-generated password • Anonymous usernames • No message history
                  </p>
                </div>
              </div>

              <Button 
                onClick={() => setStage('captcha')}
                className="w-full hover:scale-105 transition-transform"
              >
                Create Room
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {stage === 'complete' && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Room Created! ��</h1>
            <p className="text-muted-foreground">
              Your anonymous chat room is ready. Share the password with others to invite them.
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
            </CardContent>
          </Card>

          <div className="flex space-x-2">
            <Button 
              onClick={() => onComplete('room123', generatedPassword)}
              className="flex-1 hover:scale-105 transition-transform"
            >
              Enter Room as Admin
            </Button>
            <Button 
              variant="outline" 
              onClick={onBack} 
              className="flex-1 hover:scale-105 transition-transform"
            >
              Create Another Room
            </Button>
          </div>
        </div>
      )}

      <CaptchaModal 
        isOpen={stage === 'captcha'}
        fileName="Chat Room"
        fileSize={0}
        onComplete={handleCaptchaComplete}
        onClose={() => setStage('setup')}
      />
    </div>
  );
}