import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZeroCrawl MCP — Zero-Cost, Zero-Binary Web Crawler for AI Agents",
  description: "Open-source Model Context Protocol (MCP) server for fast web scraping, multi-page crawling, sitemap parsing, and metadata extraction on Vercel Free Tier.",
  keywords: ["ZeroCrawl", "ZeroCrawl MCP", "AgentNex", "MCP Server", "Model Context Protocol", "Web Crawler MCP", "FireCrawl Alternative", "Cursor MCP", "Claude MCP", "Vercel Web Scraper"],
  authors: [{ name: "AgentNex", url: "https://github.com/AgentNex" }],
  creator: "AgentNex",
  publisher: "AgentNex",
  robots: "index, follow",
  openGraph: {
    title: "ZeroCrawl MCP — Zero-Cost, Zero-Binary Web Crawler for AI Agents",
    description: "Open-source Model Context Protocol (MCP) server for fast web scraping, multi-page crawling, sitemap parsing, and metadata extraction on Vercel Free Tier.",
    url: "https://github.com/AgentNex/zerocrawl-mcp",
    siteName: "ZeroCrawl MCP",
    images: ["/assets/logo.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZeroCrawl MCP — Zero-Cost, Zero-Binary Web Crawler for AI Agents",
    description: "Open-source Model Context Protocol (MCP) server for fast web scraping, multi-page crawling, sitemap parsing, and metadata extraction on Vercel Free Tier.",
    images: ["/assets/logo.png"],
  },
  alternates: {
    canonical: "https://github.com/AgentNex/zerocrawl-mcp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "ZeroCrawl MCP",
    "operatingSystem": "Cloud / Vercel Serverless",
    "applicationCategory": "DeveloperApplication",
    "description": "Production-ready, zero-cost web crawling and scraping Model Context Protocol server.",
    "url": "https://github.com/AgentNex/zerocrawl-mcp",
    "author": {
      "@type": "Organization",
      "name": "AgentNex",
      "url": "https://github.com/AgentNex"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "softwareRequirements": "Node.js, Model Context Protocol Compatible Client (Cursor, Windsurf, Claude)"
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
