import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/providers/theme-provider";
import localFont from "next/font/local";
import Script from "next/script";
import { UTMTrackerWrapper } from "@/components/utm-tracker-wrapper";

export const metadata: Metadata = {
	title: {
		default: "SilentParcel - Secure File Sharing & Anonymous Chat | Zero-Knowledge Encryption",
		template: "%s | SilentParcel"
	},
	description: "Share files securely with end-to-end encryption and chat anonymously in ephemeral rooms. No registration required. Military-grade AES-256 encryption with automatic virus scanning.",
	keywords: [
		"secure file sharing",
		"encrypted file transfer",
		"anonymous chat",
		"zero-knowledge encryption",
		"privacy-focused file sharing",
		"end-to-end encryption",
		"secure messaging",
		"file encryption",
		"anonymous file sharing",
		"secure collaboration",
		"ephemeral messaging",
		"virus scanning",
		"password protection",
		"self-destructing files",
		"privacy tools"
	],
	authors: [{ name: "Aman Singh" }],
	creator: "SilentParcel",
	publisher: "SilentParcel",
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
	metadataBase: new URL('https://silentparcel.com'),
	alternates: {
		canonical: '/',
	},
	// icons: {
	// 	icon: [
	// 		{
	// 			url: '/icons/favicon-16x16.png',
	// 			sizes: '16x16',
	// 			type: 'image/png',
	// 		},
	// 		{
	// 			url: '/icons/favicon-32x32.png',
	// 			sizes: '32x32',
	// 			type: 'image/png',
	// 		},
	// 	],
	// 	apple: [
	// 		{
	// 			url: '/icons/apple-touch-icon.png',
	// 			sizes: '180x180',
	// 			type: 'image/png',
	// 		},
	// 	],
	// 	other: [
	// 		{
	// 			rel: 'android-chrome-192x192',
	// 			url: '/icons/android-chrome-192x192.png',
	// 		},
	// 		{
	// 			rel: 'android-chrome-512x512',
	// 			url: '/icons/android-chrome-512x512.png',
	// 		},
	// 	],
	// },
	openGraph: {
		type: 'website',
		locale: 'en_US',
		url: 'https://silentparcel.com',
		title: 'SilentParcel - Secure File Sharing & Anonymous Chat',
		description: 'Share files securely with end-to-end encryption and chat anonymously in ephemeral rooms. No registration required.',
		siteName: 'SilentParcel',
		images: [
			{
				url: '/og-image.png',
				width: 1200,
				height: 630,
				alt: 'SilentParcel - Secure File Sharing Platform',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'SilentParcel - Secure File Sharing & Anonymous Chat',
		description: 'Share files securely with end-to-end encryption and chat anonymously in ephemeral rooms.',
		images: ['/og-image.png'],
		creator: '@silentparcel',
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
	verification: {
		google: 'your-google-verification-code',
		yandex: 'your-yandex-verification-code',
		yahoo: 'your-yahoo-verification-code',
	},
	category: 'technology',
	classification: 'File Sharing & Communication',
};
const Inter = localFont({
	src: [
		{ path: "fonts/InterVariable.woff2", style: "normal" },
		{
			path: "fonts/InterVariable-Italic.woff2",
			style: "italic",
		},
	],
	display: "swap",
	preload: true,
	variable: "--font-inter",
});

const JetbrainsMono = localFont({
	src: "fonts/JetBrainsMonoVariable.woff2",
	display: "swap",
	variable: "--font-jetbrains",
	preload: true,
});

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<head>
				{/* Google Analytics */}
				{/* for domain analytics */}
				<Script
					src="https://www.googletagmanager.com/gtag/js?id=G-B8B9Y2S6C3"
					strategy="afterInteractive"
				/>
				<Script id="google-analytics" strategy="afterInteractive">
					{`
						window.dataLayer = window.dataLayer || [];
						function gtag(){dataLayer.push(arguments);}
						gtag('js', new Date());
						gtag('config', 'G-B8B9Y2S6C3');
					`}
				</Script>

					{/* for vercel analytics */}
				{/* <Script src="https://www.googletagmanager.com/gtag/js?id=G-PMRFNG45RF" strategy="afterInteractive" />
				<Script id="google-analytics" strategy="afterInteractive">
					{`window.dataLayer = window.dataLayer || [];
					function gtag(){dataLayer.push(arguments);}
					gtag('js', new Date());

					gtag('config', 'G-PMRFNG45RF');`}
				</Script> */}
			</head>
			<body className={`${Inter.variable} ${JetbrainsMono.variable}`}>
				{/* Temporarily disabled UTM tracking to debug 500 error */}
				<UTMTrackerWrapper />
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem
					disableTransitionOnChange
				>
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
