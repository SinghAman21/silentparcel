"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	Shield,
	AlertTriangle,
	Edit,
	Eye,
	Trash2,
	FileText,
	Archive,
	X,
	Undo,
	ChevronDown,
	ChevronRight,
	LoaderCircle,
	FileIcon,
	Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDropzone } from "@/components/files/file-dropzone";
import Link from "next/link";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import FilesSkeleton from "@/components/files/files-skeleton";

interface Subfile {
	file_name: string;
	file_path: string;
	size: number;
	mime_type: string;
	file_token: string;
	extracted: boolean;
	downloaded_at: string | null;
}

interface FileInfo {
	id: string;
	name: string;
	original_name: string;
	size: number;
	type: string;
	uploadDate: string;
	downloadCount: number;
	maxDownloads: number;
	expiryDate: string;
	isPasswordProtected: boolean;
	virusScanStatus: string;
	files: Subfile[];
	appwrite_id: string;
	isActive: boolean;
	totalFiles: number;
}

// --- Tree Utilities ---
type FileTreeNode = {
	name: string;
	path: string;
	isFolder: boolean;
	children?: FileTreeNode[];
	file?: Subfile | File;
	status: "existing" | "to-add" | "to-delete";
	file_token?: string; // for existing files
};

function buildFileTree(
	files: (Subfile | (File & { webkitRelativePath?: string }))[],
	status: "existing" | "to-add"
): FileTreeNode[] {
	// Build a nested object tree first
	const root: { [key: string]: any } = {};
	for (const file of files) {
		const relPath =
			(file as any).file_path ||
			(file as any).webkitRelativePath ||
			(file as any).name;
		const parts = relPath.split("/");
		let node = root;
		let currPath = "";
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			currPath = currPath ? currPath + "/" + part : part;
			if (!node[part]) {
				node[part] = {
					name: part,
					path: currPath,
					isFolder: i < parts.length - 1,
					children: i < parts.length - 1 ? {} : undefined,
					// Always set status to 'to-add' if status param is 'to-add'
					status:
						status === "to-add"
							? "to-add"
							: i === parts.length - 1
							? status
							: "existing",
				};
			} else if (status === "to-add") {
				// If this is a new file/folder, ensure status is 'to-add' for all ancestors
				node[part].status = "to-add";
			}
			if (i === parts.length - 1) {
				node[part].file = file;
				if ((file as any).file_token)
					node[part].file_token = (file as any).file_token;
			}
			node = node[part].children || {};
		}
	}
	// Convert object tree to array tree for rendering
	function toArrayTree(obj: any): FileTreeNode[] {
		return Object.values(obj).map((n: any) => ({
			...n,
			children: n.children ? toArrayTree(n.children) : undefined,
		}));
	}
	return toArrayTree(root);
}

function mergeFileTrees(
	existing: FileTreeNode[],
	toAdd: FileTreeNode[]
): FileTreeNode[] {
	// Recursively merge two trees, always prefer 'to-add' status for new files/folders
	const map = new Map<string, FileTreeNode>();
	for (const node of existing) map.set(node.path, { ...node });
	for (const node of toAdd) {
		if (map.has(node.path)) {
			const exist = map.get(node.path)!;
			if (exist.isFolder && node.children && exist.children) {
				exist.children = mergeFileTrees(exist.children, node.children);
			}
			// Always prefer 'to-add' status if present
			if (node.status === "to-add") {
				exist.status = "to-add";
			}
			if (node.file) {
				exist.file = node.file;
			}
			if (node.file_token) {
				exist.file_token = node.file_token;
			}
		} else {
			map.set(node.path, { ...node });
		}
	}
	return Array.from(map.values());
}

// --- Fix markNodeAndChildrenForDelete/unmarkNodeAndChildrenForDelete ---
function markNodeAndChildrenForDelete(node: FileTreeNode): FileTreeNode {
	return {
		...node,
		status: "to-delete",
		children: node.children
			? node.children.map(markNodeAndChildrenForDelete)
			: undefined,
	};
}
function unmarkNodeAndChildrenForDelete(node: FileTreeNode): FileTreeNode {
	return {
		...node,
		status: node.status === "to-add" ? "to-add" : "existing",
		children: node.children
			? node.children.map(unmarkNodeAndChildrenForDelete)
			: undefined,
	};
}

// --- Handler functions for tree actions ---

// Dedicated function to remove a 'to-add' node (file or folder) and all its children
function removeToAddNodeAndChildren(
	nodes: FileTreeNode[],
	path: string
): FileTreeNode[] {
	return nodes
		.map((node) => {
			if (node.path === path && node.status === "to-add") {
				return null; // Remove this node (file or folder) and all its children
			} else if (node.children) {
				const updatedChildren = removeToAddNodeAndChildren(
					node.children,
					path
				).filter(Boolean) as FileTreeNode[];
				if (updatedChildren.length === 0 && node.status === "to-add") {
					return null;
				}
				return {
					...node,
					children: updatedChildren,
				};
			}
			return node;
		})
		.filter(Boolean) as FileTreeNode[];
}

export default function ManageFilePage() {
	const params = useParams();
	const router = useRouter();
	// --- State ---
	const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
		new Set()
	);
	const [editToken, setEditToken] = useState("");
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [error, setError] = useState("");
	const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
	const [newFiles, setNewFiles] = useState<File[]>([]);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);
	const [filesToDelete, setFilesToDelete] = useState<string[]>([]); // file_token of files to delete
	const [updateLoading, setUpdateLoading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const fileId = params.id as string;

	// Fetch metadata from API
	const loadFileData = async () => {
		setLoading(true);
		setError("");
		try {
			// Add cache busting parameter to ensure fresh data
			const timestamp = Date.now();
			const res = await fetch(`/api/files/metadata/${fileId}?t=${timestamp}`, {
				cache: 'no-store',
				headers: {
					'Cache-Control': 'no-cache'
				}
			});
			if (!res.ok) {
				setError("File not found or has been deleted.");
				setFileInfo(null);
			} else {
				const data = await res.json();
				console.log("Loaded fresh file data:", data);
				setFileInfo(data);
			}
		} catch (e) {
			console.error("Failed to load file data:", e);
			setError("Failed to fetch file metadata.");
			setFileInfo(null);
		} finally {
			setLoading(false);
		}
	};

	// --- Effect: Build initial tree from fileInfo ---
	useEffect(() => {
		if (fileInfo?.files) {
			setFileTree(buildFileTree(fileInfo.files, "existing"));
			// Expand root folders by default
			setExpandedFolders(
				new Set(
					fileInfo.files.map(
						(f: any) =>
							(f.file_path || f.webkitRelativePath || f.name).split("/")[0]
					)
				)
			);
		}
	}, [fileInfo]);

	useEffect(() => {
		if (isAuthenticated) {
			loadFileData();
		}
		// eslint-disable-next-line
	}, [isAuthenticated, fileId]);

	const handleAuthenticate = async () => {
		setError("");
		if (!editToken) {
			setError("Please enter your edit token.");
			setIsAuthenticated(false);
			setTimeout(() => setError(""), 3000);
			return;
		}
		try {
			const res = await fetch(`/api/files/manage/${fileId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ editToken }),
			});
			const data = await res.json();
			if (!res.ok || !data.valid) {
				setError(data.error || "Invalid edit token.");
				setIsAuthenticated(false);
				setTimeout(() => setError(""), 3000);
			} else {
				setIsAuthenticated(true);
			}
		} catch (e) {
			setError("Failed to validate token.");
			setIsAuthenticated(false);
			setTimeout(() => setError(""), 3000);
		}
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	const handleDeleteFile = async () => {
		setDeleting(true);
		setError("");
		try {
			const res = await fetch(`/api/files/manage/${fileId}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ editToken }), // send the edit token for auth
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || "Failed to delete file");
			} else {
				// Optionally redirect or show a success message
				router.push("/files"); // or your desired route
			}
		} catch (err) {
			setError("Failed to delete file");
		} finally {
			setDeleting(false);
			setShowDeleteDialog(false);
		}
	};

	// --- Add Files ---
	const handleAddFiles = (files: File[]) => {
		const toAddTree = buildFileTree(files, "to-add");
		setFileTree((prev) => mergeFileTrees(prev, toAddTree));
	};

	// --- Folder expand/collapse logic ---
	const toggleFolder = (path: string) => {
		setExpandedFolders((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(path)) newSet.delete(path);
			else newSet.add(path);
			return newSet;
		});
	};

	// --- Handler for viewing as receiver ---
	const viewAsReceiver = () => {
		window.open(`/files/${fileId}`, "_blank");
	};

	// --- Update Files Handler ---
	const handleUpdateFiles = async () => {
		// Gather files to add and tokens to delete
		const filesToAdd: File[] = [];
		const relPathsToAdd: string[] = [];
		const filesToDelete: string[] = [];
		const pathsToAdd: string[] = []; // For folders and files that need metadata
		
		function traverse(nodes: FileTreeNode[]) {
			for (const node of nodes) {
				if (node.status === "to-add") {
					if (node.file instanceof File) {
						// This is a file with actual File object
						filesToAdd.push(node.file);
						relPathsToAdd.push(node.path);
					}
					// Always add the path for metadata tracking (both files and folders)
					pathsToAdd.push(node.path);
				}
				if (node.status === "to-delete" && node.file_token) {
					filesToDelete.push(node.file_token);
				}
				if (node.children) traverse(node.children);
			}
		}
		traverse(fileTree);
		
		// Check if there are any changes to process
		if (filesToAdd.length === 0 && filesToDelete.length === 0 && pathsToAdd.length === 0) {
			console.log("No changes detected");
			return;
		}
		
		console.log("Processing changes:", {
			filesToAdd: filesToAdd.length,
			filesToDelete: filesToDelete.length,
			pathsToAdd: pathsToAdd.length
		});
		
		setUpdateLoading(true);
		setError("");
		try {
			const formData = new FormData();
			
			// Add actual files
			filesToAdd.forEach((file, i) => {
				formData.append("files", file);
				formData.append("relativePaths", relPathsToAdd[i]);
			});
			
			// Add metadata for all paths (including folders)
			formData.append("pathsToAdd", JSON.stringify(pathsToAdd));
			formData.append("editToken", editToken);
			formData.append("filesToDelete", JSON.stringify(filesToDelete));
			
			console.log("Sending to API:", {
				files: filesToAdd.map(f => f.name),
				paths: pathsToAdd,
				deletions: filesToDelete
			});
			
			const res = await fetch(`/api/files/manage/${fileId}`, {
				method: "POST",
				body: formData,
			});
			const data = await res.json();
			if (!res.ok) {
				console.error("API Error:", data);
				setError(data.error || "Failed to update file");
			} else {
				console.log("Update successful:", data);
				// Force reload data with cache busting
				await loadFileData();
				setFileTree([]); // will be rebuilt from fileInfo
				
				// Show success message
				setError(""); // Clear any existing errors
				// You could add a success toast here if you have a toast system
			}
		} catch (err) {
			console.error("Update failed:", err);
			setError("Failed to update file");
		} finally {
			setUpdateLoading(false);
		}
	};

	// --- Render Tree ---
	function renderTree(nodes: FileTreeNode[], depth = 0) {
		return nodes.map((node) => {
			const isExpanded = expandedFolders.has(node.path);
			if (node.status === "to-add") {
				// For any new file or folder, show X to remove node and all its children
				return (
					<div
						key={node.path}
						style={{ marginLeft: depth * 14 }}
						className="py-0.5"
					>
						<div className="flex items-center gap-1 group">
							{node.isFolder ? (
								<>
									<button
										type="button"
										onClick={() => toggleFolder(node.path)}
										className="focus:outline-none p-0.5 rounded hover:bg-accent/30 transition"
										aria-label={
											isExpanded ? "Collapse folder" : "Expand folder"
										}
									>
										{isExpanded ? (
											<ChevronDown className="h-4 w-4 text-muted-foreground" />
										) : (
											<ChevronRight className="h-4 w-4 text-muted-foreground" />
										)}
									</button>
									<Archive className="h-4 w-4 text-muted-foreground" />
								</>
							) : (
								<span className="inline-block w-5" />
							)}
							{!node.isFolder && (
								<FileText className="h-4 w-4 text-muted-foreground" />
							)}
							<span
								className={`flex-1 text-sm truncate select-text text-primary`}
								title={node.name}
							>
								{node.name}
							</span>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => handleRemoveToAddNode(node.path)}
								className={`text-destructive${
									!node.isFolder ? " hover:bg-destructive/10" : ""
								} p-1`}
								aria-label="Remove pending node"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
						{node.isFolder && isExpanded && node.children && (
							<div>{renderTree(node.children, depth + 1)}</div>
						)}
					</div>
				);
			}
			// Existing logic for other cases
			return (
				<div
					key={node.path}
					style={{ marginLeft: depth * 14 }}
					className="py-0.5"
				>
					{node.isFolder ? (
						<div className="flex items-center gap-1 group">
							<button
								type="button"
								onClick={() => toggleFolder(node.path)}
								className="focus:outline-none p-0.5 rounded hover:bg-accent/30 transition"
								aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
							>
								{isExpanded ? (
									<ChevronDown className="h-4 w-4 text-muted-foreground" />
								) : (
									<ChevronRight className="h-4 w-4 text-muted-foreground" />
								)}
							</button>
							<Archive className="h-4 w-4 text-muted-foreground" />
							<span
								className={`flex-1 text-sm truncate select-text ${
									node.status === "to-delete"
										? "line-through text-destructive"
										: ""
								}`}
								title={node.name}
							>
								{node.name}
							</span>
							{node.status === "to-delete" ? (
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleUndoDeleteNode(node.path)}
									className="text-green-600 hover:text-green-700 p-1"
									aria-label="Undo delete"
								>
									<Undo className="h-4 w-4" />
								</Button>
							) : node.status === "existing" ? (
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleDeleteNode(node.path)}
									className="text-destructive  p-1"
									aria-label="Delete folder"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							) : null}
						</div>
					) : (
						<div className="flex items-center gap-1 group">
							<span className="inline-block w-5" />
							<FileText className="h-4 w-4 text-muted-foreground" />
							<span
								className={`flex-1 text-sm truncate select-text ${
									node.status === "to-delete"
										? "line-through text-destructive"
										: ""
								}`}
								title={node.name}
							>
								{node.name}
							</span>
							{node.status === "to-delete" ? (
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleUndoDeleteNode(node.path)}
									className="text-green-600 hover:text-green-700 p-1"
									aria-label="Undo delete"
								>
									<Undo className="h-4 w-4" />
								</Button>
							) : node.status === "existing" ? (
								<Button
									variant="ghost"
									size="icon"
									onClick={() => handleDeleteNode(node.path)}
									className="text-destructive hover:bg-destructive/10 p-1"
									aria-label="Delete file"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							) : null}
						</div>
					)}
					{node.isFolder && isExpanded && node.children && (
						<div>{renderTree(node.children, depth + 1)}</div>
					)}
				</div>
			);
		});
	}

	function formatDate(date: string | Date | undefined) {
		// gives IST based time
		if (!date) return "";
		const d = new Date(date);
		const istOffset = 5.5 * 60; // IST is UTC +5:30 in minutes
		const utc = d.getTime() + d.getTimezoneOffset() * 60000;
		const istTime = new Date(utc + istOffset * 60000);
		return (
			istTime.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) +
			" at " +
			istTime.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })
		);
	}

	const handleUndoDeleteNode = (path: string) => {
		setFileTree((prev) =>
			recursiveUpdateNode(prev, path, (node) =>
				unmarkNodeAndChildrenForDelete({ ...node })
			)
		);
	};
	const handleDeleteNode = (path: string) => {
		setFileTree((prev) =>
			recursiveUpdateNode(prev, path, (node) =>
				markNodeAndChildrenForDelete({ ...node })
			)
		);
	};

	function recursiveUpdateNode(
		nodes: FileTreeNode[],
		path: string,
		updater: (node: FileTreeNode) => FileTreeNode
	): FileTreeNode[] {
		return nodes.map((node) => {
			if (node.path === path) {
				return updater(node);
			} else if (node.children) {
				return {
					...node,
					children: recursiveUpdateNode(node.children, path, updater),
				};
			}
			return node;
		});
	}

	const handleRemoveToAddNode = (path: string) => {
		setFileTree((prev) => removeToAddNodeAndChildren(prev, path));
	};

	if (!isAuthenticated) {
		return (
			<div className="min-h-screen bg-background flex flex-col">
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

				<main className="flex flex-1 items-center justify-center">
					<Card className="bg-card/60 border-border/60 shadow-xl w-full max-w-md">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<Edit className="h-5 w-5 text-primary" />
								File Management Access
							</CardTitle>
							<p className="text-muted-foreground text-sm mt-2">
								Enter your management token to access file controls.
							</p>
						</CardHeader>
						<CardContent className="space-y-6">
							<div>
								<Label htmlFor="token" className="font-semibold">
									Management Token
								</Label>
								<Input
									id="token"
									type="password"
									placeholder="Enter your edit token"
									value={editToken}
									onChange={(e) => setEditToken(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
									className="bg-background/60 focus:ring-2 focus:ring-primary/40 mt-2"
									autoFocus
								/>
								{error && (
									<div className="flex items-center gap-2 mt-1 text-destructive text-sm">
										<AlertTriangle className="h-4 w-4" />
										{error}
									</div>
								)}
							</div>
							<Button
								onClick={handleAuthenticate}
								disabled={!editToken}
								className="w-full hover:scale-105 transition-transform font-semibold"
								size="lg"
							>
								Access File Management
							</Button>
						</CardContent>
					</Card>
				</main>
			</div>
		);
	}

	// if (loading) {
	// 	return (
	// 		<div className="min-h-screen flex items-center justify-center bg-background">
	// 			<div className="flex flex-col items-center gap-3">
	// 				<LoaderCircle className="animate-spin rounded-full h-8 w-8" />
	// 				<div className="text-base text-muted-foreground">
	// 					Loading file info…
	// 				</div>
	// 			</div>
	// 		</div>
	// 	);
	// }

	if (!fileInfo || loading) {
		return <FilesSkeleton />;
	}

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
					<div className="flex items-center space-x-2">
						<Button
							onClick={viewAsReceiver}
							variant="outline"
							size="sm"
							className="gap-2 hover:scale-105 transition-transform"
						>
							<Eye className="h-4 w-4" />
							<span className="max-[476px]:hidden">View as Receiver</span>
						</Button>
						<ThemeToggle />
					</div>
				</div>
			</header>

			<div className="container mx-auto px-4 py-8 max-w-4xl">
				<div className="space-y-6">
					{/* File Header */}
					<Card className="rounded-2xl bg-card/80 border-border/50 shadow-lg">
						<CardHeader>
							<div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
								<div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-lg flex items-center justify-center shadow shrink-0">
									<FileIcon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
								</div>
								<div className="flex-1 min-w-0">
									<CardTitle className="text-lg sm:text-2xl font-semibold truncate">
										{fileInfo?.original_name || fileInfo?.name}
									</CardTitle>
									<p className="text-muted-foreground text-xs sm:text-sm truncate flex-wrap flex gap-1">
										<span>{formatFileSize(fileInfo?.size ?? 0)} &middot;</span>
										{"  "}
										<span> Uploaded {formatDate(fileInfo?.uploadDate)}</span>
										{fileInfo?.totalFiles && (
											<>
												{"  "}
												<span>&middot; {fileInfo.totalFiles} files</span>
											</>
										)}
									</p>
								</div>
								<div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 ml-0 sm:ml-auto mt-2 sm:mt-0">
									<Badge
										variant="default"
										className="bg-green-100 text-green-800 border border-green-300 flex-nowrap px-2 py-1 text-xs"
									>
										<Shield className="h-3 w-3 mr-1 text-green-600" />
										Virus Free
									</Badge>
									<Badge variant="secondary" className="py-1 px-2 text-xs">
										<Lock className="h-3 w-3 mr-1" />
										Protected
									</Badge>
								</div>
							</div>
						</CardHeader>
					</Card>

					{/* Stats */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Card className="bg-card/50 border-border/50">
							<CardContent className="pt-6">
								<div className="text-center">
									<div className="text-2xl font-bold text-primary">
										{fileInfo.downloadCount}
									</div>
									<p className="text-sm text-muted-foreground">
										Total Downloads
									</p>
								</div>
							</CardContent>
						</Card>

						<Card className="bg-card/50 border-border/50">
							<CardContent className="pt-6">
								<div className="text-center">
									<div className="text-2xl font-bold text-chart-1">
										{fileInfo.maxDownloads - fileInfo.downloadCount}
									</div>
									<p className="text-sm text-muted-foreground">
										Downloads Remaining
									</p>
								</div>
							</CardContent>
						</Card>

						<Card className="bg-card/50 border-border/50">
							<CardContent className="pt-6">
								<div className="text-center">
									<div className="text-2xl font-bold text-chart-2">
										{Math.ceil(
											(new Date(fileInfo.expiryDate).getTime() - Date.now()) /
												(1000 * 60 * 60 * 24)
										)}
									</div>
									<p className="text-sm text-muted-foreground">
										Days Until Expiry
									</p>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Management Tabs */}
					<Tabs defaultValue="files" className="w-full">
						<TabsList className="flex w-full gap-2 bg-muted/30 rounded-lg p-1">
							<TabsTrigger value="files" className="flex-1">
								<Archive className="h-4 w-4 mr-1" />
								Files
							</TabsTrigger>
							<TabsTrigger value="settings" className="flex-1">
								<Shield className="h-4 w-4 mr-1" />
								Settings
							</TabsTrigger>
						</TabsList>

						<TabsContent value="files" className="space-y-4">
							<Card className="bg-card/40 border-none shadow-none">
								<CardHeader className="pb-2">
									<CardTitle className="flex items-center justify-between text-base font-semibold">
										<span className="flex items-center gap-2">
											Archive
											<Badge variant="secondary" className="ml-2">
												{fileInfo.files?.length || 0} files
											</Badge>
										</span>
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-2">
									<ScrollArea className="h-56 rounded-md border border-border/30 bg-muted/10">
										{fileTree.length > 0 ? (
											renderTree(fileTree)
										) : (
											<div className="text-center text-muted-foreground py-8 text-sm">
												No files in archive.
											</div>
										)}
									</ScrollArea>
									<div className="my-3">
										<div className="w-full">
											<Accordion type="single" collapsible>
												<AccordionItem value="add-files">
													<AccordionTrigger className="flex items-center font-medium">
														Add New Files
													</AccordionTrigger>
													<AccordionContent className="mt-3">
														<FileDropzone onFileSelect={handleAddFiles} />
													</AccordionContent>
												</AccordionItem>
											</Accordion>
										</div>
									</div>
									{error && (
										<div className="text-destructive text-xs mt-2">{error}</div>
									)}
									<Button
										onClick={handleUpdateFiles}
										className="w-full mt-4"
										disabled={updateLoading}
										variant="default"
									>
										{updateLoading ? "Updating..." : "Save Changes"}
									</Button>
								</CardContent>
							</Card>
						</TabsContent>
						<TabsContent value="settings" className="space-y-4">
							<Card className="bg-card/40 border-none shadow-none">
								<CardHeader className="pb-2">
									<CardTitle className="flex items-center gap-2 text-base font-semibold">
										Settings
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4 pt-0">
									<div className="flex items-center justify-between">
										<span className="text-sm">Password Protection</span>
										<Badge
											variant={
												fileInfo.isPasswordProtected ? "default" : "secondary"
											}
										>
											{fileInfo.isPasswordProtected ? "Enabled" : "Disabled"}
										</Badge>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm">Download Limit</span>
										<span className="text-sm font-medium">
											{fileInfo.maxDownloads}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm">Expiry Date</span>
										<span className="text-sm font-medium">
											{new Date(fileInfo.expiryDate).toLocaleDateString()}
										</span>
									</div>
									<div className="pt-4 border-t border-border/30">
										<AlertDialog
											open={showDeleteDialog}
											onOpenChange={setShowDeleteDialog}
										>
											<AlertDialogTrigger asChild>
												<Button
													variant="destructive"
													className="w-full"
													size="sm"
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Delete File
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<div>
													<AlertDialogTitle className="font-bold text-lg mb-2">
														Delete File?
													</AlertDialogTitle>
													<AlertDialogDescription>
														This will permanently delete the file from Database
														and Storage. This action cannot be undone.
													</AlertDialogDescription>
													{error && (
														<div className="text-destructive mt-2">{error}</div>
													)}
												</div>
												<div className="flex items-end justify-end gap-2 mt-4">
													<AlertDialogCancel className="bg-secondary hover:bg-secondary/90">
														Cancel
													</AlertDialogCancel>
													<AlertDialogAction
														onClick={handleDeleteFile}
														disabled={deleting}
														className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
													>
														{/* <Button
															variant="outline"
														> */}
														{deleting ? "Deleting..." : "Delete"}
														{/* </Button> */}
													</AlertDialogAction>
												</div>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
