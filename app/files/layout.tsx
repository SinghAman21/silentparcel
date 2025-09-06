import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Upload Files Securely | SilentParcel",
	description: "Upload and share files securely with end-to-end encryption. Support for up to 50MB ZIP archives with automatic virus scanning and password protection.",
	keywords: [
		"file upload",
		"secure file sharing",
		"encrypted file transfer",
		"virus scanning",
		"password protection",
		"file encryption"
	],
	openGraph: {
		title: "Upload Files Securely | SilentParcel",
		description: "Upload and share files securely with end-to-end encryption. Support for up to 50MB ZIP archives with automatic virus scanning.",
		url: "https://silentparcel.com/files",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Upload Files Securely | SilentParcel",
		description: "Upload and share files securely with end-to-end encryption.",
	},
	alternates: {
		canonical: "/files",
	},
};

export default function FilesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
} 