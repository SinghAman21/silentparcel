'use client';

import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut } from 'lucide-react';

interface LeaveRoomDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  roomId: string;
}

export function LeaveRoomDialog({ isOpen, onConfirm, onCancel, roomId }: LeaveRoomDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="bg-background/95 backdrop-blur-xs border-border/50">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center text-destructive">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Leave Secret Room?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div>
              You are about to leave room <span className="font-mono font-semibold">#{roomId}</span>.
            </div>
            {/* <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm font-medium text-destructive mb-1">⚠️ Important Warning:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All chat messages will be permanently deleted</li>
                <li>• Shared files will be removed from the room</li>
                <li>• This action cannot be undone</li>
                <li>• You'll need the room password to rejoin</li>
              </ul>
            </div> 
            <p className="text-sm text-muted-foreground">
              Are you sure you want to continue?
            </p> */}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} className="hover:scale-105 transition-transform">
            Stay in Room
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground hover:scale-105 transition-transform"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Leave Room
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}