"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
	ArrowLeft,
	Download,
	Lock,
	Shield,
	FileText,
	Archive,
	Edit,
	Folder,
	ChevronDown,
	ChevronRight,
	XCircle,
	LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/theme-toggle";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

type Subfile = {
	file_name: string;
	file_path: string;
	size: number;
	mime_type: string;
	file_token: string;
	extracted: boolean;
	downloaded_at: string | null;
};

type FileTreeNode = {
	name: string;
	path: string;
	isFolder: boolean;
	children?: FileTreeNode[];
	file?: Subfile;
};

function buildFileTree(files: Subfile[]): FileTreeNode[] {
	const root: { [key: string]: any } = {};
	for (const file of files) {
		const parts = file.file_path.split("/");
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
				};
			}
			if (i === parts.length - 1) {
				node[part].file = file;
			}
			node = node[part].children || {};
		}
	}
	function toArrayTree(obj: any): FileTreeNode[] {
		return Object.values(obj).map((n: any) => ({
			...n,
			children: n.children ? toArrayTree(n.children) : undefined,
		}));
	}
	return toArrayTree(root);
}

function getAllLeafPaths(nodes: FileTreeNode[]): string[] {
	let paths: string[] = [];
	for (const node of nodes) {
		if (node.isFolder && node.children) {
			paths = paths.concat(getAllLeafPaths(node.children));
		} else {
			paths.push(node.path);
		}
	}
	return paths;
}

type TreeCheckboxProps = {
	checked: boolean;
	indeterminate: boolean;
	onChange: () => void;
	id: string;
};
function TreeCheckbox({
	checked,
	indeterminate,
	onChange,
	id,
}: TreeCheckboxProps) {
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (ref.current) ref.current.indeterminate = indeterminate;
	}, [indeterminate]);
	return (
		<input
			ref={ref}
			type="checkbox"
			checked={checked}
			onChange={onChange}
			id={id}
			className="accent-primary w-4 h-4 rounded border border-border focus:ring-2 focus:ring-primary/50"
		/>
	);
}

import { easeInOut, easeIn } from "motion";
import FilesSkeleton from "@/components/files-skeleton";

const fadeIn = {
	hidden: { opacity: 0, y: 16 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.25, ease: easeInOut },
	},
	exit: { opacity: 0, y: 16, transition: { duration: 0.15, ease: easeIn } },
};

const subtleMotion = {
	initial: { opacity: 0, y: 8 },
	animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: easeInOut } },
	exit: { opacity: 0, y: 8, transition: { duration: 0.15, ease: easeIn } },
};

export default function FileDownloadPage() {
	const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
	const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
		new Set()
	);
	const [downloading, setDownloading] = useState(false);
	const [error, setError] = useState("");
	// const [showEditToken, setShowEditToken] = useState(false);
	// const [editToken, setEditToken] = useState("");
	const params = useParams();
	const [fileExists, setFileExists] = useState(true);
	const [fileInfo, setFileInfo] = useState<any>(null);
	const [password, setPassword] = useState("");
	const [isUnlocked, setIsUnlocked] = useState(false);
	const fileId = params.id;

	useEffect(() => {
		if (fileInfo?.files) {
			setFileTree(buildFileTree(fileInfo.files));
			setExpandedFolders(
				new Set(fileInfo.files.map((f: any) => f.file_path.split("/")[0]))
			);
		}
	}, [fileInfo]);

	const handleSelect = (
		path: string,
		isFolder: boolean,
		children?: FileTreeNode[]
	) => {
		if (isFolder && children) {
			const leafPaths = getAllLeafPaths(children);
			setSelectedPaths((prev) => {
				const allSelected = leafPaths.every((p) => prev.includes(p));
				if (allSelected) {
					return prev.filter((p) => !leafPaths.includes(p));
				} else {
					return Array.from(new Set([...prev, ...leafPaths]));
				}
			});
		} else {
			setSelectedPaths((prev) =>
				prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
			);
		}
	};
	const handleSelectAll = () => {
		setSelectedPaths(getAllLeafPaths(fileTree));
	};
	const handleClear = () => {
		setSelectedPaths([]);
	};
	const toggleFolder = (path: string) => {
		setExpandedFolders((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(path)) newSet.delete(path);
			else newSet.add(path);
			return newSet;
			return newSet;
		});
	};

	function renderTree(nodes: FileTreeNode[], depth = 0) {
		return nodes.map((node) => {
			const isExpanded = expandedFolders.has(node.path);
			const allLeafs = getAllLeafPaths([node]);
			const checked = node.isFolder
				? allLeafs.every((p) => selectedPaths.includes(p))
				: selectedPaths.includes(node.path);
			const some = node.isFolder
				? allLeafs.some((p) => selectedPaths.includes(p))
				: false;
			const indeterminate = node.isFolder && some && !checked;
			return (
				<motion.div
					key={node.path}
					style={{ marginLeft: depth * 16 }}
					className="group flex flex-col xs:flex-row items-start xs:items-center py-1 hover:bg-accent/30 rounded transition"
					initial="hidden"
					animate="visible"
					exit="exit"
					variants={fadeIn}
				>
					{node.isFolder ? (
						<>
							<div className="flex items-center w-full">
								<button
									type="button"
									onClick={() => toggleFolder(node.path)}
									className="mr-1 focus:outline-none"
									aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
								>
									{isExpanded ? (
										<ChevronDown className="h-4 w-4 text-muted-foreground" />
									) : (
										<ChevronRight className="h-4 w-4 text-muted-foreground" />
									)}
								</button>
								<TreeCheckbox
									checked={checked}
									indeterminate={indeterminate}
									onChange={() =>
										handleSelect(node.path, node.isFolder, node.children)
									}
									id={node.path}
								/>
								<Folder className="h-4 w-4 text-primary ml-2" />
								<label
									htmlFor={node.path}
									className="ml-2 text-sm cursor-pointer select-none font-medium truncate max-w-[120px] xs:max-w-none"
								>
									{node.name}
								</label>
							</div>
						</>
					) : (
						<>
							<div className="flex items-center w-full">
								<span style={{ width: 32, display: "inline-block" }} />
								<TreeCheckbox
									checked={checked}
									indeterminate={false}
									onChange={() => handleSelect(node.path, false)}
									id={node.path}
								/>
								<FileText className="h-4 w-4 text-muted-foreground ml-2" />
								<label
									htmlFor={node.path}
									className="ml-2 text-sm cursor-pointer select-none truncate max-w-[120px] xs:max-w-none"
								>
									{node.name}
								</label>
								{node.file && (
									<span className="ml-2 text-xs text-muted-foreground truncate max-w-[80px] xs:max-w-none">
										{formatFileSize(node.file.size)}
									</span>
								)}
							</div>
						</>
					)}
					<AnimatePresence>
						{node.isFolder && isExpanded && node.children && (
							<motion.div
								className="w-full"
								initial="initial"
								animate="animate"
								exit="exit"
								variants={subtleMotion}
							>
								{renderTree(node.children, depth + 1)}
							</motion.div>
						)}
					</AnimatePresence>
					<style jsx>{`
						@media (max-width: 475px) {
							.group {
								flex-direction: column !important;
								align-items: flex-start !important;
							}
							.group label {
								max-width: 120px;
								overflow: hidden;
								text-overflow: ellipsis;
								white-space: nowrap;
							}
							.group span.text-xs {
								max-width: 80px;
								overflow: hidden;
								text-overflow: ellipsis;
								white-space: nowrap;
							}
						}
					`}</style>
				</motion.div>
			);
		});
	}

	useEffect(() => {
		const fetchMeta = async () => {
			setError("");
			const res = await fetch(`/api/files/metadata/${fileId}`);
			if (res.ok) {
				const data = await res.json();
				setFileInfo(data);
				setFileExists(true);
			} else {
				setFileExists(false);
			}
		};
		fetchMeta();
	}, [fileId]);

	function formatFileSize(bytes: number) {
		if (!bytes) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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

	function onlyDate(date: string | Date | undefined) {
		if (!date) return "";
		const d = new Date(date);
		return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
	}

	const handleUnlock = async () => {
		setError("");
		try {
			// If password is provided, directly validate it without making metadata request
			if (password) {
				const checkRes = await fetch(
					`/api/files/download/${fileId}?password=${encodeURIComponent(
						password
					)}`,
					{
						method: "HEAD",
					}
				);

				if (checkRes.ok) {
					setIsUnlocked(true);
				} else {
					const errData = await checkRes.json().catch(() => ({}));
					setError(errData.error || "Invalid password");
				}
				return;
			}

			// If no password provided, try to get metadata to check if password is required
			const res = await fetch(`/api/files/download/${fileId}?meta=1`, {
				method: "GET",
			});

			if (res.status === 401) {
				// File requires password but none was provided
				setError("Password required");
				return;
			}

			if (!res.ok) {
				setError("File not found or expired");
				return;
			}

			const meta = await res.json();
			if (!meta.isPasswordProtected) {
				setIsUnlocked(true);
				return;
			}

			// File is password protected but no password was provided
			setError("Password required");
		} catch (e) {
			setError("Failed to validate password");
		}
	};

	const handleDownloadSelected = async () => {
		setDownloading(true);
		setError("");
		try {
			console.log('Attempting selective download with paths:', selectedPaths);
			const res = await fetch(
				`/api/files/download/${fileId}${
					fileInfo?.isPasswordProtected
						? `?password=${encodeURIComponent(password)}`
						: ""
				}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ paths: selectedPaths }),
				}
			);
			if (!res.ok) {
				let errorMessage = "Download failed";
				try {
					const data = await res.json();
					console.error('Selective download failed:', data);
					errorMessage = data.error || "Download failed";
					if (data.details) {
						errorMessage += ` (${data.details})`;
					}
					if (data.requestedPaths && data.availablePaths) {
						errorMessage += `\nRequested: ${data.requestedPaths.join(', ')}\nAvailable: ${data.availablePaths.slice(0, 5).join(', ')}...`;
					}
				} catch (parseError) {
					console.error('Failed to parse error response:', parseError);
					errorMessage = `Download failed (HTTP ${res.status})`;
				}
				setError(errorMessage);
				setDownloading(false);
				return;
			}
			
			// Check if response is actually a blob
			const contentType = res.headers.get("Content-Type");
			if (!contentType || !contentType.includes("application/zip")) {
				console.error('Unexpected content type:', contentType);
				setError("Download failed: Invalid response format");
				setDownloading(false);
				return;
			}
			
			let blob;
			try {
				blob = await res.blob();
				if (!blob || blob.size === 0) {
					throw new Error("Empty response received");
				}
			} catch (blobError) {
				console.error('Failed to create blob:', blobError);
				setError("Download failed: Could not process file data");
				setDownloading(false);
				return;
			}
			
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			
			// Get filename from Content-Disposition header or use fallback
			let filename = "partial_download.zip";
			const contentDisposition = res.headers.get("Content-Disposition");
			if (contentDisposition) {
				const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
				if (filenameMatch) {
					filename = filenameMatch[1];
				}
			}
			
			// Fallback to using fileInfo if header parsing fails
			if (filename === "partial_download.zip" && fileInfo?.original_name) {
				const originalName = fileInfo.original_name || "archive";
				filename = `${originalName.replace(/\.zip$/i, "")}_partial.zip`;
			}
			
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url); // Clean up the object URL
			setDownloading(false);
		} catch (e) {
			console.error('Selective download error:', e);
			setError(`Download failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
			setDownloading(false);
		}
	};

	if (!fileExists) {
		return (
			<div className="min-h-screen">
				<header className="border-b border-border/40 backdrop-blur-xs bg-background sticky top-0 z-50">
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
				<div className="container mx-auto px-4 py-16 max-w-md flex flex-col items-center">
					<motion.div
						className="w-full"
						initial="hidden"
						animate="visible"
						exit="exit"
						variants={fadeIn}
					>
						<Card className="rounded-2xl bg-card/70 border-border/50 shadow-xl w-full">
							<CardHeader>
								<CardTitle className="flex items-center text-destructive">
									<XCircle className="h-6 w-6 mr-2" />
									File Not Found
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<p className="text-muted-foreground text-center">
									This file doesn't exist or has expired.
									<br />
									Files are automatically deleted after 07 days.
								</p>
								<Link href="/files">
									<Button className="w-full">Upload New File</Button>
								</Link>
							</CardContent>
						</Card>
					</motion.div>
				</div>
			</div>
		);
	}

	if (!fileInfo) {
		return <FilesSkeleton />;
	}

	const FileIcon =
		fileInfo &&
		fileInfo.type &&
		(fileInfo.type.includes("zip") || fileInfo.type.includes("archive"))
			? Archive
			: FileText;

	return (
		<div className="min-h-screen">
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
			<div className="container mx-auto px-4 py-10 max-w-4xl">
				<motion.div
					className="space-y-8"
					initial="hidden"
					animate="visible"
					exit="exit"
					variants={fadeIn}
				>
					{/* File Info Card */}
					<motion.div variants={subtleMotion}>
						<Card className="rounded-2xl bg-card/80 border-border/50 shadow-lg">
							<CardHeader>
								<div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
									<div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-lg flex items-center justify-center shadow shrink-0">
										<FileIcon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
									</div>
									<div className="flex-1 min-w-0">
										<CardTitle className="text-lg sm:text-2xl font-semibold truncate">
											{fileInfo?.original_name}
										</CardTitle>
										<p className="text-muted-foreground text-xs sm:text-sm truncate flex-wrap flex gap-1">
											<span>
												{formatFileSize(fileInfo?.size ?? 0)} &middot;
											</span>
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
					</motion.div>
					{/* Grid for Stats and Owner */}
					<motion.div variants={subtleMotion}>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<Card className="rounded-2xl bg-card/80 border-border/50 shadow">
								<CardContent className="pt-6 pb-6 flex flex-col items-center">
									<div className="text-3xl font-bold text-primary">
										{fileInfo
											? fileInfo.maxDownloads - fileInfo.downloadCount
											: 0}
									</div>
									<p className="text-sm text-muted-foreground mt-1">
										Downloads Remaining
									</p>
								</CardContent>
							</Card>
							<Card className="rounded-2xl bg-card/80 border-border/50 shadow">
								<CardContent className="pt-6 pb-6 flex flex-col items-center">
									<div className="text-3xl font-bold text-chart-1">
										{fileInfo
											? Math.max(
													0,
													Math.ceil(
														(new Date(fileInfo.expiryDate).getTime() -
															Date.now()) /
															(1000 * 60 * 60 * 24)
													)
											  )
											: 0}
									</div>
									<p className="text-sm text-muted-foreground mt-1">
										Days Until Expiry
									</p>
								</CardContent>
							</Card>
							<Card className="rounded-2xl bg-card/80 border-border/50 shadow flex flex-col justify-between min-h-[120px]">
								<CardHeader className="p-3 border-b border-border/30 flex items-center justify-center">
									<CardTitle className="flex items-center gap-2 text-base font-medium">
										<Edit className="h-4 w-4 text-primary" />
										<span className="text-muted-foreground">Owner Options</span>
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-2 flex flex-col items-center">
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											window.open(`/files/manage/${fileId}`, `_blank`)
										}
										className="w-full rounded-lg border border-primary/30 hover:bg-primary/10 transition"
									>
										Manage File
									</Button>
								</CardContent>
							</Card>
						</div>
					</motion.div>
					{/* Password Protected */}
					<AnimatePresence>
						{fileInfo?.isPasswordProtected && !isUnlocked && (
							<motion.div
								variants={subtleMotion}
								initial="initial"
								animate="animate"
								exit="exit"
							>
								<Card className="rounded-2xl bg-card/80 border-border/50 shadow">
									<CardHeader>
										<CardTitle className="flex items-center">
											<Lock className="h-5 w-5 mr-2" />
											Password Required
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="space-y-2">
											<Label htmlFor="password">Enter Download Password</Label>
											<Input
												id="password"
												type="password"
												placeholder="Password"
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
												className="bg-background/60"
											/>
										</div>
										<Button
											onClick={handleUnlock}
											disabled={!password}
											className="w-full hover:scale-105 transition-transform"
										>
											Unlock File
										</Button>
										{error && (
											<div className="text-red-600 text-sm mt-2">{error}</div>
										)}
									</CardContent>
								</Card>
							</motion.div>
						)}
					</AnimatePresence>
					{/* File Tree and Download */}
					<AnimatePresence>
						{(!fileInfo?.isPasswordProtected || isUnlocked) &&
							fileInfo?.files &&
							fileInfo.files.length > 0 && (
								<motion.div
									variants={subtleMotion}
									initial="initial"
									animate="animate"
									exit="exit"
								>
									<Card className="rounded-2xl bg-card/80 border-border/50 shadow">
										<CardHeader>
											<CardTitle className="flex items-center flex-wrap gap-2">
												<Archive className="h-5 w-5 " />
												<span className="max-[476px]:text-base">
													Select Files or Folders to Download
												</span>
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="flex flex-wrap gap-2 mb-3">
												<Button
													size="sm"
													variant="outline"
													onClick={handleSelectAll}
													className="rounded-full px-4"
												>
													Select All
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={handleClear}
													className="rounded-full px-4"
												>
													Clear
												</Button>
											</div>
											<div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-2 bg-muted/30 shadow-inner">
												<AnimatePresence>
													{renderTree(fileTree)}
												</AnimatePresence>
											</div>
											<div className="flex flex-col md:flex-row gap-2 mt-6 w-full">
												<Button
													onClick={handleDownloadSelected}
													disabled={downloading || selectedPaths.length === 0}
													className="w-full flex items-center justify-center gap-2"
												>
													{downloading ? (
														<>
															<svg
																className="animate-spin h-4 w-4 mr-2"
																viewBox="0 0 24 24"
															>
																<circle
																	className="opacity-25"
																	cx="12"
																	cy="12"
																	r="10"
																	stroke="currentColor"
																	strokeWidth="4"
																	fill="none"
																/>
																<path
																	className="opacity-75"
																	fill="currentColor"
																	d="M4 12a8 8 0 018-8v8z"
																/>
															</svg>
															Preparing...
														</>
													) : (
														<>
															<Download className="mr-2 h-4 w-4" />
															<span className="truncate">
																Download Selected
															</span>
														</>
													)}
												</Button>
												<Button
													asChild
													variant="outline"
													className="w-full flex items-center justify-center gap-2"
												>
													<a
														href={`/api/files/download/${fileId}${
															fileInfo?.isPasswordProtected
																? `?password=${encodeURIComponent(password)}`
																: ""
														}`}
														download={fileInfo?.original_name || fileInfo?.name}
														target="_blank"
														rel="noopener noreferrer"
													>
														<Download className="mr-2 h-4 w-4" />
														<span className="truncate">Download All</span>
													</a>
												</Button>
											</div>
											{error && (
												<div className="text-red-600 text-sm mt-3">{error}</div>
											)}
										</CardContent>
									</Card>
									<style jsx global>{`
										@media (max-width: 475px) {
											.card .flex.flex-wrap.gap-2.mb-3 {
												flex-direction: column;
												gap: 0.5rem;
											}
											.card .flex.flex-col.md\\:flex-row.gap-2.mt-6 {
												flex-direction: column !important;
											}
											.card .w-full.flex.items-center.justify-center.gap-2 {
												font-size: 0.95rem;
												padding-left: 0.5rem;
												padding-right: 0.5rem;
											}
											.card
												.space-y-1.max-h-64.overflow-y-auto.border.rounded-lg.p-2.bg-muted\\/30.shadow-inner {
												max-height: 40vh;
												padding: 0.5rem;
											}
										}
									`}</style>
								</motion.div>
							)}
					</AnimatePresence>
					{/* Footer Info */}
					<motion.div variants={subtleMotion}>
						<div className="text-center space-y-2 mt-6">
							<p className="text-xs text-muted-foreground">
								Expires on {onlyDate(fileInfo?.expiryDate)}
							</p>
						</div>
					</motion.div>
				</motion.div>
			</div>
		</div>
	);
}
