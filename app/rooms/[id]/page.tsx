"use client";

import { useState, useEffect, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ThemeToggle from "@/components/theme-toggle";
import Link from "next/link";
import { SupabaseChatInterface } from "@/components/rooms/supabase-chat-interface";
import { CollaborativeCodeInterface } from "@/components/rooms/collaborative-code-interface";
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

interface RoomInfo {
  id: string;
  name: string;
  expiryTime: number;
  expiresAt: string;
  createdAt: string;
  participantCount: number;
  messageCount: number;
  roomType: 'chat' | 'code' | 'mixed';
  defaultLanguage: string;
  collaborativeMode: boolean;
  codeDocumentCount: number;
}

export default function ChatRoomPage({ searchParams }: { searchParams: Promise<{ admin?: string, name?: string }> }) {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const [username, setUsername] = useState("");
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [error, setError] = useState("");
	const [roomExists, setRoomExists] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [isCheckingRoom, setIsCheckingRoom] = useState(true);
	const [userData, setUserData] = useState<any>(null);
	const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
	const [isFirstUser, setIsFirstUser] = useState(false);

	const roomId = params.id as string;
	
	// Use React.use() to handle the searchParams promise
	const resolvedSearchParams = use(searchParams);
	const roomNameFromUrl = resolvedSearchParams?.name ? decodeURIComponent(resolvedSearchParams.name) : null;

	const checkRoomExists = useCallback(async () => {
		try {
			const response = await fetch(`/api/chat/rooms/${roomId}`);
			const data = await response.json();

			if (data.success) {
				setRoomInfo(data.room);
				setRoomExists(true);
				
				// Check if this user will be the first user (admin)
				setIsFirstUser(data.room.participantCount === 0);
			} else {
				setRoomExists(false);
			}
		} catch (error) {
			console.error("Error checking room:", error);
			setRoomExists(false);
		} finally {
			setIsCheckingRoom(false);
		}
	}, [roomId]);

	useEffect(() => {
		checkRoomExists();
	}, [checkRoomExists]);

	const handleJoinRoom = async () => {
		setIsLoading(true);
		setError("");

		try {
			// Generate username if not provided
			const finalUsername = username.trim() || `Guest_${Math.random().toString(36).substr(2, 6)}`;
			
			// Create user data with admin status if first user
			const newUserData = {
				roomId,
				username: finalUsername,
				isAdmin: isFirstUser // First user becomes admin
			};

			// Set user data first
			setUserData(newUserData);
			setIsAuthenticated(true);
			setError("");
			
			const roleMessage = isFirstUser ? "as Admin" : "as Participant";
			toast({
				title: "Success",
				description: `Successfully joined the room ${roleMessage}!`,
			});
		} catch (error) {
			console.error("Error joining room:", error);
			setError("Failed to join room. Please try again.");
			toast({
				title: "Error",
				description: "Failed to join room. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	// Show loading state while checking room
	if (isCheckingRoom) {
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
								This room doesn't exist or has expired. Rooms are
								automatically deleted after their expiration time.
							</p>
							<Button className="w-full" onClick={() => router.push("/rooms")}>
								Create New Room
							</Button>
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
								Join {roomInfo?.roomType === 'code' ? 'Code' : 'Chat'} Room
							</CardTitle>
							{isFirstUser && (
								<p className="text-sm text-primary font-medium">
									🎉 You'll be the room admin! You can manage participants.
								</p>
							)}
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="username">Username (Optional)</Label>
								<Input
									id="username"
									placeholder="Anonymous User"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									className="bg-background/50"
									onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
								/>
							</div>
							{error && <div className="text-red-600 text-sm">{error}</div>}
							<Button
								onClick={handleJoinRoom}
								disabled={isLoading}
								className="w-full hover:scale-105 transition-transform"
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Joining...
									</>
								) : (
									`Join Room${isFirstUser ? ' as Admin' : ''}`
								)}
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	// Render appropriate interface based on room type
	const renderInterface = () => {
		if (roomInfo?.roomType === 'code') {
			return (
				<CollaborativeCodeInterface
					roomId={roomId}
					roomPassword=""
					userData={userData}
					roomName={roomNameFromUrl || roomInfo?.name}
					onLeave={() => {
						setIsAuthenticated(false);
						setUserData(null);
					}}
				/>
			);
		} else {
			return (
				<SupabaseChatInterface
					roomId={roomId}
					roomPassword=""
					userData={userData}
					roomName={roomNameFromUrl || roomInfo?.name}
					onLeave={() => {
						setIsAuthenticated(false);
						setUserData(null);
					}}
				/>
			);
		}
	};

	return (
		<div className="min-h-screen bg-background">
			{renderInterface()}
		</div>
	);
}
