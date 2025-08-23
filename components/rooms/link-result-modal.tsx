"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, ExternalLink, Edit, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LinkResultModalProps {
	isOpen: boolean;
	downloadLink: string;
	editToken: string;
	fileName: string;
	onClose: () => void;
}

export function LinkResultModal({
	isOpen,
	downloadLink,
	editToken,
	fileName,
	onClose,
}: LinkResultModalProps) {
	const [copiedDownload, setCopiedDownload] = useState(false);
	const [copiedEdit, setCopiedEdit] = useState(false);

	const copyToClipboard = async (text: string, type: "download" | "edit") => {
		try {
			await navigator.clipboard.writeText(text);
			if (type === "download") {
				setCopiedDownload(true);
				setTimeout(() => setCopiedDownload(false), 2000);
			} else {
				setCopiedEdit(true);
				setTimeout(() => setCopiedEdit(false), 2000);
			}
		} catch (err) {
			console.error("Failed to copy: ", err);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-lg bg-background/95 backdrop-blur-xs border border-border/50 shadow-xl rounded-xl">
				<DialogHeader>
					<DialogTitle className="text-2xl font-bold flex items-center gap-2">
						<span role="img" aria-label="party">
							🎉
						</span>
						Upload Complete!
					</DialogTitle>
					<DialogDescription className="text-base mt-1">
						<span className="font-medium text-foreground">"{fileName}"</span>{" "}
						uploaded successfully. Share your links below.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-7 mt-2">
					{/* Download Link */}
					<Card className="bg-card/70 border border-border/40 shadow-sm">
						<CardHeader className="pb-2">
							<CardTitle className="text-base flex items-center gap-2 font-semibold">
								<ExternalLink className="h-4 w-4" />
								Public Download Link
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="flex items-center gap-2">
								<Input
									value={downloadLink}
									readOnly
									className="font-mono text-xs bg-background/60 border border-border/30 flex-1"
									aria-label="Download link"
									onFocus={(e) => e.target.select()}
								/>
								<Button
									onClick={() => copyToClipboard(downloadLink, "download")}
									variant={copiedDownload ? "default" : "outline"}
									size="icon"
									className="transition-transform duration-150 hover:scale-110"
									aria-label="Copy download link"
								>
									{copiedDownload ? (
										<Check className="h-4 w-4 text-green-600" />
									) : (
										<Copy className="h-4 w-4" />
									)}
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">
								Share this link to let others download your file.
							</p>
						</CardContent>
					</Card>

					{/* Management Token */}
					<Card className="bg-card/70 border border-border/40 shadow-sm">
						<CardHeader className="pb-2">
							<CardTitle className="text-base flex items-center gap-2 font-semibold">
								<Edit className="h-4 w-4" />
								Management Token
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="flex items-center gap-2">
								<Input
									value={editToken}
									readOnly
									className="font-mono text-xs bg-background/60 border border-border/30 flex-1"
									aria-label="Management token"
									onFocus={(e) => e.target.select()}
								/>
								<Button
									onClick={() => copyToClipboard(editToken, "edit")}
									variant={copiedEdit ? "default" : "outline"}
									size="icon"
									className="transition-transform duration-150 hover:scale-110"
									aria-label="Copy management token"
								>
									{copiedEdit ? (
										<Check className="h-4 w-4 text-green-600" />
									) : (
										<Copy className="h-4 w-4" />
									)}
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">
								Keep this token safe! Use it to manage, view logs, or delete
								your file.
							</p>
						</CardContent>
					</Card>

					{/* Actions */}
					<div className="flex gap-2">
						<Button
							onClick={onClose}
							className="flex-1 font-semibold transition-transform hover:scale-105"
							aria-label="Done"
						>
							Done
						</Button>
						<Button
							variant="outline"
							className="flex-1 font-semibold transition-transform hover:scale-105"
							aria-label="View file page"
							asChild
						>
							<a href={downloadLink} target="_blank" rel="noopener noreferrer">
								<Eye className="h-4 w-4 mr-2" />
								View File Page
							</a>
						</Button>
					</div>

					<div className="text-center text-xs text-muted-foreground border-t border-border/30 pt-4">
						<span className="font-medium">Note:</span> Files are auto-deleted
						after <span className="font-semibold">07 days</span> of inactivity.
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
