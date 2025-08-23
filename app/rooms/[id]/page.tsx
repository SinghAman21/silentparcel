"use client";

import { useState, useEffect } from "react";
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

export default function ChatRoomPage() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const [password, setPassword] = useState("");
	const [username, setUsername] = useState("");
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [error, setError] = useState("");
	const [roomExists, setRoomExists] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [isCheckingRoom, setIsCheckingRoom] = useState(true);
	const [userData, setUserData] = useState<any>(null);
	const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);

	const roomId = params.id as string;

	const checkRoomExists = useCallback(async () => {
		try {
			const response = await fetch(`/api/chat/rooms/${roomId}`);
			const data = await response.json();

			if (data.success) {
				setRoomInfo(data.room);
				setRoomExists(true);
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
	}, [roomId, checkRoomExists]);

	const handleJoinRoom = async () => {
		if (!password.trim()) {
			toast({
				title: "Error",
				description: "Please enter a room password",
				variant: "destructive",
			});
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			// Verify room and join via API
			const response = await fetch("/api/chat/rooms/verify", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					roomId,
					password: password.trim(),
					username: username.trim() || undefined,
				}),
			});

			const data = await response.json();

			if (data.success) {
				setIsAuthenticated(true);
				setUserData(data.user);
				setError("");
				toast({
					title: "Success",
					description: "Successfully joined the room!",
				});
			} else {
				setError(data.error || "Invalid room ID or password");
				toast({
					title: "Error",
					description: data.error || "Failed to join room",
					variant: "destructive",
				});
			}
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
								Join {roomInfo?.roomType === 'code' ? 'Code' : roomInfo?.roomType === 'mixed' ? 'Mixed' : 'Chat'} Room
							</CardTitle>
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
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="password">Room Password</Label>
								<Input
									id="password"
									type="password"
									placeholder="Enter room password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
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
									`Join ${roomInfo?.roomType === 'code' ? 'Code' : roomInfo?.roomType === 'mixed' ? 'Mixed' : 'Chat'} Room`
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
		if (roomInfo?.roomType === 'code' || roomInfo?.roomType === 'mixed') {
			return (
				<CollaborativeCodeInterface
					roomId={roomId}
					roomPassword={password}
					userData={userData}
					onLeave={() => {
						setIsAuthenticated(false);
						setUserData(null);
						setPassword("");
					}}
				/>
			);
		} else {
			return (
				<SupabaseChatInterface
					roomId={roomId}
					roomPassword={password}
					userData={userData}
					onLeave={() => {
						setIsAuthenticated(false);
						setUserData(null);
						setPassword("");
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
