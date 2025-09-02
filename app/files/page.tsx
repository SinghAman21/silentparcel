"use client";

import { useState, useCallback } from "react";
import {
	ArrowLeft,
	Upload,
	FileText,
	Lock,
	Shield,
	Check,
	AlertTriangle,
	Eye,
	X,
	Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/theme-toggle";
import Link from "next/link";
import { FileDropzone } from "@/components/files/file-dropzone";
import { CaptchaModal } from "@/components/captcha-modal";
import { LinkResultModal } from "@/components/rooms/link-result-modal";
import { AnimatePresence, motion } from "motion/react";
import { Slider } from "@/components/ui/slider";
import Script from "next/script";

type UploadStage =
	| "select"
	| "captcha"
	| "uploading"
	| "complete"
	| "virus-error"
	| "upload-error";

interface FileData {
	name: string;
	size: number;
	type: string;
	file: File;
}

export default function FilesPage() {
	// const router = useRouter();
	const [stage, setStage] = useState<UploadStage>("select");
	const [selectedFiles, setSelectedFiles] = useState<FileData[]>([]);
	const [uploadProgress, setUploadProgress] = useState<number[]>([]);
	const [virusScanStatus, setVirusScanStatus] = useState<
		(null | "scanning" | "clean" | "infected")[]
	>([]);
	const [passwordProtected, setPasswordProtected] = useState(false);
	const [password, setPassword] = useState("");
	const [downloadLinks, setDownloadLinks] = useState<string[]>([]);
	const [editTokens, setEditTokens] = useState<string[]>([]);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [maxDownloadsEnabled, setMaxDownloadsEnabled] =
		useState<boolean>(false);
	const [maxDownloads, setMaxDownloads] = useState<[number]>([10]);
	const [showPassword, setShowPassword] = useState<boolean>(false);

	const handleFileSelect = useCallback((files: File[]) => {
		setSelectedFiles((prev) => {
			// Map new files to FileData
			const newFileDataArr = files.map((file) => ({
				name: file.name,
				size: file.size,
				type: file.type,
				file,
			}));
			// Merge, filter out duplicates (by name, size, and relative path if available)
			const allFiles = [...prev, ...newFileDataArr];
			const uniqueFiles = allFiles.filter(
				(file, idx, arr) =>
					arr.findIndex(
						(f) =>
							f.name === file.name &&
							f.size === file.size &&
							((f.file as any).webkitRelativePath || f.name) ===
								((file.file as any).webkitRelativePath || file.name)
					) === idx
			);
			return uniqueFiles;
		});
		// Don't reset progress/status here; let them be managed by upload logic
	}, []);

	const uploadFilesToServer = async () => {
		setVirusScanStatus(selectedFiles.map(() => "scanning"));
		setUploadProgress(selectedFiles.map(() => 0));
		setUploadError(null);

		// Prepare FormData for all files at once
		const formData = new FormData();
		selectedFiles.forEach((fileData) => {
			formData.append("files", fileData.file);
			// Use webkitRelativePath if available, else fallback to file name
			formData.append(
				"relativePaths",
				(fileData.file as any).webkitRelativePath || fileData.name
			);
		});
		if (passwordProtected && password) {
			formData.append("password", password);
		}
		// Add maxDownloads to formData
		formData.append(
			"maxDownloads",
			String(maxDownloadsEnabled ? maxDownloads : 10)
		);

		try {
			const res = await fetch("/api/files/upload", {
				method: "POST",
				body: formData,
			});
			const data = await res.json();
			if (res.ok && data.downloadUrl && data.editUrl) {
				setVirusScanStatus(selectedFiles.map(() => "clean"));
				setDownloadLinks([data.downloadUrl]);
				setEditTokens([data.editUrl.split("/").pop()]);
				setUploadProgress(selectedFiles.map(() => 100));
				setTimeout(() => setStage("complete"), 500);
			} else {
				// Check if it's a virus-related error or other type of error
				const isVirusError = data.error?.includes('virus') || data.error?.includes('malicious') || data.error?.includes('infected');
				if (isVirusError) {
					setVirusScanStatus(selectedFiles.map(() => "infected"));
					setUploadError(data.error || "File contains a virus and cannot be shared.");
					setStage("virus-error");
				} else {
					// Handle other types of errors (size limits, network issues, etc.)
					setVirusScanStatus(selectedFiles.map(() => null));
					setUploadError(data.error || "Upload failed. Please try again.");
					setStage("upload-error"); // Use new error stage
				}
			}
		} catch (err: any) {
			console.error('Upload error:', err);
			setVirusScanStatus(selectedFiles.map(() => null));
			setUploadError(err.message || "Network error during upload. Please try again.");
			setStage("upload-error"); // Use new error stage
		}
	};

	const handleCaptchaComplete = () => {
		setStage("uploading");
		uploadFilesToServer();
	};

	const handleBackToSelect = () => {
		setStage("select");
		setSelectedFiles([]);
		setUploadProgress([]);
		setVirusScanStatus([]);
		setDownloadLinks([]);
		setEditTokens([]);
		setUploadError(null);
		setPassword("");
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	return (
		<div className="min-h-screen flex flex-col">
			{/* Structured Data for File Upload Page */}
			<Script
				id="file-upload-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "WebPage",
						"name": "Upload Files Securely",
						"description": "Upload and share files securely with end-to-end encryption. Support for files up to 50MB with automatic virus scanning and password protection.",
						"url": "https://silentparcel.com/files",
						"breadcrumb": {
							"@type": "BreadcrumbList",
							"itemListElement": [
								{
									"@type": "ListItem",
									"position": 1,
									"name": "Home",
									"item": "https://silentparcel.com"
								},
								{
									"@type": "ListItem",
									"position": 2,
									"name": "Upload Files",
									"item": "https://silentparcel.com/files"
								}
							]
						},
						"mainEntity": {
							"@type": "SoftwareApplication",
							"name": "SilentParcel File Upload",
							"applicationCategory": "ProductivityApplication",
							"operatingSystem": "Web Browser",
							"featureList": [
								"Drag and drop file upload",
								"End-to-end encryption",
								"Virus scanning",
								"Password protection",
								"Download limits",
								"Automatic file deletion"
							]
						}
					})
				}}
			/>

			{/* Header */}
			<header className="border-b border-border/30 bg-background/80 sticky top-0 z-50 shadow-sm">
				<div className="w-full max-w-3xl mx-auto px-2 sm:px-4 py-4 flex items-center justify-between transition-all duration-300">
					<Link href="/">
						<Button
							variant="ghost"
							size="icon"
							className="rounded-full hover:bg-accent/60 transition"
						>
							<ArrowLeft className="h-5 w-5" />
							<span className="sr-only">Back to Home</span>
						</Button>
					</Link>
					<ThemeToggle />
				</div>
			</header>

			<motion.main
				className="flex-1 flex items-center justify-center w-full flex-row"
				initial={{ opacity: 0, scale: 0.98 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.4, ease: "easeOut" }}
			>
				<motion.div
					className="w-full max-w-2xl mx-auto px-1 sm:px-4 py-4 sm:py-6"
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.35, ease: "easeOut" }}
				>
					{stage === "select" && (
						<motion.div
							className="space-y-6 sm:space-y-8"
							initial={{ opacity: 0, y: 24 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 24 }}
							transition={{ duration: 0.35, ease: "easeOut" }}
						>
							<div className="text-center">
								<motion.h1
									className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight"
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.1, duration: 0.4 }}
								>
									Upload Files
								</motion.h1>
								<motion.p
									className="text-muted-foreground text-sm sm:text-base"
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.15, duration: 0.4 }}
								>
									Securely share files up to{" "}
									<span className="font-semibold">50MB</span> with automatic
									virus scanning.
								</motion.p>
							</div>

							<motion.div
								initial={{ opacity: 0, scale: 0.98 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: 0.18, duration: 0.3 }}
							>
								<FileDropzone onFileSelect={handleFileSelect} />
							</motion.div>

							<AnimatePresence>
								{selectedFiles.length > 0 && (
									<motion.div
										initial={{ opacity: 0, y: 40, scale: 0.98 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={{ opacity: 0, y: 40, scale: 0.98 }}
										transition={{ duration: 0.35, ease: "easeOut" }}
									>
										<Card className="bg-card/90 border-none shadow-xl rounded-xl sm:rounded-2xl py-2 px-2 sm:px-6 sm:py-6">
											<CardHeader className="pb-2">
												<CardTitle className="text-base sm:text-lg flex items-center gap-2 font-semibold">
													<FileText className="h-5 w-5 text-primary" />
													Selected Files
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-3 sm:space-y-4 pt-0">
												<div className="space-y-2">
													<AnimatePresence>
														{selectedFiles.map((file, idx) => (
															<motion.div
																key={file.name + file.size}
																className="flex items-center justify-between px-2 py-2 rounded-xl bg-muted/60 gap-2 flex-wrap"
																initial={{ opacity: 0, x: 20 }}
																animate={{ opacity: 1, x: 0 }}
																exit={{ opacity: 0, x: -20 }}
																transition={{ duration: 0.2 }}
															>
																<div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
																	<FileText className="h-4 w-4 text-primary shrink-0" />
																	<div className="min-w-0">
																		<p className="font-medium truncate max-w-[90px] sm:max-w-[180px] text-xs sm:text-sm">
																			{file.name}
																		</p>
																		<p className="text-xs text-muted-foreground truncate">
																			{formatFileSize(file.size)} &middot;{" "}
																			{file.type || "Unknown"}
																		</p>
																	</div>
																</div>
																<div className="flex items-center gap-1 sm:gap-2">
																	<Badge
																		variant={
																			file.size > 50 * 1024 * 1024
																				? "destructive"
																				: "outline"
																		}
																		className="text-xs px-2 py-0.5"
																	>
																		{file.size > 50 * 1024 * 1024
																			? "Too Large"
																			: "Valid"}
																	</Badge>
																	<motion.button
																		type="button"
																		aria-label="Remove file"
																		className="ml-1 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
																		whileTap={{ scale: 0.85, rotate: -10 }}
																		onClick={() => {
																			setSelectedFiles(
																				selectedFiles.filter(
																					(_, i) => i !== idx
																				)
																			);
																			setUploadProgress(
																				uploadProgress.filter(
																					(_, i) => i !== idx
																				)
																			);
																			setVirusScanStatus(
																				virusScanStatus.filter(
																					(_, i) => i !== idx
																				)
																			);
																		}}
																	>
																		<X className="h-4 w-4" />
																	</motion.button>
																</div>
															</motion.div>
														))}
													</AnimatePresence>
												</div>

												<motion.div
													id="settings-section"
													className="space-y-4 sm:space-y-5 pt-3 sm:pt-4 border-t border-border/30 rounded-xl"
													initial={{ opacity: 0, y: 16, scale: 0.98 }}
													animate={{ opacity: 1, y: 0, scale: 1 }}
													transition={{
														delay: 0.12,
														duration: 0.45,
														type: "spring",
														bounce: 0.25,
													}}
												>
													<motion.div
														className="flex sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3"
														initial={{ opacity: 0, x: 24 }}
														animate={{ opacity: 1, x: 0 }}
														transition={{
															delay: 0.15,
															duration: 0.4,
															type: "spring",
														}}
													>
														<div className="flex items-center gap-2">
															<Lock className="h-5 w-5 text-primary" />
															<div>
																<Label className="font-semibold text-base text-primary">
																	Password
																</Label>
																<p className="text-xs text-muted-foreground mt-0.5 hidden min-[350px]:block">
																	Require password to download
																</p>
															</div>
														</div>
														<Switch
															checked={passwordProtected}
															onCheckedChange={setPasswordProtected}
															className="data-[state=checked]:ring-2 data-[state=checked]:ring-primary"
														/>
													</motion.div>

													<AnimatePresence>
														{passwordProtected && (
															<motion.div
																initial={{ opacity: 0, y: -16, scale: 0.95 }}
																animate={{ opacity: 1, y: 0, scale: 1 }}
																exit={{ opacity: 0, y: -16, scale: 0.95 }}
																transition={{
																	duration: 0.28,
																	type: "spring",
																	bounce: 0.3,
																}}
																className="flex items-center gap-2 w-full"
															>
																<div className="relative w-full">
																	<Input
																		id="password"
																		type={showPassword ? "text" : "password"}
																		placeholder="Enter password"
																		value={password}
																		onChange={(e) =>
																			setPassword(e.target.value)
																		}
																		className="bg-background/80 border-primary/30 focus:ring-2 focus:ring-primary/40 transition-all pr-10 rounded-full text-xs sm:text-sm"
																	/>
																	<Button
																		type="button"
																		className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition rounded-full"
																		onClick={() => setShowPassword((v) => !v)}
																		tabIndex={-1}
																		size={"icon"}
																		variant={"ghost"}
																	>
																		{showPassword ? (
																			<Eye className="h-4 w-4" />
																		) : (
																			<Eye className="h-4 w-4 opacity-50" />
																		)}
																	</Button>
																</div>
															</motion.div>
														)}
													</AnimatePresence>

													{/* Max Downloads */}
													<motion.div
														className="flex sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3"
														initial={{ opacity: 0, x: 24 }}
														animate={{ opacity: 1, x: 0 }}
														transition={{
															delay: 0.18,
															duration: 0.4,
															type: "spring",
														}}
													>
														<div className="flex items-center gap-2">
															<Shield className="h-5 w-5 text-primary" />
															<div>
																<Label className="font-semibold text-base text-primary">
																	Max Downloads
																</Label>
																<p className="text-xs text-muted-foreground mt-0.5 hidden min-[350px]:block">
																	Limit download count (default: 10)
																</p>
															</div>
														</div>
														<Switch
															checked={maxDownloadsEnabled}
															onCheckedChange={setMaxDownloadsEnabled}
															className="data-[state=checked]:ring-2 data-[state=checked]:ring-primary"
														/>
													</motion.div>
													<AnimatePresence>
														{maxDownloadsEnabled && (
															<motion.div
																initial={{ opacity: 0, y: -16, scale: 0.95 }}
																animate={{ opacity: 1, y: 0, scale: 1 }}
																exit={{ opacity: 0, y: -16, scale: 0.95 }}
																transition={{
																	duration: 0.28,
																	type: "spring",
																	bounce: 0.3,
																}}
																className="flex items-center gap-2 w-full pl-1"
															>
																<Slider
																	id="max-downloads-slider"
																	min={1}
																	max={20}
																	step={1}
																	value={maxDownloads}
																	onValueChange={([val]) =>
																		setMaxDownloads([val])
																	}
																	className="flex-1"
																/>
																<span className="ml-2 text-base font-semibold w-8 text-center">
																	{maxDownloads}
																</span>
															</motion.div>
														)}
													</AnimatePresence>
												</motion.div>

												<motion.div
													initial={{ opacity: 0, scale: 0.98 }}
													animate={{ opacity: 1, scale: 1 }}
													transition={{ delay: 0.1, duration: 0.25 }}
												>
													<Button
														onClick={() => {
															setStage("captcha");
															setTimeout(() => {
																const el =
																	document.getElementById("settings-section");
																if (el)
																	el.scrollIntoView({
																		behavior: "smooth",
																		block: "center",
																	});
															}, 100);
														}}
														className="w-full mt-2 rounded-xl text-base font-semibold py-2 sm:py-3 hover:scale-[1.03] transition"
														disabled={selectedFiles.some(
															(file) => file.size > 50 * 1024 * 1024
														)}
														asChild
													>
														<span className="flex items-center justify-center gap-2">
															<Upload className="h-5 w-5" />
															Continue
														</span>
													</Button>
												</motion.div>
											</CardContent>
										</Card>
									</motion.div>
								)}
							</AnimatePresence>
						</motion.div>
					)}

					<AnimatePresence>
						{stage === "uploading" &&
							selectedFiles.length > 0 &&
							!uploadError && (
								<motion.div
									initial={{ opacity: 0, scale: 0.97, y: 20 }}
									animate={{ opacity: 1, scale: 1, y: 0 }}
									exit={{ opacity: 0, scale: 0.97, y: 20 }}
									transition={{ duration: 0.35, ease: "easeOut" }}
								>
									<Card className="bg-card/80 border-none shadow-lg rounded-xl sm:rounded-2xl px-2 py-4 sm:px-8 sm:py-8">
										<CardHeader className="pb-3">
											<CardTitle className="flex items-center gap-3 sm:gap-4 text-base sm:text-lg font-bold">
												<Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
												<span>Uploading &amp; Virus Scanning</span>
											</CardTitle>
										</CardHeader>
										<CardContent className="space-y-5 sm:space-y-8 pt-0">
											<div className="flex flex-col gap-3 sm:gap-5">
												{selectedFiles.map((file, idx) => (
													<motion.div
														key={file.name + file.size}
														initial={{ opacity: 0, x: 20 }}
														animate={{ opacity: 1, x: 0 }}
														exit={{ opacity: 0, x: -20 }}
														transition={{ duration: 0.2 }}
														className="rounded-lg bg-muted/30 px-3 py-3 sm:px-5 sm:py-4 shadow-sm"
													>
														<div className="flex items-center justify-between mb-2">
															<div className="flex items-center gap-2 sm:gap-3">
																<FileText className="h-4 w-4 text-primary" />
																<span className="font-semibold truncate max-w-[120px] sm:max-w-[180px] text-xs sm:text-base">
																	{file.name}
																</span>
															</div>
															<span className="text-xs text-muted-foreground font-medium">
																{Math.round(uploadProgress[idx] || 0)}%
															</span>
														</div>
														<Progress
															value={uploadProgress[idx] || 0}
															className="h-2 rounded-full bg-background/60"
														/>
														<div className="flex items-center gap-2 mt-2 sm:mt-3 text-xs">
															<Shield className="h-4 w-4 text-primary" />
															{virusScanStatus[idx] === "scanning" && (
																<motion.span
																	initial={{ opacity: 0 }}
																	animate={{ opacity: 1 }}
																	className="text-muted-foreground flex items-center gap-1"
																>
																	<span className="animate-pulse">
																		Scanning for viruses...
																	</span>
																</motion.span>
															)}
															{virusScanStatus[idx] === "clean" && (
																<motion.span
																	initial={{ opacity: 0 }}
																	animate={{ opacity: 1 }}
																	className="text-green-600 flex items-center gap-1 font-semibold"
																>
																	<Check className="h-4 w-4" />
																	Clean
																</motion.span>
															)}
															{virusScanStatus[idx] === "infected" && (
																<motion.span
																	initial={{ opacity: 0 }}
																	animate={{ opacity: 1 }}
																	className="text-red-600 flex items-center gap-1 font-semibold"
																>
																	<AlertTriangle className="h-4 w-4" />
																	Virus detected
																</motion.span>
															)}
														</div>
													</motion.div>
												))}
											</div>
											<div className="flex justify-center mt-4 sm:mt-6">
												<span className="text-xs sm:text-sm text-muted-foreground text-center">
													Please keep this page open until upload &amp; scan
													completes.
												</span>
											</div>
										</CardContent>
									</Card>
								</motion.div>
							)}
					</AnimatePresence>

					<AnimatePresence>
						{stage === "virus-error" && uploadError && (
							<motion.div
								initial={{ opacity: 0, scale: 0.97, y: 20 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.97, y: 20 }}
								transition={{ duration: 0.35, ease: "easeOut" }}
							>
								<Card className="bg-card/70 border-none shadow-md rounded-lg sm:rounded-xl">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-red-600 font-semibold text-base sm:text-lg">
											<AlertTriangle className="h-5 w-5" />
											Virus Detected
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3 sm:space-y-4">
										<motion.div
											className="text-center text-red-600 font-medium text-sm sm:text-base"
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.2 }}
										>
											{uploadError}
										</motion.div>
										<motion.div
											initial={{ opacity: 0, scale: 0.98 }}
											animate={{ opacity: 1, scale: 1 }}
											transition={{ duration: 0.2 }}
										>
											<Button
												onClick={handleBackToSelect}
												className="w-full rounded-lg font-semibold"
											>
												Try Again
											</Button>
										</motion.div>
									</CardContent>
								</Card>
							</motion.div>
						)}
					</AnimatePresence>

					<AnimatePresence>
						{stage === "upload-error" && uploadError && (
							<motion.div
								initial={{ opacity: 0, scale: 0.97, y: 20 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.97, y: 20 }}
								transition={{ duration: 0.35, ease: "easeOut" }}
							>
								<Card className="bg-card/70 border-none shadow-md rounded-lg sm:rounded-xl">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-orange-600 font-semibold text-base sm:text-lg">
											<AlertTriangle className="h-5 w-5" />
											Upload Error
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3 sm:space-y-4">
										<motion.div
											className="text-center text-orange-600 font-medium text-sm sm:text-base"
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.2 }}
										>
											{uploadError}
										</motion.div>
										<motion.div
											initial={{ opacity: 0, scale: 0.98 }}
											animate={{ opacity: 1, scale: 1 }}
											transition={{ duration: 0.2 }}
										>
											<Button
												onClick={handleBackToSelect}
												className="w-full rounded-lg font-semibold"
											>
												Try Again
											</Button>
										</motion.div>
									</CardContent>
								</Card>
							</motion.div>
						)}
					</AnimatePresence>

					<CaptchaModal
						isOpen={stage === "captcha"}
						fileName={
							selectedFiles.length === 1
								? selectedFiles[0].name
								: selectedFiles.length > 1
								? `${selectedFiles.length} files`
								: ""
						}
						fileSize={selectedFiles.reduce((acc, f) => acc + f.size, 0)}
						onComplete={handleCaptchaComplete}
						onClose={() => setStage("select")}
					/>

					<LinkResultModal
						isOpen={stage === "complete"}
						downloadLink={downloadLinks.length === 1 ? downloadLinks[0] : ""}
						editToken={editTokens.length === 1 ? editTokens[0] : ""}
						fileName={
							selectedFiles.length === 1
								? selectedFiles[0].name
								: selectedFiles.length > 1
								? `${selectedFiles.length} files`
								: ""
						}
						onClose={() => setStage("select")}
					/>
				</motion.div>
			</motion.main>
		</div>
	);
}
