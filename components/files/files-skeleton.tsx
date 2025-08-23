import React from "react";

const FilesSkeleton = () => {
	return (
		<div className="min-h-screen">
			<header className="border-b border-border/40 backdrop-blur-xs bg-background sticky top-0 z-50">
				<div className="container mx-auto px-4 py-4 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="h-8 w-24 bg-muted/40 rounded animate-pulse" />
					</div>
					<div className="h-8 w-8 bg-muted/40 rounded-full animate-pulse" />
				</div>
			</header>
			<div className="container mx-auto px-4 py-10 max-w-4xl">
				<div className="space-y-8">
					<div className="rounded-2xl bg-card/80 border border-border/50 shadow-lg p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-pulse">
						<div className="w-12 h-12 sm:w-14 sm:h-14 bg-muted/40 rounded-lg" />
						<div className="flex-1 min-w-0 space-y-2 w-full">
							<div className="h-5 w-40 bg-muted/40 rounded" />
							<div className="h-4 w-32 bg-muted/30 rounded" />
						</div>
						<div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 ml-0 sm:ml-auto mt-2 sm:mt-0">
							<div className="h-6 w-20 bg-muted/30 rounded" />
							<div className="h-6 w-20 bg-muted/30 rounded" />
						</div>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="rounded-2xl bg-card/80 border border-border/50 shadow p-6 flex flex-col items-center animate-pulse"
							>
								<div className="h-8 w-16 bg-muted/40 rounded mb-2" />
								<div className="h-4 w-24 bg-muted/30 rounded" />
							</div>
						))}
					</div>
					{/* Password Skeleton */}
					<div className="rounded-2xl bg-card/80 border border-border/50 shadow p-6 space-y-4 animate-pulse mx-auto">
						<div className="h-5 w-40 bg-muted/40 rounded mb-2" />
						<div className="h-10 w-full bg-muted/30 rounded" />
						<div className="h-10 w-full bg-muted/30 rounded" />
					</div>
					{/* File Tree Skeleton */}
					<div className="rounded-2xl bg-card/80 border border-border/50 shadow p-6 animate-pulse">
						<div className="h-5 w-56 bg-muted/40 rounded mb-4" />
						<div className="space-y-2">
							{Array.from({ length: 5 }).map((_, idx) => (
								<div key={idx} className="flex items-center gap-2">
									<div className="h-4 w-4 bg-muted/30 rounded" />
									<div className="h-4 w-32 bg-muted/30 rounded" />
								</div>
							))}
						</div>
						<div className="flex gap-2 mt-6">
							<div className="h-10 w-40 bg-muted/30 rounded" />
							<div className="h-10 w-40 bg-muted/30 rounded" />
						</div>
					</div>
					{/* Footer Skeleton */}
					<div className="text-center mt-6">
						<div className="h-4 w-32 bg-muted/30 rounded mx-auto" />
					</div>
				</div>
			</div>
		</div>
	);
};

export default FilesSkeleton;
