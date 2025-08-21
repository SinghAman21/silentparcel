/** @type {import('next').NextConfig} */
const nextConfig = {
	eslint: {
		ignoreDuringBuilds: false,
	},

	images: {
		dangerouslyAllowSVG: true,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "api.dicebear.com",
				pathname: "/**", 
			},
			{
				protocol: "https",
				hostname: "peerlist.io",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "api.producthunt.com",
				pathname: "/**",
			},
		],
	},

	serverExternalPackages: ["ioredis"],

	compiler: {
		removeConsole: false,
	},

	// Configure body size limits for API routes
	// api: {
	// 	bodyParser: {
	// 		sizeLimit: '50mb', // Allow up to 50MB for file uploads
	// 	},
	// 	responseLimit: false, // Disable response size limit
	// },

	webpack: (config, { isServer }) => {
		config.ignoreWarnings = [
			(warning) =>
				typeof warning.message === "string" &&
				warning.message.includes(
					"Critical dependency: the request of a dependency is an expression"
				),
		];

		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
				crypto: false,
			};
		}

		return config;
	},

	async headers() {
		return [
			{
				source: "/api/:path*",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "X-XSS-Protection", value: "1; mode=block" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
				],
			},
			{
				source: "/(.*)",
				headers: [
					// Security Headers
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "X-XSS-Protection", value: "1; mode=block" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},

					// SEO Headers
					{ key: "X-Robots-Tag", value: "index, follow" },

					// Performance Headers
					{
						key: "Cache-Control",
						// value: "public, max-age=31536000, immutable",
						value: "no-store",
						// , no-cache, must-revalidate, proxy-revalidate",
					},
				],
			},
			{
				source: "/robots.txt",
				headers: [
					{ key: "Content-Type", value: "text/plain" },
					{ key: "Cache-Control", value: "public, max-age=86400" },
				],
			},
			{
				source: "/sitemap.xml",
				headers: [
					{ key: "Content-Type", value: "application/xml" },
					{ key: "Cache-Control", value: "public, max-age=3600" },
				],
			},
			{
				source: "/manifest.json",
				headers: [
					{ key: "Content-Type", value: "application/manifest+json" },
					{ key: "Cache-Control", value: "public, max-age=86400" },
				],
			},
		];
	},

	// SEO and Performance Optimizations
	poweredByHeader: false,
	compress: true,

	// Enable experimental features for better performance
	experimental: {
		optimizeCss: true,
		optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
	},

	// Redirects for SEO
	async redirects() {
		return [
			{
				source: "/home",
				destination: "/",
				permanent: true,
			},
			{
				source: "/index.html",
				destination: "/",
				permanent: true,
			},
		];
	},

	// Rewrites for clean URLs
	async rewrites() {
		return [
			{
				source: "/sitemap.xml",
				destination: "/api/sitemap",
			},
		];
	},
};

module.exports = nextConfig;
