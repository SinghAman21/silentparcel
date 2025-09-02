"use client";

import { useState } from "react";
import { MoreHorizontal, Users, Clock, UserMinus, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Participant {
  id: string;
  username: string;
  isOnline: boolean;
  lastSeen?: string;
  userId?: string;
  joinedAt: string;
}

interface CompactUserDisplayProps {
  participants: Participant[];
  currentUsername: string;
  isCurrentUserAdmin?: boolean;
  onKickParticipant?: (targetUsername: string) => Promise<void>;
  maxVisibleAvatars?: number;
}

export function CompactUserDisplay({
  participants,
  currentUsername,
  isCurrentUserAdmin = false,
  onKickParticipant,
  maxVisibleAvatars = 5
}: CompactUserDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [userToKick, setUserToKick] = useState<string | null>(null);
  const [isKicking, setIsKicking] = useState(false);
  const { toast } = useToast();

  // Check if current user is admin (first participant by join time)
  const sortedParticipants = [...participants].sort((a, b) => 
    new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  );
  const firstParticipant = sortedParticipants.length > 0 ? sortedParticipants[0] : null;
  const isAdmin = isCurrentUserAdmin || (firstParticipant?.username === currentUsername);

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

  const handleKickClick = (username: string) => {
    setUserToKick(username);
    setKickDialogOpen(true);
    setIsExpanded(false);
  };

  const handleConfirmKick = async () => {
    if (!userToKick || !onKickParticipant) return;
    
    setIsKicking(true);
    try {
      await onKickParticipant(userToKick);
      toast({
        title: "User Removed",
        description: `${userToKick} has been removed from the room.`,
      });
    } catch (error) {
      console.error('Failed to kick user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsKicking(false);
      setKickDialogOpen(false);
      setUserToKick(null);
    }
  };

  const visibleParticipants = sortedParticipants.slice(0, maxVisibleAvatars);
  const hiddenCount = Math.max(0, sortedParticipants.length - maxVisibleAvatars);

  return (
    <div className="flex items-center space-x-2">
      {/* Avatar circles */}
      <div className="flex items-center -space-x-2">
        {visibleParticipants.map((participant, index) => (
          <div
            key={participant.id}
            className="relative"
            style={{ zIndex: visibleParticipants.length - index }}
          >
            <Avatar 
              className="w-8 h-8 border-2 border-background ring-1 ring-border/20 transition-all hover:scale-110 hover:ring-2 hover:ring-primary/20"
              title={`${participant.username}${participant.username === currentUsername ? ' (You)' : ''} - ${participant.isOnline ? 'Online' : 'Offline'}`}
            >
              <AvatarFallback 
                className="text-xs font-medium"
                style={{ 
                  backgroundColor: getParticipantColor(participant.username) + "20",
                  color: getParticipantColor(participant.username)
                }}
              >
                {getParticipantAvatar(participant.username)}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator */}
            <div 
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                participant.isOnline ? "bg-green-500" : "bg-gray-400"
              }`}
            />
          </div>
        ))}
        
        {/* Additional count badge */}
        {hiddenCount > 0 && (
          <div className="relative ml-2">
            <Avatar className="w-8 h-8 border-2 border-background bg-muted/80">
              <AvatarFallback className="text-xs font-medium text-muted-foreground">
                +{hiddenCount}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* User count and 3-dots menu */}
      <div className="flex items-center space-x-2 ml-2">
        <span className="text-sm text-muted-foreground">
          {sortedParticipants.length} user{sortedParticipants.length !== 1 ? 's' : ''}
        </span>
        
        <DropdownMenu open={isExpanded} onOpenChange={setIsExpanded}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted/50"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-80 p-0 bg-background/95 backdrop-blur-sm border-border/50" 
            align="end"
            side="bottom"
          >
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Active Users ({sortedParticipants.length})
                  </div>
                  {isAdmin && (
                    <div className="flex items-center text-xs text-primary">
                      <Crown className="h-3 w-3 mr-1" />
                      Admin
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-80">
                  <div className="px-4 pb-4 space-y-2">
                    {sortedParticipants.map((participant, index) => (
                      <div 
                        key={participant.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className="relative">
                            <Avatar className="w-10 h-10 shrink-0">
                              <AvatarFallback 
                                className="text-sm font-medium"
                                style={{ 
                                  backgroundColor: getParticipantColor(participant.username) + "20",
                                  color: getParticipantColor(participant.username)
                                }}
                              >
                                {getParticipantAvatar(participant.username)}
                              </AvatarFallback>
                            </Avatar>
                            <div 
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                                participant.isOnline ? "bg-green-500" : "bg-gray-400"
                              }`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span 
                                className="font-medium text-sm truncate"
                                style={{ color: getParticipantColor(participant.username) }}
                              >
                                {participant.username}
                              </span>
                              {participant.username === currentUsername && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  You
                                </span>
                              )}
                              {index === 0 && (
                                <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full flex items-center">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 mt-0.5">
                              <div 
                                className={`w-2 h-2 rounded-full ${
                                  participant.isOnline ? "bg-green-500" : "bg-gray-400"
                                }`}
                              />
                              <span className="text-xs text-muted-foreground">
                                {participant.isOnline ? "Online" : "Offline"}
                              </span>
                              {!participant.isOnline && participant.lastSeen && (
                                <>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs text-muted-foreground">
                                    Last seen {new Date(participant.lastSeen).toLocaleTimeString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Kick button for admin */}
                        {isAdmin && 
                         participant.username !== currentUsername && 
                         onKickParticipant && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleKickClick(participant.username)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title={`Remove ${participant.username} from room`}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Footer with additional info */}
                <div className="border-t border-border/40 px-4 py-3 bg-muted/20">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {sortedParticipants.filter(p => p.isOnline).length} online, {sortedParticipants.filter(p => !p.isOnline).length} offline
                    </span>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Live updates</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Kick confirmation dialog */}
      <AlertDialog open={kickDialogOpen} onOpenChange={setKickDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{userToKick}</strong> from the room? 
              They will no longer be able to participate in this session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isKicking}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmKick}
              disabled={isKicking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isKicking ? "Removing..." : "Remove User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}