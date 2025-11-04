import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	FileText,
	Shield,
	AlertTriangle,
	CheckCircle,
	ArrowLeft,
	Lock,
	Globe,
	Users,
	Clock,
	Trash2,
} from "lucide-react";
import Script from "next/script";

export const metadata: Metadata = {
	title: "Terms of Service | SilentParcel",
	description: "Read SilentParcel's terms of service covering acceptable use, security, privacy, and user responsibilities.",
	keywords: [
		"terms of service",
		"terms and conditions",
		"acceptable use policy",
		"user agreement",
		"legal terms",
		"service terms"
	],
	openGraph: {
		title: "Terms of Service | SilentParcel",
		description: "Read our terms of service covering acceptable use, security, privacy, and user responsibilities.",
		url: "https://silentparcel.com/terms",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Terms of Service | SilentParcel",
		description: "Read our terms of service covering acceptable use and user responsibilities.",
	},
	alternates: {
		canonical: "/terms",
	},
};

export default function TermsPage() {
	return (
		<div className="min-h-screen bg-background">
			{/* Structured Data for Terms Page */}
			<Script
				id="terms-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "WebPage",
						"name": "Terms of Service",
						"description": "Read SilentParcel's terms of service covering acceptable use, security, privacy, and user responsibilities.",
						"url": "https://silentparcel.com/terms",
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
									"name": "Terms of Service",
									"item": "https://silentparcel.com/terms"
								}
							]
						}
					})
				}}
			/>

			{/* Header */}
			<header className="border-b border-border/30 bg-background/80 sticky top-0 z-50 shadow-sm">
				<div className="w-full max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
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
					<h1 className="text-xl font-semibold">Terms of Service</h1>
					<div className="w-10" /> {/* Spacer for centering */}
				</div>
			</header>

			<main className="max-w-4xl mx-auto px-4 py-8">
				{/* Hero Section */}
				<section className="text-center mb-16">
					<div className="mb-8">
						<FileText className="h-16 w-16 mx-auto text-primary mb-4" />
						<h1 className="text-4xl font-bold mb-4">
							Terms of Service
						</h1>
						<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
							Please read these terms carefully before using SilentParcel.
							By using our service, you agree to these terms.
						</p>
					</div>
					<div className="flex flex-wrap justify-center gap-4">
						<Badge variant="outline" className="text-sm px-4 py-2">
							Last Updated: {new Date().toLocaleDateString('en-US', { 
								year: 'numeric', 
								month: 'long', 
								day: 'numeric' 
							})}
						</Badge>
					</div>
				</section>

				{/* Terms Sections */}
				<section className="space-y-12">
					{/* Acceptance of Terms */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<CheckCircle className="h-6 w-6 text-primary" />
								1. Acceptance of Terms
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground mb-4">
								By accessing or using SilentParcel ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
							</p>
							<p className="text-muted-foreground">
								These Terms apply to all visitors, users, and others who access or use the Service.
							</p>
						</CardContent>
					</Card>

					{/* Description of Service */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<Globe className="h-6 w-6 text-primary" />
								2. Description of Service
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground mb-4">
								SilentParcel is a secure file sharing and anonymous chat platform that provides:
							</p>
							<ul className="space-y-2 text-muted-foreground">
								<li>• End-to-end encrypted file sharing</li>
								<li>• Anonymous chat rooms</li>
								<li>• Automatic virus scanning</li>
								<li>• Self-destructing files and messages</li>
								<li>• Zero-knowledge architecture</li>
							</ul>
						</CardContent>
					</Card>

					{/* Acceptable Use */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<Shield className="h-6 w-6 text-primary" />
								3. Acceptable Use
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground mb-4">
								You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to use the Service:
							</p>
							<ul className="space-y-2 text-muted-foreground mb-4">
								<li>• To upload, share, or transmit any illegal, harmful, threatening, abusive, or objectionable content</li>
								<li>• To violate any applicable laws or regulations</li>
								<li>• To infringe upon the rights of others</li>
								<li>• To upload files containing viruses, malware, or other harmful code</li>
								<li>• To attempt to gain unauthorized access to our systems</li>
								<li>• To use the Service for spam or mass messaging</li>
							</ul>
							<p className="text-muted-foreground">
								We reserve the right to terminate access to the Service for users who violate these terms.
							</p>
						</CardContent>
					</Card>

					{/* Privacy and Security */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<Lock className="h-6 w-6 text-primary" />
								4. Privacy and Security
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground mb-4">
								Your privacy is important to us. Our privacy practices are detailed in our Privacy Policy, which is incorporated into these Terms by reference.
							</p>
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold mb-2">Security Features</h4>
									<ul className="space-y-1 text-sm text-muted-foreground">
										<li>• All files are encrypted using AES-256 encryption</li>
										<li>• Files are encrypted in your browser before upload</li>
										<li>• We cannot access or decrypt your files</li>
										<li>• All files are automatically scanned for viruses</li>
									</ul>
								</div>
								<div>
									<h4 className="font-semibold mb-2">Your Responsibilities</h4>
									<ul className="space-y-1 text-sm text-muted-foreground">
										<li>• Keep your download links secure and private</li>
										<li>• Don't share links with unintended recipients</li>
										<li>• Be aware that files are automatically deleted after expiry</li>
									</ul>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* File Sharing and Storage */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<FileText className="h-6 w-6 text-primary" />
								5. File Sharing and Storage
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold mb-2">File Limits</h4>
									<ul className="space-y-1 text-sm text-muted-foreground">
										<li>• Maximum archive size in one go: 50MB total</li>
										<li>• Supported file types: All file types</li>
										<li>• Maximum downloads: Configurable (default: 10)</li>
									</ul>
								</div>
								<div>
									<h4 className="font-semibold mb-2">File Retention</h4>
									<ul className="space-y-1 text-sm text-muted-foreground">
										<li>• Files are automatically deleted after download or expiry</li>
										<li>• Default expiry: 07 days from upload</li>
										<li>• No long-term storage or backup</li>
									</ul>
								</div>
								<div>
									<h4 className="font-semibold mb-2">Virus Scanning</h4>
									<p className="text-sm text-muted-foreground">
										All uploaded files are automatically scanned for viruses and malware. Files containing malicious code will be rejected and cannot be shared.
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Disclaimers */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<AlertTriangle className="h-6 w-6 text-primary" />
								6. Disclaimers
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold mb-2">Service Availability</h4>
									<p className="text-sm text-muted-foreground">
										We strive to maintain high availability but cannot guarantee uninterrupted service. The Service is provided "as is" without warranties of any kind.
									</p>
								</div>
								<div>
									<h4 className="font-semibold mb-2">Data Loss</h4>
									<p className="text-sm text-muted-foreground">
										We are not responsible for any data loss. Files are automatically deleted and cannot be recovered once deleted.
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Limitation of Liability */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<Shield className="h-6 w-6 text-primary" />
								7. Limitation of Liability
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground mb-4">
								To the maximum extent permitted by law, SilentParcel shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
							</p>
						</CardContent>
					</Card>

					{/* Intellectual Property */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<FileText className="h-6 w-6 text-primary" />
								8. Intellectual Property
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold mb-2">Our Rights</h4>
									<p className="text-sm text-muted-foreground">
										The Service and its original content, features, and functionality are owned by SilentParcel and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
									</p>
								</div>
								<div>
									<h4 className="font-semibold mb-2">Your Rights</h4>
									<p className="text-sm text-muted-foreground">
										You retain ownership of the content you upload. By uploading content, you grant us a limited license to store and serve your content as necessary to provide the Service.
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Termination */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<Trash2 className="h-6 w-6 text-primary" />
								9. Termination
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground mb-4">
								We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
							</p>
							<p className="text-muted-foreground">
								Upon termination, your right to use the Service will cease immediately. All files and data associated with your use will be automatically deleted.
							</p>
						</CardContent>
					</Card>

					{/* Changes to Terms */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<Clock className="h-6 w-6 text-primary" />
								10. Changes to Terms
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground mb-4">
								We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 07 days notice prior to any new terms taking effect.
							</p>
							<p className="text-muted-foreground">
								What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms.
							</p>
						</CardContent>
					</Card>

					{/* Governing Law */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<Globe className="h-6 w-6 text-primary" />
								11. Governing Law
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground">
								These Terms shall be interpreted and governed by the laws of [Your Jurisdiction], without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
							</p>
						</CardContent>
					</Card>

					{/* Contact Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-3">
								<Users className="h-6 w-6 text-primary" />
								12. Contact Information
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground mb-4">
								If you have any questions about these Terms of Service, please contact us:
							</p>
							<div className="space-y-2">
								<p className="font-medium">Email: singhaman21@proton.me</p>
								<p className="text-sm text-muted-foreground">
									We typically respond within 24-48 hours.
								</p>
							</div>
						</CardContent>
					</Card>
				</section>

				{/* CTA Section */}
				<section className="text-center mt-16">
					<Card className="bg-primary/5 border-primary/20">
						<CardContent className="pt-8">
							<h2 className="text-2xl font-bold mb-4">
								Ready to Get Started?
							</h2>
							<p className="text-muted-foreground mb-6 max-w-md mx-auto">
								By using SilentParcel, you agree to these terms. Start sharing files securely today.
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center">
								<Link href="/files">
									<Button className="bg-primary hover:bg-primary/90">
										<FileText className="mr-2 h-4 w-4" />
										Start Sharing Securely
									</Button>
								</Link>
								<Link href="/privacy">
									<Button variant="outline">
										<Shield className="mr-2 h-4 w-4" />
										Read Privacy Policy
									</Button>
								</Link>
							</div>
						</CardContent>
					</Card>
				</section>
			</main>
		</div>
	);
} 