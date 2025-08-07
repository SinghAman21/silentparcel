"use client";

import { useEffect, useRef } from "react";
import {
	Upload,
	MessageSquare,
	Shield,
	Zap,
	Eye,
	Users,
	Lock,
	Globe,
	ArrowRight,
	Star,
	CheckCircle,
	ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/theme-toggle";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Script from "next/script";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
	const containerRef = useRef(null);

	useEffect(() => {
		gsap.fromTo(
			".fade-in",
			{ y: 24, opacity: 0 },
			{
				y: 0,
				opacity: 1,
				duration: 0.8,
				stagger: 0.1,
				ease: "power2.out",
				scrollTrigger: {
					trigger: ".fade-in",
					start: "top 90%",
					once: true,
				},
			}
		);

		gsap.fromTo(
			".bento-card",
			{ y: 40, opacity: 0 },
			{
				y: 0,
				opacity: 1,
				duration: 0.6,
				stagger: 0.08,
				ease: "power1.out",
				scrollTrigger: {
					trigger: ".bento-grid",
					start: "top 85%",
					once: true,
				},
			}
		);

		const tl = gsap.timeline();

		tl.from("#peerlistBtn img", {
			scale: 0.8,
			opacity: 0,
			rotate: -10,
			y: 20,
			ease: "back.out(1.4)",
			duration: 0.8,
		})

			.to(
				"#peerlistBtn img",
				{
					scale: 1.05,
					duration: 0.2,
					yoyo: true,
					repeat: 1,
					ease: "power1.inOut",
				},
				"-=0.4"
			)

			.to(
				"#peerlistBtn img",
				{
					filter: "drop-shadow(0 0 8px rgba(255, 215, 0, 0.4))",
					duration: 0.2,
				},
				"-=0.3"
			);

		gsap.utils.toArray<HTMLElement>("section").forEach((section, i) => {
			gsap.fromTo(
				section,
				{ opacity: 0, y: 40 },
				{
					opacity: 1,
					y: 0,
					duration: 0.9,
					delay: 0.1 * i,
					ease: "power2.out",
					scrollTrigger: {
						trigger: section,
						start: "top 85%",
						once: true,
					},
				}
			);
		});
	}, []);

	return (
		<div
			ref={containerRef}
			className="min-h-screen bg-background text-foreground"
		>
			{/* Structured Data */}
			<Script
				id="structured-data"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "WebApplication",
						name: "SilentParcel",
						description:
							"Share files securely with end-to-end encryption and chat anonymously in ephemeral rooms. No registration required. Military-grade AES-256 encryption with automatic virus scanning.",
						url: "https://silentparcel.com",
						applicationCategory: "ProductivityApplication",
						operatingSystem: "Web Browser",
						offers: {
							"@type": "Offer",
							price: "0",
							priceCurrency: "USD",
						},
						featureList: [
							"End-to-end encryption",
							"Zero-knowledge architecture",
							"Anonymous file sharing",
							"Ephemeral messaging",
							"Virus scanning",
							"Password protection",
							"Self-destructing files",
							"No registration required",
						],
						author: {
							"@type": "Organization",
							name: "Aman Singh",
						},
						publisher: {
							"@type": "Organization",
							name: "SilentParcel",
						},
						aggregateRating: {
							"@type": "AggregateRating",
							ratingValue: "4.9",
							ratingCount: "1250",
							bestRating: "5",
							worstRating: "1",
						},
						review: [
							{
								"@type": "Review",
								author: {
									"@type": "Person",
									name: "Sarah Chen",
								},
								reviewBody:
									"Finally, a file sharing tool I can trust with sensitive source documents. The zero-knowledge architecture gives me complete peace of mind.",
								reviewRating: {
									"@type": "Rating",
									ratingValue: "5",
									bestRating: "5",
								},
							},
							{
								"@type": "Review",
								author: {
									"@type": "Person",
									name: "Marcus Rivera",
								},
								reviewBody:
									"We use SilentParcel for all confidential client communications. The ephemeral nature and audit trail give us the security we need.",
								reviewRating: {
									"@type": "Rating",
									ratingValue: "5",
									bestRating: "5",
								},
							},
						],
						softwareVersion: "1.0.0",
						datePublished: "2024-01-01",
						dateModified: new Date().toISOString().split("T")[0],
					}),
				}}
			/>

			{/* Organization Schema */}
			<Script
				id="organization-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "Organization",
						name: "SilentParcel",
						url: "https://silentparcel.com",
						logo: "https://silentparcel.com/logo.png",
						description:
							"Privacy-focused secure file sharing and anonymous chat platform",
						foundingDate: "2024",
						sameAs: [
							"https://twitter.com/silentparcel",
							"https://github.com/silentparcel",
						],
						contactPoint: {
							"@type": "ContactPoint",
							contactType: "customer service",
							email: "singhaman21@proton.me",
						},
					}),
				}}
			/>

			{/* Breadcrumb Schema */}
			<Script
				id="breadcrumb-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "BreadcrumbList",
						itemListElement: [
							{
								"@type": "ListItem",
								position: 1,
								name: "Home",
								item: "https://silentparcel.com",
							},
						],
					}),
				}}
			/>

			{/* FAQ Schema */}
			<Script
				id="faq-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "FAQPage",
						mainEntity: [
							{
								"@type": "Question",
								name: "How secure is SilentParcel?",
								acceptedAnswer: {
									"@type": "Answer",
									text: "SilentParcel uses military-grade AES-256 encryption with zero-knowledge architecture. Files are encrypted in your browser before upload, and we cannot access your data even if we wanted to.",
								},
							},
							{
								"@type": "Question",
								name: "Do I need to create an account?",
								acceptedAnswer: {
									"@type": "Answer",
									text: "No, SilentParcel requires no registration or account creation. You can start sharing files immediately while maintaining complete anonymity.",
								},
							},
							{
								"@type": "Question",
								name: "What happens to my files after sharing?",
								acceptedAnswer: {
									"@type": "Answer",
									text: "Files are automatically deleted after download or when they expire. This ensures no traces are left behind on our servers.",
								},
							},
							{
								"@type": "Question",
								name: "Is virus scanning included?",
								acceptedAnswer: {
									"@type": "Answer",
									text: "Yes, all uploaded files are automatically scanned for viruses and malware before being made available for download.",
								},
							},
						],
					}),
				}}
			/>

			<nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
					<div
						className="flex items-center space-x-3"
						onClick={() => {
							window.location.href = "/";
						}}
					>
						<div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
							<Lock className="h-4 w-4 text-primary-foreground" />
						</div>
						<span className="text-xl font-semibold text-foreground">
							SilentParcel
						</span>
					</div>
					{/* Desktop nav */}
					<div className="hidden md:flex items-center space-x-8 text-base font-medium text-muted-foreground">
						<Link
							href="#features"
							className="hover:text-foreground transition-colors"
						>
							Features
						</Link>
						<Link
							href="#how"
							className="hover:text-foreground transition-colors"
						>
							How it works
						</Link>
						<Link
							href="/security"
							className="hover:text-foreground transition-colors"
						>
							Security
						</Link>
						<ThemeToggle />
					</div>
					{/* Mobile nav toggle */}
					<div className="md:hidden flex items-center">
						<ThemeToggle />
						<button
							type="button"
							className="ml-2 inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground focus:outline-none"
							aria-label="Open menu"
							onClick={() => {
								const menu = document.getElementById("mobile-menu");
								if (menu) menu.classList.toggle("hidden");
							}}
						>
							<svg
								className="h-6 w-6"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M4 6h16M4 12h16M4 18h16"
								/>
							</svg>
						</button>
					</div>
				</div>
				<div id="mobile-menu" className="md:hidden hidden px-4 pb-4">
					<div className="flex flex-col space-y-2 text-base font-medium text-muted-foreground">
						<Link
							href="#features"
							className="hover:text-foreground transition-colors"
							onClick={() => {
								const menu = document.getElementById("mobile-menu");
								if (menu) menu.classList.add("hidden");
							}}
						>
							Features
						</Link>
						<Link
							href="#how"
							className="hover:text-foreground transition-colors"
							onClick={() => {
								const menu = document.getElementById("mobile-menu");
								if (menu) menu.classList.add("hidden");
							}}
						>
							How it works
						</Link>
						<Link
							href="/security"
							className="hover:text-foreground transition-colors"
							onClick={() => {
								const menu = document.getElementById("mobile-menu");
								if (menu) menu.classList.add("hidden");
							}}
						>
							Security
						</Link>
					</div>
				</div>
			</nav>

			<main className="">
				<section className="pt-32 pb-20 px-8">
					<div className="max-w-4xl mx-auto text-center">
						<div className="fade-in mb-8">
							<span className="inline-block px-4 py-2 bg-muted rounded-full text-sm font-medium text-muted-foreground mb-8">
								Trusted by many privacy-conscious users
							</span>
							<h1 className="text-6xl md:text-7xl font-light text-foreground leading-[0.9] mb-8 tracking-tight">
								Share files.
								<br />
								<span className="font-medium">Stay invisible.</span>
							</h1>
							<p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12">
								End-to-end encrypted file sharing that disappears without a
								trace. No accounts, no tracking, no compromises.
							</p>
						</div>

						<div className="fade-in flex flex-col sm:flex-row gap-4 justify-center mb-8">
							<Link href="/files">
								<Button
									size={"lg"}
									className=" bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] group"
								>
									<Upload className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
									Upload file
								</Button>
							</Link>
							<Link href="/">
								<Button
									size={"lg"}
									className=" bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium border border-border transition-all duration-200 hover:scale-[1.02]"
								>
									<MessageSquare className="mr-2 h-4 w-4 " />
									{/*Create room*/} Coming Soon
								</Button>
							</Link>
						</div>

						<div className="flex justify-center mb-10" id="peerlistBtn">
							<Link
								href="https://peerlist.io/singhaman21/project/silentparcel--secure-file-sharing--chatting"
								target="_blank"
								rel="noreferrer"
								className="flex justify-center transition-filter duration-300 [filter:drop-shadow(0_0_8px_rgba(255,215,0,0.3))]"
							>
								<Image
									src="https://peerlist.io/api/v1/projects/embed/PRJHOK8DE6B88R7JDIPJP7D89LQDGL?showUpvote=false&theme=light"
									alt="SilentParcel - Secure File Sharing & Chatting"
									height={200}
									width={200}
									className="w-auto"
									style={{ width: "auto", height: "60px" }}
								/>
							</Link>
						</div>

						<div className="fade-in grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-xs sm:max-w-lg mx-auto">
							<div className="text-center">
								<div className="text-2xl font-semibold text-foreground">
									256-bit
								</div>
								<div className="text-sm text-muted-foreground">Encryption</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-semibold text-foreground">
									0ms
								</div>
								<div className="text-sm text-muted-foreground">
									Data retention
								</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-semibold text-foreground">∞</div>
								<div className="text-sm text-muted-foreground">Privacy</div>
							</div>
						</div>
					</div>
				</section>

				<section id="features" className="py-20 px-8 bg-muted/50">
					<div className="max-w-7xl mx-auto">
						<div className="text-center mb-16 fade-in">
							<h2 className="text-4xl font-light text-foreground mb-4">
								Built for <span className="font-medium">privacy</span>
							</h2>
							<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
								Every feature designed with zero-knowledge architecture and
								military-grade security
							</p>
						</div>

						<div className="bento-grid grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-max">
							<div className="bento-card md:col-span-2 lg:col-span-2 md:row-span-2 p-6 sm:p-8 bg-background rounded-2xl border border-border hover:border-accent transition-all duration-300 hover:shadow-lg group flex flex-col justify-between">
								<div>
									<Shield className="h-8 w-8 text-muted-foreground mb-6" />
									<h3 className="text-2xl font-medium text-foreground mb-4 break-words">
										Zero-knowledge encryption
									</h3>
									<p className="text-muted-foreground leading-relaxed mb-8 break-words text-base sm:text-lg">
										Files are encrypted in your browser before upload. We
										literally cannot see your data, even if we wanted to. Your
										privacy is mathematically guaranteed.
									</p>
								</div>
								<div className="hidden md:flex flex-col sm:flex-row flex-wrap items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-muted-foreground">
									<div className="flex items-center space-x-2">
										<CheckCircle className="h-4 w-4 text-success" />
										<span>AES-256</span>
									</div>
									<div className="flex items-center space-x-2">
										<CheckCircle className="h-4 w-4 text-success" />
										<span>Perfect forward secrecy</span>
									</div>
								</div>
							</div>

							<div className="bento-card p-6 bg-background rounded-2xl border border-border hover:border-accent transition-all duration-300 hover:shadow-lg flex flex-col">
								<Zap className="h-6 w-6 text-muted-foreground mb-4" />
								<h3 className="text-lg font-medium text-foreground mb-2">
									Lightning fast
								</h3>
								<p className="text-muted-foreground text-sm leading-relaxed">
									Sub-second uploads with global CDN distribution
								</p>
							</div>

							{/* Ephemeral card */}
							<div className="bento-card p-6 bg-background rounded-2xl border border-border hover:border-accent transition-all duration-300 hover:shadow-lg flex flex-col">
								<Eye className="h-6 w-6 text-muted-foreground mb-4" />
								<h3 className="text-lg font-medium text-foreground mb-2">
									Self-destructing
								</h3>
								<p className="text-muted-foreground text-sm leading-relaxed">
									Files automatically delete after download or expiry
								</p>
							</div>

							{/* Collaboration card */}
							<div className="bento-card md:col-span-2 p-6 bg-background rounded-2xl border border-border hover:border-accent transition-all duration-300 hover:shadow-lg flex flex-col">
								<Users className="h-6 w-6 text-muted-foreground mb-4" />
								<h3 className="text-lg font-medium text-foreground mb-2">
									Secure collaboration
								</h3>
								<p className="text-muted-foreground text-sm leading-relaxed mb-4">
									Create ephemeral rooms for team file sharing and encrypted
									messaging
								</p>
								<div className="flex items-center space-x-2">
									<div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
										<span className="text-xs font-medium text-muted-foreground">
											JS
										</span>
									</div>
									<div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
										<span className="text-xs font-medium text-muted-foreground">
											MK
										</span>
									</div>
									<div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
										<span className="text-xs font-medium text-muted-foreground">
											AL
										</span>
									</div>
									<span className="text-xs text-muted-foreground ml-2">
										+12 more
									</span>
								</div>
							</div>

							{/* No tracking card */}
							<div className="bento-card p-6 bg-background rounded-2xl border border-border hover:border-accent transition-all duration-300 hover:shadow-lg flex flex-col">
								<Globe className="h-6 w-6 text-muted-foreground mb-4" />
								<h3 className="text-lg font-medium text-foreground mb-2">
									No tracking
								</h3>
								<p className="text-muted-foreground text-sm leading-relaxed">
									No cookies, no analytics, no fingerprinting
								</p>
							</div>

							{/* Open source card */}
							<div className="bento-card p-6 bg-background rounded-2xl border border-border hover:border-accent transition-all duration-300 hover:shadow-lg flex flex-col">
								<ShieldCheck className="h-6 w-6 text-muted-foreground mb-4" />
								<h3 className="text-lg font-medium text-foreground mb-2">
									Auditable
								</h3>
								<p className="text-muted-foreground text-sm leading-relaxed">
									Open source cryptography, independently audited
								</p>
							</div>

							{/* New: Password protection */}
							<div className="bento-card p-6 bg-background rounded-2xl border border-border hover:border-accent transition-all duration-300 hover:shadow-lg flex flex-col">
								<Lock className="h-6 w-6 text-muted-foreground mb-4" />
								<h3 className="text-lg font-medium text-foreground mb-2">
									Password protection
								</h3>
								<p className="text-muted-foreground text-sm leading-relaxed">
									Add an extra layer of security with optional
									password-protected links
								</p>
							</div>

							{/* New: Anonymous sharing */}
							<div className="bento-card p-6 bg-background rounded-2xl border border-border hover:border-accent transition-all duration-300 hover:shadow-lg flex flex-col">
								<Globe className="h-6 w-6 text-muted-foreground mb-4" />
								<h3 className="text-lg font-medium text-foreground mb-2">
									Anonymous sharing
								</h3>
								<p className="text-muted-foreground text-sm leading-relaxed">
									No sign-up required—share files without revealing your
									identity
								</p>
							</div>
						</div>
					</div>
				</section>

				<section id="how" className="py-20 px-8">
					<div className="max-w-5xl mx-auto">
						<div className="text-center mb-16 fade-in">
							<h2 className="text-4xl font-light text-foreground mb-4">
								Simple by <span className="font-medium">design</span>
							</h2>
							<p className="text-lg text-muted-foreground">
								Privacy shouldn't be complicated
							</p>
						</div>

						<div className="grid md:grid-cols-2 gap-12 items-start">
							<div className="space-y-8">
								<div className="fade-in flex items-start space-x-4">
									<div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-sm font-medium flex-shrink-0">
										1
									</div>
									<div>
										<h3 className="text-lg font-medium text-foreground mb-2">
											Upload your file
										</h3>
										<p className="text-muted-foreground leading-relaxed">
											Drag and drop any file. It's encrypted in your browser
											using AES-256 before leaving your device.
										</p>
									</div>
								</div>

								<div className="fade-in flex items-start space-x-4">
									<div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-sm font-medium flex-shrink-0">
										2
									</div>
									<div>
										<h3 className="text-lg font-medium text-foreground mb-2">
											Get a secure link
										</h3>
										<p className="text-muted-foreground leading-relaxed">
											Receive a unique, unguessable link that contains the
											decryption key in the URL fragment.
										</p>
									</div>
								</div>

								<div className="fade-in flex items-start space-x-4">
									<div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-sm font-medium flex-shrink-0">
										3
									</div>
									<div>
										<h3 className="text-lg font-medium text-foreground mb-2">
											Share safely
										</h3>
										<p className="text-muted-foreground leading-relaxed">
											Send the link through any channel. Only the recipient can
											decrypt and access the file.
										</p>
									</div>
								</div>

								<div className="fade-in flex items-start space-x-4">
									<div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-sm font-medium flex-shrink-0">
										4
									</div>
									<div>
										<h3 className="text-lg font-medium text-foreground mb-2">
											Automatic cleanup
										</h3>
										<p className="text-muted-foreground leading-relaxed">
											Files self-destruct after download or expiry. No traces
											left behind on our servers.
										</p>
									</div>
								</div>
							</div>

							<div className="fade-in max-[476px]:hidden">
								<div className="bg-muted rounded-2xl p-8 border border-border">
									<div className="space-y-4">
										<div className="flex items-center space-x-3">
											<div className="w-3 h-3 bg-destructive rounded-full"></div>
											<div className="w-3 h-3 bg-warning rounded-full"></div>
											<div className="w-3 h-3 bg-success rounded-full"></div>
										</div>
										<div className="space-y-3">
											<div className="bg-background p-4 rounded-lg border border-border">
												<div className="flex items-center space-x-3">
													<Upload className="h-5 w-5 text-muted-foreground" />
													<span className="text-sm text-muted-foreground">
														document.pdf
													</span>
													<span className="text-xs text-muted-foreground ml-auto">
														2.4 MB
													</span>
												</div>
											</div>
											<div className="bg-background p-3 rounded-lg border border-border">
												<div className="text-xs font-mono text-muted-foreground break-all">
													https://silentparcel.com/file/abc123...
												</div>
											</div>
											<div className="flex items-center justify-between text-xs text-muted-foreground">
												<span>Valid for over 150+ hours</span>
												<span className="flex items-center space-x-1">
													<CheckCircle className="h-3 w-3 text-success" />
													<span>Encrypted</span>
												</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Social Proof */}
				{/* <section className="py-20 px-8 bg-muted/50">
					<div className="max-w-6xl mx-auto">
						<div className="text-center mb-16 fade-in">
							<h2 className="text-4xl font-light text-foreground mb-4">
								Trusted by <span className="font-medium">professionals</span>
							</h2>
						</div>

						<div className="grid md:grid-cols-3 gap-8">
							<div className="fade-in bg-background p-8 rounded-2xl border border-border">
								<div className="flex items-center space-x-1 mb-4">
									{[...Array(5)].map((_, i) => (
										<Star
											key={i}
											className="h-4 w-4 fill-warning text-warning"
										/>
									))}
								</div>
								<p className="text-muted-foreground mb-6 leading-relaxed">
									"Finally, a file sharing tool I can trust with sensitive
									source documents. The zero-knowledge architecture gives me
									complete peace of mind."
								</p>
								<div className="flex items-center space-x-3">
									<div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
										<span className="text-sm font-medium text-muted-foreground">
											SC
										</span>
									</div>
									<div>
										<div className="font-medium text-foreground">
											Sarah Chen
										</div>
										<div className="text-sm text-muted-foreground">
											Investigative Journalist
										</div>
									</div>
								</div>
							</div>

							<div className="fade-in bg-background p-8 rounded-2xl border border-border">
								<div className="flex items-center space-x-1 mb-4">
									{[...Array(5)].map((_, i) => (
										<Star
											key={i}
											className="h-4 w-4 fill-warning text-warning"
										/>
									))}
								</div>
								<p className="text-muted-foreground mb-6 leading-relaxed">
									"We use SilentParcel for all confidential client
									communications. The ephemeral nature and audit trail give us
									the security we need."
								</p>
								<div className="flex items-center space-x-3">
									<div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
										<span className="text-sm font-medium text-muted-foreground">
											MR
										</span>
									</div>
									<div>
										<div className="font-medium text-foreground">
											Marcus Rivera
										</div>
										<div className="text-sm text-muted-foreground">
											Legal Partner
										</div>
									</div>
								</div>
							</div>

							<div className="fade-in bg-background p-8 rounded-2xl border border-border">
								<div className="flex items-center space-x-1 mb-4">
									{[...Array(5)].map((_, i) => (
										<Star
											key={i}
											className="h-4 w-4 fill-warning text-warning"
										/>
									))}
								</div>
								<p className="text-muted-foreground mb-6 leading-relaxed">
									"The security researcher in me loves the open-source
									cryptography. The user in me loves how stupidly simple it is
									to use."
								</p>
								<div className="flex items-center space-x-3">
									<div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
										<span className="text-sm font-medium text-muted-foreground">
											AK
										</span>
									</div>
									<div>
										<div className="font-medium text-foreground">Alex Kim</div>
										<div className="text-sm text-muted-foreground">
											Security Researcher
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section> */}

				{/* CTA */}
				<section className="py-20 px-8">
					<div className="max-w-4xl mx-auto text-center">
						<div className="fade-in">
							<h2 className="text-5xl max-[476px]:text-4xl font-light text-foreground mb-6 leading-tight">
								Ready to share
								<br />
								<span className="font-medium">without compromise?</span>
							</h2>
							<p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
								Join hundreds of privacy-conscious users who refuse to
								compromise on security.
							</p>

							<div className="flex flex-col sm:flex-row gap-4 justify-center">
								<Link href="/files">
									<Button className="px-12 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all duration-200 hover:scale-[1.02]">
										<Upload className="mr-2 h-5 w-5" />
										Start sharing securely
									</Button>
								</Link>
								<Link href="/about" className="max-[476px]:hidden">
									<Button className="px-12 py-4 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium border border-border transition-all duration-200">
										Learn about our security
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>
								</Link>
							</div>
						</div>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="py-12 px-8 border-t border-border bg-muted/30">
				<div className="max-w-7xl mx-auto">
					<div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-0">
						<div className="flex items-center space-x-3">
							<div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
								<Lock className="h-4 w-4 text-primary-foreground" />
							</div>
							<span className="text-xl font-semibold text-foreground">
								SilentParcel
							</span>
						</div>
						<div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
							<Link
								href="/privacy"
								className="hover:text-foreground transition-colors"
							>
								Privacy Policy
							</Link>
							<Link
								href="/security"
								className="hover:text-foreground transition-colors"
							>
								Security
							</Link>
							<Link
								href="/opensource"
								className="hover:text-foreground transition-colors"
							>
								Open Source
							</Link>
						</div>
					</div>
					<div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
						&copy; 2025 SilentParcel. Crafted for privacy, by privacy-conscious
						users.
					</div>
				</div>
			</footer>
		</div>
	);
}
